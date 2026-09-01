/**
 * Role-Based Access Control Service
 * Manages user roles and permissions
 */

import type { UserRole, RolePermissions, Permission } from '../../types/auth'
import { AuthorizationError, ErrorCode } from '../../utils/errors'
import { getSupabaseAdminClient } from '../../config/supabase'

/**
 * Define permissions for each role
 * Follows principle of least privilege
 */
const ROLE_PERMISSIONS: RolePermissions = {
  farmer: [
    // Profile management
    { resource: 'profile', action: 'read', owned: true },
    { resource: 'profile', action: 'update', owned: true },
    
    // Marketplace access
    { resource: 'products', action: 'read' },
    { resource: 'categories', action: 'read' },
    { resource: 'reviews', action: 'read' },
    
    // Cart and orders
    { resource: 'cart', action: 'create', owned: true },
    { resource: 'cart', action: 'read', owned: true },
    { resource: 'cart', action: 'update', owned: true },
    { resource: 'cart', action: 'delete', owned: true },
    { resource: 'orders', action: 'create', owned: true },
    { resource: 'orders', action: 'read', owned: true },
    
    // Disease intelligence
    { resource: 'diseases', action: 'read' },
    { resource: 'predictions', action: 'create', owned: true },
    { resource: 'predictions', action: 'read', owned: true },
    { resource: 'predictions', action: 'delete', owned: true },
    { resource: 'feedback', action: 'create', owned: true },
    
    // Schemes and news
    { resource: 'schemes', action: 'read' },
    { resource: 'articles', action: 'read' },
    { resource: 'alerts', action: 'read', owned: true },
    
    // AI Assistant
    { resource: 'chat', action: 'create', owned: true },
    { resource: 'chat', action: 'read', owned: true },
    { resource: 'chat', action: 'delete', owned: true },
  ],

  vendor: [
    // Profile management
    { resource: 'profile', action: 'read', owned: true },
    { resource: 'profile', action: 'update', owned: true },
    
    // Product management
    { resource: 'products', action: 'create', owned: true },
    { resource: 'products', action: 'read' },
    { resource: 'products', action: 'update', owned: true },
    { resource: 'products', action: 'delete', owned: true },
    
    // Categories
    { resource: 'categories', action: 'read' },
    
    // Orders
    { resource: 'orders', action: 'read', owned: true },
    { resource: 'orders', action: 'update', owned: true },
    
    // Reviews
    { resource: 'reviews', action: 'read', owned: true },
    
    // Vendor dashboard
    { resource: 'dashboard', action: 'read', owned: true },
    { resource: 'analytics', action: 'read', owned: true },
    
    // Schemes and news (read-only)
    { resource: 'schemes', action: 'read' },
    { resource: 'articles', action: 'read' },
  ],

  expert: [
    // Profile management
    { resource: 'profile', action: 'read', owned: true },
    { resource: 'profile', action: 'update', owned: true },
    
    // Disease expertise
    { resource: 'diseases', action: 'read' },
    { resource: 'diseases', action: 'update' },
    { resource: 'predictions', action: 'read' },
    { resource: 'feedback', action: 'create' },
    { resource: 'feedback', action: 'read' },
    
    // Marketplace (read-only)
    { resource: 'products', action: 'read' },
    { resource: 'categories', action: 'read' },
    
    // Content review
    { resource: 'articles', action: 'read' },
    { resource: 'schemes', action: 'read' },
  ],

  admin: [
    // Full access to all resources
    { resource: '*', action: '*' },
  ],

  buyer: [
    { resource: 'profile', action: 'read', owned: true },
    { resource: 'profile', action: 'update', owned: true },
    { resource: 'products', action: 'read' },
    { resource: 'categories', action: 'read' },
    { resource: 'reviews', action: 'read' },
    { resource: 'reviews', action: 'create', owned: true },
    { resource: 'cart', action: 'create', owned: true },
    { resource: 'cart', action: 'read', owned: true },
    { resource: 'cart', action: 'update', owned: true },
    { resource: 'cart', action: 'delete', owned: true },
    { resource: 'orders', action: 'create', owned: true },
    { resource: 'orders', action: 'read', owned: true },
    { resource: 'schemes', action: 'read' },
    { resource: 'articles', action: 'read' },
  ],

  fpo_agent: [
    { resource: 'profile', action: 'read', owned: true },
    { resource: 'profile', action: 'update', owned: true },
    { resource: 'products', action: 'read' },
    { resource: 'categories', action: 'read' },
    { resource: 'reviews', action: 'read' },
    { resource: 'cart', action: 'create', owned: true },
    { resource: 'cart', action: 'read', owned: true },
    { resource: 'cart', action: 'update', owned: true },
    { resource: 'cart', action: 'delete', owned: true },
    { resource: 'orders', action: 'create', owned: true },
    { resource: 'orders', action: 'read', owned: true },
    { resource: 'diseases', action: 'read' },
    { resource: 'predictions', action: 'create', owned: true },
    { resource: 'predictions', action: 'read', owned: true },
    { resource: 'predictions', action: 'delete', owned: true },
    { resource: 'schemes', action: 'read' },
    { resource: 'articles', action: 'read' },
    { resource: 'alerts', action: 'read', owned: true },
    { resource: 'chat', action: 'create', owned: true },
    { resource: 'chat', action: 'read', owned: true },
  ],
}

