import { Router, Request, Response, NextFunction } from 'express'
import { matchDemandsToYields, getAggregationDashboard } from '../services/marketplace/aggregationService.js'
import { getSupabaseAdminClient } from '../config/supabase.js'

const router = Router()

router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await getAggregationDashboard() })
  } catch (error) {
    next(error)
  }
})

router.post('/match/:demandId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await matchDemandsToYields(req.params.demandId)
    res.json({ success: true, message: `Matched ${result.fulfillment_percentage}% of demand`, data: result })
  } catch (error: any) {
    const status = error.message?.includes('not found') ? 404 : error.message?.includes('already') ? 409 : 500
    if (status !== 500) {
      return res.status(status).json({ error: { message: error.message, code: status === 404 ? 'NOT_FOUND' : 'CONFLICT' } })
    }
    next(error)
  }
})

router.post('/demands', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { crop_type, required_quantity, max_price_per_kg, min_quality_grade, required_by, latitude, longitude, delivery_address, buyer_profile_id } = req.body
    if (!crop_type || !required_quantity || !max_price_per_kg || !required_by || !latitude || !longitude) {
      return res.status(400).json({ error: { message: 'Missing required fields', code: 'MISSING_FIELDS' } })
    }
    const { data, error } = await getSupabaseAdminClient()
      .from('institutional_demands')
      .insert({
        buyer_profile_id, crop_type, required_by, delivery_address,
        required_quantity: parseFloat(required_quantity),
        max_price_per_kg: parseFloat(max_price_per_kg),
        min_quality_grade: min_quality_grade ?? 'B',
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        status: 'open',
      })
      .select().single()

    if (error) throw error
    res.status(201).json({ success: true, data })
  } catch (error) {
    next(error)
  }
})

router.post('/yields', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fpo_profile_id, crop_type, variety, available_quantity, price_per_kg, quality_grade, harvest_date, available_until, latitude, longitude, location_name } = req.body
    if (!fpo_profile_id || !crop_type || !available_quantity || !price_per_kg || !latitude || !longitude) {
      return res.status(400).json({ error: { message: 'Missing required fields', code: 'MISSING_FIELDS' } })
    }
    const { data, error } = await getSupabaseAdminClient()
      .from('fpo_yields')
      .insert({
        fpo_profile_id, crop_type, variety: variety || null, harvest_date: harvest_date || null, available_until: available_until || null, location_name: location_name || null,
        available_quantity: parseFloat(available_quantity),
        price_per_kg: parseFloat(price_per_kg),
        quality_grade: quality_grade ?? 'B',
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        is_available: true,
      })
      .select().single()

    if (error) throw error
    res.status(201).json({ success: true, data })
  } catch (error) {
    next(error)
  }
})

router.get('/yields', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { crop_type, page = '1', limit = '20' } = req.query
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string)
    let query = getSupabaseAdminClient()
      .from('fpo_yields')
      .select('*, fpo:profiles!fpo_yields_fpo_profile_id_fkey(full_name, location)', { count: 'exact' })
      .eq('is_available', true)
      .eq('is_aggregated', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit as string) - 1)

    if (crop_type) query = query.eq('crop_type', crop_type)
    const { data, error, count } = await query
    if (error) throw error
    res.json({ success: true, data, count, page: parseInt(page as string) })
  } catch (error) {
    next(error)
  }
})

export default router
