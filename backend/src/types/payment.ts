/**
 * @fileoverview Payment Types - Razorpay integration types
 * @module src/types/payment
 */

/**
 * Razorpay order for payment
 */
export interface RazorpayOrder {
  id: string;
  entity: 'order';
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: 'created' | 'paid' | 'attempted';
  created_at: number;
  notes: Record<string, string>;
}

/**
 * Razorpay payment
 */
export interface RazorpayPayment {
  id: string;
  entity: 'payment';
  amount: number;
  currency: string;
  status: 'captured' | 'failed' | 'authorized';
  description: string;
  amount_refunded: number;
  refund_status: string | null;
  captured: boolean;
  email: string;
  contact: string;
  fee: number;
  tax: number;
  error_code: string | null;
  error_description: string | null;
  error_source: string | null;
  error_reason: string | null;
  acquirer_data: {
    auth_code: string | null;
  };
  created_at: number;
  notes: Record<string, string>;
}

/**
 * Payment verification request
 */
export interface PaymentVerificationRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/**
 * Refund request
 */
export interface RefundRequest {
  order_id: string;
  amount: number;
  reason: string;
}

/**
 * Refund response
 */
export interface RefundResponse {
  id: string;
  entity: 'refund';
  payment_id: string;
  amount: number;
  currency: string;
  notes: Record<string, string>;
  receipt: string | null;
  status: 'processed' | 'failed' | 'pending';
  speed_processed: 'normal' | 'optimum';
  batch_id: string | null;
  failure_reason: string | null;
  acquirer_data: {
    rrn: string | null;
  };
  created_at: number;
}

/**
 * Payment webhook callback
 */
export interface PaymentWebhookCallback {
  event: 'payment.authorized' | 'payment.failed' | 'payment.captured';
  payload: {
    payment: {
      entity: RazorpayPayment;
    };
    order?: {
      entity: RazorpayOrder;
    };
  };
  created_at: number;
}

/**
 * Payment history entry
 */
export interface PaymentHistory {
  id: string;
  order_id: string;
  user_id: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  method: 'card' | 'netbanking' | 'wallet' | 'upi' | 'other';
  error_code: string | null;
  error_message: string | null;
  refund_id: string | null;
  refund_amount: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Create Razorpay order request
 */
export interface CreateRazorpayOrderRequest {
  amount: number;
  currency?: string;
  receipt?: string;
  customer_notify?: 0 | 1;
  notes?: Record<string, string>;
}

/**
 * Create Razorpay order response
 */
export interface CreateRazorpayOrderResponse {
  id: string;
  entity: 'order';
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  offer_id: string | null;
  status: 'created';
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
}
