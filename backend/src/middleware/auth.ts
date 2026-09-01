/**
 * Authentication Middleware
 * Validates JWT tokens and authorizes requests
 */

import type { Request, Response, NextFunction } from 'express'
import type { AuthContext, UserRole } from '../types/auth.js'
import {
  AuthenticationError,
  AuthorizationError,
  ErrorCode,
} from '../utils/errors.js'
import { roleService } from '../services/auth/roleService.js'
import { createSupabaseAdminClient } from '../config/supabase.js'

/**
 * Extend Express Request to include auth context
 */
declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext
    }
  }
}

/**
 * JWT authentication middleware
 * Extracts and validates JWT token from request
 * 
 * JWT should be in:
 * 1. Authorization header: Bearer <token>
 * 2. HttpOnly cookie: sb-auth-token
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract JWT from Authorization header or cookies
    let token: string | null = null

    // Try Authorization header first
    const authHeader = req.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }

    // Fall back to HttpOnly cookie
    if (!token) {
      token = req.cookies['sb-auth-token'] || req.cookies['auth-token']
    }

    if (!token) {
      throw new AuthenticationError(
        'Missing authentication token',
        ErrorCode.MISSING_TOKEN
      )
    }

    // Verify JWT
    // In production, use Supabase.auth.getUser(token) or
    // a proper JWT verification library with RS256 keys
    const decoded = verifyJWT(token)
    const profile = await getApplicationProfile(decoded.sub || decoded.user_id, decoded.email)

    // Attach auth context to request
    req.auth = {
      userId: decoded.sub || decoded.user_id,
      email: profile?.email || decoded.email,
      role: (profile?.role || decoded.user_metadata?.role || decoded.app_metadata?.role || 'farmer') as UserRole,
      emailVerified: profile?.email_verified ?? profile?.verified ?? decoded.email_verified ?? false,
      phoneVerified: decoded.phone_verified || false,
    }

    next()
  } catch (error) {
    if (error instanceof AuthenticationError) {
      res.status(error.statusCode).json(error.toJSON())
      return
    }

    res.status(401).json({
      error: {
        message: 'Authentication failed',
        code: ErrorCode.INVALID_TOKEN,
      },
    })
  }
}

/**
 * Optional authentication middleware
 * Does not throw if token is missing, but validates if present
 */
export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract JWT
    let token: string | null = null

    const authHeader = req.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }

    if (!token) {
      token = req.cookies['sb-auth-token'] || req.cookies['auth-token']
    }

    // If token exists, verify it
    if (token) {
      const decoded = verifyJWT(token)
      const profile = await getApplicationProfile(decoded.sub || decoded.user_id, decoded.email)
      req.auth = {
        userId: decoded.sub || decoded.user_id,
        email: profile?.email || decoded.email,
        role: (profile?.role || decoded.user_metadata?.role || decoded.app_metadata?.role || 'farmer') as UserRole,
        emailVerified: profile?.email_verified ?? profile?.verified ?? decoded.email_verified ?? false,
        phoneVerified: decoded.phone_verified || false,
      }
    }

    next()
  } catch (error) {
    // Continue without auth context
    next()
  }
}

/**
 * Require specific role(s)
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      throw new AuthenticationError(
        'Authentication required',
        ErrorCode.UNAUTHORIZED
      )
    }

    if (!allowedRoles.includes(req.auth.role)) {
      throw new AuthorizationError(
        `This action requires one of these roles: ${allowedRoles.join(', ')}`,
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        {
          userRole: req.auth.role,
          requiredRoles: allowedRoles,
        }
      )
    }

    next()
  }
}

/**
 * Require email verification
 */
export function requireEmailVerified(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.auth) {
    throw new AuthenticationError(
      'Authentication required',
      ErrorCode.UNAUTHORIZED
    )
  }

  if (!req.auth.emailVerified) {
    throw new AuthenticationError(
      'Email verification required',
      ErrorCode.EMAIL_NOT_VERIFIED,
      {
        userId: req.auth.userId,
        email: req.auth.email,
      }
    )
  }

  next()
}

/**
 * Require specific permission
 */
export function requirePermission(resource: string, action: string) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.auth) {
      throw new AuthenticationError(
        'Authentication required',
        ErrorCode.UNAUTHORIZED
      )
    }

    // Check if user has permission
    const hasPermission = roleService.hasPermission(
      req.auth.role,
      resource,
      action
    )

    if (!hasPermission) {
      throw new AuthorizationError(
        `You do not have permission to ${action} ${resource}`,
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        {
          resource,
          action,
          userRole: req.auth.role,
        }
      )
    }

    next()
  }
}

/**
 * Verify JWT token (placeholder)
 * In production, use a JWT library with proper RS256 verification
 */
function verifyJWT(token: string): any {
  try {
    // This is a simplified example
    // In production:
    // 1. Use jsonwebtoken library with public key
    // 2. Verify signature with Supabase's RS256 public key
    // 3. Check expiration and other claims

    // For now, decode without verification
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format')
    }

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString()
    )

    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      throw new AuthenticationError(
        'Token has expired',
        ErrorCode.EXPIRED_TOKEN
      )
    }

    return payload
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error
    }
    throw new AuthenticationError(
      'Invalid token',
      ErrorCode.INVALID_TOKEN
    )
  }
}

async function getApplicationProfile(userId?: string, email?: string): Promise<any | null> {
  if (!userId && !email) return null

  const supabase = createSupabaseAdminClient()
  const selectors = [
    { table: 'profiles', column: userId ? 'id' : 'email', value: userId || email },
    { table: 'users', column: userId ? 'id' : 'email', value: userId || email },
  ]

  for (const selector of selectors) {
    const { data, error } = await supabase
      .from(selector.table)
      .select('*')
      .eq(selector.column, selector.value)
      .maybeSingle()

    if (!error && data) return data
  }

  return null
}

/**
 * Export middleware
 */
export const authMiddlewares = {
  auth: authMiddleware,
  optionalAuth: optionalAuthMiddleware,
  requireRole,
  requireEmailVerified,
  requirePermission,
}
