/**
 * Micro-Logistics Route Optimization Service
 * ─────────────────────────────────────────────────────────────────
 * Computes the most efficient pickup path for a single transport
 * truck visiting multiple FPO collection points.
 *
 * Algorithm: Nearest-Neighbor TSP heuristic (O(n²), practical up
 * to ~200 stops). Zero external API dependencies — uses Haversine
 * distances. Swap `distanceKm` for an OSRM/Mapbox call to get
 * real road distances without changing the optimizer logic.
 *
 * Output includes:
 *   - Ordered waypoints
 *   - Total distance (km)
 *   - Estimated transit time (hours, assuming avg 40 km/h)
 *   - Estimated fuel cost (INR, assuming 12 km/l diesel @ ₹95/l)
 *   - Potential savings vs. individual trips
 */

// ─────────────────────────────────────────────────────────────────
// Constants — override via env vars if needed
// ─────────────────────────────────────────────────────────────────
const AVG_SPEED_KMH = parseFloat(process.env.LOGISTICS_SPEED_KMH ?? '40')
const FUEL_EFFICIENCY_KML = parseFloat(process.env.LOGISTICS_FUEL_KML ?? '12')  // km per litre
const DIESEL_PRICE_INR = parseFloat(process.env.LOGISTICS_DIESEL_INR ?? '95')   // ₹ per litre
const EARTH_RADIUS_KM = 6371

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
export interface Location {
  id: string
  name: string
  latitude: number
  longitude: number
  /** Optional: quantity to load at this stop (metric tonnes) */
  quantity?: number
  /** Optional: contact person at pickup */
  contact?: string
}

export interface Waypoint extends Location {
  sequence: number
  distanceFromPrev: number     // km
  cumulativeDistance: number   // km
  estimatedArrival: string     // ISO time offset (e.g. "+1h 20m")
}

export interface OptimizedRoute {
  depot: Location
  waypoints: Waypoint[]
  totalDistanceKm: number
  totalDistanceWithReturn: number   // round-trip distance
  estimatedTimeHours: number
  estimatedFuelCostINR: number
  totalQuantityTonnes: number
  savingsVsIndividual: {
    distanceKm: number
    fuelCostINR: number
    percentageSaved: number
  }
  summary: string
}

// ─────────────────────────────────────────────────────────────────
// Haversine straight-line distance (km)
// Replace this function body with an OSRM/Mapbox API call
// to use real road distances.
// ─────────────────────────────────────────────────────────────────
export function distanceKm(a: Location, b: Location): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.latitude - a.latitude)
  const dLon = toRad(b.longitude - a.longitude)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

// ─────────────────────────────────────────────────────────────────
// Nearest-Neighbor TSP heuristic
// ─────────────────────────────────────────────────────────────────
function nearestNeighborTSP(depot: Location, stops: Location[]): Location[] {
  if (stops.length === 0) return []
  if (stops.length === 1) return [stops[0]]

  const unvisited = [...stops]
  const route: Location[] = []
  let current: Location = depot

  while (unvisited.length > 0) {
    let nearestIdx = 0
    let nearestDist = Infinity

    for (let i = 0; i < unvisited.length; i++) {
      const d = distanceKm(current, unvisited[i])
      if (d < nearestDist) {
        nearestDist = d
        nearestIdx = i
      }
    }

    route.push(unvisited[nearestIdx])
    current = unvisited[nearestIdx]
    unvisited.splice(nearestIdx, 1)
  }

  return route
}

// ─────────────────────────────────────────────────────────────────
// Main optimizer
// ─────────────────────────────────────────────────────────────────
export function optimizeRoute(fpoLocations: Location[], depot: Location): OptimizedRoute {
  if (fpoLocations.length === 0) {
    throw new Error('At least one FPO location is required')
  }

  // ── Compute optimized visit order ────────────────────────────
  const orderedStops = nearestNeighborTSP(depot, fpoLocations)

  // ── Build waypoints with cumulative stats ────────────────────
  const waypoints: Waypoint[] = []
  let cumulativeKm = 0
  let cumulativeMinutes = 0
  let prev: Location = depot

  for (let i = 0; i < orderedStops.length; i++) {
    const stop = orderedStops[i]
    const segmentKm = distanceKm(prev, stop)
    const segmentMin = (segmentKm / AVG_SPEED_KMH) * 60

    cumulativeKm += segmentKm
    cumulativeMinutes += segmentMin

    const hours = Math.floor(cumulativeMinutes / 60)
    const mins = Math.round(cumulativeMinutes % 60)
    const arrivalLabel = hours > 0 ? `+${hours}h ${mins}m` : `+${mins}m`

    waypoints.push({
      ...stop,
      sequence: i + 1,
      distanceFromPrev: parseFloat(segmentKm.toFixed(2)),
      cumulativeDistance: parseFloat(cumulativeKm.toFixed(2)),
      estimatedArrival: arrivalLabel,
    })

    prev = stop
  }

  // Return leg to depot
  const returnKm = distanceKm(prev, depot)
  const totalWithReturn = cumulativeKm + returnKm

  // ── Fuel & time estimates ────────────────────────────────────
  const totalTimeHours = parseFloat((totalWithReturn / AVG_SPEED_KMH).toFixed(2))
  const fuelCost = parseFloat(
    ((totalWithReturn / FUEL_EFFICIENCY_KML) * DIESEL_PRICE_INR).toFixed(2)
  )

  // ── Savings vs. individual trips ─────────────────────────────
  const individualTotalKm = fpoLocations.reduce(
    (sum, loc) => sum + distanceKm(depot, loc) * 2, // round-trip per FPO
    0
  )
  const individualFuelCost = parseFloat(
    ((individualTotalKm / FUEL_EFFICIENCY_KML) * DIESEL_PRICE_INR).toFixed(2)
  )
  const savedKm = parseFloat((individualTotalKm - totalWithReturn).toFixed(2))
  const savedFuel = parseFloat((individualFuelCost - fuelCost).toFixed(2))
  const savedPct = parseFloat(((savedKm / individualTotalKm) * 100).toFixed(1))

  const totalQty = fpoLocations.reduce((sum, loc) => sum + (loc.quantity ?? 0), 0)

  return {
    depot,
    waypoints,
    totalDistanceKm: parseFloat(cumulativeKm.toFixed(2)),
    totalDistanceWithReturn: parseFloat(totalWithReturn.toFixed(2)),
    estimatedTimeHours: totalTimeHours,
    estimatedFuelCostINR: fuelCost,
    totalQuantityTonnes: parseFloat(totalQty.toFixed(2)),
    savingsVsIndividual: {
      distanceKm: Math.max(0, savedKm),
      fuelCostINR: Math.max(0, savedFuel),
      percentageSaved: Math.max(0, savedPct),
    },
    summary: `${orderedStops.length} stops · ${totalWithReturn.toFixed(1)} km round-trip · ₹${fuelCost.toLocaleString('en-IN')} fuel · saves ${Math.max(0, savedPct)}% vs individual trips`,
  }
}
