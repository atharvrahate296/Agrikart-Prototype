'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Wheat,
  Truck,
  Leaf,
  Package,
  ShoppingBag,
  Shield,
  BarChart2,
  MapPin,
  Zap,
  AlertCircle,
} from 'lucide-react'

type Role = 'farmer' | 'fpo_agent' | 'bulk_buyer' | 'consumer' | 'admin'

export default function ChooseDemoRole() {
  const [selectedRole, setSelectedRole] = useState<Role>('farmer')
  const [showIntro, setShowIntro] = useState(true)

  const roles: {
    key: Role
    label: string
    description: string
  }[] = [
    {
      key: 'farmer',
      label: '🌱 Farmer',
      description: 'Grow crops, offer supply, track orders and payments',
    },
    {
      key: 'fpo_agent',
      label: '🏛️ FPO / Aggregator',
      description:
        "Aggregate farmers' supply, create batches, verify quality, dispatch",
    },
    {
      key: 'bulk_buyer',
      label: '📦 Bulk Buyer',
      description:
        'Create demands, view matches, confirm orders, track delivery',
    },
    {
      key: 'consumer',
      label: '🛒 Consumer',
      description:
        'Browse available produce, see transparent pricing, source directly',
    },
    {
      key: 'admin',
      label: '⚙️ Admin / Operations',
      description:
        'Monitor all activity, logistics, quality, payments, exceptions',
    },
  ]

  const roleLabels: Record<Role, string> = {
    farmer: 'Farmer / FPO',
    fpo_agent: 'FPO / Aggregator',
    bulk_buyer: 'Bulk Buyer',
    consumer: 'Consumer',
    admin: 'Admin / Operations',
  }

  const roleDescriptions: Record<Role, string> = {
    farmer: 'Offer supply, view buyer demands, track orders and payments',
    fpo_agent: 'Aggregate supply, match demands, verify quality, plan pickup',
    bulk_buyer: 'Create demands, view matches, confirm orders, track delivery',
    consumer:
      'Browse available produce, see transparent pricing, source directly',
    admin:
      'Monitor all activity, logistics, quality, payments, exceptions',
  }

  const roleColors: Record<Role, string> = {
    farmer: 'bg-green-500',
    fpo_agent: 'bg-emerald-500',
    bulk_buyer: 'bg-amber-500',
    consumer: 'bg-amber-600',
    admin: 'bg-purple-600',
  }

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role)
    setShowIntro(false)
  }

  if (showIntro) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="text-4xl">🌾</span>
            <h1 className="text-3xl font-extrabold text-gray-900">
              AgriKart
            </h1>
          </div>

          <p className="text-gray-600 text-lg mb-2">
            AgriKart connects farmers directly with bulk buyers, removing intermediaries to ensure fair pricing, verified quality, and optimized logistics for the agricultural supply chain.
          </p>

          <p className="text-gray-500 text-sm mb-10">
            SIH 26033 Prototype - Demo Mode
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
            {roles.map((role) => (
              <button
                key={role.key}
                type="button"
                onClick={() => handleRoleSelect(role.key)}
                className={`group p-5 rounded-2xl border transition-all cursor-pointer shadow-sm text-left ${
                  selectedRole === role.key
                    ? 'border-emerald-500 bg-emerald-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/30'
                }`}
              >
                <div className="text-3xl mb-3">{role.label}</div>

                <p className="text-gray-500 text-sm leading-relaxed">
                  {role.description}
                </p>
              </button>
            ))}
          </div>


        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">
              Choose Demo Role
            </h1>

            <p className="text-gray-500 text-lg mt-2">
              Select your role to explore the AgriKart platform
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-gray-900 text-white font-bold hover:bg-emerald-600 transition-all"
          >
            Back to Dashboard
          </Link>
        </div>

        {/* Role selector */}
        <div className="bg-white rounded-3xl p-5 mb-8 shadow-sm border border-gray-100">
          <div className="flex flex-wrap gap-3">
            {roles.map((role) => (
              <button
                key={role.key}
                type="button"
                onClick={() => setSelectedRole(role.key)}
                className={`px-5 py-3 rounded-xl font-bold transition-all ${
                  selectedRole === role.key
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                {role.label}
              </button>
            ))}
          </div>
        </div>

        {/* Demo state indicator */}
        <div className="bg-white rounded-3xl p-6 mb-8 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <Shield size={20} className="text-emerald-500" />

            <div>
              <p className="font-bold text-gray-900">
                SIH Demo Mode Active
              </p>

              <p className="text-sm text-gray-500">
                Instant access - no authentication required
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-500">
            Role:{' '}
            <span
              className={`${roleColors[selectedRole]} text-white font-medium px-2 py-1 rounded`}
            >
              {roleLabels[selectedRole]}
            </span>
          </p>
        </div>


        {/* Current Demo Scenario */}
        <div className="bg-white rounded-3xl p-6 mb-8 shadow-sm border border-gray-100">
          <h2 className="font-black text-gray-900 uppercase tracking-widest text-sm mb-4">
            Current Demo Scenario
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-gray-600 text-xs uppercase tracking-wider mb-2">
                Buyer
              </h3>

              <p className="text-gray-900 font-medium">
                FreshMart Foods
              </p>

              <p className="text-xs text-gray-500">
                Tomato – 5,000 kg · Max ₹45/kg
              </p>
            </div>

            <div>
              <h3 className="text-gray-600 text-xs uppercase tracking-wider mb-2">
                FPO
              </h3>

              <p className="text-gray-900 font-medium">
                Nashik Agro FPO
              </p>

              <p className="text-xs text-gray-500">
                3–5 linked farmers · 4,250 kg
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-gray-600 text-xs uppercase tracking-wider mb-2">
              Quality
            </p>

            <p className="text-gray-900 font-medium">
              Grade A
            </p>

            <p className="text-xs text-gray-500">
              Destination: Pune
            </p>
          </div>
        </div>

        {/* Role capabilities */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-black text-gray-900 mb-2">
            {roleLabels[selectedRole]} Capabilities
          </h2>

          <p className="text-gray-500 text-sm mb-5">
            {roleDescriptions[selectedRole]}
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {selectedRole === 'farmer' && (
              <>
                <Capability label="Manage crop supply" />
                <Capability label="View buyer demands" />
                <Capability label="Track orders" />
                <Capability label="Monitor payments" />
              </>
            )}

            {selectedRole === 'fpo_agent' && (
              <>
                <Capability label="Aggregate farmer supply" />
                <Capability label="Create batches" />
                <Capability label="Verify quality" />
                <Capability label="Plan pickup" />
              </>
            )}

            {selectedRole === 'bulk_buyer' && (
              <>
                <Capability label="Create purchase demands" />
                <Capability label="View supply matches" />
                <Capability label="Confirm orders" />
                <Capability label="Track deliveries" />
              </>
            )}

            {selectedRole === 'consumer' && (
              <>
                <Capability label="Browse produce" />
                <Capability label="Compare prices" />
                <Capability label="View source information" />
                <Capability label="Purchase directly" />
              </>
            )}

            {selectedRole === 'admin' && (
              <>
                <Capability label="Monitor platform activity" />
                <Capability label="Track logistics" />
                <Capability label="Review quality" />
                <Capability label="Handle exceptions" />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Capability({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
      <div className="h-2 w-2 rounded-full bg-emerald-500" />
      <span className="text-sm text-gray-700">{label}</span>
    </div>
  )
}