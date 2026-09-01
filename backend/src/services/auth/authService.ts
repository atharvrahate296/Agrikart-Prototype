/**
 * Authentication Service
 * Handles all authentication business logic
 * Delegates password handling to Supabase Auth
 */

import type { AuthContext, LoginRequest, SignUpRequest, AuthResponse } from '../../types/auth.js'
import type { UserProfile } from '../../types/user.js'
import { 
  createAuthUser, 
  getUserByEmail, 
  sendPasswordResetEmail,
  resetPassword,
  verifyEmail,
  getSupabaseAdminClient,
  getSupabaseAnonClient,
} from '../../config/supabase.js'
import {
  AuthenticationError,
  ValidationError,
  ConflictError,
  NotFoundError,
  ErrorCode,
} from '../../utils/errors.js'
import {
  loginSchema,
  signUpSchema,
  validateEmail,
} from '../../utils/validators.js'

/**
 * Login user with email and password
 */
export async function login(
  credentials: LoginRequest
): Promise<AuthResponse> {
  // Validate input
  const validation = loginSchema.safeParse(credentials)
  if (!validation.success) {
    throw new ValidationError(
      'Invalid email or password',
      ErrorCode.INVALID_CREDENTIALS
    )
  }

  const { email, password } = validation.data

  // Authenticate credentials via Supabase Auth
  const client = getSupabaseAnonClient()
  let { data: authData, error: authError } = await client.auth.signInWithPassword({
    email,
    password,
  })

  // If email is unconfirmed, auto-confirm user via Admin API and retry login
  if (authError && authError.message.toLowerCase().includes('email not confirmed')) {
    try {
      const admin = getSupabaseAdminClient()
      const existingUser = await getUserByEmail(email)
      if (existingUser?.id) {
        await admin.auth.admin.updateUserById(existingUser.id, { email_confirm: true })
        // Retry login after auto-confirm
        const retry = await client.auth.signInWithPassword({ email, password })
        authData = retry.data
        authError = retry.error
      }
    } catch (autoConfirmErr) {
      console.error('[authService] Auto-confirm email failed:', autoConfirmErr)
    }
  }

  if (authError || !authData.user || !authData.session) {
    throw new AuthenticationError(
      authError?.message || 'Invalid email or password',
      ErrorCode.INVALID_CREDENTIALS
    )
  }

  const existingUser = await getUserByEmail(email)

  return {
    success: true,
    message: 'Login successful',
    token: authData.session.access_token,
    user: {
      id: authData.user.id,
      email: authData.user.email || email,
      full_name: existingUser?.full_name || authData.user.user_metadata?.full_name || 'User',
      role: existingUser?.role || authData.user.user_metadata?.role || 'farmer',
    },
  }
}

/**
 * Sign up new user
 */
export async function signup(
  signupData: SignUpRequest
): Promise<AuthResponse> {
  // Validate input
  const validation = signUpSchema.safeParse(signupData)
  if (!validation.success) {
    throw new ValidationError(
      'Validation failed',
      ErrorCode.VALIDATION_ERROR,
      {
        details: validation.error.errors,
      }
    )
  }

  const {
    email,
    password,
    fullName,
    phone,
    role,
    location,
  } = validation.data

  // Check if user already exists in profiles
  const existingUser = await getUserByEmail(email)
  let userId: string = ''

  if (existingUser) {
    const admin = getSupabaseAdminClient()
    const { data: usersData } = await admin.auth.admin.listUsers()
    const existingAuthUser = usersData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (existingAuthUser) {
      await admin.auth.admin.updateUserById(existingAuthUser.id, {
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, role }
      })
      userId = existingAuthUser.id
    }
  }

  if (!userId) {
    try {
      const admin = getSupabaseAdminClient()
      const { data: userData, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role: role,
        }
      })

      if (createError || !userData?.user) {
        throw new Error(createError?.message || 'Failed to create user account')
      }

      userId = userData.user.id
    } catch (error) {
      if (error instanceof Error && (error.message.includes('already') || error.message.includes('registered') || error.message.includes('exists'))) {
        const admin = getSupabaseAdminClient()
        const { data: usersData } = await admin.auth.admin.listUsers()
        const existingAuthUser = usersData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
        if (existingAuthUser) {
          await admin.auth.admin.updateUserById(existingAuthUser.id, {
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName, role }
          })
          userId = existingAuthUser.id
        } else {
          throw new ConflictError('Email address is already registered')
        }
      } else {
        throw error
      }
    }
  }

  // Create user profile in profiles table
  const supabase = getSupabaseAdminClient()
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email,
      full_name: fullName,
      phone: phone || null,
      role,
      location: typeof location === 'string' ? location : (location ? `${location.district || ''}, ${location.state || ''}` : null),
    })
    .select()
    .single()

  if (profileError) {
    // Clean up auth user if profile creation fails
    try {
      const adminClient = getSupabaseAdminClient()
      await adminClient.auth.admin.deleteUser(userId)
    } catch (cleanupError) {
      console.error('Failed to cleanup auth user:', cleanupError)
    }

    throw new Error(`Failed to create user profile: ${profileError.message}`)
  }

  // Create user record in users table
  const { error: usersError } = await supabase
    .from('users')
    .upsert({
      id: userId,
      email,
      full_name: fullName,
      phone: phone || null,
      role,
      verified: false,
      location: location || null,
    })

  if (usersError) {
    console.error('Failed to create users record:', usersError)
  }

  // Create vendor profile if user is a vendor
  if (role === 'vendor') {
    const businessName = `${fullName}'s Business`
    const { error: vendorError } = await supabase
      .from('vendors')
      .upsert({
        id: userId,
        user_id: userId,
        company_name: businessName,
        business_name: businessName,
        owner_name: fullName,
        business_phone: phone || null,
        business_description: 'New vendor profile',
        is_active: true,
      })

    if (vendorError) {
      console.error('Failed to create vendor profile:', vendorError)
    }
  }

  return {
    success: true,
    message: 'Account created successfully.',
    user: {
      id: userId,
      email,
      role,
    },
  }
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email: string): Promise<AuthResponse> {
  // Validate email
  if (!validateEmail(email)) {
    throw new AuthenticationError(
      'Invalid email address',
      ErrorCode.INVALID_EMAIL
    )
  }

  // Check if user exists
  const user = await getUserByEmail(email)
  if (!user) {
    // Return success even if user doesn't exist (security practice)
    return {
      success: true,
      message: 'If an account exists, you will receive a password reset email',
    }
  }

  // Send password reset email
  try {
    await sendPasswordResetEmail(email)
  } catch (error) {
    console.error('Failed to send password reset email:', error)
    throw new Error('Failed to send password reset email')
  }

  return {
    success: true,
    message: 'If an account exists, you will receive a password reset email',
  }
}

