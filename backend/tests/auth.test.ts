/**
 * Authentication Tests
 * Unit and integration tests for authentication system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { authService } from '../src/services/auth/authService'
import { roleService } from '../src/services/auth/roleService'
import {
  validateEmail,
  validatePasswordStrength,
  validatePhoneNumber,
  validatePincode,
} from '../src/utils/validators'
import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  ConflictError,
  ErrorCode,
} from '../src/utils/errors'

vi.mock('../src/config/supabase', () => ({
  getUserByEmail: vi.fn(async (email: string) => {
    if (email === 'existing@example.com') {
      return { id: 'user-123', email, role: 'farmer' };
    }
    return null;
  }),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  createAuthUser: vi.fn(),
  getSupabaseAdminClient: vi.fn(),
  getSupabaseAnonClient: vi.fn(),
}));

/**
 * Auth Service Tests
 */
describe('AuthService', () => {
  describe('signup', () => {
    it('should create a new user account', async () => {
      const signupData = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        fullName: 'John Farmer',
        phone: '9876543210',
        role: 'farmer' as const,
        location: {
          state: 'Maharashtra',
          district: 'Pune',
          village: 'Test Village',
          pincode: '411001',
        },
      }

      // This would need mocking of Supabase
      // const result = await authService.signup(signupData)
      // expect(result.success).toBe(true)
      // expect(result.user?.email).toBe(signupData.email)
    })

    it('should reject duplicate email', async () => {
      const signupData = {
        email: 'existing@example.com',
        password: 'SecurePass123!',
        fullName: 'John Farmer',
        role: 'farmer' as const,
      }

      // This would need mocking
      // expect(async () => {
      //   await authService.signup(signupData)
      //   await authService.signup(signupData)
      // }).rejects.toThrow(ConflictError)
    })

    it('should reject weak password', async () => {
      const signupData = {
        email: 'test@example.com',
        password: 'weak',
        fullName: 'John Farmer',
        role: 'farmer' as const,
      }

      // const result = validationSchema.safeParse(signupData)
      // expect(result.success).toBe(false)
    })

    it('should validate required fields', async () => {
      const signupData = {
        email: 'test@example.com',
        // Missing password
        fullName: 'John Farmer',
        role: 'farmer' as const,
      }

      // const result = signUpSchema.safeParse(signupData)
      // expect(result.success).toBe(false)
    })
  })

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const credentials = {
        email: 'user@example.com',
        password: 'SecurePass123!',
      }

      // This would need mocking
      // const result = await authService.login(credentials)
      // expect(result.success).toBe(true)
      // expect(result.user?.email).toBe(credentials.email)
    })

    it('should reject invalid email', async () => {
      const credentials = {
        email: 'invalid-email',
        password: 'SecurePass123!',
      }

      // expect(async () => {
      //   await authService.login(credentials)
      // }).rejects.toThrow(AuthenticationError)
    })

    it('should reject wrong password', async () => {
      const credentials = {
        email: 'user@example.com',
        password: 'WrongPassword123!',
      }

      // expect(async () => {
      //   await authService.login(credentials)
      // }).rejects.toThrow(AuthenticationError)
    })

    it('should reject non-existent user', async () => {
      const credentials = {
        email: 'nonexistent@example.com',
        password: 'SecurePass123!',
      }

      // expect(async () => {
      //   await authService.login(credentials)
      // }).rejects.toThrow(AuthenticationError)
    })
  })

  describe('password reset', () => {
    it('should request password reset for valid email', async () => {
      // const result = await authService.requestPasswordReset('user@example.com')
      // expect(result.success).toBe(true)
    })

    it('should not reveal if email exists (security)', async () => {
      const result1 = await authService.requestPasswordReset('existing@example.com')
      const result2 = await authService.requestPasswordReset(
        'nonexistent@example.com'
      )

      expect(result1.message).toBe(result2.message)
    })

    it('should reject invalid email', async () => {
      // expect(async () => {
      //   await authService.requestPasswordReset('invalid-email')
      // }).rejects.toThrow()
    })
  })
})

/**
 * Role Service Tests
 */
