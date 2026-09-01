/**
 * Agri News & Alerts Types & Interfaces
 */

export type ArticleCategory = 'market' | 'weather' | 'pest' | 'government' | 'general';

export interface Article {
  id: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  featuredImageUrl?: string;
  
  category: ArticleCategory;
  tags: string[];
  relevantCrops: string[];
  relevantStates: string[];
  
  authorId?: string;
  authorName: string;
  sourceUrl?: string;
  
  isPublished: boolean;
  publishedAt?: string;
  viewCount: number;
  shareCount: number;
  
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export type AlertType = 'critical' | 'warning' | 'info';
export type AlertSeverity = 'high' | 'medium' | 'low';

export interface Alert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  severity?: AlertSeverity;
  
  relevantStates: string[];
  relevantDistricts: string[];
  relevantCrops: string[];
  
  actionUrl?: string;
  externalLink?: string;
  
  isActive: boolean;
  expiresAt?: string;
  
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface ArticleFilters {
  category?: ArticleCategory;
  state?: string;
  crop?: string;
  tag?: string;
  isPublished?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface AlertFilters {
  type?: AlertType;
  severity?: AlertSeverity;
  state?: string;
  district?: string;
  crop?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}
