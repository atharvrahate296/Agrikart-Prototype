/**
 * Agri News & Alerts Unit & Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as newsService from '../src/services/news/newsService';
import { DatabaseError, NotFoundError, ValidationError } from '../src/utils/errors';
import {
  validateCreateArticle,
  validateUpdateArticle,
  validateArticleFilters,
  validateCreateAlert,
  validateUpdateAlert,
  validateAlertFilters
} from '../src/utils/news-validators';

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
let mockArticlesResult: { data: any[]; error: any } = { data: [], error: null };
let mockAlertsResult: { data: any[]; error: any } = { data: [], error: null };
let mockInsertResult: { data: any; error: any } = { data: null, error: null };
let mockUpdateResult: { data: any; error: any } = { data: null, error: null };

const mockSupabaseClient = {
  from: vi.fn((tableName: string) => {
    if (tableName === 'profiles') {
      return new MockQueryChain(mockProfilesResult.data, mockProfilesResult.error);
    }
    if (tableName === 'articles') {
      return {
        select: vi.fn(() => new MockQueryChain(mockArticlesResult.data, mockArticlesResult.error, mockArticlesResult.data?.length || 0)),
        insert: vi.fn(() => new MockQueryChain(mockInsertResult.data, mockInsertResult.error)),
        update: vi.fn(() => new MockQueryChain(mockUpdateResult.data, mockUpdateResult.error)),
      };
    }
    if (tableName === 'alerts') {
      return {
        select: vi.fn(() => new MockQueryChain(mockAlertsResult.data, mockAlertsResult.error, mockAlertsResult.data?.length || 0)),
        insert: vi.fn(() => new MockQueryChain(mockInsertResult.data, mockInsertResult.error)),
        update: vi.fn(() => new MockQueryChain(mockUpdateResult.data, mockUpdateResult.error)),
      };
    }
    return new MockQueryChain();
  }),
};

vi.mock('../src/config/supabase', () => ({
  createSupabaseAdminClient: () => mockSupabaseClient,
}));

describe('Agri News & Alerts Service Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProfilesResult = { data: null, error: null };
    mockArticlesResult = { data: [], error: null };
    mockAlertsResult = { data: [], error: null };
    mockInsertResult = { data: null, error: null };
    mockUpdateResult = { data: null, error: null };
  });

  describe('Validators', () => {
    it('should validate and parse valid article query filters', () => {
      const parsed = validateArticleFilters({
        category: 'market',
        state: 'Maharashtra',
        crop: 'Wheat',
        isPublished: 'true',
        limit: '10',
        offset: '5'
      });

      expect(parsed.category).toBe('market');
      expect(parsed.state).toBe('Maharashtra');
      expect(parsed.crop).toBe('Wheat');
      expect(parsed.isPublished).toBe(true);
      expect(parsed.limit).toBe(10);
      expect(parsed.offset).toBe(5);
    });

    it('should throw ValidationError for invalid categories', () => {
      expect(() => {
        validateCreateArticle({
          title: 'New Scheme',
          description: 'A test scheme description',
          content: 'This is the long detailed content of the article.',
          category: 'invalid-category',
          authorName: 'Admin'
        });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for missing required fields', () => {
      expect(() => {
        validateCreateArticle({
          title: 'Abc',
          category: 'general'
          // missing description, content, authorName
        });
      }).toThrow(ValidationError);
    });
  });

  describe('listArticles', () => {
    it('should list articles and map DB snake_case columns to TypeScript camelCase', async () => {
      mockArticlesResult = {
        data: [
          {
            id: 'article-1',
            title: 'Market Updates',
            slug: 'market-updates',
            description: 'Weekly market price trends',
            content: 'Detailed price content...',
            featured_image_url: 'https://example.com/img.jpg',
            category: 'market',
            tags: ['market', 'price'],
            relevant_crops: ['Wheat', 'Rice'],
            relevant_states: ['All'],
            author_id: 'author-123',
            author_name: 'Dr. Patil',
            source_url: 'https://news.example.com',
            is_published: true,
            published_at: '2026-06-01T10:00:00Z',
            view_count: 42,
            share_count: 5,
            created_at: '2026-06-01T09:00:00Z',
            updated_at: '2026-06-01T10:00:00Z',
            metadata: { editor: 'Patil' }
          }
        ],
        error: null
      };

      const result = await newsService.listArticles({ category: 'market' });

      expect(result.count).toBe(1);
      expect(result.articles[0]).toEqual({
        id: 'article-1',
        title: 'Market Updates',
        slug: 'market-updates',
        description: 'Weekly market price trends',
        content: 'Detailed price content...',
        featuredImageUrl: 'https://example.com/img.jpg',
        category: 'market',
        tags: ['market', 'price'],
        relevantCrops: ['Wheat', 'Rice'],
        relevantStates: ['All'],
        authorId: 'author-123',
        authorName: 'Dr. Patil',
        sourceUrl: 'https://news.example.com',
        isPublished: true,
        publishedAt: '2026-06-01T10:00:00Z',
        viewCount: 42,
        shareCount: 5,
        createdAt: '2026-06-01T09:00:00Z',
        updatedAt: '2026-06-01T10:00:00Z',
        metadata: { editor: 'Patil' }
      });
    });
  });

  describe('getArticleByIdOrSlug', () => {
    it('should retrieve article and atomically increment the view counter', async () => {
      const mockArticle = {
        id: 'article-101',
        title: 'Weather Forecast',
        slug: 'weather-forecast',
        description: 'Monsoon predictions',
        content: 'Heavy rains expected in central India...',
        category: 'weather',
        view_count: 10,
        author_name: 'Dr. Rao'
      };

      mockArticlesResult = {
        data: [mockArticle],
        error: null
      };

      mockUpdateResult = {
        data: { ...mockArticle, view_count: 11 },
        error: null
      };

      const result = await newsService.getArticleByIdOrSlug('weather-forecast');

      expect(result.id).toBe('article-101');
      expect(result.viewCount).toBe(11);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('articles');
    });

    it('should throw NotFoundError if article does not exist', async () => {
      mockArticlesResult = { data: [], error: null };

      await expect(
        newsService.getArticleByIdOrSlug('non-existent-slug')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('createArticle', () => {
    it('should generate a unique slug, set default location tags, and insert into Supabase', async () => {
      mockArticlesResult = { data: [], error: null }; // no existing slug conflict
      mockInsertResult = {
        data: {
          id: 'new-article-uuid',
          title: 'Pest Infestation Alert',
          slug: 'pest-infestation-alert',
          description: 'Pest warning description',
          content: 'Details on fall armyworm...',
          category: 'pest',
          relevant_crops: ['Corn'],
          relevant_states: ['Maharashtra'],
          author_id: 'user-expert-1',
          author_name: 'Dr. Shah',
          is_published: true,
          published_at: '2026-06-08T12:00:00Z',
          view_count: 0,
          share_count: 0,
          created_at: '2026-06-08T12:00:00Z',
          updated_at: '2026-06-08T12:00:00Z'
        },
        error: null
      };

      const article = await newsService.createArticle('user-expert-1', {
        title: 'Pest Infestation Alert',
        description: 'Pest warning description',
        content: 'Details on fall armyworm...',
        category: 'pest',
        relevantCrops: ['Corn'],
        relevantStates: ['Maharashtra'],
        authorName: 'Dr. Shah',
        isPublished: true
      });

      expect(article.slug).toBe('pest-infestation-alert');
      expect(article.relevantCrops).toContain('Corn');
      expect(article.relevantStates).toContain('Maharashtra');
      expect(article.isPublished).toBe(true);
    });
  });

  describe('listAlerts & Personalization', () => {
    it('should personalize alerts based on profile state, district, and crop metadata', async () => {
      // 1. Setup mock active alerts
      mockAlertsResult = {
        data: [
          {
            id: 'alert-critical-pests',
            type: 'critical',
            title: 'Armyworm in Maize',
            message: 'Invasion reported in Pune district',
            severity: 'high',
            relevant_states: ['Maharashtra'],
            relevant_districts: ['Pune'],
            relevant_crops: ['Maize'],
            is_active: true
          },
          {
            id: 'alert-weather-general',
            type: 'warning',
            title: 'Heavy Rainfall Alert',
            message: 'Expect heavy rainfall across the state',
            severity: 'medium',
            relevant_states: ['Maharashtra'],
            relevant_districts: ['All'],
            relevant_crops: ['All'],
            is_active: true
          },
          {
            id: 'alert-crop-wheat-punjab',
            type: 'critical',
            title: 'Wheat Rust Warning',
            message: 'Rust infection spreading',
            severity: 'high',
            relevant_states: ['Punjab'],
            relevant_districts: ['Ludhiana'],
            relevant_crops: ['Wheat'],
            is_active: true
          }
        ],
        error: null
      };

      // 2. Setup mock profile for a farmer in Pune growing Maize
      mockProfilesResult = {
        data: {
          id: 'farmer-pune-maize',
          role: 'farmer',
          state: 'Maharashtra',
          location: {
            state: 'Maharashtra',
            district: 'Pune'
          },
          metadata: {
            primary_crops: ['Maize']
          }
        },
        error: null
      };

      const result = await newsService.listAlerts({ isActive: true }, 'farmer-pune-maize');

      // The farmer should receive alert-critical-pests (matches state, district, and crop)
      // and alert-weather-general (matches state, matches 'All' for district/crops)
      // but NOT alert-crop-wheat-punjab (wrong state, wrong district, wrong crop)
      expect(result.count).toBe(2);
      const alertIds = result.alerts.map(a => a.id);
      expect(alertIds).toContain('alert-critical-pests');
      expect(alertIds).toContain('alert-weather-general');
      expect(alertIds).not.toContain('alert-crop-wheat-punjab');
    });

    it('should filter alerts correctly when no userId is passed but query filters are specified', async () => {
      mockAlertsResult = {
        data: [
          {
            id: 'alert-1',
            type: 'info',
            title: 'Pest Notice',
            message: 'General notice',
            relevant_crops: ['Cotton'],
            is_active: true
          },
          {
            id: 'alert-2',
            type: 'critical',
            title: 'Weather Storm',
            message: 'Storm notice',
            relevant_crops: ['All'],
            is_active: true
          }
        ],
        error: null
      };

      const result = await newsService.listAlerts({ crop: 'Cotton' });

      expect(result.count).toBe(2); // alert-1 matches crop Cotton, alert-2 matches 'All'
    });
  });
});