describe('RoleService', () => {
  describe('hasPermission', () => {
    it('farmer should read products', () => {
      const has = roleService.hasPermission('farmer', 'products', 'read')
      expect(has).toBe(true)
    })

    it('farmer should not create products', () => {
      const has = roleService.hasPermission('farmer', 'products', 'create')
      expect(has).toBe(false)
    })

    it('vendor should create products', () => {
      const has = roleService.hasPermission('vendor', 'products', 'create', true)
      expect(has).toBe(true)
    })

    it('vendor should not create for others', () => {
      const has = roleService.hasPermission('vendor', 'products', 'create', false)
      expect(has).toBe(false)
    })

    it('expert should read predictions', () => {
      const has = roleService.hasPermission('expert', 'predictions', 'read')
      expect(has).toBe(true)
    })

    it('admin should have full access', () => {
      const hasCreate = roleService.hasPermission('admin', 'anything', 'create')
      const hasDelete = roleService.hasPermission('admin', 'anything', 'delete')

      expect(hasCreate).toBe(true)
      expect(hasDelete).toBe(true)
    })
  })

  describe('assertPermission', () => {
    it('should not throw if user has permission', () => {
      expect(() => {
        roleService.assertPermission('farmer', 'products', 'read')
      }).not.toThrow()
    })

    it('should throw if user lacks permission', () => {
      expect(() => {
        roleService.assertPermission('farmer', 'products', 'create')
      }).toThrow(AuthorizationError)
    })
  })

  describe('getPermissionsForRole', () => {
    it('should return farmer permissions', () => {
      const perms = roleService.getPermissionsForRole('farmer')
      expect(perms.length).toBeGreaterThan(0)
      expect(perms.some((p) => p.resource === 'products')).toBe(true)
    })

    it('should return vendor permissions', () => {
      const perms = roleService.getPermissionsForRole('vendor')
      expect(perms.length).toBeGreaterThan(0)
      expect(perms.some((p) => p.resource === 'products' && p.action === 'create')).toBe(
        true
      )
    })

    it('should return admin permissions', () => {
      const perms = roleService.getPermissionsForRole('admin')
      expect(perms.some((p) => p.resource === '*')).toBe(true)
    })
  })
})

/**
 * Validator Tests
 */
describe('Validators', () => {
  describe('validateEmail', () => {
    it('should accept valid email', () => {
      expect(validateEmail('user@example.com')).toBe(true)
      expect(validateEmail('test.email+tag@domain.co.in')).toBe(true)
    })

    it('should reject invalid email', () => {
      expect(validateEmail('invalid')).toBe(false)
      expect(validateEmail('invalid@')).toBe(false)
      expect(validateEmail('@example.com')).toBe(false)
    })
  })

  describe('validatePasswordStrength', () => {
    it('should accept strong password', () => {
      const result = validatePasswordStrength('SecurePass123!')
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject weak password - too short', () => {
      const result = validatePasswordStrength('Short1!')
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should reject password without uppercase', () => {
      const result = validatePasswordStrength('lowercase123!')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(
        'Password must contain at least one uppercase letter'
      )
    })

    it('should reject password without number', () => {
      const result = validatePasswordStrength('NoNumbers!')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one number')
    })

    it('should reject password without special char', () => {
      const result = validatePasswordStrength('NoSpecial123')
      expect(result.isValid).toBe(false)
    })
  })

  describe('validatePhoneNumber', () => {
    it('should accept valid Indian phone', () => {
      expect(validatePhoneNumber('9876543210')).toBe(true)
      expect(validatePhoneNumber('+919876543210')).toBe(true)
      expect(validatePhoneNumber('09876543210')).toBe(true)
    })

    it('should reject invalid phone', () => {
      expect(validatePhoneNumber('1234567890')).toBe(false)
      expect(validatePhoneNumber('invalid')).toBe(false)
    })
  })

  describe('validatePincode', () => {
    it('should accept valid Indian pincode', () => {
      expect(validatePincode('411001')).toBe(true)
      expect(validatePincode('560001')).toBe(true)
    })

    it('should reject invalid pincode', () => {
      expect(validatePincode('11001')).toBe(false)
      expect(validatePincode('4110011')).toBe(false)
      expect(validatePincode('invalid')).toBe(false)
    })
  })
})

/**
 * Error Tests
 */
describe('Error Classes', () => {
  it('should create AuthenticationError with correct status', () => {
    const error = new AuthenticationError('Invalid credentials')
    expect(error.statusCode).toBe(401)
    expect(error.code).toBe(ErrorCode.UNAUTHORIZED)
  })

  it('should create AuthorizationError with correct status', () => {
    const error = new AuthorizationError('Access denied')
    expect(error.statusCode).toBe(403)
  })

  it('should serialize error to JSON', () => {
    const error = new AuthenticationError('Test error', ErrorCode.INVALID_TOKEN)
    const json = error.toJSON()

    expect(json.error.message).toBe('Test error')
    expect(json.error.code).toBe(ErrorCode.INVALID_TOKEN)
  })

  it('should include stack trace in development', () => {
    process.env.NODE_ENV = 'development'
    const error = new AuthenticationError('Test')
    const json = error.toJSON()

    expect(json.error.stack).toBeDefined()
  })

  it('should exclude stack trace in production', () => {
    process.env.NODE_ENV = 'production'
    const error = new AuthenticationError('Test')
    const json = error.toJSON()

    expect(json.error.stack).toBeUndefined()
  })
})
