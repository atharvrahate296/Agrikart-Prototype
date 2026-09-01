'use client'

import { useState } from 'react'
import { useDemoRole, useDemoData } from '@/components/lib/demo-role-context'
import Link from 'next/link'
import { FiPlus, FiFilter, FiArrowRight, FiInbox } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  open: { label: 'Open', bg: 'bg-blue-50', text: 'text-blue-700' },
  partially_matched: { label: 'Partially Matched', bg: 'bg-yellow-50', text: 'text-yellow-700' },
  fully_matched: { label: 'Fully Matched', bg: 'bg-green-50', text: 'text-green-700' },
  delivered: { label: 'Delivered', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  cancelled: { label: 'Cancelled', bg: 'bg-gray-100', text: 'text-gray-500' },
}

export default function DemandsPage() {
  const { user, switchRole } = useDemoRole()
  const data = useDemoData()
  const [filter, setFilter] = useState<string>('')
  const isBuyer = user?.role === 'bulk_buyer' || user?.role === 'admin'

  const demands = (data?.demands || []).filter((d: any) => 
    !filter || (d.crop_type?.toLowerCase().includes(filter.toLowerCase()) || 
      d.id?.toLowerCase().includes(filter.toLowerCase()))
  )

  const statuses = ['', 'open', 'partially_matched', 'fully_matched', 'delivered']

  return (
    <div className="min-h-screen bg-gray-50/50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">
              {isBuyer ? 'My Demands' : 'Marketplace Demands'}
            </h1>
            <p className="text-gray-500 text-lg mt-2">
              {isBuyer ? 'Manage your active requirements and track fulfillment.' : 'Connect directly with buyers looking for agricultural produce.'}
            </p>
          </div>
          {isBuyer && (
            <Link
              href="/demands/create"
              className="inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95"
            >
              <FiPlus size={20} /> Create New Demand
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8">
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 text-gray-400 border-r pr-4 mr-2">
              <FiFilter size={18} />
              <span className="text-sm font-bold uppercase tracking-wider">Status</span>
            </div>
            {statuses.map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`text-sm font-bold px-5 py-2 rounded-xl transition-all whitespace-nowrap ${
                  filter === s
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {s === '' ? 'All Demands' : statusConfig[s]?.label || s}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {demands.length >= 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {demands.map((d: any, index: number) => {
                const status = statusConfig[d.status] ?? statusConfig.open
                return (
                  <motion.div
                    key={d.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={`/demands/${d.id}`}
                      className="group block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-emerald-900/5 hover:border-emerald-100 transition-all duration-300 overflow-hidden h-full"
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                              🌾
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900 capitalize text-lg leading-tight">{d.crop_type}</h3>
                              <p className="text-xs text-gray-400 font-medium">#{d.id.slice(0, 8)}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider ${status.bg} ${status.text} border`}>
                            {status.label}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-6 mb-6">
                          <div className="space-y-1">
                            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Quantity</p>
                            <p className="font-black text-gray-900 text-lg">{d.required_quantity} <span className="text-sm font-medium text-gray-500">{d.unit === 'piece' ? 'Units' : (d.unit || 'MT')}</span></p>
                          </div>
                          <div className="space-y-1 text-right">
                            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Max Price</p>
                            <p className="font-black text-emerald-600 text-lg">₹{d.max_price || d.max_price_per_kg}<span className="text-sm font-medium text-gray-400">/{d.unit === 'piece' ? 'unit' : (d.unit || 'kg')}</span></p>
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="space-y-2 mb-6">
                          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                            <span className="text-gray-400">Fulfillment</span>
                            <span className="text-emerald-600">{d.fulfillment_percentage ?? 0}%</span>
                          </div>
                          <div className="w-full bg-gray-50 rounded-full h-2 overflow-hidden border border-gray-100">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(d.fulfillment_percentage ?? 0, 100)}%` }}
                              transition={{ duration: 1, ease: "easeOut" }}
                              className="bg-emerald-500 h-full rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                            />
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-[10px] text-gray-500">
                              📍
                            </div>
                            <span className="text-xs font-semibold text-gray-500 truncate max-w-[140px]">
                              {isBuyer ? d.delivery_address || 'Delivery TBD' : d.buyer_full_name || 'AgriBuyer'}
                            </span>
                          </div>
                          <div className="w-8 h-8 rounded-lg bg-gray-50 group-hover:bg-emerald-600 flex items-center justify-center text-gray-400 group-hover:text-white transition-all">
                            <FiArrowRight />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}