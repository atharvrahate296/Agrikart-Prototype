/**
 * FPO Aggregation Service
 * ─────────────────────────────────────────────────────────────────
 * Core business logic for demand-led supply chain aggregation.
 *
 * Algorithm:
 *   1. Load an open Institutional Demand
 *   2. Find all available FPO Yields of the same crop type
 *   3. Filter yields within the 50km radius using Haversine formula
 *   4. Sort by: (a) quality grade, (b) price ascending, (c) proximity
 *   5. Greedily allocate yields until demand is fully satisfied
 *   6. Persist matches to `demand_fulfillment_groups`
 *   7. Update demand status and fpo_yield.is_aggregated flags
 */

import { getSupabaseAdminClient } from '../../config/supabase.js'

// ─────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────
const EARTH_RADIUS_KM = 6371
const DEFAULT_RADIUS_KM = 50

// Quality grade ordering (higher index = better grade)
const QUALITY_ORDER: Record<string, number> = { 'C': 0, 'B': 1, 'A': 2, 'A+': 3 }

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
export interface FPOYield {
  id: string
  fpo_profile_id: string
  crop_type: string
  variety: string | null
  available_quantity: number  // metric tonnes
  price_per_kg: number
  quality_grade: string
  latitude: number
  longitude: number
  location_name: string | null
  is_available: boolean
}

export interface InstitutionalDemand {
  id: string
  buyer_profile_id: string
  crop_type: string
  required_quantity: number  // metric tonnes
  max_price_per_kg: number
  min_quality_grade: string
  required_by: string
  latitude: number
  longitude: number
  delivery_address: string | null
  status: string
  matched_quantity: number
}

export interface AggregationMatch {
  fpo_yield_id: string
  allocated_quantity: number
  agreed_price_per_kg: number
  distance_km: number
  location_name: string | null
}

export interface AggregationResult {
  demand_id: string
  crop_type: string
  required_quantity: number
  total_matched: number
  fulfillment_percentage: number
  status: 'fully_matched' | 'partially_matched' | 'unmatched'
  matches: AggregationMatch[]
  total_cost_estimate: number
}

