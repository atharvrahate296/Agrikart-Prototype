'use client'

import Link from 'next/link'
import { useState, useRef } from 'react'
import {
  AlertCircle,
  IndianRupee,
  Calendar,
  LayoutDashboard,
  Wheat,
  Package,
  Truck,
  Leaf,
  ShoppingBag,
  ShieldCheck,
  Users,
  ChevronDown,
  X,
  Menu,
  LogOut,
} from 'lucide-react'
import { useDemoRole } from '@/components/lib/demo-role-context'
import { useRouter } from 'next/navigation'

type Role = 'farmer' | 'fpo_agent' | 'bulk_buyer' | 'consumer' | 'admin'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)

  const { user, switchRole, resetDemo } = useDemoRole()
  const router = useRouter()

  const roles: Role[] = [
    'farmer',
    'fpo_agent',
    'bulk_buyer',
    'consumer',
    'admin',
  ]

  const roleLabels: Record<Role, string> = {
    farmer: 'Farmer / FPO',
    fpo_agent: 'FPO / Aggregator',
    bulk_buyer: 'Bulk Buyer',
    consumer: 'Consumer',
    admin: 'Admin / Operations',
  }

  const roleColors: Record<Role, string> = {
    farmer: 'bg-green-500',
    fpo_agent: 'bg-emerald-500',
    bulk_buyer: 'bg-amber-500',
    consumer: 'bg-amber-600',
    admin: 'bg-purple-600',
  }

  const getNavLinks = () => {
    if (!user) {
      return [{ href: '/', label: 'AgriKart' }]
    }

    switch (user.role as Role) {
      case 'farmer':
        return [
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/supply', label: 'Available Demands' },
          { href: '/quality', label: 'Quality' },
          { href: '/orders', label: 'My Orders' },
        ]

      case 'fpo_agent':
        return [
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/quality', label: 'Quality Verification' },
          { href: '/supply', label: 'Aggregate Farmers' },
          { href: '/logistics', label: 'Logistics' },
        ]

      case 'bulk_buyer':
        return [
          { href: '/demands', label: 'My Demands' },
          { href: '/demands/create', label: 'Create Demand' },
          { href: '/logistics', label: 'Logistics' },
          { href: '/orders', label: 'Order Status' },
        ]

      case 'consumer':
        return [
          { href: '/demands', label: 'Available Produce' },
          { href: '/logistics', label: 'Track Delivery' },
        ]

      case 'admin':
        return [
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/demands', label: 'All Demands' },
          { href: '/logistics', label: 'Logistics' },
          { href: '/quality', label: 'Quality' },
          { href: '/orders', label: 'All Orders' },
        ]

      default:
        return [{ href: '/', label: 'AgriKart' }]
    }
  }

  const navLinks = getNavLinks()

  const handleSwitchRole = (role: Role) => {
    switchRole(role)
    setDropdownOpen(false)
    setIsOpen(false)
  }

  const handleResetDemo = () => {
    resetDemo()
    setDropdownOpen(false)
    setIsOpen(false)
    router.push('/auth/choose-role')
  }

  return (
    <nav className="glass sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-1.5 group"
            onClick={() => setIsOpen(false)}
          >
            <span className="text-2xl">🌾</span>

            <span className="text-xl font-extrabold text-green-700 group-hover:text-green-600 transition-colors">
              AgriKart
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="nav-link text-gray-600 hover:text-green-700 font-medium text-sm px-3 py-2 rounded-lg hover:bg-green-50/50 transition-all"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="hidden md:flex items-center gap-2">

            {user && (
              <div className="relative" ref={dropdownRef}>

                {/* Role Badge */}
                <button
                  type="button"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-100 transition-all"
                  aria-expanded={dropdownOpen}
                  aria-haspopup="menu"
                >
                  <span className="text-sm font-medium text-gray-700 block leading-tight max-w-[100px] truncate">
                    {user.full_name || 'Demo User'}
                  </span>

                  <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-gray-600">
                    {roleLabels[user.role as Role]}
                  </span>

                  <span
                    className={`${roleColors[user.role as Role]} text-white text-[10px] font-bold px-2 py-0.5 rounded`}
                  >
                    {user.role}
                  </span>

                  {dropdownOpen ? (
                    <X size={15} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={14} className="text-gray-400" />
                  )}
                </button>

                {/* Switch Role Dropdown */}
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">

                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-800">
                        SIH Demo Mode
                      </p>

                      <p className="text-xs text-gray-400">
                        Instant role switching
                      </p>
                    </div>

                    <div className="py-1.5">
                      {roles.map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => handleSwitchRole(role)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                            user.role === role
                              ? 'text-white bg-emerald-600'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <span
                            className={`${roleColors[role]} text-white text-xs font-semibold px-2 py-1 rounded`}
                          >
                            {roleLabels[role]}
                          </span>

                          {user.role !== role && (
                            <span className="ml-auto text-xs text-gray-400">
                              Switch
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="border-t border-gray-100 py-1.5">
                      <button
                        type="button"
                        onClick={handleResetDemo}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={16} />
                        <span>Reset Demo</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SIH Demo label */}
            <div className="ml-3 bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full uppercase">
              SIH Demo
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isOpen}
            >
              {isOpen ? (
                <X size={22} />
              ) : (
                <Menu size={22} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white animate-slide-down">
          <div className="px-4 py-3 space-y-1">

            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-3 py-2.5 text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-lg text-sm font-medium transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            <div className="border-t border-gray-100 pt-2 mt-2">

              <div className="flex items-center gap-3 px-3 py-2.5">
                <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                  {user?.full_name?.charAt(0).toUpperCase() || 'D'}
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {user?.full_name || 'Demo User'}
                  </p>

                  {user && (
                    <p className="text-[10px] font-bold text-green-600 uppercase">
                      {roleLabels[user.role as Role]}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">

                <Link
                  href="/"
                  className="block text-center px-3 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  AgriKart
                </Link>

                <Link
                  href="/auth/choose-role"
                  className="block text-center px-3 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-sm font-semibold transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  Switch Role
                </Link>

                {user && (
                  <button
                    type="button"
                    onClick={handleResetDemo}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
                  >
                    <LogOut size={15} />
                    Reset Demo
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}