'use client'

import { useDemoRole, useDemoData } from '@/components/lib/demo-role-context'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Truck, 
  MapPin, 
  Route, 
  Calendar,
  Leaf,
  IndianRupee,
  Loader2,
  BarChart2,
  AlertCircle,
  Folder,
  Users,
  ShieldCheck,
  ArrowLeft,
  Package
} from 'lucide-react'
import { motion } from 'framer-motion'

export default function LogisticsPage() {
  const { user, switchRole } = useDemoRole()
  const data = useDemoData()
  const router = useRouter()

  const role = user?.role
  const isFarmer = role === 'farmer' || role === 'fpo_agent'
  const isBuyer = role === 'bulk_buyer' || role === 'admin'
  const isAdmin = role === 'admin'

  const forecasts = data?.forecasts || []
  const logistics = data?.logistics || []
  const supplies = data?.supplies || []
  const demands = data?.demands || []

  return (
    <div className="min-h-screen bg-gray-50/50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row mb-8">
          <div className="flex-1">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                {isFarmer ? 'Logistics & Routes' : isBuyer ? 'Shipment Tracking' : 'Fleet Management'}
              </h1>
              <p className="text-gray-500 text-lg mt-2">
                {isFarmer ? 'Track shipments and plan pickups' : isBuyer ? 'Monitor delivery progress' : 'Optimize fleet operations'}
              </p>
            </motion.div>
          </div>
          <div className="md:ml-6 flex items-center gap-3">
            <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all active:scale-95">
              <ArrowLeft size={16} /> Back
            </Link>
            <Link href="/auth/choose-role" className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all">
              Switch Role
            </Link>
          </div>
        </div>

        {/* AI Demand Forecast Section */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm mb-8 overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Loader2 size={20} className="text-amber-500" />
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">AI Demand Forecast</h2>
            </div>
          </div>
          <div className="p-6">
            {forecasts.length === 0 ? (
              <div className="h-64 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                <Package size={48} className="mx-auto mb-2 text-gray-300" /> No forecasts yet
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                {forecasts.slice(0, 3).map((f: any, i: number) => (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-4 rounded-xl border border-amber-100 hover:bg-amber-50 transition-all"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <BarChart2 size={20} className="text-amber-500" />
      <div>
        <p className="font-medium text-gray-900">{f.crop_type || 'Tomato'}</p>
        <p className="text-xs text-gray-400">Predicted: {f.predicted_demand} MT · Expected: {f.expected_demand} MT</p>
      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-2xl font-bold text-amber-600">{f.suggested_route?.split('→').length - 1 || 0} stops</div>
                        <div className="text-xs text-gray-400">Stops</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-amber-600">{f.distance_km} km</div>
                        <div className="text-xs text-gray-400">Distance</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-amber-600">{f.eta_hours} h</div>
                        <div className="text-xs text-gray-400">ETA</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-amber-600">{f.consolidation_benefit}</div>
                        <div className="text-xs text-gray-400">Consolidation</div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-amber-100">
                      <div className="flex items-center gap-2 text-amber-600">
                        <IndianRupee size={14} /> <span>₹{f.estimated_logistics_saving} saving</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Route Visualization */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm mb-8 overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin size={20} className="text-emerald-500" />
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Route Planning</h2>
            </div>
            <span className="text-sm text-gray-500">Farmer A & Farmer B → FPO → Buyer</span>
          </div>
          <div className="p-6">
            {logistics.length === 0 && demands.length > 0 && supplies.length > 0 ? (
              <div className="h-96 bg-gray-50 rounded-xl flex flex-col items-center justify-center text-gray-400">
                <Package size={48} className="mx-auto mb-2 text-gray-300" /> No routes planned yet
                <p className="text-sm">Create a demand and offer supply to generate route optimization</p>
              </div>
            ) : (
              <div className="space-y-4">
                {logistics.slice(0, 3).map((l: any, i: number) => (
                  <motion.div
                    key={l.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-6 p-4 rounded-xl border border-emerald-100 hover:bg-emerald-50 transition-all"
                  >
                    <div className="w-16 h-16 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 text-sm font-bold">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{l.route || 'Nashik → Pune via NH48'}</p>
      <p className="text-xs text-gray-400 truncate">Distance: {l.distance_km} km · ETA: {l.estimated_time}</p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-400 text-sm font-bold">
                      {l.status}
                    </div>
                  </motion.div>
                ))}
                <div className="pt-3 border-t border-emerald-100">
                  <button
                    className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg"
                  >
                    <Truck size={16} /> Optimize Routes
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Supply-Demand Matching Overview */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Folder size={20} className="text-amber-500" />
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Matching Overview</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-2xl font-bold text-emerald-600">{supplies.length}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Supply Points</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-2xl font-bold text-emerald-600">{demands.length}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Active Demands</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-2xl font-bold text-emerald-600">{logistics.length}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Routes Optimized</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-2xl font-bold text-emerald-600">{forecasts.length}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Forecasts Generated</div>
              </div>
            </div>
            <div className="space-y-3">
              {supplies.length > 0 && demands.length > 0 ? (
                <button
                  className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg"
                >
                  <Leaf size={16} /> Auto-Match Supply & Demand
                </button>
              ) : (
                <p className="text-gray-500 text-sm">Create demands and offer supply to enable matching</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}