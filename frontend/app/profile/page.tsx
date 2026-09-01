'use client'
import { useState, useEffect } from 'react'

import { useDemoRole, useDemoData } from '@/components/lib/demo-role-context'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiUser, FiMail, FiPhone, FiMapPin, FiLock, FiSettings, FiLogOut, FiSave, FiCheck, FiAlertCircle, FiEdit3 } from 'react-icons/fi'

type TabType = 'profile' | 'security' | 'settings'

export default function ProfilePage() {
  const { user, switchRole, resetDemo } = useDemoRole()
  const data = useDemoData()
  const router = useRouter()

  const role = user?.role
  const isFarmer = role === 'farmer' || role === 'fpo_agent'

  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  // Profile fields
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [bio, setBio] = useState('')

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '')
      setPhone(user.phone || '')
      setLocation(user.location || '')
      setBio(user.bio || '')
    }
  }, [user])

  const handleSaveProfile = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      setSuccess('Profile updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all password fields')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      setSuccess('Password changed successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    resetDemo()
  }

  if (user) {
    // Already initialized
  } else {
    // Should not happen as DemoRoleProvider always sets user
  }

  const tabs = [
    { id: 'profile' as TabType, label: 'Personal Info', icon: FiUser },
    { id: 'security' as TabType, label: 'Security', icon: FiLock },
    { id: 'settings' as TabType, label: 'Settings', icon: FiSettings },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8 animate-fade-in">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">My Account</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your profile, security settings, and preferences.</p>
        </div>

        <div className="grid md:grid-cols-[240px_1fr] gap-6">
          {/* Sidebar */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 h-fit">
            {/* User Card */}
            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-100">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-md">
                {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 text-sm truncate">{fullName || 'User'}</p>
                <p className="text-xs text-gray-400 truncate">Demo User</p>
              </div>
            </div>

            {/* Nav Tabs */}
            <nav className="space-y-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-green-50 text-green-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}

              <div className="border-t border-gray-100 pt-2 mt-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
                >
                  <FiLogOut size={16} /> Sign Out
                </button>
              </div>
            </nav>
          </div>

          {/* Content Area */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {/* Success / Error Messages */}
            {success && (
              <div className="mb-6 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm animate-fade-in">
                <FiCheck size={16} />
                {success}
              </div>
            )}
            {error && (
              <div className="mb-6 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm animate-fade-in">
                <FiAlertCircle size={16} />
                {error}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="animate-fade-in">
                <div className="flex items-center gap-2 mb-6">
                  <FiEdit3 size={18} className="text-green-600" />
                  <h2 className="text-xl font-bold text-gray-800">Personal Information</h2>
                </div>

                <div className="space-y-5">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                    <div className="relative">
                      <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="input-modern pl-10"
                        placeholder="Your full name"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                    <div className="relative">
                      <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="input-modern pl-10"
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Address / Location</label>
                    <div className="relative">
                      <FiMapPin className="absolute left-3.5 top-3 text-gray-400" size={16} />
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="input-modern pl-10"
                        placeholder="City, State, Country"
                      />
                    </div>
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      className="input-modern resize-none"
                      placeholder="Tell us about yourself..."
                    />
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-green-700 transition-all disabled:opacity-50 active:scale-[0.98] shadow-sm"
                  >
                    <FiSave size={16} />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="animate-fade-in">
                <div className="flex items-center gap-2 mb-6">
                  <FiLock size={18} className="text-green-600" />
                  <h2 className="text-xl font-bold text-gray-800">Change Password</h2>
                </div>

                <div className="space-y-5 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
                    <div className="relative">
                      <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="input-modern pl-10"
                        placeholder="Enter current password"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                    <div className="relative">
                      <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="input-modern pl-10"
                        placeholder="Min 6 characters"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
                    <div className="relative">
                      <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="input-modern pl-10"
                        placeholder="Repeat new password"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleChangePassword}
                    disabled={saving}
                    className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-green-700 transition-all disabled:opacity-50 active:scale-[0.98] shadow-sm"
                  >
                    <FiLock size={16} />
                    {saving ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="animate-fade-in">
                <div className="flex items-center gap-2 mb-6">
                  <FiSettings size={18} className="text-green-600" />
                  <h2 className="text-xl font-bold text-gray-800">Preferences</h2>
                </div>

                <div className="space-y-6">
                  {/* Account Info */}
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Account Information</h3>
                    <div className="grid gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Account Type</span>
                        <span className="font-medium text-gray-800 capitalize">{(user as any).role || 'Farmer'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Member Since</span>
                        <span className="font-medium text-gray-800">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Email Verified</span>
                        <span className={`font-medium ${(user as any).verified ? 'text-green-600' : 'text-orange-500'}`}>
                          {(user as any).verified ? '✓ Verified' : '⚠ Pending'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Notification Settings */}
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Notifications</h3>
                    <div className="space-y-3">
                      {[
                        { label: 'Email Notifications', desc: 'Receive updates via email' },
                        { label: 'Scheme Alerts', desc: 'Get notified about new government schemes' },
                        { label: 'Disease Alerts', desc: 'Alerts for disease outbreaks in your region' },
                        { label: 'Order Updates', desc: 'Track your marketplace orders' },
                      ].map((item, idx) => (
                        <label key={idx} className="flex items-center justify-between cursor-pointer">
                          <div>
                            <p className="text-sm font-medium text-gray-700">{item.label}</p>
                            <p className="text-xs text-gray-400">{item.desc}</p>
                          </div>
                          <div className="relative">
                            <input type="checkbox" defaultChecked className="sr-only peer" />
                            <div className="w-10 h-5 bg-gray-300 peer-checked:bg-green-500 rounded-full transition-colors"></div>
                            <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform"></div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="p-4 bg-red-50/50 rounded-xl border border-red-100">
                    <h3 className="text-sm font-semibold text-red-700 mb-2">Danger Zone</h3>
                    <p className="text-xs text-red-500 mb-3">Once you sign out, you'll need to log in again to access your account.</p>
                    <button
                      onClick={handleLogout}
                      className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-all active:scale-[0.98]"
                    >
                      <FiLogOut size={14} />
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}