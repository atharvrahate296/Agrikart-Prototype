'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

// Define user role type
type UserRole = 'farmer' | 'fpo_agent' | 'bulk_buyer' | 'consumer' | 'admin'

export interface DemoUser {
  id: string
  full_name: string
  email: string
  role: UserRole
  location?: string
  phone?: string
  bio?: string
  created_at?: string
  verified?: boolean
}

export interface DemoDataStore {
  demands: any[]
  supplies: any[]
  matched: any[]
  orders: any[]
  logistics: any[]
  settlements: any[]
  forecasts: any[]
}

// Context value type
type DemoContextValue = {
  user: DemoUser
  data: DemoDataStore
  setUser: (user: DemoUser) => void
  setData: (data: DemoDataStore) => void
  switchRole: (role: UserRole) => void
  resetDemo: () => void
  updateDemand: (id: string, partial: Partial<any>) => void
  updateSupply: (id: string, partial: Partial<any>) => void
  updateMatched: (id: string, partial: Partial<any>) => void
  updateOrder: (id: string, partial: Partial<any>) => void
  updateLogistics: (id: string, partial: Partial<any>) => void
  updateSettlement: (id: string, partial: Partial<any>) => void
  updateForecast: (id: string, partial: Partial<any>) => void
}

// Create context
const DemoRoleContext = createContext<DemoContextValue | null>(null)

export { DemoRoleContext }

export function useDemoRole() {
  const ctx = useContext(DemoRoleContext)
  if (!ctx) {
    throw new Error('useDemoRole must be used within DemoRoleProvider')
  }
  return ctx
}

export function useDemoData() {
  const ctx = useContext(DemoRoleContext)
  if (!ctx) {
    throw new Error('useDemoData must be used within DemoRoleProvider')
  }
  return ctx.data
}

export function useDemoUpdates() {
  const ctx = useContext(DemoRoleContext)
  if (!ctx) {
    throw new Error('useDemoUpdates must be used within DemoRoleProvider')
  }
  return ctx
}

export function DemoRoleProvider({ children }: { children: ReactNode }) {
  // User state
  const [user, setUser] = useState<DemoUser>({
    id: 'demo-user-' + Date.now(),
    full_name: '',
    email: 'demo@agrikart.example',
    role: 'farmer',
  })

  // Data state
  const [data, setData] = useState<DemoDataStore>({
    demands: [],
    supplies: [],
    matched: [],
    orders: [],
    logistics: [],
    settlements: [],
    forecasts: [],
  })

  // Initialize demo data when role changes
  useEffect(() => {
    initDemoData(user.role)
  }, [user.role])

  const initDemoData = async (role: UserRole) => {
    try {
      // Fetch user profile from Supabase based on role
      const { data: usersData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('role', role)
        .limit(1)
        
      if (usersData && usersData.length > 0) {
        setUser(prev => ({
          ...prev,
          id: usersData[0].id,
          full_name: usersData[0].full_name,
          email: usersData[0].email,
          role: usersData[0].role as UserRole,
          location: usersData[0].location,
          verified: usersData[0].verified
        }))
      }

      // Fetch products and map to supplies
      const { data: products } = await supabase.from('products').select('*')
      const mappedSupplies = (products || []).map(p => ({
        id: p.id,
        vendor_id: p.vendor_id,
        crop_type: p.name,
        variety: p.category,
        available_quantity: p.stock_quantity > 0 ? p.stock_quantity : p.quantity_in_stock,
        price_per_kg: p.price,
        unit: p.unit || 'kg',
        quality_grade: p.quality_grade || 'A',
        location_name: p.location_name || 'Database',
      }))

      // Fetch orders
      const { data: orders } = await supabase.from('orders').select('*')

      // Fetch other data
      const { data: demands, error: dErr } = await supabase.from('demands').select('*')
      if (dErr) console.error('Demands fetch error:', dErr)

      const { data: logistics } = await supabase.from('logistics').select('*')
      const { data: settlements } = await supabase.from('settlements').select('*')
      const { data: forecasts } = await supabase.from('forecasts').select('*')
      const { data: matched } = await supabase.from('matched').select('*')

      setData({
        demands: demands || [],
        supplies: mappedSupplies,
        matched: matched || [],
        orders: orders || [],
        logistics: logistics || [],
        settlements: settlements || [],
        forecasts: forecasts || [],
      })
    } catch (error) {
      console.error('Error fetching authentic data from Supabase:', error)
    }
  }

  // Switch role
  const switchRole = (role: UserRole) => {
    const roleNames: Record<UserRole, string> = {
      farmer: 'Farmer / FPO',
      fpo_agent: 'FPO / Aggregator',
      bulk_buyer: 'Bulk Buyer',
      consumer: 'Consumer',
      admin: 'Admin / Operations',
    }
    setUser(prev => ({
      ...prev,
      role,
      full_name: roleNames[role],
    }))
    initDemoData(role)
  }

  // Reset demo
  const resetDemo = () => {
    setUser({
      id: 'demo-user-' + Date.now(),
      full_name: '',
      email: 'demo@agrikart.example',
      role: 'farmer',
    })
    setData({
      demands: [],
      supplies: [],
      matched: [],
      orders: [],
      logistics: [],
      settlements: [],
      forecasts: [],
    })
  }

  // Update demand
  const updateDemand = (id: string, partial: Partial<any>) => {
    setData(prev => ({
      ...prev,
      demands: prev.demands.map(d => (d.id as string) === id ? { ...d, ...partial } : d),
    }))
  }

  // Update supply
  const updateSupply = (id: string, partial: Partial<any>) => {
    setData(prev => ({
      ...prev,
      supplies: prev.supplies.map(s => (s.id as string) === id ? { ...s, ...partial } : s),
    }))
  }

  // Update matched
  const updateMatched = (id: string, partial: Partial<any>) => {
    setData(prev => ({
      ...prev,
      matched: prev.matched.map(m => (m.id as string) === id ? { ...m, ...partial } : m),
    }))
  }

  // Update order
  const updateOrder = (id: string, partial: Partial<any>) => {
    setData(prev => ({
      ...prev,
      orders: prev.orders.map(o => (o.id as string) === id ? { ...o, ...partial } : o),
    }))
  }

  // Update logistics
  const updateLogistics = (id: string, partial: Partial<any>) => {
    setData(prev => ({
      ...prev,
      logistics: prev.logistics.map(l => (l.id as string) === id ? { ...l, ...partial } : l),
    }))
  }

  // Update settlement
  const updateSettlement = (id: string, partial: Partial<any>) => {
    setData(prev => ({
      ...prev,
      settlements: prev.settlements.map(s => (s.id as string) === id ? { ...s, ...partial } : s),
    }))
  }

  // Update forecast
  const updateForecast = (id: string, partial: Partial<any>) => {
    setData(prev => ({
      ...prev,
      forecasts: prev.forecasts.map(f => (f.id as string) === id ? { ...f, ...partial } : f),
    }))
  }

  return (
    <DemoRoleContext.Provider value={{
      user,
      data,
      setUser,
      setData,
      switchRole,
      resetDemo,
      updateDemand,
      updateSupply,
      updateMatched,
      updateOrder,
      updateLogistics,
      updateSettlement,
      updateForecast,
    }}>
      {children}
    </DemoRoleContext.Provider>
  )
}