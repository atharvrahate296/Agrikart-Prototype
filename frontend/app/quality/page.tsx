'use client'

import { useDemoRole, useDemoData } from '@/components/lib/demo-role-context'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  CheckCircle2, 
  Shield,
  Microscope,
  Leaf,
  TrendingUp,
  Loader2,
  AlertCircle,
  Clipboard,
  Calendar,
  Users,
  Folder,
  Image,
  Loader,
  Palette,
  ArrowLeft,
  ShieldCheck
} from 'lucide-react'
import { motion } from 'framer-motion'

export default function QualityPage() {
  const { user, switchRole } = useDemoRole()
  const data = useDemoData()
  const router = useRouter()

  const role = user?.role
  const isFarmer = role === 'farmer' || role === 'fpo_agent'
  const isBuyer = role === 'bulk_buyer' || role === 'admin'
  const isAdmin = role === 'admin'

  const supplies = data?.supplies || []
  const demands = data?.demands || []
  const matched = data?.matched || []
  const settlements = data?.settlements || []

  return (
    <div className="min-h-screen bg-gray-50/50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row mb-8">
          <div className="flex-1">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                {isFarmer ? 'Quality Verification' : 'Quality Management'}
              </h1>
              <p className="text-gray-500 text-lg mt-2">
                {isFarmer ? 'Verify crop quality before delivery' : 'Monitor quality across all shipments'}
              </p>
            </motion.div>
          </div>
          <div className="md:ml-6 flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all active:scale-95"
            >
              <ArrowLeft size={16} /> Back
            </Link>
            <button
              onClick={() => switchRole(isFarmer ? 'bulk_buyer' : 'farmer')}
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all"
            >
              <Microscope size={16} /> Switch Role
            </button>
          </div>
        </div>

        {/* Quality Overview Section */}
        <div className="grid lg:grid-cols-2 gap-6 mb-12">
          {/* Farmer/FPO Supplies */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Leaf size={20} className="text-emerald-500" />
              <div>
                <h2 className="font-black text-gray-900 uppercase tracking-widest text-sm mb-2">Your Supply</h2>
                <p className="text-gray-500 text-sm">{supplies.length} commodity</p>
              </div>
            </div>
            {supplies.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Image size={48} className="mx-auto mb-3" /> No supplies to verify
              </div>
            ) : (
              <div className="space-y-3">
                {supplies.slice(0, 3).map((s: any, i: number) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-3 rounded-xl border border-emerald-100 hover:bg-emerald-50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 text-sm font-bold">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{s.crop_type}</p>
                        <p className="text-xs text-gray-400">Qty: {s.available_quantity} MT · Grade: {s.quality_grade}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Matched Pairs */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 size={20} className="text-emerald-500" />
              <div>
                <h2 className="font-black text-gray-900 uppercase tracking-widest text-sm mb-2">Matched Pairs</h2>
                <p className="text-gray-500 text-sm">{matched.length} demand-supply matches</p>
              </div>
            </div>
            {matched.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Image size={48} className="mx-auto mb-3" /> No matches yet
              </div>
            ) : (
              <div className="space-y-3">
                {matched.slice(0, 3).map((m: any, i: number) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-3 rounded-xl border border-emerald-100 hover:bg-emerald-50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 text-sm font-bold">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{m.crop_type}</p>
                        <p className="text-xs text-gray-400">Alloc: {m.allocated_quantity} MT · ₹{m.matched_price}/kg</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quality Audit Form or Verification History */}
        {isFarmer && (
          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Leaf size={20} className="text-emerald-500" />
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Submit Quality Audit</h2>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-500 text-sm mb-4">
                Document quality metrics for your produce to enable faster matching and better prices.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 rounded-xl border border-gray-200">
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Moisture Content</Label>
                  <Input className="w-full p-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                </div>
                <div className="p-3 rounded-xl border border-gray-200">
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Defect Score</Label>
                  <Input className="w-full p-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                </div>
                <div className="p-3 rounded-xl border border-gray-200">
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Colour Uniformity</Label>
                  <Input className="w-full p-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                </div>
                <div className="p-3 rounded-xl border border-gray-200">
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Pesticide Residue</Label>
                  <Input className="w-full p-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                </div>
              </div>
              <button
                className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg"
              >
                Submit Quality Audit
              </button>
            </div>
          </section>
        )}

        {isBuyer && (
          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Palette size={20} className="text-emerald-500" />
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Quality Certificates</h2>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-500 text-sm mb-4">
                View quality certificates for all matched shipments.
              </p>
              <div className="space-y-3">
                {settlements.slice(0, 3).map((s: any, i: number) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-3 rounded-xl border border-emerald-100 hover:bg-emerald-50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Shield size={20} className="text-emerald-500" />
                      <div>
                        <p className="font-medium text-gray-900">{s.crop_type || 'Tomato'}</p>
                        <p className="text-xs text-gray-400">Grade A · {s.delivery_date || 'Pending'}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {settlements.length === 0 ? (
                  <p className="text-gray-400 text-sm">No certificates yet</p>
                ) : null}
              </div>
            </div>
          </section>
        )}

        {isAdmin && (
          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck size={20} className="text-emerald-500" />
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Quality Analytics</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-emerald-600">94%</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Quality compliance</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-emerald-600">87</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Audits this month</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-emerald-600">3</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Rejected batches</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-emerald-600">12</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Pending audits</div>
                </div>
              </div>
              <div className="space-y-4">
                <AlertCircle size={20} className="text-red-500 mr-2" /> <span className="text-gray-600">1 batch flagged for pesticide residue</span>
                <Loader2 size={20} className="text-amber-500 mr-2" /> <span className="text-gray-600">2 batches pending verification</span>
                <CheckCircle2 size={20} className="text-emerald-500 mr-2" /> <span className="text-gray-600">5 batches certified this week</span>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function Label({ children }: any) {
  return <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{children}</span>
}

function Input({ children, ...rest }: any) {
  return <input className="w-full p-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none" {...rest} /> }