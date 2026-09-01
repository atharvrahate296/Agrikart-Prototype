/**
 * @fileoverview Disease Validators - Zod schemas for all disease-related operations
 * @module src/utils/disease-validators
 */

import { z } from 'zod';

/**
 * Prediction feedback validation schema
 */
export const predictionFeedbackSchema = z.object({
  prediction_id: z.string().uuid('Invalid prediction ID'),
  feedback_type: z.enum(['correct', 'incorrect'], {
    errorMap: () => ({ message: "Feedback type must be 'correct' or 'incorrect'" })
  }),
  actual_disease_id: z.string().uuid('Invalid disease ID').optional().nullable(),
  actual_disease_name: z.string().max(150).optional().nullable(),
  explanation: z.string().max(1000).optional().nullable(),
  confidence_in_correction: z.number().min(0).max(1).optional().nullable(),
});

export type PredictionFeedbackInput = z.infer<typeof predictionFeedbackSchema>;

/**
 * Expert verification validation schema
 */
export const expertVerificationSchema = z.object({
  verification_status: z.enum(['verified', 'rejected', 'corrected'], {
    errorMap: () => ({ message: "Verification status must be 'verified', 'rejected', or 'corrected'" })
  }),
  disease_id: z.string().uuid('Invalid disease ID').optional().nullable(),
  expert_notes: z.string().max(2000).optional().nullable(),
});

export type ExpertVerificationInput = z.infer<typeof expertVerificationSchema>;

/**
 * Validate prediction feedback
 */
export function validatePredictionFeedback(data: unknown): PredictionFeedbackInput {
  return predictionFeedbackSchema.parse(data);
}

/**
 * Validate expert verification
 */
export function validateExpertVerification(data: unknown): ExpertVerificationInput {
  return expertVerificationSchema.parse(data);
}
