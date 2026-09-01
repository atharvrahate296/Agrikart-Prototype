import { z } from 'zod';
import { ValidationError } from './errors';

/**
 * Validator helper to parse numbers from string query params
 */
const coerceNumeric = z.preprocess((val) => {
  if (typeof val === 'string' && val.trim() !== '') {
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  }
  return val;
}, z.number().optional());

/**
 * Validator helper to parse array of strings from comma separated queries
 */
const coerceStringArray = z.preprocess((val) => {
  if (typeof val === 'string') {
    return val.split(',').map(s => s.trim()).filter(Boolean);
  }
  if (Array.isArray(val)) {
    return val;
  }
  return val;
}, z.array(z.string()).optional());

/**
 * Validate scheme eligibility parameters
 */
export const eligibilityQuerySchema = z.object({
  state: z.string().optional(),
  role: z.string().optional(),
  landSize: coerceNumeric,
  income: coerceNumeric,
  primaryCrops: coerceStringArray,
});

/**
 * Validate scheme creation/modification inputs
 */
export const createSchemeSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  agency: z.string().min(2, 'Agency name is required'),
  
  eligibleStates: z.array(z.string()).default(['All']),
  eligibleRoles: z.array(z.string()).default(['farmer']),
  minLandSize: z.number().nonnegative().optional(),
  maxIncomeLimit: z.number().nonnegative().optional(),
  
  subsidyAmount: z.number().nonnegative().optional(),
  subsidyType: z.string().optional(),
  benefitsDescription: z.string().optional(),
  
  launchDate: z.string().datetime({ offset: true }).optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  deadline: z.string().datetime({ offset: true }).optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  applicationStartDate: z.string().datetime({ offset: true }).optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  applicationEndDate: z.string().datetime({ offset: true }).optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  
  applicationProcess: z.string().optional(),
  requiredDocuments: z.array(z.string()).default([]),
  officialWebsite: z.string().url('Invalid official website URL').optional().or(z.literal('')),
  contactDetails: z.record(z.any()).optional(),
  
  yearApplicable: z.number().int().positive().optional(),
  isActive: z.boolean().default(true),
});

/**
 * Validate scheme application details
 */
export const applySchemeSchema = z.object({
  landSizeAtApplication: z.number().nonnegative().optional(),
  incomeAtApplication: z.number().nonnegative().optional(),
  documentsSubmitted: z.array(
    z.object({
      documentName: z.string().min(1, 'Document name is required'),
      fileUrl: z.string().url('Invalid document file URL'),
    })
  ).default([]),
  metadata: z.record(z.any()).optional(),
});

/**
 * Validate expert review application status updates
 */
export const updateApplicationStatusSchema = z.object({
  status: z.enum(['pending', 'submitted', 'under_review', 'approved', 'rejected', 'disbursed']),
  rejectionReason: z.string().optional(),
  disbursedAmount: z.number().nonnegative().optional(),
  metadata: z.record(z.any()).optional(),
}).refine((data) => {
  if (data.status === 'rejected' && (!data.rejectionReason || data.rejectionReason.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: 'Rejection reason is required when rejecting an application',
  path: ['rejectionReason'],
}).refine((data) => {
  if (data.status === 'disbursed' && data.disbursedAmount === undefined) {
    return false;
  }
  return true;
}, {
  message: 'Disbursed amount is required when status is disbursed',
  path: ['disbursedAmount'],
});

/**
 * Helper to validate request query or body and throw ValidationError if failed
 */
export function validateEligibilityQuery(input: any) {
  const result = eligibilityQuerySchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Invalid eligibility query params', undefined, { details: result.error.errors });
  }
  return result.data;
}

export function validateApplyScheme(input: any) {
  const result = applySchemeSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Invalid application payload', undefined, { details: result.error.errors });
  }
  return result.data;
}

export function validateUpdateApplicationStatus(input: any) {
  const result = updateApplicationStatusSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Invalid status update payload', undefined, { details: result.error.errors });
  }
  return result.data;
}

export function validateCreateScheme(input: any) {
  const result = createSchemeSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Invalid scheme creation payload', undefined, { details: result.error.errors });
  }
  return result.data;
}
