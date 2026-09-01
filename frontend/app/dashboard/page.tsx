'use client'

import { useDemoRole, useDemoData } from '@/components/lib/demo-role-context'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  Truck, 
  CheckCircle2, 
  IndianRupee, 
  ArrowRight, 
  Plus, 
  TrendingUp, 
  Package, 
  Users,
  ShieldCheck,
  AlertCircle,
  Wheat,
  ShoppingBag,
  Zap
} from 'lucide-react'
import { motion } from 'framer-motion'

function StatCard({ label, value, icon: Icon, color, trend }: { label: string; value: string; icon: any; color: string; trend?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-emerald-900/5 transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-2xl ${color} bg-opacity-10 text-opacity-90 group-hover:scale-110 transition-transform`}>
          <Icon size={24} className={color.replace('bg-', 'text-').replace('10', '600')} />
        </div>
        {trend && (
          <span className="text-[10px] font-bold px-2 py-1 bg-green-50 text-green-600 rounded-lg">
            {trend}
          </span>
        )}
      </div>
      <div>
        <h3 className="text-3xl font-black text-gray-900 tracking-tight">{value}</h3>
        <p className="text-sm font-semibold text-gray-400 mt-1 uppercase tracking-wider">{label}</p>
      </div>
    </motion.div>
  )
}

export default function DashboardPage() {
  const { user, switchRole } = useDemoRole()
  const data = useDemoData()
  const router = useRouter()

  const role = user?.role
  const isBuyer = role === 'bulk_buyer' || role === 'admin'
  const isFarmer = role === 'farmer' || role === 'fpo_agent'
  const isAdmin = role === 'admin'

  // Demo data from context
  const demands = data?.demands || []
  const supplies = data?.supplies || []
  const matched = data?.matched || []
  const orders = data?.orders || []
  const logistics = data?.logistics || []
  const settlements = data?.settlements || []
  const forecasts = data?.forecasts || []

  // Farmer commitments from supplies
  const commitments = supplies
  const commitmentsLoading = false

  // Compute stats
  const stats = {
    open: demands.filter((d: any) => d.status === 'open').length,
    matched: demands.filter((d: any) => ['partially_matched', 'fully_matched'].includes(d.status)).length,
    delivered: demands.filter((d: any) => d.status === 'delivered').length,
    total: demands.length
  }

  return (
    <div className="min-h-screen bg-gray-50/50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black uppercase tracking-widest mb-4">
              <ShieldCheck size={12} /> {role?.replace('_', ' ')} verified
            </span>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">
              Hello, {user?.full_name || 'User'}! 👋
            </h1>
            <p className="text-gray-500 text-lg mt-2 font-medium">
              Here's what's happening with your agricultural supply chain today.
            </p>
          </motion.div>
          
          <div className="flex gap-3">
            {isBuyer && (
              <Link
                href="/demands/create"
                className="inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3.5 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 active:scale-95"
              >
                <Plus size={20} /> Post New Demand
              </Link>
            )}
            <Link
              href="/auth/choose-role"
              className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 border border-gray-200 px-6 py-3.5 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95"
            >
              Switch Role
            </Link>
            <Link
              href="/auth/choose-role"
              className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 border border-gray-200 px-6 py-3.5 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95"
            >
              <Wheat size={16} /> Demo Select
            </Link>
          </div>
        </div>

        {/* Dynamic Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard label="Active Demands" value={stats.open.toString()} icon={LayoutDashboard} color="bg-blue-500" trend="+12% this week" />
          <StatCard label="Matched Pairs" value={stats.matched.toString()} icon={CheckCircle2} color="bg-emerald-500" trend="Optimal" />
          <StatCard label="In Transit" value={stats.delivered.toString()} icon={Truck} color="bg-amber-500" />
          <StatCard 
            label={isBuyer ? 'Est. Value' : 'Revenue'} 
            value={`₹${(stats.total * 12.5).toFixed(1)}L`} 
            icon={IndianRupee} 
            color="bg-purple-500" 
            trend="Live"
          />
        </div>

        {/* Main Content Sections */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Activity Feed */}
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <TrendingUp size={20} />
                  </div>
                  <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Recent Activity</h2>
                </div>
                <Link href="/demands" className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors">
                  View full board <ArrowRight size={16} />
                </Link>
              </div>
              <div className="p-4">
                {demands.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle size={32} className="text-gray-200" />
                    </div>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No recent activity found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {demands.slice(0, 5).map((d: any, i: number) => (
                      <motion.div 
                        key={d.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-colors group"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                            🌾
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 capitalize truncate">{d.crop_type}</p>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                              {d.required_quantity} MT · <span className="text-emerald-600">₹{d.max_price_per_kg}/KG</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider border ${
                            d.status === 'open' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            ['fully_matched', 'delivered'].includes(d.status) ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            'bg-amber-50 text-amber-600 border-amber-100'
                          }`}>
                            {d.status?.replace('_', ' ')}
                          </span>
                          <p className="text-[10px] text-gray-300 font-bold mt-1 uppercase">2h ago</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Role-specific section */}
            {isFarmer ? (
              <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                      <Package size={20} />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Your Commitments</h2>
                  </div>
                </div>
                <div className="p-8">
                  {commitmentsLoading ? (
                    <div className="text-center text-gray-400 py-10">Loading commitments...</div>
                  ) : commitments.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-3xl">
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No active commitments</p>
                      <Link href="/supply" className="text-emerald-600 text-sm font-black mt-2 inline-block">Browse Demand Board</Link>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {commitments.slice(0, 4).map((c: any) => (
                        <div key={c.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                          <p className="font-bold text-gray-900 capitalize">{c.crop_type}</p>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{c.available_quantity} MT</span>
                            <span className="text-xs font-black text-emerald-600">Grade {c.quality_grade}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            ) : (
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="p-8 bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl text-white shadow-xl shadow-gray-200">
                  <h3 className="text-lg font-black uppercase tracking-tight mb-2 text-emerald-400">Market Insights</h3>
                  <p className="text-sm text-gray-400 font-medium mb-6">Current demand for wheat is up by 24% in your region.</p>
                </div>
                <div className="p-8 bg-white border border-gray-100 rounded-3xl shadow-sm">
                  <h3 className="text-lg font-black uppercase tracking-tight mb-2 text-blue-600">Network Growth</h3>
                  <p className="text-sm text-gray-400 font-medium mb-6">4 new FPOs have joined the network in the last 48 hours.</p>
                  <div className="flex -space-x-3">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400">
                        F{i}
                      </div>
                    ))}
                    <div className="w-10 h-10 rounded-full border-2 border-white bg-emerald-500 flex items-center justify-center text-xs font-black text-white">+12</div>
                  </div>
                </div>
              </div>
            )}

            {/* Admin overview or Buyer insights */}
            {isAdmin && (
              <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                      <Zap size={20} />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">System Overview</h2>
                  </div>
                </div>
                <div className="p-8">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="text-2xl font-bold text-emerald-600">{demands.length}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider">Active Demands</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="text-2xl font-bold text-emerald-600">{supplies.length}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider">Supply Points</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="text-2xl font-bold text-emerald-600">{matched.length}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider">Matched Pairs</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="text-2xl font-bold text-emerald-600">{orders.length}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider">Active Orders</div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <AlertCircle size={20} className="text-red-500 mr-2" /> <span className="text-gray-600">5 delayed deliveries</span>
                    <Truck size={20} className="text-amber-500 mr-2" /> <span className="text-gray-600">3 active logistics</span>
                    <ShieldCheck size={20} className="text-emerald-500 mr-2" /> <span className="text-gray-600">2 verified settlements</span>
                  </div>
                </div>
              </section>
            )}

            {isBuyer && (
              <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                      <ShoppingBag size={20} />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Market Insights</h2>
                  </div>
                </div>
                <div className="p-8">
                  <p className="text-sm text-gray-400 font-medium mb-6">Current demand for tomatoes is strong in Pune market.</p>
                </div>
              </section>
            )}
          </div>

          {/* Quick Actions Sidebar */}
          <div className="space-y-8">
            <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-6 flex items-center gap-2">
                <Users size={20} className="text-emerald-500" /> Workflow
              </h2>
              <div className="space-y-4">
                {isFarmer && (
                  <QuickActionLink 
                    href="/supply" 
                    title="Offer Supply" 
                    description="Commit your produce" 
                    icon={Wheat} 
                    bg="bg-green-50" 
                    text="text-green-600" 
                  />
                )}
                {isFarmer && (
                  <QuickActionLink 
                    href="/quality" 
                    title="Quality Verification" 
                    description="Verify crop quality" 
                    icon={CheckCircle2} 
                    bg="bg-emerald-50" 
                    text="text-emerald-600" 
                  />
                )}
                {isBuyer && (
                  <QuickActionLink 
                    href="/demands/create" 
                    title="Create Demand" 
                    description="Post buyer requirements" 
                    icon={Plus} 
                    bg="bg-emerald-50" 
                    text="text-emerald-600" 
                  />
                )}
                {isBuyer && (
                  <QuickActionLink 
                    href="/logistics" 
                    title="Logistics Queue" 
                    description="Route optimization" 
                    icon={Truck} 
                    bg="bg-amber-50" 
                    text="text-amber-600" 
                  />
                )}
                {isAdmin && (
                  <QuickActionLink 
                    href="/dashboard" 
                    title="System Overview" 
                    description="Monitor all activity" 
                    icon={Zap} 
                    bg="bg-purple-50" 
                    text="text-purple-600" 
                  />
                )}
                {isAdmin && (
                  <QuickActionLink 
                    href="/orders" 
                    title="All Orders" 
                    description="Track all settlements" 
                    icon={IndianRupee} 
                    bg="bg-purple-50" 
                    text="text-purple-600" 
                  />
                )}
              </div>
            </section>


          </div>
        </div>
      </div>
    </div>
  )
}

function QuickActionLink({ href, title, description, icon: Icon, bg, text }: any) {
  return (
    <Link 
      href={href} 
      className="flex items-center gap-4 p-4 rounded-2xl border border-gray-50 hover:bg-gray-50 hover:border-emerald-100 transition-all group"
    >
      <div className={`p-3 rounded-xl ${bg} ${text} group-hover:scale-110 transition-transform`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="font-bold text-gray-900 text-sm">{title}</p>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{description}</p>
      </div>
    </Link>
  )
}