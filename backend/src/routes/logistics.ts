import { Router, Request, Response, NextFunction } from 'express'
import { optimizeRoute, distanceKm, Location } from '../services/marketplace/logisticsService.js'

const router = Router()

router.post('/optimize', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { depot, fpo_locations } = req.body
    if (!depot || !fpo_locations) {
      return res.status(400).json({ error: { message: "'depot' and 'fpo_locations' are required", code: 'MISSING_FIELDS' } })
    }
    if (!Array.isArray(fpo_locations) || fpo_locations.length === 0) {
      return res.status(400).json({ error: { message: "'fpo_locations' must be a non-empty array", code: 'INVALID_INPUT' } })
    }
    if (fpo_locations.length > 200) {
      return res.status(400).json({ error: { message: 'Maximum 200 FPO locations per request', code: 'LIMIT_EXCEEDED' } })
    }
    const invalid = fpo_locations.filter(l => l.latitude == null || l.longitude == null || !l.id)
    if (invalid.length > 0) {
      return res.status(400).json({ error: { message: 'Each stop must have id, latitude, and longitude', code: 'INVALID_LOCATION' } })
    }
    res.json({ success: true, data: optimizeRoute(fpo_locations as Location[], depot as Location) })
  } catch (error) {
    next(error)
  }
})

router.get('/estimate', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from_lat, from_lon, to_lat, to_lon } = req.query
    if (!from_lat || !from_lon || !to_lat || !to_lon) {
      return res.status(400).json({ error: { message: 'from_lat, from_lon, to_lat, to_lon are required', code: 'MISSING_PARAMS' } })
    }
    const from: Location = { id: 'from', name: 'Origin', latitude: parseFloat(from_lat as string), longitude: parseFloat(from_lon as string) }
    const to: Location = { id: 'to', name: 'Destination', latitude: parseFloat(to_lat as string), longitude: parseFloat(to_lon as string) }
    const DIESEL_PRICE = parseFloat(process.env.LOGISTICS_DIESEL_INR || '95')
    const FUEL_KML = parseFloat(process.env.LOGISTICS_FUEL_KML || '12')
    const SPEED_KMH = parseFloat(process.env.LOGISTICS_SPEED_KMH || '40')

    const km = parseFloat(distanceKm(from, to).toFixed(2))
    const roundTripKm = km * 2
    res.json({
      success: true,
      data: {
        one_way_km: km,
        round_trip_km: roundTripKm,
        estimated_time_hours: parseFloat((roundTripKm / SPEED_KMH).toFixed(2)),
        estimated_fuel_cost_inr: parseFloat(((roundTripKm / FUEL_KML) * DIESEL_PRICE).toFixed(2)),
        assumptions: { avg_speed_kmh: SPEED_KMH, fuel_efficiency_kml: FUEL_KML, diesel_price_inr_per_litre: DIESEL_PRICE },
      },
    })
  } catch (error) {
    next(error)
  }
})

export default router
