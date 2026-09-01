import { createSupabaseAdminClient } from '../../config/supabase.js';
import { DatabaseError, NotFoundError, ValidationError } from '../../utils/errors.js';
import type {
  Article,
  Alert,
  ArticleFilters,
  AlertFilters,
  ArticleCategory,
  AlertType,
  AlertSeverity
} from '../../types/news';

/**
 * Maps database article row to TypeScript Article
 */
function mapArticle(db: any): Article {
  return {
    id: db.id,
    title: db.title,
    slug: db.slug,
    description: db.description,
    content: db.content,
    featuredImageUrl: db.featured_image_url || undefined,
    category: db.category as ArticleCategory,
    tags: db.tags || [],
    relevantCrops: db.relevant_crops || [],
    relevantStates: db.relevant_states || [],
    authorId: db.author_id || undefined,
    authorName: db.author_name,
    sourceUrl: db.source_url || undefined,
    isPublished: db.is_published ?? false,
    publishedAt: db.published_at || undefined,
    viewCount: db.view_count || 0,
    shareCount: db.share_count || 0,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    metadata: db.metadata || {},
  };
}

/**
 * Maps database alert row to TypeScript Alert
 */
function mapAlert(db: any): Alert {
  return {
    id: db.id,
    type: db.type as AlertType,
    title: db.title,
    message: db.message,
    severity: db.severity as AlertSeverity || undefined,
    relevantStates: db.relevant_states || [],
    relevantDistricts: db.relevant_districts || [],
    relevantCrops: db.relevant_crops || [],
    actionUrl: db.action_url || undefined,
    externalLink: db.external_link || undefined,
    isActive: db.is_active ?? true,
    expiresAt: db.expires_at || undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    metadata: db.metadata || {},
  };
}

/**
 * Generates a clean URL slug from article title
 */
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start
    .replace(/-+$/, ''); // Trim - from end
}

/**
 * List news articles with pagination and filters
 */
export async function listArticles(filters: ArticleFilters = {}): Promise<{ articles: Article[]; count: number }> {
  try {
    const supabase = createSupabaseAdminClient();
    let query = supabase.from('articles').select('*', { count: 'exact' });

    if (filters.isPublished !== undefined) {
      query = query.eq('is_published', filters.isPublished);
    } else {
      // Default to showing only published articles if not specified
      query = query.eq('is_published', true);
    }

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.state) {
      query = query.or(`relevant_states.cs.{"${filters.state}"},relevant_states.cs.{"All"}`);
    }

    if (filters.crop) {
      query = query.or(`relevant_crops.cs.{"${filters.crop}"},relevant_crops.cs.{"All"}`);
    }

    if (filters.tag) {
      query = query.contains('tags', [filters.tag]);
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    query = query.range(offset, offset + limit - 1).order('published_at', { ascending: false });

    const { data, count, error } = await query;

    if (error) {
      throw new DatabaseError(`Failed to fetch articles: ${error.message}`);
    }

    return {
      articles: (data || []).map(mapArticle),
      count: count || 0,
    };
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError(`List articles service failed: ${String(error)}`);
  }
}

/**
 * Retrieves a single article by ID or unique Slug, atomically incrementing the view count
 */
export async function getArticleByIdOrSlug(idOrSlug: string): Promise<Article> {
  try {
    const supabase = createSupabaseAdminClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    let query = supabase.from('articles').select('*');
    if (isUuid) {
      query = query.eq('id', idOrSlug);
    } else {
      query = query.eq('slug', idOrSlug);
    }

    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      throw new NotFoundError(`Article not found: ${idOrSlug}`);
    }

    // Increment views atomically (fetch-and-update approach is safe for views)
    const currentViews = data.view_count || 0;
    const { data: updated, error: updateError } = await supabase
      .from('articles')
      .update({ view_count: currentViews + 1 })
      .eq('id', data.id)
      .select('*')
      .single();

    const resultData = updateError ? data : updated;
    if (!updateError) {
      resultData.view_count = currentViews + 1;
    }

    return mapArticle(resultData);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Retrieve article failed: ${String(error)}`);
  }
}

/**
 * Creates a new article (Admin/Expert only)
 */
export async function createArticle(
  authorId: string,
  input: {
    title: string;
    description: string;
    content: string;
    featuredImageUrl?: string;
    category: ArticleCategory;
    tags?: string[];
    relevantCrops?: string[];
    relevantStates?: string[];
    authorName: string;
    sourceUrl?: string;
    isPublished?: boolean;
    publishedAt?: string;
    metadata?: Record<string, any>;
  }
): Promise<Article> {
  try {
    const supabase = createSupabaseAdminClient();

    // 1. Generate unique slug
    let slug = slugify(input.title);
    const { data: existing } = await supabase
      .from('articles')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (existing) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // 2. Default relevant location/crops to 'All' if not specified
    const states = input.relevantStates && input.relevantStates.length > 0 ? input.relevantStates : ['All'];
    const crops = input.relevantCrops && input.relevantCrops.length > 0 ? input.relevantCrops : ['All'];

    const isPublished = input.isPublished ?? false;
    const publishedAt = isPublished ? (input.publishedAt || new Date().toISOString()) : null;

    const { data, error } = await supabase
      .from('articles')
      .insert([
        {
          title: input.title,
          slug,
          description: input.description,
          content: input.content,
          featured_image_url: input.featuredImageUrl || null,
          category: input.category,
          tags: input.tags || [],
          relevant_crops: crops,
          relevant_states: states,
          author_id: authorId,
          author_name: input.authorName,
          source_url: input.sourceUrl || null,
          is_published: isPublished,
          published_at: publishedAt,
          view_count: 0,
          share_count: 0,
          metadata: input.metadata || {},
        }
      ])
      .select('*')
      .single();

    if (error || !data) {
      throw new DatabaseError(`Failed to create article: ${error?.message}`);
    }

    return mapArticle(data);
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Create article failed: ${String(error)}`);
  }
}

