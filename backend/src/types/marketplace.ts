/**
 * @fileoverview Marketplace Types - Product, Vendor, Order, Cart, Review types
 * @module src/types/marketplace
 */

/**
 * Sort options for product listings
 */
export type ProductSort = 'newest' | 'price-asc' | 'price-desc' | 'rating' | 'popular';

/**
 * Order status progression
 */
export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

/**
 * Payment status
 */
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

/**
 * Product category
 */
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  parent_category_id: string | null;
  is_active: boolean;
  product_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Product entity
 */
export interface Product {
  id: string;
  vendor_id: string;
  category_id: string;
  name: string;
  description: string;
  image_url: string;
  price: number;
  quantity_in_stock: number;
  sku: string;
  tags: string[];
  average_rating: number;
  total_reviews: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Product with vendor details for display
 */
export interface ProductWithVendor extends Product {
  vendor: {
    id: string;
    business_name: string;
    avatar_url: string | null;
    average_rating: number;
  };
}

/**
 * Vendor profile
 */
export interface Vendor {
  id: string;
  user_id: string;
  business_name: string;
  business_description: string;
  gst_number: string;
  pancard_number: string;
  bank_account_number: string;
  bank_ifsc_code: string;
  state_of_operation: string[];
  avatar_url: string | null;
  banner_url: string | null;
  is_verified: boolean;
  verification_date: string | null;
  average_rating: number;
  total_reviews: number;
  total_orders: number;
  total_revenue: number;
  commission_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Vendor analytics
 */
export interface VendorAnalytics {
  vendor_id: string;
  total_sales: number;
  total_revenue: number;
  total_orders: number;
  average_rating: number;
  total_reviews: number;
  total_products: number;
  active_products: number;
  average_order_value: number;
  repeat_customer_count: number;
  top_products: Product[];
  recent_orders: Order[];
  sales_trend: Array<{
    date: string;
    amount: number;
    order_count: number;
  }>;
  rating_distribution: {
    five_star: number;
    four_star: number;
    three_star: number;
    two_star: number;
    one_star: number;
  };
}

/**
 * Shopping cart item
 */
export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  vendor_id: string;
  quantity: number;
  product: Product;
  added_at: string;
  updated_at: string;
}

/**
 * Shopping cart summary
 */
export interface CartSummary {
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  item_count: number;
  vendor_count: number;
}

/**
 * Order entity
 */
export interface Order {
  id: string;
  user_id: string;
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_id: string | null;
  shipping_address: ShippingAddress;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Shipping address
 */
export interface ShippingAddress {
  name: string;
  phone: string;
  email: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

/**
 * Order item (line item in order)
 */
export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  vendor_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product: Product;
  created_at: string;
}

/**
 * Order with items
 */
export interface OrderWithItems extends Order {
  items: OrderItem[];
}

/**
 * Review entity
 */
export interface Review {
  id: string;
  user_id: string;
  product_id: string | null;
  vendor_id: string;
  rating: number;
  title: string;
  content: string;
  helpful_count: number;
  is_verified_purchase: boolean;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

/**
 * Rating statistics
 */
export interface RatingStats {
  average_rating: number;
  total_reviews: number;
  rating_distribution: {
    five_star: number;
    four_star: number;
    three_star: number;
    two_star: number;
    one_star: number;
  };
}

/**
 * Product filter options for search
 */
export interface ProductFilter {
  category_id?: string;
  vendor_id?: string;
  min_price?: number;
  max_price?: number;
  min_rating?: number;
  search?: string;
  tags?: string[];
  is_active?: boolean;
  sort?: ProductSort;
  limit?: number;
  offset?: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

/**
 * Cart update event for WebSocket
 */
export interface CartUpdateEvent {
  type: 'add' | 'update' | 'remove' | 'clear';
  user_id: string;
  cart: CartSummary;
  timestamp: string;
}

/**
 * Order update event for WebSocket
 */
export interface OrderUpdateEvent {
  type: 'created' | 'status_changed' | 'payment_received';
  order_id: string;
  order: Order;
  timestamp: string;
}

/**
 * Review created event for WebSocket
 */
export interface ReviewCreatedEvent {
  type: 'review_created';
  product_id: string;
  vendor_id: string;
  review: Review;
  rating_stats: RatingStats;
  timestamp: string;
}
