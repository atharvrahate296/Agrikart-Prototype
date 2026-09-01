/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { createSupabaseAdminClient } from '../../config/supabase.js';
import { DatabaseError, NotFoundError, ValidationError } from '../../utils/errors.js';
import type { ChatSession, ChatMessage, ChatRole } from '../../types/chat.js';

const LLM_SERVICE_URL = process.env.LLM_SERVICE_URL || 'http://localhost:8001';

function mapSession(db: any): ChatSession {
  return {
    id: db.id,
    farmerId: db.farmer_id,
    title: db.title || undefined,
    topic: db.topic || undefined,
    context: db.context || {},
    isActive: db.is_active ?? true,
    endedAt: db.ended_at || undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    metadata: db.metadata || {},
  };
}

function mapMessage(db: any): ChatMessage {
  return {
    id: db.id,
    sessionId: db.session_id,
    senderRole: db.sender_role as ChatRole,
    content: db.content,
    tokensUsed: db.tokens_used || undefined,
    generationTimeMs: db.generation_time_ms || undefined,
    modelVersion: db.model_version || undefined,
    createdAt: db.created_at,
    metadata: db.metadata || {},
  };
}

/**
 * Creates a new chat session for a farmer
 */
export async function createSession(
  farmerId: string,
  input: { title?: string; topic?: string } = {}
): Promise<ChatSession> {
  try {
    const supabase = createSupabaseAdminClient();
    const title = input.title || 'New Farming Conversation';

    const { data, error } = await supabase
      .from('chat_sessions')
      .insert([
        {
          farmer_id: farmerId,
          title,
          topic: input.topic || 'General agriculture',
          is_active: true,
          context: {},
          metadata: {},
        }
      ])
      .select('*')
      .single();

    if (error || !data) {
      throw new DatabaseError(`Failed to create chat session: ${error?.message}`);
    }

    return mapSession(data);
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Create session service failed: ${String(error)}`);
  }
}

/**
 * Lists active chat sessions belonging to a farmer
 */
export async function listSessions(farmerId: string): Promise<ChatSession[]> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('farmer_id', farmerId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new DatabaseError(`Failed to fetch sessions: ${error.message}`);
    }

    return (data || []).map(mapSession);
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError(`List sessions service failed: ${String(error)}`);
  }
}

/**
 * Retrieves chat history messages for a session
 */
export async function getMessages(sessionId: string, farmerId: string): Promise<ChatMessage[]> {
  try {
    const supabase = createSupabaseAdminClient();

    // Verify ownership
    const { data: session, error: sErr } = await supabase
      .from('chat_sessions')
      .select('id, farmer_id')
      .eq('id', sessionId)
      .single();

    if (sErr || !session) {
      throw new NotFoundError(`Chat session not found: ${sessionId}`);
    }

    if (session.farmer_id !== farmerId) {
      throw new ValidationError('Not authorized to access this chat history.');
    }

    // Fetch messages
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new DatabaseError(`Failed to load messages: ${error.message}`);
    }

    return (data || []).map(mapMessage);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Get messages service failed: ${String(error)}`);
  }
}

/**
 * Sends farmer query message, proxies query to LangChain FastAPI, and saves response
 */