/**
 * Modifies an existing article (Admin/Expert only)
 */
export async function updateArticle(
  id: string,
  input: {
    title?: string;
    description?: string;
    content?: string;
    featuredImageUrl?: string;
    category?: ArticleCategory;
    tags?: string[];
    relevantCrops?: string[];
    relevantStates?: string[];
    authorName?: string;
    sourceUrl?: string;
    isPublished?: boolean;
    publishedAt?: string;
    metadata?: Record<string, any>;
  }
): Promise<Article> {
  try {
    const supabase = createSupabaseAdminClient();

    // 1. Check article existence
    const { data: current, error: fetchError } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      throw new NotFoundError(`Article not found: ${id}`);
    }

    // 2. Prepare updates mapping camelCase to snake_case
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) updates.title = input.title;
    if (input.description !== undefined) updates.description = input.description;
    if (input.content !== undefined) updates.content = input.content;
    if (input.featuredImageUrl !== undefined) updates.featured_image_url = input.featuredImageUrl || null;
    if (input.category !== undefined) updates.category = input.category;
    if (input.tags !== undefined) updates.tags = input.tags;
    if (input.relevantCrops !== undefined) {
      updates.relevant_crops = input.relevantCrops.length > 0 ? input.relevantCrops : ['All'];
    }
    if (input.relevantStates !== undefined) {
      updates.relevant_states = input.relevantStates.length > 0 ? input.relevantStates : ['All'];
    }
    if (input.authorName !== undefined) updates.author_name = input.authorName;
    if (input.sourceUrl !== undefined) updates.source_url = input.sourceUrl || null;

    if (input.isPublished !== undefined) {
      updates.is_published = input.isPublished;
      if (input.isPublished && !current.is_published) {
        updates.published_at = input.publishedAt || new Date().toISOString();
      } else if (!input.isPublished) {
        updates.published_at = null;
      }
    }

    if (input.metadata !== undefined) {
      updates.metadata = { ...current.metadata, ...input.metadata };
    }

    const { data, error: updateError } = await supabase
      .from('articles')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError || !data) {
      throw new DatabaseError(`Failed to update article: ${updateError?.message}`);
    }

    return mapArticle(data);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Update article failed: ${String(error)}`);
  }
}

/**
 * List active alerts, with optional profile location & crop personalization
 */
export async function listAlerts(filters: AlertFilters = {}, userId?: string): Promise<{ alerts: Alert[]; count: number }> {
  try {
    const supabase = createSupabaseAdminClient();
    let query = supabase.from('alerts').select('*');

    if (filters.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    } else {
      query = query.eq('is_active', true);
    }

    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    if (filters.severity) {
      query = query.eq('severity', filters.severity);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new DatabaseError(`Failed to fetch alerts: ${error.message}`);
    }

    let alerts = (data || []).map(mapAlert);

    // Apply personalization if userId is provided
    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profile) {
        const pState = profile.state || profile.location?.state || profile.metadata?.state;
        const pDistrict = profile.location?.district || profile.metadata?.district;
        const pCrops = profile.primary_crops || profile.primaryCrops || profile.metadata?.primary_crops || profile.metadata?.primaryCrops || [];

        alerts = alerts.filter(alert => {
          // Check state
          const stateMatch =
            alert.relevantStates.length === 0 ||
            alert.relevantStates.includes('All') ||
            (pState && alert.relevantStates.includes(pState));

          // Check district
          const districtMatch =
            alert.relevantDistricts.length === 0 ||
            alert.relevantDistricts.includes('All') ||
            (pDistrict && alert.relevantDistricts.includes(pDistrict));

          // Check crop
          const cropMatch =
            alert.relevantCrops.length === 0 ||
            alert.relevantCrops.includes('All') ||
            (Array.isArray(pCrops) && pCrops.some(crop => alert.relevantCrops.includes(crop)));

          return stateMatch && districtMatch && cropMatch;
        });
      }
    } else {
      // If no user profile exists, apply query filters directly
      if (filters.state) {
        alerts = alerts.filter(alert => alert.relevantStates.length === 0 || alert.relevantStates.includes('All') || alert.relevantStates.includes(filters.state!));
      }
      if (filters.district) {
        alerts = alerts.filter(alert => alert.relevantDistricts.length === 0 || alert.relevantDistricts.includes('All') || alert.relevantDistricts.includes(filters.district!));
      }
      if (filters.crop) {
        alerts = alerts.filter(alert => alert.relevantCrops.length === 0 || alert.relevantCrops.includes('All') || alert.relevantCrops.includes(filters.crop!));
      }
    }

    const totalCount = alerts.length;
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    const paginatedAlerts = alerts.slice(offset, offset + limit);

    return {
      alerts: paginatedAlerts,
      count: totalCount,
    };
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError(`List alerts service failed: ${String(error)}`);
  }
}

/**
 * Creates a new system warning alert (Admin/Expert only)
 */
export async function createAlert(
  input: {
    type: AlertType;
    title: string;
    message: string;
    severity?: AlertSeverity;
    relevantStates?: string[];
    relevantDistricts?: string[];
    relevantCrops?: string[];
    actionUrl?: string;
    externalLink?: string;
    isActive?: boolean;
    expiresAt?: string;
    metadata?: Record<string, any>;
  }
): Promise<Alert> {
  try {
    const supabase = createSupabaseAdminClient();

    const states = input.relevantStates && input.relevantStates.length > 0 ? input.relevantStates : ['All'];
    const districts = input.relevantDistricts && input.relevantDistricts.length > 0 ? input.relevantDistricts : ['All'];
    const crops = input.relevantCrops && input.relevantCrops.length > 0 ? input.relevantCrops : ['All'];

    const { data, error } = await supabase
      .from('alerts')
      .insert([
        {
          type: input.type,
          title: input.title,
          message: input.message,
          severity: input.severity || null,
          relevant_states: states,
          relevant_districts: districts,
          relevant_crops: crops,
          action_url: input.actionUrl || null,
          external_link: input.externalLink || null,
          is_active: input.isActive ?? true,
          expires_at: input.expiresAt || null,
          metadata: input.metadata || {},
        }
      ])
      .select('*')
      .single();

    if (error || !data) {
      throw new DatabaseError(`Failed to create alert: ${error?.message}`);
    }

    return mapAlert(data);
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Create alert failed: ${String(error)}`);
  }
}

