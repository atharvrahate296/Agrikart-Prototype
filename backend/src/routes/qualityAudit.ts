/**
 * Quality Audit Routes
 * ─────────────────────────────────────────────
 * POST /quality-audit                       — submit a new audit for an FPO yield
 * PUT  /quality-audit/:id                   — update an existing audit
 * GET  /quality-audit/:fpo_yield_id         — get audit record (certificate view)
 * POST /quality-audit/:id/certify           — certify an audit (issue certificate)
 * POST /quality-audit/:id/upload-image      — upload produce photo to Supabase Storage
 */

import { Router, Request, Response, NextFunction } from 'express'
import { getSupabaseAdminClient } from '../config/supabase.js'

const router = Router()

// ─────────────────────────────────────────────────────────────────
// Helper: compute overall grade from individual metrics
// ─────────────────────────────────────────────────────────────────
function computeOverallGrade(metrics: {
  moisture_content?: number
  defect_score?: number
  colour_uniformity?: number
  pesticide_residue?: string
}): string {
  const { moisture_content, defect_score, colour_uniformity, pesticide_residue } = metrics

  if (pesticide_residue === 'Fail') return 'Rejected'

  // Simple weighted scoring system
  let score = 100

  // Defect score: 0 = perfect, 10 = terrible
  if (defect_score !== undefined) score -= defect_score * 5       // max -50 pts

  // Colour uniformity: 100% = perfect
  if (colour_uniformity !== undefined) score -= (100 - colour_uniformity) * 0.2  // max -20 pts

  // Moisture: if outside a typical acceptable window (>15% or <8%) dock points
  if (moisture_content !== undefined) {
    if (moisture_content > 20 || moisture_content < 5) score -= 20
    else if (moisture_content > 15 || moisture_content < 8) score -= 10
  }

  if (score >= 90) return 'A+'
  if (score >= 75) return 'A'
  if (score >= 55) return 'B'
  if (score >= 35) return 'C'
  return 'Rejected'
}

/**
 * POST /quality-audit
 * Submit a new quality audit record for an FPO yield batch
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      fpo_yield_id, auditor_id,
      moisture_content, size_grade, defect_score,
      colour_uniformity, avg_weight_grams,
      pesticide_residue, storage_condition, packaging_type,
      auditor_notes, image_urls,
    } = req.body

    if (!fpo_yield_id || !auditor_id) {
      return res.status(400).json({
        error: { message: 'fpo_yield_id and auditor_id are required', code: 'MISSING_FIELDS' },
      })
    }

    const overall_grade = computeOverallGrade({
      moisture_content, defect_score, colour_uniformity, pesticide_residue,
    })

    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('crop_quality_audits')
      .insert({
        fpo_yield_id,
        auditor_id,
        moisture_content: moisture_content ?? null,
        size_grade: size_grade ?? null,
        defect_score: defect_score ?? null,
        colour_uniformity: colour_uniformity ?? null,
        avg_weight_grams: avg_weight_grams ?? null,
        pesticide_residue: pesticide_residue ?? 'Not Tested',
        storage_condition: storage_condition ?? null,
        packaging_type: packaging_type ?? null,
        auditor_notes: auditor_notes ?? null,
        image_urls: image_urls ?? [],
        overall_grade,
        is_certified: false,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({
          error: { message: 'An audit already exists for this FPO yield. Use PUT to update it.', code: 'DUPLICATE' },
        })
      }
      throw error
    }

    res.status(201).json({
      success: true,
      message: `Audit submitted. Overall grade: ${overall_grade}`,
      data,
    })
  } catch (error) {
    next(error)
  }
})

/**
 * PUT /quality-audit/:id
 * Update an existing audit record (only before certification)
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const supabase = getSupabaseAdminClient()

    // Ensure not already certified
    const { data: existing } = await supabase
      .from('crop_quality_audits').select('is_certified').eq('id', id).single()

    if (existing?.is_certified) {
      return res.status(403).json({
        error: { message: 'Cannot modify a certified audit', code: 'FORBIDDEN' },
      })
    }

    const updates = req.body
    const overall_grade = computeOverallGrade({
      moisture_content: updates.moisture_content,
      defect_score: updates.defect_score,
      colour_uniformity: updates.colour_uniformity,
      pesticide_residue: updates.pesticide_residue,
    })

    const { data, error } = await supabase
      .from('crop_quality_audits')
      .update({ ...updates, overall_grade })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /quality-audit/:fpo_yield_id
 * Fetch the audit (quality certificate) for a given FPO yield
 * This is the buyer-facing view
 */
