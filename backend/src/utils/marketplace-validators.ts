/**
 * @fileoverview Marketplace Validators - Zod schemas for all marketplace operations
 * @module src/utils/marketplace-validators
 */

import { z } from 'zod';

/**
 * Product creation schema
 */
const productPayloadSchema = z.object({
  category_id: z.string().uuid('Invalid category ID').optional(),
  category: z.string().min(2).max(100).optional(),
  name: z.string()
    .min(3, 'Product name must be at least 3 characters')
    .max(200, 'Product name must be at most 200 characters'),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be at most 2000 characters'),
  price: z.number()
    .positive('Price must be greater than 0')
    .max(999999, 'Price must be at most 999999'),
  quantity_in_stock: z.number()
    .int('Quantity must be an integer')
    .min(0, 'Quantity cannot be negative'),
  sku: z.string()
    .min(3, 'SKU must be at least 3 characters')
    .max(50, 'SKU must be at most 50 characters')
    .regex(/^[A-Z0-9\-]+$/, 'SKU must contain only uppercase letters, numbers, and hyphens')
    .optional(),
  image_url: z.string().url('Invalid image URL').optional().or(z.literal('')),
  tags: z.array(z.string().min(2).max(50)).max(10, 'Maximum 10 tags allowed').default([]),
});

export const createProductSchema = productPayloadSchema.refine((data) => data.category_id || data.category, {
  message: 'Either category_id or category is required',
  path: ['category'],
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

/**
 * Product update schema (all fields optional)
 */
export const updateProductSchema = productPayloadSchema.partial();

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

/**
 * Product filter schema
 */
export const productFilterSchema = z.object({
  category_id: z.string().uuid().optional(),
  vendor_id: z.string().uuid().optional(),
  min_price: z.number().min(0).optional(),
  max_price: z.number().min(0).optional(),
  min_rating: z.number().min(0).max(5).optional(),
  search: z.string().max(200).optional(),
  tags: z.array(z.string()).max(10).optional(),
  sort: z.enum(['newest', 'price-asc', 'price-desc', 'rating', 'popular']).default('newest'),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  is_active: z.boolean().optional(),
});

export type ProductFilterInput = z.infer<typeof productFilterSchema>;

/**
 * Add to cart schema
 */
export const addToCartSchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
  quantity: z.number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(1000, 'Quantity must be at most 1000'),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;

/**
 * Update cart item schema
 */
export const updateCartItemSchema = z.object({
  quantity: z.number()
    .int('Quantity must be an integer')
    .min(0, 'Quantity must be non-negative')
    .max(1000, 'Quantity must be at most 1000'),
});

export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

/**
 * Shipping address schema
 */
export const shippingAddressSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100),
  phone: z.string()
    .regex(/^[0-9]{10}$/, 'Phone must be a valid 10-digit number'),
  email: z.string().email('Invalid email address'),
  address_line_1: z.string().min(5, 'Address must be at least 5 characters').max(200),
  address_line_2: z.string().max(200).optional(),
  city: z.string().min(2, 'City name must be at least 2 characters').max(100),
  state: z.string().min(2, 'State name must be at least 2 characters').max(100),
  pincode: z.string()
    .regex(/^[0-9]{6}$/, 'Pincode must be a valid 6-digit number'),
  country: z.string().default('India'),
});

export type ShippingAddressInput = z.infer<typeof shippingAddressSchema>;

/**
 * Create order schema
 */
export const createOrderSchema = z.object({
  shipping_address: shippingAddressSchema,
  notes: z.string().max(500).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/**
 * Update order status schema
 */
export const orderStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']),
  notes: z.string().max(500).optional(),
});

export type OrderStatusInput = z.infer<typeof orderStatusSchema>;

/**
 * Create review schema
 */
export const createReviewSchema = z.object({
  product_id: z.string().uuid('Invalid product ID').optional(),
  vendor_id: z.string().uuid('Invalid vendor ID'),
  rating: z.number()
    .int('Rating must be an integer')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must be at most 5'),
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title must be at most 100 characters'),
  content: z.string()
    .min(10, 'Review must be at least 10 characters')
    .max(1000, 'Review must be at most 1000 characters'),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

/**
 * Update review schema
 */
export const updateReviewSchema = createReviewSchema.partial();

export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

/**
 * Payment verification schema
 */
export const paymentVerificationSchema = z.object({
  razorpay_order_id: z.string().min(1, 'Order ID required'),
  razorpay_payment_id: z.string().min(1, 'Payment ID required'),
  razorpay_signature: z.string().min(1, 'Signature required'),
});

export type PaymentVerificationInput = z.infer<typeof paymentVerificationSchema>;

/**
 * Refund request schema
 */
export const refundRequestSchema = z.object({
  reason: z.string()
    .min(5, 'Reason must be at least 5 characters')
    .max(500, 'Reason must be at most 500 characters'),
});

export type RefundRequestInput = z.infer<typeof refundRequestSchema>;

/**
 * Vendor profile update schema
 */
export const vendorProfileUpdateSchema = z.object({
  business_name: z.string()
    .min(3, 'Business name must be at least 3 characters')
    .max(150, 'Business name must be at most 150 characters')
    .optional(),
  business_description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be at most 2000 characters')
    .optional(),
  owner_name: z.string().min(2).max(150).optional(),
  business_type: z.string().max(100).optional(),
  registration_number: z.string().max(100).optional(),
  gst_number: z.string().max(30).optional(),
  pan_number: z.string().max(30).optional(),
  business_phone: z.string().max(20).optional(),
  business_email: z.string().email('Invalid business email').optional().or(z.literal('')),
  business_address: z.string().max(1000).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pincode: z.string().max(20).optional(),
  website_url: z.string().url('Invalid website URL').optional().or(z.literal('')),
  years_in_business: z.number().int().min(0).max(200).optional(),
  service_areas: z.array(z.string().min(1).max(100)).max(50).optional(),
  support_contact: z.string().max(100).optional(),
  avatar_url: z.string().url('Invalid avatar URL').optional(),
  banner_url: z.string().url('Invalid banner URL').optional(),
});

export type VendorProfileUpdateInput = z.infer<typeof vendorProfileUpdateSchema>;

/**
 * Vendor verification schema (admin only)
 */
export const vendorVerificationSchema = z.object({
  vendor_id: z.string().uuid('Invalid vendor ID'),
  is_verified: z.boolean(),
});

export type VendorVerificationInput = z.infer<typeof vendorVerificationSchema>;

/**
 * Category filter schema
 */
export const categoryFilterSchema = z.object({
  parent_category_id: z.string().uuid().optional(),
  is_active: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export type CategoryFilterInput = z.infer<typeof categoryFilterSchema>;

/**
 * Validate and parse product filter input
 */
export function validateProductFilter(data: unknown): ProductFilterInput {
  return productFilterSchema.parse(data);
}

/**
 * Validate and parse cart input
 */
export function validateAddToCart(data: unknown): AddToCartInput {
  return addToCartSchema.parse(data);
}

/**
 * Validate and parse order input
 */
export function validateCreateOrder(data: unknown): CreateOrderInput {
  return createOrderSchema.parse(data);
}

/**
 * Validate and parse review input
 */
export function validateCreateReview(data: unknown): CreateReviewInput {
  return createReviewSchema.parse(data);
}

/**
 * Validate and parse payment verification
 */
export function validatePaymentVerification(data: unknown): PaymentVerificationInput {
  return paymentVerificationSchema.parse(data);
}