export async function sendMessage(
  farmerId: string,
  sessionId: string,
  messageText: string
): Promise<ChatMessage> {
  try {
    const supabase = createSupabaseAdminClient();
    const startTime = Date.now();

    // 1. Verify session ownership
    const { data: session, error: sErr } = await supabase
      .from('chat_sessions')
      .select('id, farmer_id, title, is_active')
      .eq('id', sessionId)
      .single();

    if (sErr || !session) {
      throw new NotFoundError(`Chat session not found: ${sessionId}`);
    }

    if (session.farmer_id !== farmerId) {
      throw new ValidationError('Not authorized to message this session.');
    }

    if (!session.is_active) {
      throw new ValidationError('Cannot message an archived chat session.');
    }

    // 2. Fetch recent conversation history from DB for prompt context (limit last 15 messages)
    const { data: recentDbMsgs } = await supabase
      .from('chat_messages')
      .select('sender_role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(15);

    const history = (recentDbMsgs || []).map(m => ({
      role: m.sender_role === 'user' ? 'user' : 'assistant',
      content: m.content
    }));

    // 3. Query farmer's profile for location & crop personalization context
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, state, location, metadata')
      .eq('id', farmerId)
      .maybeSingle();

    const profilePayload = profile ? {
      id: profile.id,
      state: profile.state || profile.location?.state || profile.metadata?.state || 'Unknown',
      primary_crops: profile.metadata?.primary_crops || profile.metadata?.primaryCrops || []
    } : null;

    // 4. Save farmer's message to Database
    const { data: userMsg, error: insertUserErr } = await supabase
      .from('chat_messages')
      .insert([
        {
          session_id: sessionId,
          sender_role: 'user',
          content: messageText,
          metadata: {}
        }
      ])
      .select('*')
      .single();

    if (insertUserErr || !userMsg) {
      throw new DatabaseError(`Failed to save user message: ${insertUserErr?.message}`);
    }

    // 5. Proxy conversation payload to LLM FastAPI Service
    let assistantResponse = '';
    let tokensUsed = 0;
    let modelVersion = 'mock-fallback';

    try {
      const chatPayload = {
        session_id: sessionId,
        message: messageText,
        history,
        profile: profilePayload
      };

      const { data: llmReply } = await axios.post(`${LLM_SERVICE_URL}/api/chat`, chatPayload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000 // 10s timeout
      });

      if (llmReply && llmReply.success) {
        assistantResponse = llmReply.response;
        tokensUsed = llmReply.tokens_used || 0;
        modelVersion = llmReply.model || 'live-llm';
      } else {
        throw new Error('Invalid LLM service reply structure');
      }
    } catch (llmError) {
      console.error('FastAPI LLM Service unavailable, fallback to offline rules:', String(llmError));
      // Fallback response for offline resilience
      assistantResponse = "I am currently running in offline safety mode. Please make sure the LLM microservice is running. I recommend checking Schemes or Disease history directly in the hub.";
      tokensUsed = 50;
      modelVersion = 'local-resiliency-mode';
    }

    const elapsed = Date.now() - startTime;

    // 6. Save Assistant response to Database
    const { data: assistantMsg, error: insertAiErr } = await supabase
      .from('chat_messages')
      .insert([
        {
          session_id: sessionId,
          sender_role: 'assistant',
          content: assistantResponse,
          tokens_used: tokensUsed,
          generation_time_ms: elapsed,
          model_version: modelVersion,
          metadata: {}
        }
      ])
      .select('*')
      .single();

    if (insertAiErr || !assistantMsg) {
      throw new DatabaseError(`Failed to save assistant response: ${insertAiErr?.message}`);
    }

    // Optional: If title is 'New Farming Conversation', dynamically rename it to first few words
    if (session.title === 'New Farming Conversation') {
      const summaryTitle = messageText.split(' ').slice(0, 4).join(' ') + '...';
      await supabase
        .from('chat_sessions')
        .update({ title: summaryTitle, updated_at: new Date().toISOString() })
        .eq('id', sessionId);
    }

    return mapMessage(assistantMsg);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Send message service failed: ${String(error)}`);
  }
}

/**
 * Archives a session by setting is_active to false
 */
export async function archiveSession(sessionId: string, farmerId: string): Promise<ChatSession> {
  try {
    const supabase = createSupabaseAdminClient();

    // Verify ownership
    const { data: session, error: sErr } = await supabase
      .from('chat_sessions')
      .select('id, farmer_id')
      .eq('id', sessionId)
      .single();

    if (sErr || !session) {
      throw new NotFoundError(`Chat session not found: ${sessionId}`);
    }

    if (session.farmer_id !== farmerId) {
      throw new ValidationError('Not authorized to archive this chat session.');
    }

    const { data, error } = await supabase
      .from('chat_sessions')
      .update({
        is_active: false,
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select('*')
      .single();

    if (error || !data) {
      throw new DatabaseError(`Failed to archive chat session: ${error?.message}`);
    }

    return mapSession(data);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Archive session service failed: ${String(error)}`);
  }
}