/**
 * Confirm password reset
 */
export async function confirmPasswordReset(
  token: string,
  newPassword: string
): Promise<AuthResponse> {
  if (!token) {
    throw new AuthenticationError(
      'Invalid reset token',
      ErrorCode.INVALID_TOKEN
    )
  }

  try {
    await resetPassword(token, newPassword)
  } catch (error) {
    throw new AuthenticationError(
      'Failed to reset password',
      ErrorCode.INVALID_TOKEN,
      {
        details: error instanceof Error ? error.message : 'Unknown error',
      }
    )
  }

  return {
    success: true,
    message: 'Password reset successfully',
  }
}

/**
 * Verify email with token
 */
export async function confirmEmailVerification(token: string): Promise<AuthResponse> {
  if (!token) {
    throw new AuthenticationError(
      'Invalid verification token',
      ErrorCode.INVALID_TOKEN
    )
  }

  try {
    await verifyEmail(token)
  } catch (error) {
    throw new AuthenticationError(
      'Failed to verify email',
      ErrorCode.INVALID_TOKEN,
      {
        details: error instanceof Error ? error.message : 'Unknown error',
      }
    )
  }

  // Mark profile as email verified
  // This would typically be done via an after-auth trigger in Supabase
  
  return {
    success: true,
    message: 'Email verified successfully',
  }
}

/**
 * Get user profile by ID
 */
export async function getUserProfile(userId: string): Promise<UserProfile> {
  const supabase = getSupabaseAdminClient()
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    throw new NotFoundError('User not found', { userId })
  }

  return mapProfileData(profile)
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  const supabase = getSupabaseAdminClient()

  const { data: profile, error } = await supabase
    .from('profiles')
    .update({
      full_name: updates.fullName,
      phone: updates.phone,
      language: updates.language,
      location: updates.location,
      bio: updates.bio,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`)
  }

  return mapProfileData(profile)
}

/**
 * Map database profile to UserProfile type
 */
function mapProfileData(dbProfile: any): UserProfile {
  return {
    id: dbProfile.id,
    email: dbProfile.email,
    fullName: dbProfile.full_name,
    phone: dbProfile.phone,
    role: dbProfile.role,
    language: dbProfile.language,
    location: dbProfile.location,
    bio: dbProfile.bio,
    emailVerified: dbProfile.email_verified,
    phoneVerified: dbProfile.phone_verified,
    verificationStatus: dbProfile.verification_status,
    notificationPreferences: dbProfile.notification_preferences,
    lastLogin: dbProfile.last_login,
    createdAt: dbProfile.created_at,
    updatedAt: dbProfile.updated_at,
  }
}

/**
 * Export auth service
 */
export const authService = {
  login,
  signup,
  requestPasswordReset,
  confirmPasswordReset,
  confirmEmailVerification,
  getUserProfile,
  updateUserProfile,
}
