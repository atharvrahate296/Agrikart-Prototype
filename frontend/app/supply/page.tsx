'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Search, 
  Filter, 
  ChevronRight, 
  MapPin, 
  Calendar, 
  Weight, 
  IndianRupee,
  LayoutGrid,
  List,
  ShieldCheck
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { useDemoRole, useDemoData } from '@/components/lib/demo-role-context'
import { FiPlus } from 'react-icons/fi'

type ViewMode = 'grid' | 'list'

export default function SupplyPage() {
  const { user, switchRole } = useDemoRole()
  const router = useRouter()
  const [view, setView] = useState('grid')
  const [searchTerm, setSearchTerm] = useState('')

  const data = useDemoData()
  const allSupplies: any[] = data?.supplies || []
  const demands = allSupplies.filter(function(d: any) {
    if (!searchTerm) return true;
    return d.crop_type?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  return (
    <div className="min-h-screen bg-gray-50/50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-4 uppercase">
              Marketplace <span className="text-emerald-600">Demands</span>
            </h1>
            <p className="text-gray-500 text-lg font-medium max-w-2xl">
              Connect directly with bulk buyers. Commit your future harvest and secure guaranteed prices before you even sow.
            </p>
          </motion.div>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Search crops (e.g. Wheat, Rice, Potato)..." 
              className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-medium transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-6 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">
              <Filter size={20} /> Filters
            </button>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-1 flex gap-1">
              <button 
                onClick={() => setView('grid')}
                className={`p-3 rounded-xl transition-all ${view === 'grid' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
              >
                <LayoutGrid size={20} />
              </button>
              <button 
                onClick={() => setView('list')}
                className={`p-3 rounded-xl transition-all ${view === 'list' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
              >
                <List size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Demand Grid/List */}
        <AnimatePresence mode="wait">
          {demands.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-32 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100"
            >
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search size={32} className="text-gray-200" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">No matching demands</h3>
              <p className="text-gray-500 max-w-sm mx-auto font-medium">Try adjusting your search terms or filters to find what you're looking for.</p>
              <div className="mt-4">
                <Link href="/demands" className="text-emerald-600 font-bold hover:text-emerald-700 transition-colors inline-flex items-center gap-2">
                  <FiPlus /> Browse All Demands
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key={view}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={view === 'grid' ? "grid md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}
            >
              {demands.map((d: any, i: number) => (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link 
                    href={`/demands/${d.id}`}
                    className={`group block bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-emerald-900/5 hover:border-emerald-100 transition-all duration-300 overflow-hidden ${view === 'grid' ? 'rounded-3xl' : 'rounded-2xl'}`}
                  >
                    <div className={view === 'grid' ? "p-8" : "p-6 flex items-center justify-between"}>
                      <div className={view === 'grid' ? "mb-8" : "flex items-center gap-6"}>
                        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform mb-0 shadow-sm border border-emerald-100">
                          🌾
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-gray-900 capitalize group-hover:text-emerald-600 transition-colors">{d.crop_type}</h3>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Ref: {d.id.slice(0, 8)}</p>
                        </div>
                      </div>

                      {view === 'grid' && (
                        <div className="grid grid-cols-2 gap-y-6 mb-8">
                          <Detail label="Quantity" value={`${d.available_quantity} ${d.unit === 'piece' ? 'Units' : d.unit}`} icon={Weight} />
                          <Detail label="Price" value={`₹${d.price_per_kg}/${d.unit === 'piece' ? 'unit' : d.unit}`} icon={IndianRupee} color="text-emerald-600" />
                          <Detail label="Quality" value={`Grade ${d.quality_grade}`} icon={Search} />
                          <Detail label="Location" value={d.location_name || 'TBD'} icon={MapPin} />
                        </div>
                      )}

                      {view === 'list' && (
                        <div className="flex gap-12 text-sm font-bold">
                           <div className="flex items-center gap-2 text-gray-900"><Weight size={16} className="text-gray-400"/> {d.available_quantity} {d.unit === 'piece' ? 'Units' : d.unit}</div>
                           <div className="flex items-center gap-2 text-emerald-600"><IndianRupee size={16} className="text-emerald-400"/> ₹{d.price_per_kg}/{d.unit === 'piece' ? 'unit' : d.unit}</div>
                           <div className="flex items-center gap-2 text-gray-900"><MapPin size={16} className="text-gray-400"/> {d.location_name || 'TBD'}</div>
                        </div>
                      )}

                      <div className={view === 'grid' ? "pt-6 border-t border-gray-50 flex items-center justify-between" : ""}>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-xs font-black text-gray-400 uppercase">
                            {d.farmer_count || 1}
                          </div>
                          <span className="text-xs font-bold text-gray-500">{d.fpo_aggregator_name || 'FPO Aggregator'}</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-gray-50 group-hover:bg-emerald-600 flex items-center justify-center text-gray-400 group-hover:text-white transition-all">
                          <ChevronRight size={20} />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function Detail({ label, value, icon: Icon, color = "text-gray-900" }: any) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
        <Icon size={12} /> {label}
      </p>
      <p className={`font-black ${color} text-base`}>{value}</p>
    </div>
  )
}