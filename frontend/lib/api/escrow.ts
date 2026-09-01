import { supabase } from '@/lib/supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

async function getHeaders() {
  const session = (await supabase.auth.getSession()).data.session
  return {
    'Authorization': session ? `Bearer ${session.access_token}` : '',
    'Content-Type': 'application/json',
  }
}

export const depositEscrow = async (demand_id: string, buyer_id: string, total_amount: number) => {
  const headers = await getHeaders()
  const res = await fetch(`${API_URL}/api/escrow/deposit`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ demand_id, buyer_id, total_amount }),
  })
  if (!res.ok) throw new Error('Failed to deposit escrow')
  return (await res.json()).data
}

export const getEscrowStatus = async (demandId: string) => {
  const headers = await getHeaders()
  const res = await fetch(`${API_URL}/api/escrow/${demandId}`, { headers })
  if (!res.ok) throw new Error('Failed to fetch escrow status')
  return (await res.json()).data
}

export const verifyDelivery = async (demand_id: string, verified_by: string, notes?: string) => {
  const headers = await getHeaders()
  const res = await fetch(`${API_URL}/api/escrow/verify-delivery`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ demand_id, verified_by, verification_notes: notes }),
  })
  if (!res.ok) throw new Error('Failed to verify delivery')
  return (await res.json()).data
}

export const releasePayment = async (demand_id: string, farmer_payouts?: any[]) => {
  const headers = await getHeaders()
  const res = await fetch(`${API_URL}/api/escrow/release`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ demand_id, farmer_payouts }),
  })
  if (!res.ok) throw new Error('Failed to release payment')
  return (await res.json()).data
}
