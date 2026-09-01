'use client'

import Link from 'next/link'
import { FiArrowRight, FiTruck, FiShield, FiCheckCircle } from 'react-icons/fi'
import { useAuth } from '@/lib/hooks/useAuth'

export default function HeroSection() {
  const { user } = useAuth()
  const isBuyer = user?.role === 'buyer' || user?.role === 'vendor'

  return (
    <div className="relative bg-gradient-to-r from-green-700 via-green-600 to-emerald-600 text-white pt-10 pb-14 md:pt-16 md:pb-20 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          {/* Left Content */}
          <div className="space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 mb-4">
                <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></span>
                <span className="text-sm font-semibold text-green-100">SIH 26033 — Eliminating Intermediaries</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Find Farmers for{' '}
                <span className="text-green-200">Confirmed Demand</span>
              </h1>
            </div>

            <p className="text-lg text-green-50 leading-relaxed max-w-xl">
              Stop speculative harvesting. AgriKart connects institutional buyers directly with farmers and FPOs
              through demand-first aggregation, quality verification, and shared logistics.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              {isBuyer ? (
                <Link
                  href="/demands/create"
                  className="inline-flex items-center gap-2 bg-white text-green-700 px-8 py-3.5 rounded-xl font-bold hover:bg-green-50 transition transform hover:scale-105 shadow-lg shadow-green-900/20"
                >
                  Post a Demand <FiArrowRight size={20} />
                </Link>
              ) : user ? (
                <Link
                  href="/supply"
                  className="inline-flex items-center gap-2 bg-white text-green-700 px-8 py-3.5 rounded-xl font-bold hover:bg-green-50 transition transform hover:scale-105 shadow-lg shadow-green-900/20"
                >
                  View Demands <FiArrowRight size={20} />
                </Link>
              ) : (
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center gap-2 bg-white text-green-700 px-8 py-3.5 rounded-xl font-bold hover:bg-green-50 transition transform hover:scale-105 shadow-lg shadow-green-900/20"
                >
                  Get Started <FiArrowRight size={20} />
                </Link>
              )}
              <Link
                href="/demands"
                className="inline-flex items-center gap-2 border-2 border-white/40 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-white/10 transition"
              >
                Explore Demand Board
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
              <div>
                <p className="text-2xl font-bold">250+</p>
                <p className="text-green-200 text-xs font-medium">Active Demands</p>
              </div>
              <div>
                <p className="text-2xl font-bold">1,200+</p>
                <p className="text-green-200 text-xs font-medium">FPOs Connected</p>
              </div>
              <div>
                <p className="text-2xl font-bold">5,400 MT</p>
                <p className="text-green-200 text-xs font-medium">Fulfilled</p>
              </div>
              <div>
                <p className="text-2xl font-bold">18%</p>
                <p className="text-green-200 text-xs font-medium">Better Price for Farmers</p>
              </div>
            </div>
          </div>

          {/* Right Side - Workflow Steps */}
          <div className="space-y-3">
            {[
              { icon: FiCheckCircle, title: 'Confirmed Demand First', desc: 'Buyers post verified requirements — no speculative farming' },
              { icon: FiShield, title: 'Quality Verified at Source', desc: 'FPO agents grade and certify produce before dispatch' },
              { icon: FiTruck, title: 'Shared Micro-Logistics', desc: 'AI-optimized routes pool partial loads to cut transport costs' },
            ].map((item, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20 hover:bg-white/20 transition">
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                    <item.icon className="text-xl" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base mb-1">{item.title}</h3>
                    <p className="text-green-100 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
