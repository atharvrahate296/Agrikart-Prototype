/**
 * Input Validation Utilities
 * Using Zod for schema validation
 */

import { z } from 'zod'
import type { UserRole } from '../types/auth.js'

/**
 * Email validation regex
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Password validation requirements:
 * - At least 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character (!@#$%^&*)
 */
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/

/**
 * Phone number validation (Indian format)
 */
const PHONE_REGEX = /^(\+91|0)?[6-9]\d{9}$/

/**
 * Pincode validation (Indian format)
 */
const PINCODE_REGEX = /^\d{6}$/

/**
 * Login schema
 */
export const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase(),
  password: z
    .string()
    .min(1, 'Password is required'),
})

/**
 * Sign up schema
 */
export const signUpSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase(),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters'),
  confirmPassword: z
    .string()
    .optional(),
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must not exceed 100 characters'),
  phone: z
    .string()
    .optional()
    .or(z.literal('')),
  role: z
    .enum(['farmer', 'buyer', 'fpo_agent', 'admin', 'vendor', 'expert'] as const)
    .default('farmer'),
  location: z.object({
    state: z.string().min(1, 'State is required'),
    district: z.string().min(1, 'District is required'),
    village: z.string().optional(),
    pincode: z
      .string()
      .regex(PINCODE_REGEX, 'Invalid pincode format')
      .optional(),
  }).optional(),
}).refine((data) => !data.confirmPassword || data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

/**
 * Email verification schema
 */
export const emailVerificationSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
})

/**
 * Password reset request schema
 */
export const passwordResetRequestSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase(),
})

/**
 * Password reset confirm schema
 */
export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .regex(PASSWORD_REGEX, 
      'Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

/**
 * Change password schema
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .regex(PASSWORD_REGEX, 
      'Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'New passwords do not match',
  path: ['confirmPassword'],
})

/**
 * Update profile schema
 */
export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must not exceed 100 characters')
    .optional(),
  phone: z
    .string()
    .regex(PHONE_REGEX, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  language: z
    .enum(['en', 'hi', 'ta', 'te', 'ka', 'ml'] as const)
    .optional(),
  bio: z
    .string()
    .max(500, 'Bio must not exceed 500 characters')
    .optional(),
  location: z.object({
    state: z.string().min(1),
    district: z.string().min(1),
    village: z.string().optional(),
    pincode: z
      .string()
      .regex(PINCODE_REGEX, 'Invalid pincode format')
      .optional(),
  }).optional(),
})

/**
 * Update vendor profile schema
 */
export const updateVendorProfileSchema = updateProfileSchema.extend({
  businessName: z
    .string()
    .min(2, 'Business name must be at least 2 characters')
    .optional(),
  gstNumber: z
    .string()
    .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z\d{1}$/, 'Invalid GST number format')
    .optional(),
  minimumOrderValue: z
    .number()
    .positive('Minimum order value must be positive')
    .optional(),
  shippingDays: z
    .number()
    .int()
    .positive()
    .optional(),
})

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  limit: z
    .number()
    .int()
    .positive()
    .default(10)
    .optional(),
  offset: z
    .number()
    .int()
    .nonnegative()
    .default(0)
    .optional(),
})

/**
 * Validate email
 */
export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email)
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Validate phone number
 */
export function validatePhoneNumber(phone: string): boolean {
  return PHONE_REGEX.test(phone)
}

/**
 * Validate pincode
 */
export function validatePincode(pincode: string): boolean {
  return PINCODE_REGEX.test(pincode)
}

/**
 * Validate role
 */
export function isValidRole(role: string): role is UserRole {
  return ['farmer', 'vendor', 'expert', 'admin', 'buyer', 'fpo_agent'].includes(role)
}
