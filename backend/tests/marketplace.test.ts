/**
 * Marketplace Unit Tests
 * Unit tests for Category, Review, and Payment services
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import * as categoryService from '../src/services/marketplace/categoryService';
import * as reviewService from '../src/services/marketplace/reviewService';
import * as paymentService from '../src/services/marketplace/paymentService';
import { DatabaseError, NotFoundError, ValidationError } from '../src/utils/errors';

// Mock Supabase Config
const mockSingle = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockIs = vi.fn();
const mockIn = vi.fn();
const mockOrder = vi.fn();
const mockRange = vi.fn();
const mockGte = vi.fn();
const mockRpc = vi.fn();

const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    is: mockIs,
    in: mockIn,
    order: mockOrder,
    range: mockRange,
    gte: mockGte,
    single: mockSingle,
  })),
  rpc: mockRpc,
};

vi.mock('../src/config/supabase', () => ({
  createSupabaseAdminClient: () => mockSupabaseClient,
  createSupabaseAnonClient: () => mockSupabaseClient,
}));

// Mock orderService dependency inside paymentService
vi.mock('../src/services/marketplace/orderService', () => ({
  confirmPayment: vi.fn().mockResolvedValue({ id: 'order_123', payment_status: 'completed' }),
  getOrder: vi.fn().mockResolvedValue({ id: 'order_123', status: 'pending', payment_status: 'pending', user_id: 'user_123', total_amount: 1000 }),
}));

describe('CategoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default chain returns
    mockSelect.mockReturnValue({ eq: mockEq, order: mockOrder, range: mockRange, single: mockSingle });
    mockEq.mockReturnValue({ eq: mockEq, order: mockOrder, range: mockRange, single: mockSingle });
    mockIs.mockReturnValue({ eq: mockEq, order: mockOrder, range: mockRange, single: mockSingle });
    mockIn.mockReturnValue({ eq: mockEq, order: mockOrder, range: mockRange, single: mockSingle });
    mockOrder.mockReturnValue({ range: mockRange, single: mockSingle });
  });

  describe('listCategories', () => {
    it('should return a paginated response of categories', async () => {
      const mockCategories = [
        { id: 'cat-1', name: 'Seeds', slug: 'seeds', is_active: true },
        { id: 'cat-2', name: 'Fertilizers', slug: 'fertilizers', is_active: true }
      ];

      mockRange.mockResolvedValue({ data: mockCategories, error: null, count: 2 });

      const result = await categoryService.listCategories({ limit: 10, offset: 0, is_active: true });
      
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.data[0].name).toBe('Seeds');
    });

    it('should throw DatabaseError if query fails', async () => {
      mockRange.mockResolvedValue({ data: null, error: { message: 'Query failed' }, count: 0 });

      await expect(
        categoryService.listCategories({ limit: 10, offset: 0 })
      ).rejects.toThrow(DatabaseError);
    });
  });

  describe('getCategoryById', () => {
    it('should return a category detail if found', async () => {
      const mockCategory = { id: 'cat-1', name: 'Seeds', slug: 'seeds' };
      mockSingle.mockResolvedValue({ data: mockCategory, error: null });

      const result = await categoryService.getCategoryById('cat-1');
      expect(result.name).toBe('Seeds');
    });

    it('should throw NotFoundError if category does not exist', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } });

      await expect(
        categoryService.getCategoryById('cat-non-existent')
      ).rejects.toThrow(NotFoundError);
    });
  });
});

describe('ReviewService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({ eq: mockEq, order: mockOrder, range: mockRange, single: mockSingle });
    mockEq.mockReturnValue({ eq: mockEq, order: mockOrder, range: mockRange, single: mockSingle, is: mockIs });
    mockIs.mockReturnValue({ eq: mockEq, order: mockOrder, range: mockRange, single: mockSingle });
    mockInsert.mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) });
  });

  describe('getProductReviews', () => {
    it('should fetch paginated reviews for a product', async () => {
      const mockReviews = [
        { id: 'rev-1', rating: 5, content: 'Excellent quality seeds' }
      ];
      mockRange.mockResolvedValue({ data: mockReviews, error: null, count: 1 });

      const result = await reviewService.getProductReviews('prod-1', 10, 0);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('createReview', () => {
    it('should reject if profile or vendor does not exist', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } });

      await expect(
        reviewService.createReview('user-1', { vendor_id: 'vendor-1', rating: 5, title: 'Good', content: 'Very nice' })
      ).rejects.toThrow(ValidationError);
    });
  });
});

describe('PaymentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('verifyPaymentSignature', () => {
    it('should return true for a valid Razorpay signature', () => {
      process.env.RAZORPAY_KEY_SECRET = 'test_secret';
      process.env.RAZORPAY_WEBHOOK_SECRET = 'test_secret';
      
      const orderId = 'order_abc123';
      const paymentId = 'pay_xyz789';
      const secret = 'test_secret';
      
      // Calculate valid signature manually
      const generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const result = paymentService.verifyPaymentSignature({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: generatedSignature,
      });

      expect(result).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const result = paymentService.verifyPaymentSignature({
        razorpay_order_id: 'order_1',
        razorpay_payment_id: 'pay_1',
        razorpay_signature: 'invalid_sig',
      });
      expect(result).toBe(false);
    });
  });

  describe('createRazorpayOrder', () => {
    it('should generate a mocked Razorpay order in test/dev environment', async () => {
      mockSingle.mockResolvedValue({ data: { user_id: 'user-1', total_amount: 100, status: 'pending', payment_status: 'pending' }, error: null });
      mockInsert.mockResolvedValue({ error: null });

      const result = await paymentService.createRazorpayOrder('order-1', 100);
      expect(result.id).toBeDefined();
      expect(result.entity).toBe('order');
      expect(result.amount).toBe(10000); // 100 INR in paise
    });
  });
});
