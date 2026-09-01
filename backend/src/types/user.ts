/**
 * User Type Definitions
 * Defines all types related to user data and profiles
 */

import type { UserRole } from './auth'

/**
 * User location data
 */
export interface UserLocation {
  state: string
  district: string
  village?: string
  pincode?: string
}

/**
 * User notification preferences
 */
export interface NotificationPreferences {
  emailNotifications: boolean
  pushNotifications: boolean
  smsNotifications: boolean
  newsletterSubscribed: boolean
  schemeAlerts: boolean
  diseaseAlerts: boolean
  orderUpdates: boolean
}

/**
 * User profile data
 */
export interface UserProfile {
  id: string
  email: string
  fullName: string
  phone?: string
  role: UserRole
  language: string
  location?: UserLocation
  profileImage?: string
  bio?: string
  emailVerified: boolean
  phoneVerified: boolean
  verificationStatus: 'pending' | 'verified' | 'rejected'
  notificationPreferences: NotificationPreferences
  lastLogin?: string
  createdAt: string
  updatedAt: string
}

/**
 * Vendor-specific profile
 */
export interface VendorProfile extends UserProfile {
  role: 'vendor'
  businessName: string
  businessLicense: string
  gstNumber: string
  contactPerson: string
  stateOfOperation: string[]
  minimumOrderValue: number
  shippingDays: number
  verificationStatus: 'pending' | 'verified' | 'rejected'
  rating: number
  totalOrders: number
  activeProducts: number
}

/**
 * Farmer-specific profile
 */
export interface FarmerProfile extends UserProfile {
  role: 'farmer'
  farmSize?: number
  primaryCrops: string[]
  landOwned: boolean
  farmLocation?: UserLocation
}

/**
 * Expert-specific profile
 */
export interface ExpertProfile extends UserProfile {
  role: 'expert'
  specialization: string[]
  yearsOfExperience: number
  qualifications: string[]
  verificationStatus: 'pending' | 'verified' | 'rejected'
}

/**
 * Admin-specific profile
 */
export interface AdminProfile extends UserProfile {
  role: 'admin'
  adminLevel: 'super' | 'moderator' | 'support'
  permissions: string[]
}

/**
 * Update user profile request
 */
export interface UpdateProfileRequest {
  fullName?: string
  phone?: string
  language?: string
  location?: UserLocation
  bio?: string
  profileImage?: string
  notificationPreferences?: Partial<NotificationPreferences>
}

/**
 * Update vendor profile request
 */
export interface UpdateVendorProfileRequest extends UpdateProfileRequest {
  businessName?: string
  businessLicense?: string
  gstNumber?: string
  contactPerson?: string
  stateOfOperation?: string[]
  minimumOrderValue?: number
  shippingDays?: number
}

/**
 * Change password request
 */
export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

/**
 * User search filters
 */
export interface UserSearchFilters {
  role?: UserRole
  state?: string
  district?: string
  verificationStatus?: 'pending' | 'verified' | 'rejected'
  createdAfter?: string
  createdBefore?: string
  sortBy?: 'createdAt' | 'updatedAt' | 'rating'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}
