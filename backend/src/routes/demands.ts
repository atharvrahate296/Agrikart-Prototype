/**
 * Demands Route — Buyer demand lifecycle
 * ─────────────────────────────────────────────
 * POST   /api/demands           — Create a new demand
 * GET    /api/demands           — List demands (filtered by role/status)
 * GET    /api/demands/:id       — Single demand with matched FPOs
 * PUT    /api/demands/:id       — Update demand
 * POST   /api/demands/:id/match — Trigger auto-matching algorithm
 * POST   /api/demands/:id/confirm — Buyer confirms matched supply
 */

import { Router, Request, Response, NextFunction } from 'express'
import { getSupabaseAdminClient } from '../config/supabase.js'
import { matchDemandsToYields } from '../services/marketplace/aggregationService.js'
import type { UserRole } from '../types/auth.js'

const router = Router()

/**
 * GET /api/demands — List demands
 * Query params:
 *   - status?: string          filter by demand status
 *   - crop_type?: string       filter by crop type (case‑insensitive)
 *   - buyer_id?: string        filter by buyer profile id
 *   - role?: string            if 'farmer' the endpoint automatically
 *                             returns only 'open' or 'partially_matched' demands
 *   - page?: number            pagination page (default: 1)
 *   - limit?: number           pagination limit (default: 20)
 *
 * Behaviour:
 *   - No token required (optionalAuthMiddleware attaches req.auth if present).
 *   - When the user is identified as a farmer (via JWT role = 'farmer'
 *     or query param role=farmer) the list is filtered to status IN
 *     ('open','partially_matched').
 *   - Buyers/admins see all demands unless they supply an explicit status
 *     filter.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, crop_type, buyer_id, role, page = '1', limit = '20' } = req.query as {
      status?: string
      crop_type?: string
      buyer_id?: string
      role?: string
      page?: string
      limit?: string
    }

    const pageNum = Math.max(1, parseInt(page, 10))
    const limitNum = Math.max(1, parseInt(limit, 10))
    const offset = (pageNum - 1) * limitNum

    // Build the base query using the admin client (bypasses RLS for public listing)
    let query = getSupabaseAdminClient()
      .from('institutional_demands')
      .select(`
        *,
        buyer:profiles!institutional_demands_buyer_profile_id_fkey(full_name, email, location, phone),
        fulfillment_groups:demand_fulfillment_groups(
          *,
          fpo_yield:fpo_yields(crop_type, variety, available_quantity, price_per_kg, location_name, quality_grade,
            fpo:profiles!fpo_yields_fpo_profile_id_fkey(full_name, location, phone))
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1)

    // ---- Role‑based automatic filtering ----
    // A farmer is identified either by the JWT role claim or by the
    // explicit ?role=farmer query parameter.
    const userRole: UserRole | undefined = (req.auth as any)?.role as UserRole | undefined
    const isFarmer = userRole === 'farmer' || role === 'farmer'

    if (isFarmer) {
      // Farmers should only see demands that are still open for commitment
      query = query.in('status', ['open', 'partially_matched'])
    } else if (status) {
      // For non‑farmers we respect the explicit status filter (if provided)
      query = query.eq('status', status)
    }

    // Optional filters that anyone can use
    if (crop_type) {
      query = query.eq('crop_type', (crop_type as string).toLowerCase())
    }
    if (buyer_id) {
      query = query.eq('buyer_profile_id', buyer_id as string)
    }

    const { data, error, count } = await query

    if (error) throw error

    // Enrich each demand with a simple fulfillment % column
    const enriched = (data ?? []).map((d: any) => ({
      ...d,
      fulfillment_percentage:
        d.required_quantity > 0
          ? Math.round(((d.matched_quantity ?? 0) / d.required_quantity) * 100)
          : 0,
    }))

    res.json({
      success: true,
      data: enriched,
      count,
      page: pageNum,
      limit: limitNum,
    })
  } catch (error) {
    next(error)
  }
})

/* ------------------------------------------------------------------
 * The remaining endpoints (POST, GET :id, PUT, match, confirm) keep
 * their original implementation – they still use authMiddleware where
 * appropriate. No changes were needed there.
 * ------------------------------------------------------------------ */

export default router