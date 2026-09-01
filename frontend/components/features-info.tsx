'use client'

import Link from 'next/link'
import { FiLayers, FiTruck, FiCheckCircle, FiLock, FiArrowRight } from 'react-icons/fi'
import { useAuth } from '@/lib/hooks/useAuth'

export default function FeaturesInfo() {
  const { user } = useAuth()

  const modules = [
    {
      title: 'Demand-Led Aggregation',
      description: 'Buyers post confirmed requirements. The platform matches nearby FPOs with the right crop, quantity and quality — eliminating speculative farming.',
      link: '/demands',
      bgColor: 'bg-green-50 border-green-100 text-green-950',
      icon: FiLayers,
      iconColor: 'text-green-600',
      emoji: '📋',
    },
    {
      title: 'Shared Micro-Logistics',
      description: 'Pool partial farmer loads into shared transport. AI optimizes multi-stop pickup routes to minimize distance, time and fuel costs.',
      link: '/logistics',
      bgColor: 'bg-blue-50 border-blue-100 text-blue-950',
      icon: FiTruck,
      iconColor: 'text-blue-600',
      emoji: '🚛',
    },
    {
      title: 'Verifiable Quality Grading',
      description: 'FPO agents inspect and grade produce at the farm gate. Photo evidence and quality certificates build buyer confidence before dispatch.',
      link: '/quality',
      bgColor: 'bg-amber-50 border-amber-100 text-amber-950',
      icon: FiCheckCircle,
      iconColor: 'text-amber-600',
      emoji: '🔬',
    },
    {
      title: 'Escrow & Settlement',
      description: 'Buyer payments are held in escrow until delivery is verified. Farmers receive transparent, guaranteed payouts with full status tracking.',
      link: '/orders',
      bgColor: 'bg-emerald-50 border-emerald-100 text-emerald-950',
      icon: FiLock,
      iconColor: 'text-emerald-600',
      emoji: '🔐',
    },
  ]

  return (
    <section className="py-16 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            How AgriKart Works
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Four integrated modules that transform agricultural supply chains — from confirmed demand to settled payment.
          </p>
        </div>

        {/* Workflow Arrow */}
        <div className="hidden lg:flex items-center justify-center gap-2 mb-10 text-sm font-semibold text-gray-400">
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full">Demand</span>
          <FiArrowRight />
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full">Match</span>
          <FiArrowRight />
          <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full">Verify</span>
          <FiArrowRight />
          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full">Transport</span>
          <FiArrowRight />
          <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">Deliver</span>
          <FiArrowRight />
          <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">Settle</span>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map((item, idx) => {
            const Icon = item.icon
            const targetLink = user ? item.link : `/auth/login?redirect=${item.link}`
            return (
              <div
                key={item.title}
                className={`p-6 rounded-2xl border flex flex-col justify-between hover:shadow-lg transition-shadow duration-300 ${item.bgColor}`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{item.emoji}</span>
                    <span className="text-xs font-bold text-gray-400 uppercase">Module {idx + 1}</span>
                  </div>
                  <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                  <p className="text-sm opacity-90 leading-relaxed mb-6">
                    {item.description}
                  </p>
                </div>
                <Link
                  href={targetLink}
                  className="inline-flex items-center gap-1.5 text-sm font-bold hover:underline"
                >
                  {user ? 'Explore' : 'Login to Access'} <FiArrowRight />
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
