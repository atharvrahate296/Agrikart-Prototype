/**
 * Supabase Configuration
 * Initializes Supabase client with proper authentication
 */

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Validate required environment variables
 */
function validateEnvironment(): void {
  const requiredVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_KEY']
  
  const missing = requiredVars.filter(
    (varName) => !process.env[varName]
  )

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file'
    )
  }
}

/**
 * Initialize Supabase client with anon key
 * Used for client-side operations
 */
export function createSupabaseAnonClient(): SupabaseClient {
  validateEnvironment()

  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  )
}

/**
 * Initialize Supabase admin client with service role key
 * Used for admin operations (should only be used on backend)
 * 
 * WARNING: Never expose this key to the frontend!
 */
export function createSupabaseAdminClient(): SupabaseClient {
  validateEnvironment()

  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  )
}

/**
 * Get singleton Supabase client (anon)
 */
let supabaseAnonClient: SupabaseClient | null = null

export function getSupabaseAnonClient(): SupabaseClient {
  if (!supabaseAnonClient) {
    supabaseAnonClient = createSupabaseAnonClient()
  }
  return supabaseAnonClient
}

/**
 * Get singleton Supabase admin client
 */
let supabaseAdminClient: SupabaseClient | null = null

export function getSupabaseAdminClient(): SupabaseClient {
  if (!supabaseAdminClient) {
    supabaseAdminClient = createSupabaseAdminClient()
  }
  return supabaseAdminClient
}

/**
 * Verify JWT token using Supabase
 */
export async function verifyJWT(token: string): Promise<any> {
  const client = getSupabaseAnonClient()
  
  const { data, error } = await client.auth.getUser(token)
  
  if (error || !data.user) {
    throw new Error('Invalid token')
  }

  return data.user
}

/**
 * Get user by ID from auth.users table
 */
export async function getUserById(userId: string): Promise<any> {
  const client = getSupabaseAdminClient()
  
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    throw new Error(`Failed to fetch user: ${error.message}`)
  }

  return data
}

/**
 * Get user by email from auth.users table
 */
export async function getUserByEmail(email: string): Promise<any> {
  const client = getSupabaseAdminClient()
  
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 means no rows returned
    throw new Error(`Failed to fetch user: ${error.message}`)
  }

  return data || null
}

/**
 * Create user in Supabase Auth
 */
export async function createAuthUser(
  email: string,
  password: string
): Promise<{ userId: string; user: any }> {
  const client = getSupabaseAdminClient()
  
  const { data, error } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: false, // User must verify email
  })

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`)
  }

  if (!data.user) {
    throw new Error('User creation failed')
  }

  return {
    userId: data.user.id,
    user: data.user,
  }
}

/**
 * Delete user from Supabase Auth
 */
export async function deleteAuthUser(userId: string): Promise<void> {
  const client = getSupabaseAdminClient()
  
  const { error } = await client.auth.admin.deleteUser(userId)

  if (error) {
    throw new Error(`Failed to delete user: ${error.message}`)
  }
}

/**
 * Send password reset link via Supabase admin (no Site URL config required).
 * Generates a recovery magic link and sends it via our custom Nodemailer SMTP.
 * Falls back to plain link if email sending fails (link is still valid).
 */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  const admin = getSupabaseAdminClient()

  // admin.generateLink works without a configured Supabase Site URL
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: `${process.env.FRONTEND_URL}/auth/reset-password`,
    },
  })

  if (error || !data?.properties?.action_link) {
    throw new Error(`Failed to generate reset link: ${error?.message ?? 'Unknown error'}`)
  }

  // Optionally send via custom SMTP — imported lazily to avoid circular dep
  try {
    const { emailService } = await import('../services/email/emailService.js')
    await emailService.sendVerificationEmail(email, data.properties.action_link)
  } catch (emailErr) {
    console.error('[supabase] Custom SMTP send failed, link was still generated:', emailErr)
  }
}

/**
 * Reset password for a user by userId (admin, no active session required).
 * Used after OTP verification on the backend.
 */
export async function resetPassword(userId: string, newPassword: string): Promise<void> {
  const admin = getSupabaseAdminClient()

  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: newPassword,
  })

  if (error) {
    throw new Error(`Failed to reset password: ${error.message}`)
  }
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string): Promise<void> {
  const client = getSupabaseAnonClient()
  
  const { error } = await client.auth.verifyOtp({
    token_hash: token,
    type: 'email',
  })

  if (error) {
    throw new Error(`Failed to verify email: ${error.message}`)
  }
}

/**
 * Export for use in other modules
 */
export const supabaseConfig = {
  getSupabaseAnonClient,
  getSupabaseAdminClient,
  verifyJWT,
  getUserById,
  getUserByEmail,
  createAuthUser,
  deleteAuthUser,
  sendPasswordResetEmail,
  resetPassword,
  verifyEmail,
}
