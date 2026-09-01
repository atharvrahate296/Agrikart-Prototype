/**
 * AI Assistant Chat Unit & Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as chatService from '../src/services/chat/chatService';
import { DatabaseError, NotFoundError, ValidationError } from '../src/utils/errors';
import axios from 'axios';

vi.mock('axios');

/**
 * Mock Query Chain helper to simulate Supabase query methods
 */
class MockQueryChain {
  private _data: any;
  private _error: any;
  private _count: number;

  constructor(data: any = [], error: any = null, count: number = 0) {
    this._data = data;
    this._error = error;
    this._count = count;
  }

  select() { return this; }
  eq() { return this; }
  or() { return this; }
  order() { return this; }
  range() { return this; }
  limit() { return this; }
  ilike() { return this; }
  contains() { return this; }

  async single() {
    const d = Array.isArray(this._data) ? this._data[0] : this._data;
    if (!d && !this._error) {
      return { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
    }
    return { data: d, error: this._error };
  }

  async maybeSingle() {
    const d = Array.isArray(this._data) ? this._data[0] : this._data;
    return { data: d || null, error: this._error };
  }

  then(onfulfilled?: (value: any) => any) {
    const promise = Promise.resolve({ data: this._data, error: this._error, count: this._count });
    return promise.then(onfulfilled);
  }
}

// Global mock variables to configure in individual tests
let mockProfilesResult: { data: any; error: any } = { data: null, error: null };
let mockSessionsResult: { data: any[]; error: any } = { data: [], error: null };
let mockMessagesResult: { data: any[]; error: any } = { data: [], error: null };
let mockInsertResult: { data: any; error: any } = { data: null, error: null };
let mockUpdateResult: { data: any; error: any } = { data: null, error: null };

const mockSupabaseClient = {
  from: vi.fn((tableName: string) => {
    if (tableName === 'profiles') {
      return new MockQueryChain(mockProfilesResult.data, mockProfilesResult.error);
    }
    if (tableName === 'chat_sessions') {
      return {
        select: vi.fn(() => new MockQueryChain(mockSessionsResult.data, mockSessionsResult.error, mockSessionsResult.data?.length || 0)),
        insert: vi.fn(() => new MockQueryChain(mockInsertResult.data, mockInsertResult.error)),
        update: vi.fn(() => new MockQueryChain(mockUpdateResult.data, mockUpdateResult.error)),
      };
    }
    if (tableName === 'chat_messages') {
      return {
        select: vi.fn(() => new MockQueryChain(mockMessagesResult.data, mockMessagesResult.error, mockMessagesResult.data?.length || 0)),
        insert: vi.fn(() => new MockQueryChain(mockInsertResult.data, mockInsertResult.error)),
      };
    }
    return new MockQueryChain();
  }),
};

vi.mock('../src/config/supabase', () => ({
  createSupabaseAdminClient: () => mockSupabaseClient,
}));

describe('AI Assistant Chat Service Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProfilesResult = { data: null, error: null };
    mockSessionsResult = { data: [], error: null };
    mockMessagesResult = { data: [], error: null };
    mockInsertResult = { data: null, error: null };
    mockUpdateResult = { data: null, error: null };
  });

  describe('createSession', () => {
    it('should create a chat session and return the mapped record', async () => {
      mockInsertResult = {
        data: {
          id: 'session-uuid-1',
          farmer_id: 'farmer-uuid-abc',
          title: 'Farming Tips',
          topic: 'General agriculture',
          is_active: true,
          created_at: '2026-06-09T00:00:00Z',
          updated_at: '2026-06-09T00:00:00Z'
        },
        error: null
      };

      const session = await chatService.createSession('farmer-uuid-abc', {
        title: 'Farming Tips',
        topic: 'General agriculture'
      });

      expect(session.id).toBe('session-uuid-1');
      expect(session.farmerId).toBe('farmer-uuid-abc');
      expect(session.isActive).toBe(true);
    });
  });

  describe('listSessions', () => {
    it('should list active chat sessions belonging to a farmer', async () => {
      mockSessionsResult = {
        data: [
          {
            id: 'session-1',
            farmer_id: 'farmer-123',
            title: 'Scheme inquiry',
            is_active: true,
            created_at: '2026-06-09T00:00:00Z',
            updated_at: '2026-06-09T00:00:00Z'
          }
        ],
        error: null
      };

      const list = await chatService.listSessions('farmer-123');

      expect(list.length).toBe(1);
      expect(list[0].title).toBe('Scheme inquiry');
    });
  });

  describe('sendMessage', () => {
    it('should verify session ownership, save farmer query, post to LLM API, and log response', async () => {
      // 1. Setup session mock
      mockSessionsResult = {
        data: [
          {
            id: 'session-active',
            farmer_id: 'farmer-valid',
            title: 'New Farming Conversation',
            is_active: true
          }
        ],
        error: null
      };

      // 2. Setup profile metadata
      mockProfilesResult = {
        data: {
          id: 'farmer-valid',
          state: 'Maharashtra',
          metadata: {
            primary_crops: ['Rice']
          }
        },
        error: null
      };

      // 3. Setup Axios reply mock
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          success: true,
          response: 'Here are rice farming suggestions for Maharashtra.',
          model: 'gemini-1.5-flash',
          tokens_used: 180
        }
      });

      // 4. Setup mock insert message replies
      let insertCount = 0;
      mockSupabaseClient.from = vi.fn((tableName: string) => {
        if (tableName === 'chat_sessions') {
          return {
            select: vi.fn(() => new MockQueryChain(mockSessionsResult.data, mockSessionsResult.error)),
            update: vi.fn(() => new MockQueryChain(mockUpdateResult.data, mockUpdateResult.error))
          };
        }
        if (tableName === 'profiles') {
          return new MockQueryChain(mockProfilesResult.data, mockProfilesResult.error);
        }
        if (tableName === 'chat_messages') {
          return {
            select: vi.fn(() => new MockQueryChain([], null)),
            insert: vi.fn(() => {
              insertCount++;
              if (insertCount === 1) {
                // user message insert
                return new MockQueryChain({
                  id: 'msg-user-1',
                  session_id: 'session-active',
                  sender_role: 'user',
                  content: 'suggest seeds',
                  created_at: '2026-06-09T00:01:00Z'
                });
              } else {
                // assistant response insert
                return new MockQueryChain({
                  id: 'msg-assistant-1',
                  session_id: 'session-active',
                  sender_role: 'assistant',
                  content: 'Here are rice farming suggestions for Maharashtra.',
                  tokens_used: 180,
                  model_version: 'gemini-1.5-flash',
                  created_at: '2026-06-09T00:01:02Z'
                });
              }
            })
          };
        }
        return new MockQueryChain();
      });

      const reply = await chatService.sendMessage('farmer-valid', 'session-active', 'suggest seeds');

      expect(reply.content).toContain('Maharashtra');
      expect(reply.senderRole).toBe('assistant');
      expect(reply.tokensUsed).toBe(180);
      expect(axios.post).toHaveBeenCalled();
    });

    it('should throw ValidationError if farmer tries to message another user session', async () => {
      mockSessionsResult = {
        data: [
          {
            id: 'session-other',
            farmer_id: 'farmer-other',
            is_active: true
          }
        ],
        error: null
      };

      await expect(
        chatService.sendMessage('farmer-hacker', 'session-other', 'hello')
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('archiveSession', () => {
    it('should set is_active to false and set ended_at timestamp', async () => {
      mockSessionsResult = {
        data: [{ id: 'session-to-archive', farmer_id: 'farmer-1', is_active: true }],
        error: null
      };

      mockUpdateResult = {
        data: {
          id: 'session-to-archive',
          farmer_id: 'farmer-1',
          is_active: false,
          ended_at: '2026-06-09T00:05:00Z',
          updated_at: '2026-06-09T00:05:00Z'
        },
        error: null
      };

      const archived = await chatService.archiveSession('session-to-archive', 'farmer-1');

      expect(archived.isActive).toBe(false);
      expect(archived.endedAt).toBeDefined();
    });
  });
});