/**
 * Check if user has permission for an action
 */
export function hasPermission(
  userRole: UserRole,
  resource: string,
  action: string,
  isOwnedResource: boolean = false
): boolean {
  const permissions = ROLE_PERMISSIONS[userRole]
  
  if (!permissions) {
    return false
  }

  return permissions.some((permission) => {
    // Check wildcard permissions
    if (permission.resource === '*' && permission.action === '*') {
      return true
    }

    // Check specific resource and action
    const resourceMatch = permission.resource === '*' || permission.resource === resource
    const actionMatch = permission.action === '*' || permission.action === action

    if (!resourceMatch || !actionMatch) {
      return false
    }

    // If permission requires ownership, check if resource is owned
    if (permission.owned && !isOwnedResource) {
      return false
    }

    return true
  })
}

/**
 * Assert that user has permission, throw if not
 */
export function assertPermission(
  userRole: UserRole,
  resource: string,
  action: string,
  isOwnedResource: boolean = false
): void {
  if (!hasPermission(userRole, resource, action, isOwnedResource)) {
    throw new AuthorizationError(
      `You do not have permission to ${action} ${resource}`,
      ErrorCode.INSUFFICIENT_PERMISSIONS,
      {
        resource,
        action,
        userRole,
      }
    )
  }
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || []
}

/**
 * Check if resource is owned by user
 */
export async function isResourceOwned(
  userId: string,
  resourceType: string,
  resourceId: string
): Promise<boolean> {
  const supabase = getSupabaseAdminClient()

  // Map resource types to tables and ownership fields
  const ownershipMap: Record<string, { table: string; userField: string }> = {
    order: { table: 'orders', userField: 'farmer_id' },
    product: { table: 'products', userField: 'vendor_id' },
    cart: { table: 'cart_items', userField: 'farmer_id' },
    profile: { table: 'profiles', userField: 'id' },
    prediction: { table: 'disease_predictions', userField: 'farmer_id' },
    chat: { table: 'chat_sessions', userField: 'farmer_id' },
  }

  const mapping = ownershipMap[resourceType]
  if (!mapping) {
    return false
  }

  const { data, error } = await supabase
    .from(mapping.table)
    .select('id')
    .eq('id', resourceId)
    .eq(mapping.userField, userId)
    .single()

  if (error) {
    return false
  }

  return !!data
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(
  userId: string,
  newRole: UserRole
): Promise<void> {
  // Validate role
  if (!['farmer', 'vendor', 'expert', 'admin'].includes(newRole)) {
    throw new Error(`Invalid role: ${newRole}`)
  }

  const supabase = getSupabaseAdminClient()

  const { error } = await supabase
    .from('profiles')
    .update({
      role: newRole,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (error) {
    throw new Error(`Failed to update role: ${error.message}`)
  }
}

/**
 * Get user role
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (error || !data) {
    throw new Error(`Failed to fetch user role: ${error?.message || 'User not found'}`)
  }

  return data.role as UserRole
}

/**
 * Check if user can access resource based on RLS
 * This is enforced by database RLS policies
 */
export function canAccessResource(
  userRole: UserRole,
  resource: string,
  isOwned: boolean = false
): boolean {
  return hasPermission(userRole, resource, 'read', isOwned)
}

/**
 * Export role service
 */
export const roleService = {
  hasPermission,
  assertPermission,
  getPermissionsForRole,
  isResourceOwned,
  updateUserRole,
  getUserRole,
  canAccessResource,
}