router.get('/:fpo_yield_id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fpo_yield_id } = req.params
    const supabase = getSupabaseAdminClient()

    const { data, error } = await supabase
      .from('crop_quality_audits')
      .select(`
        *,
        fpo_yield:fpo_yields(crop_type, variety, available_quantity, price_per_kg, location_name,
          fpo:profiles!fpo_yields_fpo_profile_id_fkey(full_name, location, phone)),
        auditor:profiles!crop_quality_audits_auditor_id_fkey(full_name, location)
      `)
      .eq('fpo_yield_id', fpo_yield_id)
      .single()

    if (error?.code === 'PGRST116') {
      return res.status(404).json({
        error: { message: 'No audit found for this yield', code: 'NOT_FOUND' },
      })
    }

    if (error) throw error

    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /quality-audit/:id/certify
 * Issue a Quality Certificate (marks is_certified = true)
 * Body: { certified_by, certification_notes? }
 */
router.post('/:id/certify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { certified_by, certification_notes } = req.body

    if (!certified_by) {
      return res.status(400).json({
        error: { message: 'certified_by (profile id) is required', code: 'MISSING_FIELDS' },
      })
    }

    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('crop_quality_audits')
      .update({
        is_certified: true,
        certified_at: new Date().toISOString(),
        certified_by,
        certification_notes: certification_notes ?? null,
      })
      .eq('id', id)
      .neq('overall_grade', 'Rejected')   // Cannot certify rejected produce
      .select()
      .single()

    if (error?.code === 'PGRST116') {
      return res.status(404).json({
        error: { message: 'Audit not found or produce is Rejected grade', code: 'NOT_FOUND' },
      })
    }

    if (error) throw error

    res.json({ success: true, message: 'Quality Certificate issued successfully', data })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /quality-audit/:id/upload-image
 * Upload a produce photo to Supabase Storage and attach URL to the audit
 * Expects multipart/form-data with field 'image'
 */
router.post('/:id/upload-image', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const supabase = getSupabaseAdminClient()

    // In production, use multer or busboy for multipart parsing.
    // For this implementation, accept a base64-encoded image in the body.
    const { image_base64, file_name, mime_type = 'image/jpeg' } = req.body

    if (!image_base64 || !file_name) {
      return res.status(400).json({
        error: { message: 'image_base64 and file_name are required', code: 'MISSING_FIELDS' },
      })
    }

    const buffer = Buffer.from(image_base64, 'base64')
    const storagePath = `audits/${id}/${Date.now()}_${file_name}`

    // Upload to Supabase Storage bucket 'crop-audits'
    const { error: uploadErr } = await supabase.storage
      .from('crop-audits')
      .upload(storagePath, buffer, { contentType: mime_type, upsert: false })

    if (uploadErr) throw uploadErr

    const { data: { publicUrl } } = supabase.storage.from('crop-audits').getPublicUrl(storagePath)

    // Append URL to image_urls array
    const { data: audit } = await supabase
      .from('crop_quality_audits').select('image_urls').eq('id', id).single()

    const updatedUrls = [...(audit?.image_urls ?? []), publicUrl]

    await supabase
      .from('crop_quality_audits')
      .update({ image_urls: updatedUrls })
      .eq('id', id)

    res.json({ success: true, image_url: publicUrl, total_images: updatedUrls.length })
  } catch (error) {
    next(error)
  }
})

export default router
