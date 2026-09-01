/**
 * Supply Route — Farmer/FPO supply management
 * ─────────────────────────────────────────────
 * GET    /api/supply/available-demands — Demands available for farmers
 * POST   /api/supply/commit           — Farmer commits quantity to a demand
 * GET    /api/supply/my-commitments   — Farmer's active commitments
 * GET    /api/supply/yields           — List farmer's own yields
 * POST   /api/supply/yields           — Submit a new yield
 */

import { Router, Request, Response, NextFunction } from 'express'
import { getSupabaseAdminClient } from '../config/supabase.js'

const router = Router()

/**
 * GET /api/supply/available-demands — Demands available for farmer commitment
 */
router.get('/available-demands', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { crop_type, page = '1', limit = '20' } = req.query
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string)

    let query = getSupabaseAdminClient()
      .from('institutional_demands')
      .select(`
        *,
        buyer:profiles!institutional_demands_buyer_profile_id_fkey(full_name, location)
      `, { count: 'exact' })
      .in('status', ['open', 'partially_matched'])
      .gte('required_by', new Date().toISOString().split('T')[0])
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit as string) - 1)

    if (crop_type) query = query.eq('crop_type', (crop_type as string).toLowerCase())

    const { data, error, count } = await query
    if (error) throw error

    const enriched = (data ?? []).map((d: any) => ({
      ...d,
      remaining_quantity: d.required_quantity - (d.matched_quantity ?? 0),
      fulfillment_percentage: d.required_quantity > 0
        ? Math.round(((d.matched_quantity ?? 0) / d.required_quantity) * 100)
        : 0,
    }))

    res.json({ success: true, data: enriched, count, page: parseInt(page as string) })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/supply/commit — Farmer commits supply quantity to a demand
 */
router.post('/commit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      fpo_profile_id, demand_id, crop_type, variety,
      available_quantity, price_per_kg, quality_grade,
      latitude, longitude, location_name
    } = req.body

    if (!fpo_profile_id || !demand_id || !crop_type || !available_quantity || !price_per_kg || !latitude || !longitude) {
      return res.status(400).json({
        error: { message: 'Missing required fields', code: 'MISSING_FIELDS' }
      })
    }

    const supabase = getSupabaseAdminClient()

    // 1. Create the FPO yield
    const { data: yield_, error: yieldErr } = await supabase
      .from('fpo_yields')
      .insert({
        fpo_profile_id,
        crop_type: crop_type.toLowerCase().trim(),
        variety: variety || null,
        available_quantity: parseFloat(available_quantity),
        price_per_kg: parseFloat(price_per_kg),
        quality_grade: quality_grade ?? 'B',
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        location_name: location_name || null,
        is_available: true,
        is_aggregated: false,
      })
      .select()
      .single()

    if (yieldErr) throw yieldErr

    // 2. Fetch demand to calculate allocation
    const { data: demand } = await supabase
      .from('institutional_demands')
      .select('required_quantity, matched_quantity, max_price_per_kg')
      .eq('id', demand_id)
      .single()

    if (!demand) {
      return res.status(404).json({ error: { message: 'Demand not found', code: 'NOT_FOUND' } })
    }

    const remaining = demand.required_quantity - (demand.matched_quantity ?? 0)
    const allocatedQty = Math.min(parseFloat(available_quantity), remaining)
    const agreedPrice = Math.min(parseFloat(price_per_kg), demand.max_price_per_kg)

    // 3. Create fulfillment group link
    const { error: fgErr } = await supabase
      .from('demand_fulfillment_groups')
      .insert({
        demand_id,
        fpo_yield_id: yield_.id,
        allocated_quantity: allocatedQty,
        agreed_price_per_kg: agreedPrice,
        status: 'matched',
      })

    if (fgErr) throw fgErr

    // 4. Update yield as aggregated & demand matched quantity
    await supabase.from('fpo_yields').update({ is_aggregated: true }).eq('id', yield_.id)

    const newMatched = (demand.matched_quantity ?? 0) + allocatedQty
    const newStatus = newMatched >= demand.required_quantity ? 'fully_matched' : 'partially_matched'

    await supabase
      .from('institutional_demands')
      .update({ matched_quantity: newMatched, status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', demand_id)

    res.status(201).json({
      success: true,
      message: `Committed ${allocatedQty} MT to demand`,
      data: {
        yield_id: yield_.id,
        demand_id,
        allocated_quantity: allocatedQty,
        agreed_price_per_kg: agreedPrice,
        demand_status: newStatus,
      }
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/supply/my-commitments — Farmer's active commitments
 */
router.get('/my-commitments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { farmer_id } = req.query

    if (!farmer_id) {
      return res.status(400).json({ error: { message: 'farmer_id is required', code: 'MISSING_FIELDS' } })
    }

    const { data, error } = await getSupabaseAdminClient()
      .from('fpo_yields')
      .select(`
        *,
        fulfillment:demand_fulfillment_groups(
          *,
          demand:institutional_demands(
            crop_type, required_quantity, required_by, status, delivery_address,
            buyer:profiles!institutional_demands_buyer_profile_id_fkey(full_name, location)
          )
        ),
        audit:crop_quality_audits(overall_grade, is_certified)
      `)
      .eq('fpo_profile_id', farmer_id)
      .order('created_at', { ascending: false })

    if (error) throw error

    res.json({ success: true, data: data ?? [] })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/supply/yields — List available yields
 */
router.get('/yields', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { crop_type, page = '1', limit = '20' } = req.query
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string)

    let query = getSupabaseAdminClient()
      .from('fpo_yields')
      .select('*, fpo:profiles!fpo_yields_fpo_profile_id_fkey(full_name, location, phone)', { count: 'exact' })
      .eq('is_available', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit as string) - 1)

    if (crop_type) query = query.eq('crop_type', crop_type)

    const { data, error, count } = await query
    if (error) throw error

    res.json({ success: true, data: data ?? [], count, page: parseInt(page as string) })
  } catch (error) {
    next(error)
  }
})

export default router
