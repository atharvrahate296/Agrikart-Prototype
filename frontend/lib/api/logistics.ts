const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export interface OptimizeRoutePayload {
  depot: { id: string; name: string; latitude: number; longitude: number }
  fpo_locations: Array<{ id: string; name: string; latitude: number; longitude: number; quantity?: number }>
}

export const optimizeRoute = async (payload: OptimizeRoutePayload) => {
  const res = await fetch(`${API_URL}/api/logistics/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error((await res.json()).error?.message || 'Route optimization failed')
  return (await res.json()).data
}

export const getDistanceEstimate = async (from: { lat: number; lon: number }, to: { lat: number; lon: number }) => {
  const params = new URLSearchParams({
    from_lat: from.lat.toString(),
    from_lon: from.lon.toString(),
    to_lat: to.lat.toString(),
    to_lon: to.lon.toString(),
  })
  const res = await fetch(`${API_URL}/api/logistics/estimate?${params}`)
  if (!res.ok) throw new Error('Distance estimate failed')
  return (await res.json()).data
}
