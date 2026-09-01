/**
 * Escrow Route — Payment lifecycle tracking
 * ─────────────────────────────────────────────
 * POST  /api/escrow/deposit       — Record buyer escrow deposit
 * GET   /api/escrow/:demandId     — Get payment status for a demand
 * POST  /api/escrow/release       — Release payment after verified delivery
 * POST  /api/escrow/verify-delivery — Mark delivery as verified
 */

import { Router, Request, Response, NextFunction } from 'express'
import { getSupabaseAdminClient } from '../config/supabase.js'

const router = Router()

/**
 * POST /api/escrow/deposit — Buyer deposits escrow
 */
router.post('/deposit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { demand_id, buyer_id, total_amount } = req.body

    if (!demand_id || !buyer_id || !total_amount) {
      return res.status(400).json({
        error: { message: 'demand_id, buyer_id, and total_amount are required', code: 'MISSING_FIELDS' }
      })
    }

    const { data, error } = await getSupabaseAdminClient()
      .from('escrow_payments')
      .insert({
        demand_id,
        buyer_id,
        total_amount: parseFloat(total_amount),
        status: 'deposited',
        deposited_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ success: true, message: 'Escrow deposited', data })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/escrow/:demandId — Get escrow status for a demand
 */
router.get('/:demandId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await getSupabaseAdminClient()
      .from('escrow_payments')
      .select(`
        *,
        buyer:profiles!escrow_payments_buyer_id_fkey(full_name, email, phone),
        demand:institutional_demands(crop_type, required_quantity, status)
      `)
      .eq('demand_id', req.params.demandId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!data) {
      return res.json({ success: true, data: null, message: 'No escrow found for this demand' })
    }

    if (error) throw error

    res.json({ success: true, data })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/escrow/verify-delivery — Mark delivery as verified
 */
router.post('/verify-delivery', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { demand_id, verified_by, verification_notes } = req.body

    if (!demand_id || !verified_by) {
      return res.status(400).json({
        error: { message: 'demand_id and verified_by are required', code: 'MISSING_FIELDS' }
      })
    }

    const { data, error } = await getSupabaseAdminClient()
      .from('escrow_payments')
      .update({
        delivery_verified: true,
        verified_by,
        verified_at: new Date().toISOString(),
        verification_notes: verification_notes ?? null,
        status: 'held',
        held_at: new Date().toISOString(),
      })
      .eq('demand_id', demand_id)
      .select()
      .single()

    if (error) throw error

    res.json({ success: true, message: 'Delivery verified, payment held for release', data })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/escrow/release — Release payment to farmers
 */
router.post('/release', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { demand_id, farmer_payouts } = req.body

    if (!demand_id) {
      return res.status(400).json({
        error: { message: 'demand_id is required', code: 'MISSING_FIELDS' }
      })
    }

    const supabase = getSupabaseAdminClient()

    // Verify delivery was confirmed
    const { data: existing } = await supabase
      .from('escrow_payments')
      .select('delivery_verified, status')
      .eq('demand_id', demand_id)
      .single()

    if (!existing?.delivery_verified) {
      return res.status(400).json({
        error: { message: 'Delivery must be verified before releasing payment', code: 'DELIVERY_NOT_VERIFIED' }
      })
    }

    const { data, error } = await supabase
      .from('escrow_payments')
      .update({
        status: 'released',
        released_at: new Date().toISOString(),
        farmer_payouts: farmer_payouts ?? [],
      })
      .eq('demand_id', demand_id)
      .select()
      .single()

    if (error) throw error

    // Update demand status to delivered
    await supabase
      .from('institutional_demands')
      .update({ status: 'delivered', updated_at: new Date().toISOString() })
      .eq('id', demand_id)

    res.json({ success: true, message: 'Payment released to farmers', data })
  } catch (error) {
    next(error)
  }
})

export default router
