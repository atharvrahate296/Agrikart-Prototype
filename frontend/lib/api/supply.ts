import { supabase } from '@/lib/supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

async function getHeaders() {
  const session = (await supabase.auth.getSession()).data.session
  return {
    'Authorization': session ? `Bearer ${session.access_token}` : '',
    'Content-Type': 'application/json',
  }
}

export interface CommitSupplyPayload {
  fpo_profile_id: string
  demand_id: string
  crop_type: string
  variety?: string
  available_quantity: number
  price_per_kg: number
  quality_grade?: string
  latitude: number
  longitude: number
  location_name?: string
}

export const getAvailableDemands = async (params?: { crop_type?: string }) => {
  const headers = await getHeaders()
  const searchParams = new URLSearchParams()
  if (params?.crop_type) searchParams.set('crop_type', params.crop_type)

  const res = await fetch(`${API_URL}/api/supply/available-demands?${searchParams}`, { headers })
  if (!res.ok) throw new Error('Failed to fetch available demands')
  return (await res.json())
}

export const commitSupply = async (payload: CommitSupplyPayload) => {
  const headers = await getHeaders()
  const res = await fetch(`${API_URL}/api/supply/commit`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error((await res.json()).error?.message || 'Failed to commit supply')
  return (await res.json()).data
}

export const getMyCommitments = async (farmerId: string) => {
  const headers = await getHeaders()
  const res = await fetch(`${API_URL}/api/supply/my-commitments?farmer_id=${farmerId}`, { headers })
  if (!res.ok) throw new Error('Failed to fetch commitments')
  return (await res.json()).data
}

export const getYields = async (params?: { crop_type?: string }) => {
  const headers = await getHeaders()
  const searchParams = new URLSearchParams()
  if (params?.crop_type) searchParams.set('crop_type', params.crop_type)

  const res = await fetch(`${API_URL}/api/supply/yields?${searchParams}`, { headers })
  if (!res.ok) throw new Error('Failed to fetch yields')
  return (await res.json())
}