// ─────────────────────────────────────────────────────────────────
// Haversine distance (km) between two lat/lon points
// ─────────────────────────────────────────────────────────────────
function haversineDistanceKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─────────────────────────────────────────────────────────────────
// Core matching algorithm
// ─────────────────────────────────────────────────────────────────
export async function matchDemandsToYields(demandId: string): Promise<AggregationResult> {
  const supabase = getSupabaseAdminClient()

  // ── Step 1: Fetch demand ──────────────────────────────────────
  const { data: demand, error: demandErr } = await supabase
    .from('institutional_demands')
    .select('*')
    .eq('id', demandId)
    .single()

  if (demandErr || !demand) {
    throw new Error(`Demand not found: ${demandErr?.message ?? 'Unknown'}`)
  }

  if (demand.status === 'fully_matched' || demand.status === 'cancelled') {
    throw new Error(`Demand is already ${demand.status}`)
  }

  const remainingQty = demand.required_quantity - (demand.matched_quantity ?? 0)

  // ── Step 2: Fetch candidate FPO yields ───────────────────────
  const { data: yields, error: yieldsErr } = await supabase
    .from('fpo_yields')
    .select('*')
    .eq('crop_type', demand.crop_type)
    .eq('is_available', true)
    .eq('is_aggregated', false)
    .lte('price_per_kg', demand.max_price_per_kg)

  if (yieldsErr) {
    throw new Error(`Failed to fetch yields: ${yieldsErr.message}`)
  }

  if (!yields || yields.length === 0) {
    return buildResult(demand, remainingQty, [])
  }

  // ── Step 3: Filter by radius & quality grade ─────────────────
  const qualityThreshold = QUALITY_ORDER[demand.min_quality_grade] ?? 1

  const candidates = yields
    .map((y: FPOYield) => ({
      ...y,
      distance_km: haversineDistanceKm(demand.latitude, demand.longitude, y.latitude, y.longitude),
    }))
    .filter((y: FPOYield & { distance_km: number }) =>
      y.distance_km <= DEFAULT_RADIUS_KM &&
      (QUALITY_ORDER[y.quality_grade] ?? 0) >= qualityThreshold
    )
    // ── Step 4: Sort — best quality first, then cheapest, then closest ──
    .sort((a: any, b: any) => {
      const qualityDiff = (QUALITY_ORDER[b.quality_grade] ?? 0) - (QUALITY_ORDER[a.quality_grade] ?? 0)
      if (qualityDiff !== 0) return qualityDiff
      const priceDiff = a.price_per_kg - b.price_per_kg
      if (priceDiff !== 0) return priceDiff
      return a.distance_km - b.distance_km
    })

  // ── Step 5: Greedy allocation ─────────────────────────────────
  const matches: AggregationMatch[] = []
  let stillNeeded = remainingQty

  for (const candidate of candidates) {
    if (stillNeeded <= 0) break

    const allocate = Math.min(candidate.available_quantity, stillNeeded)
    matches.push({
      fpo_yield_id: candidate.id,
      allocated_quantity: allocate,
      agreed_price_per_kg: candidate.price_per_kg,
      distance_km: parseFloat(candidate.distance_km.toFixed(2)),
      location_name: candidate.location_name,
    })
    stillNeeded -= allocate
  }

  const totalMatched = remainingQty - Math.max(0, stillNeeded)

  if (matches.length === 0) {
    return buildResult(demand, remainingQty, [])
  }

  // ── Step 6: Persist matches ───────────────────────────────────
  const fulfillmentRows = matches.map((m) => ({
    demand_id: demandId,
    fpo_yield_id: m.fpo_yield_id,
    allocated_quantity: m.allocated_quantity,
    agreed_price_per_kg: m.agreed_price_per_kg,
    distance_km: m.distance_km,
    status: 'matched',
  }))

  await supabase
    .from('demand_fulfillment_groups')
    .upsert(fulfillmentRows, { onConflict: 'demand_id,fpo_yield_id' })

  // Mark yields as aggregated
  const yieldIds = matches.map((m) => m.fpo_yield_id)
  await supabase.from('fpo_yields').update({ is_aggregated: true }).in('id', yieldIds)

  // ── Step 7: Update demand status ─────────────────────────────
  const newMatchedQty = (demand.matched_quantity ?? 0) + totalMatched
  const newStatus =
    newMatchedQty >= demand.required_quantity ? 'fully_matched' : 'partially_matched'

  await supabase
    .from('institutional_demands')
    .update({ status: newStatus, matched_quantity: newMatchedQty, updated_at: new Date() })
    .eq('id', demandId)

  return buildResult(demand, demand.required_quantity, matches, totalMatched)
}

// ─────────────────────────────────────────────────────────────────
// Dashboard: all active demands with their fulfillment groups
// ─────────────────────────────────────────────────────────────────
export async function getAggregationDashboard() {
  const supabase = getSupabaseAdminClient()

  const { data: demands, error } = await supabase
    .from('institutional_demands')
    .select(`
      *,
      buyer:profiles!institutional_demands_buyer_profile_id_fkey(full_name, email, location),
      fulfillment_groups:demand_fulfillment_groups(
        *,
        fpo_yield:fpo_yields(*, fpo:profiles!fpo_yields_fpo_profile_id_fkey(full_name, location))
      )
    `)
    .in('status', ['open', 'partially_matched', 'fully_matched'])
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch dashboard data: ${error.message}`)

  return demands?.map((d: any) => ({
    ...d,
    fulfillment_percentage:
      d.required_quantity > 0
        ? Math.round((d.matched_quantity / d.required_quantity) * 100)
        : 0,
  })) ?? []
}

// ─────────────────────────────────────────────────────────────────
// Helper: build result object
// ─────────────────────────────────────────────────────────────────
function buildResult(
  demand: InstitutionalDemand,
  requiredQty: number,
  matches: AggregationMatch[],
  totalMatched = 0
): AggregationResult {
  const pct = requiredQty > 0 ? Math.round((totalMatched / requiredQty) * 100) : 0
  const totalCost = matches.reduce(
    (sum, m) => sum + m.allocated_quantity * 1000 * m.agreed_price_per_kg, // MT → kg
    0
  )

  return {
    demand_id: demand.id,
    crop_type: demand.crop_type,
    required_quantity: requiredQty,
    total_matched: totalMatched,
    fulfillment_percentage: pct,
    status: totalMatched === 0 ? 'unmatched' : pct >= 100 ? 'fully_matched' : 'partially_matched',
    matches,
    total_cost_estimate: parseFloat(totalCost.toFixed(2)),
  }
}
