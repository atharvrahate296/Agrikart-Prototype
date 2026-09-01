import { z } from 'zod';
import { ValidationError } from './errors';

const coerceNumeric = z.preprocess((val) => {
  if (typeof val === 'string' && val.trim() !== '') {
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  }
  return val;
}, z.number().optional());

const coerceBoolean = z.preprocess((val) => {
  if (typeof val === 'string') {
    if (val.toLowerCase() === 'true') return true;
    if (val.toLowerCase() === 'false') return false;
  }
  if (typeof val === 'boolean') return val;
  return undefined;
}, z.boolean().optional());

export const createArticleSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  featuredImageUrl: z.string().url('Invalid featured image URL').optional().or(z.literal('')),
  
  category: z.enum(['market', 'weather', 'pest', 'government', 'general'], {
    errorMap: () => ({ message: "Category must be one of: 'market', 'weather', 'pest', 'government', 'general'" })
  }),
  tags: z.array(z.string()).default([]),
  relevantCrops: z.array(z.string()).default([]),
  relevantStates: z.array(z.string()).default([]),
  
  authorName: z.string().min(1, 'Author name is required'),
  sourceUrl: z.string().url('Invalid source URL').optional().or(z.literal('')),
  
  isPublished: z.boolean().default(false),
  publishedAt: z.string().datetime({ offset: true }).optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  metadata: z.record(z.any()).optional(),
});

export const updateArticleSchema = createArticleSchema.partial();

export const articleFiltersSchema = z.object({
  category: z.enum(['market', 'weather', 'pest', 'government', 'general']).optional(),
  state: z.string().optional(),
  crop: z.string().optional(),
  tag: z.string().optional(),
  isPublished: coerceBoolean,
  search: z.string().optional(),
  limit: coerceNumeric,
  offset: coerceNumeric,
});

export const createAlertSchema = z.object({
  type: z.enum(['critical', 'warning', 'info'], {
    errorMap: () => ({ message: "Alert type must be one of: 'critical', 'warning', 'info'" })
  }),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  message: z.string().min(5, 'Message must be at least 5 characters'),
  severity: z.enum(['high', 'medium', 'low']).optional(),
  
  relevantStates: z.array(z.string()).default([]),
  relevantDistricts: z.array(z.string()).default([]),
  relevantCrops: z.array(z.string()).default([]),
  
  actionUrl: z.string().url('Invalid action URL').optional().or(z.literal('')),
  externalLink: z.string().url('Invalid external link URL').optional().or(z.literal('')),
  
  isActive: z.boolean().default(true),
  expiresAt: z.string().datetime({ offset: true }).optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  metadata: z.record(z.any()).optional(),
});

export const updateAlertSchema = createAlertSchema.partial();

export const alertFiltersSchema = z.object({
  type: z.enum(['critical', 'warning', 'info']).optional(),
  severity: z.enum(['high', 'medium', 'low']).optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  crop: z.string().optional(),
  isActive: coerceBoolean,
  limit: coerceNumeric,
  offset: coerceNumeric,
});

export function validateCreateArticle(input: unknown) {
  const result = createArticleSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Invalid article creation payload', undefined, { details: result.error.errors });
  }
  return result.data;
}

export function validateUpdateArticle(input: unknown) {
  const result = updateArticleSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Invalid article update payload', undefined, { details: result.error.errors });
  }
  return result.data;
}

export function validateArticleFilters(input: unknown) {
  const result = articleFiltersSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Invalid article filter parameters', undefined, { details: result.error.errors });
  }
  return result.data;
}

export function validateCreateAlert(input: unknown) {
  const result = createAlertSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Invalid alert creation payload', undefined, { details: result.error.errors });
  }
  return result.data;
}

export function validateUpdateAlert(input: unknown) {
  const result = updateAlertSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Invalid alert update payload', undefined, { details: result.error.errors });
  }
  return result.data;
}

export function validateAlertFilters(input: unknown) {
  const result = alertFiltersSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Invalid alert filter parameters', undefined, { details: result.error.errors });
  }
  return result.data;
}
