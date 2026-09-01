'use client'

import { useDemoRole, useDemoData } from '@/components/lib/demo-role-context'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  IndianRupee,
  CheckCircle2,
  Clock,
  AlertCircle,
  Shield,
  Truck,
  Folder,
  Calendar,
  Users,
  ShieldX,
  ArrowLeft,
  Package
} from 'lucide-react'
import { motion } from 'framer-motion'

export default function OrdersPage() {
  const { user, switchRole } = useDemoRole()
  const data = useDemoData()

  const role = user?.role
  const isFarmer = role === 'farmer' || role === 'fpo_agent'
  const isBuyer = role === 'bulk_buyer' || role === 'admin'
  const isAdmin = role === 'admin'

  const orders = data?.orders || []
  const settlements = data?.settlements || []
  const logistics = data?.logistics || []

  return (
    <div className="min-h-screen bg-gray-50/50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row mb-8">
          <div className="flex-1">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                {isFarmer ? 'My Orders' : isBuyer ? 'Order Status' : 'All Orders'}
              </h1>
              <p className="text-gray-500 text-lg mt-2">
                {isFarmer ? 'Track your commitments and settlements' : isBuyer ? 'Monitor order progress and delivery' : 'Full order management'}
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

        {/* Orders Summary */}
        <div className="grid lg:grid-cols-2 gap-6 mb-12">
          {/* Farmer Orders */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Truck size={20} className="text-emerald-500" />
              <div>
                <h2 className="font-black text-gray-900 uppercase tracking-widest text-sm mb-2">Your Orders</h2>
                <p className="text-gray-500 text-sm">{orders.filter((o: any) => o.status.includes('farmer') || o.farmer_id).length} active</p>
              </div>
            </div>
            {orders.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Package size={48} className="mx-auto mb-3 text-gray-300" /> No orders yet
              </div>
            ) : (
              <div className="space-y-3">
                {orders.slice(0, 4).map((o: any, i: number) => (
                  <motion.div
                    key={o.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-sm font-bold text-gray-400">
                        {i + 1}
                      </div>
      <div>
        <p className="font-medium text-gray-900">{o.crop_type || 'Tomato'}</p>
        <p className="text-xs text-gray-400">Qty: {o.quantity} MT · Status: {o.status}</p>
      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Buyer/Admin Orders */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <IndianRupee size={20} className="text-purple-500" />
              <div>
                <h2 className="font-black text-gray-900 uppercase tracking-widest text-sm mb-2">Order Status</h2>
                <p className="text-gray-500 text-sm">{settlements.length} settlements</p>
              </div>
            </div>
            {settlements.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Package size={48} className="mx-auto mb-3 text-gray-300" /> No settlements yet
              </div>
            ) : (
              <div className="space-y-3">
                {settlements.slice(0, 4).map((s: any, i: number) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <IndianRupee size={20} className="text-purple-500" />
      <div>
        <p className="font-medium text-gray-900">{s.crop_type || 'Tomato'}</p>
        <p className="text-xs text-gray-400">₹{s.total_amount.toLocaleString()} · {s.status}</p>
      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Logistics & Delivery Timeline */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-12">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock size={20} className="text-amber-500" />
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Delivery Timeline</h2>
            </div>
            <span className="text-sm text-gray-500">Track delivery progress</span>
          </div>
          <div className="p-6">
            {logistics.length === 0 ? (
              <div className="h-64 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                <Package size={48} className="mx-auto mb-2 text-gray-300" /> No deliveries in transit
              </div>
            ) : (
              <div className="space-y-4">
                {logistics.slice(0, 3).map((l: any, i: number) => (
                  <motion.div
                    key={l.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-6 p-4 rounded-xl border border-amber-100 hover:bg-amber-50 transition-all"
                  >
                    <div className="w-16 h-16 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600 text-sm font-bold">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{l.route || 'Route planned'}</p>
                      <p className="text-xs text-gray-400">Distance: {l.distance_km} km · ETA: {l.estimated_time}</p>
                    </div>
                    <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center text-amber-400 text-sm font-bold">
                      {l.status === 'delivered' ? '✓' : l.status === 'in-transit' ? '→' : '⏳'}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Exception Alerts */}
        {isAdmin && (
          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle size={20} className="text-red-500" />
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Exception Alerts</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                <AlertCircle size={20} className="text-red-500 mr-2" /> <span className="text-gray-600">Delayed: 2 shipments (3+ days)</span>
                <ShieldX size={20} className="text-amber-500 mr-2" /> <span className="text-gray-600">Quality flag: 1 batch</span>
                <Truck size={20} className="text-amber-500 mr-2" /> <span className="text-gray-600">Route recalculation needed</span>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}