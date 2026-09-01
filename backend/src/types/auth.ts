/**
 * Authentication Type Definitions
 * Defines all types for authentication system
 */

export type UserRole = 'farmer' | 'vendor' | 'expert' | 'admin' | 'buyer' | 'fpo_agent'

/**
 * JWT Payload structure
 * Decoded from Supabase JWT token
 */
export interface JWTPayload {
  sub: string // User ID (UUID)
  email: string
  email_verified: boolean
  phone_verified: boolean
  aud: string
  iat: number
  exp: number
  iss: string
  role?: string
  [key: string]: any
}

/**
 * Authenticated user context
 * Attached to request object after middleware validation
 */
export interface AuthContext {
  userId: string
  email: string
  role: UserRole
  emailVerified: boolean
  phoneVerified: boolean
}

/**
 * Login request payload
 */
export interface LoginRequest {
  email: string
  password: string
}

/**
 * Sign up request payload
 */
export interface SignUpRequest {
  email: string
  password: string
  fullName: string
  phone?: string
  role: UserRole
  location?: {
    state: string
    district: string
    village?: string
    pincode?: string
  }
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  email: string
}

/**
 * Password reset confirmation
 */
export interface PasswordResetConfirmRequest {
  token: string
  newPassword: string
}

/**
 * Auth response (after login/signup)
 */
export interface AuthResponse {
  success: boolean
  message: string
  user?: {
    id: string
    email: string
    full_name?: string
    role: UserRole
  }
  token?: string
}

/**
 * Token refresh request
 */
export interface RefreshTokenRequest {
  refreshToken: string
}

/**
 * Verify email request
 */
export interface VerifyEmailRequest {
  token: string
}

/**
 * User profile data from database
 */
export interface UserProfile {
  id: string
  email: string
  fullName: string
  phone?: string
  role: UserRole
  language: string
  location?: {
    state: string
    district: string
    village?: string
    pincode?: string
  }
  emailVerified: boolean
  phoneVerified: boolean
  verificationStatus: 'pending' | 'verified' | 'rejected'
  notificationPreferences: {
    emailNotifications: boolean
    pushNotifications: boolean
    smsNotifications: boolean
  }
  createdAt: string
  updatedAt: string
}

/**
 * Permission levels
 */
export interface Permission {
  resource: string // e.g., 'products', 'orders', 'users'
  action: string // e.g., 'create', 'read', 'update', 'delete'
  owned?: boolean // If true, user can only access own resources
}

/**
 * Role-based permissions mapping
 */
export type RolePermissions = Record<UserRole, Permission[]>

/**
 * Auth middleware error types
 */
export enum AuthErrorType {
  MISSING_TOKEN = 'MISSING_TOKEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  UNAUTHORIZED = 'UNAUTHORIZED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
}

/**
 * Rate limiting data
 */
export interface RateLimitInfo {
  attempts: number
  lastAttempt: Date
  locked: boolean
  lockedUntil?: Date
}

/**
 * Session data
 */
export interface SessionData {
  userId: string
  email: string
  role: UserRole
  createdAt: Date
  expiresAt: Date
}
