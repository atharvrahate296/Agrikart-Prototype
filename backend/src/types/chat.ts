/**
 * AI Agricultural Assistant Chat Types & Interfaces
 */

export interface ChatSession {
  id: string;
  farmerId: string;
  title?: string;
  topic?: string;
  context?: Record<string, any>;
  isActive: boolean;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderRole: ChatRole;
  content: string;
  tokensUsed?: number;
  generationTimeMs?: number;
  modelVersion?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface SendMessageRequest {
  message: string;
}

export interface CreateChatSessionRequest {
  title?: string;
  topic?: string;
}
