'use client'

import { useState } from 'react'
import { useDemoRole, useDemoUpdates } from '@/components/lib/demo-role-context'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiArrowLeft, FiSend } from 'react-icons/fi'
import { motion } from 'framer-motion'

const CROP_OPTIONS = [
  'wheat', 'rice', 'tomato', 'onion', 'potato', 'soybean',
  'maize', 'cotton', 'sugarcane', 'mango', 'banana', 'chickpea',
]

const QUALITY_GRADES = ['A+', 'A', 'B', 'C']

export default function CreateDemandPage() {
  const { user } = useDemoRole()
  const { updateDemand } = useDemoUpdates()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    crop_type: '',
    required_quantity: '',
    max_price_per_kg: '',
    min_quality_grade: 'B',
    required_by: '',
    latitude: '',
    longitude: '',
    delivery_address: '',
  })

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setError('')
    setLoading(true)

    try {
      const latitude = parseFloat(form.latitude) || 19.0761
      const longitude = parseFloat(form.longitude) || 72.8777
      
      const newDemand = {
        id: 'demo-demand-' + Date.now(),
        buyer_profile_id: user.id,
        crop_type: form.crop_type,
        required_quantity: parseFloat(form.required_quantity),
        max_price_per_kg: parseFloat(form.max_price_per_kg),
        min_quality_grade: form.min_quality_grade,
        required_by: form.required_by,
        latitude,
        longitude,
        delivery_address: form.delivery_address,
        status: 'open',
        created_at: new Date().toISOString(),
      }

      // Add the new demand to demo data
      updateDemand(newDemand.id, {
        ...newDemand,
        fulfillment_percentage: 0,
        matched_quantity: 0,
      })

      setSuccess(true)
      setTimeout(() => router.push('/demands'), 1500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl border border-gray-100 shadow-sm p-10 max-w-md">
          <div className="text-5xl mb-3">✅</div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Demand Created!</h2>
          <p className="text-gray-500 text-sm mb-4">The platform will now match nearby FPOs with the right crop and quality.</p>
          <p className="text-xs text-gray-400">Redirecting to demands board...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Link href="/demands" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-green-600 mb-4 transition-colors">
          <FiArrowLeft size={14} /> Back to Demands
        </Link>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Create Demand</h1>
            <p className="text-gray-500 text-sm mt-1">
              Specify what you need — crop type, quantity, quality grade, and delivery deadline. The platform will automatically find matching FPOs nearby.
            </p>
          </div>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Crop Details */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2">
              <span className="text-lg">🌾</span> Crop Requirements
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Crop Type *</label>
                <select
                  value={form.crop_type}
                  onChange={e => update('crop_type', e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                >
                  <option value="">Select crop</option>
                  {CROP_OPTIONS.map(c => (
                    <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Quantity (Metric Tonnes) *</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={form.required_quantity}
                  onChange={e => update('required_quantity', e.target.value)}
                  required
                  placeholder="e.g. 10"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Max Price (₹/kg) *</label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={form.max_price_per_kg}
                  onChange={e => update('max_price_per_kg', e.target.value)}
                  required
                  placeholder="e.g. 45"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Min Quality Grade *</label>
                <select
                  value={form.min_quality_grade}
                  onChange={e => update('min_quality_grade', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                >
                  {QUALITY_GRADES.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Delivery */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-2">
              <span className="text-lg">📦</span> Delivery Details
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Required By Date *</label>
                <input
                  type="date"
                  value={form.required_by}
                  onChange={e => update('required_by', e.target.value)}
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Delivery Address</label>
                <input
                  type="text"
                  value={form.delivery_address}
                  onChange={e => update('delivery_address', e.target.value)}
                  placeholder="e.g. APMC Market Yard, Pune"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={form.latitude}
                    onChange={e => update('latitude', e.target.value)}
                    placeholder="e.g. 18.5204"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={form.longitude}
                    onChange={e => update('longitude', e.target.value)}
                    placeholder="e.g. 73.8567"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3.5 rounded-xl font-bold text-base hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 active:scale-[0.98] shadow-md shadow-green-600/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating Demand...
              </>
            ) : (
              <>
                <FiSend size={16} /> Submit Demand
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}