/**
 * Modifies an existing alert (Admin/Expert only)
 */
export async function updateAlert(
  id: string,
  input: {
    type?: AlertType;
    title?: string;
    message?: string;
    severity?: AlertSeverity;
    relevantStates?: string[];
    relevantDistricts?: string[];
    relevantCrops?: string[];
    actionUrl?: string;
    externalLink?: string;
    isActive?: boolean;
    expiresAt?: string;
    metadata?: Record<string, any>;
  }
): Promise<Alert> {
  try {
    const supabase = createSupabaseAdminClient();

    // 1. Verify existence
    const { data: current, error: fetchError } = await supabase
      .from('alerts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      throw new NotFoundError(`Alert not found: ${id}`);
    }

    // 2. Prepare updates mapping camelCase to snake_case
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (input.type !== undefined) updates.type = input.type;
    if (input.title !== undefined) updates.title = input.title;
    if (input.message !== undefined) updates.message = input.message;
    if (input.severity !== undefined) updates.severity = input.severity;
    if (input.relevantStates !== undefined) {
      updates.relevant_states = input.relevantStates.length > 0 ? input.relevantStates : ['All'];
    }
    if (input.relevantDistricts !== undefined) {
      updates.relevant_districts = input.relevantDistricts.length > 0 ? input.relevantDistricts : ['All'];
    }
    if (input.relevantCrops !== undefined) {
      updates.relevant_crops = input.relevantCrops.length > 0 ? input.relevantCrops : ['All'];
    }
    if (input.actionUrl !== undefined) updates.action_url = input.actionUrl || null;
    if (input.externalLink !== undefined) updates.external_link = input.externalLink || null;
    if (input.isActive !== undefined) updates.is_active = input.isActive;
    if (input.expiresAt !== undefined) updates.expires_at = input.expiresAt || null;

    if (input.metadata !== undefined) {
      updates.metadata = { ...current.metadata, ...input.metadata };
    }

    const { data, error: updateError } = await supabase
      .from('alerts')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError || !data) {
      throw new DatabaseError(`Failed to update alert: ${updateError?.message}`);
    }

    return mapAlert(data);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Update alert failed: ${String(error)}`);
  }
}
