import { z } from 'zod';
import { ValidationError } from './errors';

export const createChatSessionSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').optional().or(z.literal('')),
  topic: z.string().min(3, 'Topic must be at least 3 characters').optional().or(z.literal('')),
});

export const sendMessageSchema = z.object({
  message: z.string().min(1, 'Message content cannot be empty'),
});

export function validateCreateChatSession(input: unknown) {
  const result = createChatSessionSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Invalid session creation payload', undefined, { details: result.error.errors });
  }
  return result.data;
}

export function validateSendMessage(input: unknown) {
  const result = sendMessageSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Invalid message payload', undefined, { details: result.error.errors });
  }
  return result.data;
}
