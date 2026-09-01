/**
 * Disease Service Unit Tests
 * Unit tests for disease prediction service layer and validations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as diseaseService from '../src/services/disease/diseaseService';
import { DatabaseError, NotFoundError, ValidationError, AuthorizationError } from '../src/utils/errors';
import { validatePredictionFeedback, validateExpertVerification } from '../src/utils/disease-validators';
import axios from 'axios';
import diseaseRouter from '../src/routes/disease';

vi.mock('axios');

// Mock Supabase Config
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();

const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    eq: vi.fn(() => ({
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
      order: vi.fn(() => ({
        range: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    })),
  })),
  storage: {
    from: vi.fn(() => ({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
    })),
  },
};

vi.mock('../src/config/supabase', () => ({
  createSupabaseAdminClient: () => mockSupabaseClient,
}));

describe('Disease Service Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set default returns
    mockUpload.mockResolvedValue({ data: { path: 'test_path' }, error: null });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'http://supabase.com/test_path.png' } });
    vi.mocked(axios.post).mockRejectedValue(new Error('ML Service Offline'));
  });

  describe('predictDisease', () => {
    it('should upload to storage and store prediction results', async () => {
      const mockFileBuffer = Buffer.from('FakeLeafData');
      const mockResultRecord = {
        id: 'pred-123',
        farmer_id: 'user-123',
        predicted_disease: 'Potato Late Blight',
        confidence_score: 0.90,
      };

      // Mock database calls
      // 1. mock diseases search
      mockSelect.mockReturnValue({ ilike: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }) }) });
      mockMaybeSingle.mockResolvedValue({ data: { id: 'disease-123', name: 'Potato Late Blight' }, error: null });
      
      // 2. mock prediction insert
      mockInsert.mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) });
      mockSingle.mockResolvedValue({ data: mockResultRecord, error: null });

      const result = await diseaseService.predictDisease(
        'user-123',
        mockFileBuffer,
        'leaf.jpg',
        'image/jpeg',
        'potato'
      );

      expect(result.id).toBe('pred-123');
      expect(result.confidence_score).toBe(0.90);
      expect(result.disease_details.name).toBe('Potato Late Blight');
    });

    it('should throw DatabaseError if storage upload fails', async () => {
      mockUpload.mockResolvedValue({ data: null, error: { message: 'Upload limit exceeded' } });

      await expect(
        diseaseService.predictDisease('user-123', Buffer.from(''), 'leaf.jpg', 'image/jpeg')
      ).rejects.toThrow(DatabaseError);
    });
  });

  describe('getPredictionById', () => {
    it('should return prediction details for authorized owner', async () => {
      const mockRecord = {
        id: 'pred-123',
        farmer_id: 'user-123',
        predicted_disease: 'Apple Scab',
      };
      
      mockSelect.mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: mockRecord, error: null }) }) });

      const result = await diseaseService.getPredictionById('pred-123', 'user-123', 'farmer');
      expect(result.predicted_disease).toBe('Apple Scab');
    });

    it('should reject access if user does not own prediction and is not expert/admin', async () => {
      const mockRecord = {
        id: 'pred-123',
        farmer_id: 'user-123',
      };
      
      mockSelect.mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: mockRecord, error: null }) }) });

      await expect(
        diseaseService.getPredictionById('pred-123', 'intruder-456', 'farmer')
      ).rejects.toThrow(AuthorizationError);
    });

    it('should allow access to predictions for expert role', async () => {
      const mockRecord = {
        id: 'pred-123',
        farmer_id: 'user-123',
      };
      
      mockSelect.mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: mockRecord, error: null }) }) });

      const result = await diseaseService.getPredictionById('pred-123', 'expert-456', 'expert');
      expect(result).toBeDefined();
    });
  });

  describe('triggerModelRetraining', () => {
    it('should successfully call ML service to trigger retraining', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: { success: true, run_id: 'run-789', status: 'queued' }
      });

      const result = await diseaseService.triggerModelRetraining(5, 32, 0.001);
      expect(result.success).toBe(true);
      expect(result.run_id).toBe('run-789');
      expect(axios.post).toHaveBeenCalled();
    });

    it('should throw DatabaseError if ML service call fails', async () => {
      vi.mocked(axios.post).mockRejectedValueOnce(new Error('ML Service Offline'));

      await expect(
        diseaseService.triggerModelRetraining()
      ).rejects.toThrow(DatabaseError);
    });
  });

  describe('auto retraining trigger', () => {
    it('should trigger retraining when total count is a multiple of 5', async () => {
      // Mock prediction lookup
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { farmer_id: 'user-123' }, error: null })
        })
      });

      // Mock feedback insert
      mockInsert.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'feedback-123' }, error: null })
        })
      });

      // Mock count calls. First for disease_predictions count, second for prediction_feedback count.
      // We will return a result containing count properties
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({ count: 5 })
      });
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({ count: 0 })
      });

      // Mock axios post for trigger
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: { success: true, run_id: 'auto-run-123' }
      });

      const feedbackInput = {
        prediction_id: 'pred-123',
        feedback_type: 'incorrect' as const,
        actual_disease_name: 'Apple Scab',
      };

      await diseaseService.submitFeedback('user-123', feedbackInput);

      // Verify that axios.post was called to trigger training
      expect(axios.post).toHaveBeenCalled();
    });
  });
});

describe('Disease Zod Validators', () => {
  describe('validatePredictionFeedback', () => {
    it('should accept valid correct/incorrect feedback inputs', () => {
      const payload = {
        prediction_id: 'd456f05f-288f-4777-9e70-7578d984494a',
        feedback_type: 'incorrect' as const,
        actual_disease_name: 'Apple Scab',
        explanation: 'The leaves don\'t look late blight',
      };

      const result = validatePredictionFeedback(payload);
      expect(result.feedback_type).toBe('incorrect');
    });

    it('should throw validation error on invalid feedback_type', () => {
      const payload = {
        prediction_id: 'd456f05f-288f-4777-9e70-7578d984494a',
        feedback_type: 'random_value',
      };

      expect(() => validatePredictionFeedback(payload)).toThrow();
    });
  });
});

describe('Disease API Router Structure', () => {
  it('should have mounted expected retraining route', () => {
    const routes = diseaseRouter.stack
      .filter(r => r.route)
      .map(r => ({
        path: r.route.path,
        methods: Object.keys(r.route.methods),
      }));

    const paths = routes.map(r => r.path);
    expect(paths).toContain('/retrain');
    
    const retrainRoute = routes.find(r => r.path === '/retrain');
    expect(retrainRoute?.methods).toContain('post');
  });
});
