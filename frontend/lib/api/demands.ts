import apiClient from '../api-client'

export interface CreateDemandPayload {
  buyer_profile_id: string
  crop_type: string
  required_quantity: number
  max_price_per_kg: number
  min_quality_grade?: string
  required_by: string
  latitude: number
  longitude: number
  delivery_address?: string
}

export const createDemand = async (payload: CreateDemandPayload) => {
  const { data } = await apiClient.post('/api/demands', payload)
  return data.data
}

export const getDemands = async (params?: { status?: string; crop_type?: string; buyer_id?: string }) => {
  const { data } = await apiClient.get('/api/demands', { params })
  return data
}

export const getDemandById = async (id: string) => {
  const { data } = await apiClient.get(`/api/demands/${id}`)
  return data.data
}

export const matchDemand = async (id: string) => {
  const { data } = await apiClient.post(`/api/demands/${id}/match`)
  return data.data
}

export const confirmDemand = async (id: string) => {
  const { data } = await apiClient.post(`/api/demands/${id}/confirm`)
  return data.data
}
