/**
 * Government Schemes Types & Interfaces
 */

export interface Scheme {
  id: string;
  name: string;
  slug: string;
  description: string;
  agency: string;
  
  eligibleStates: string[];
  eligibleRoles: string[];
  minLandSize?: number;
  maxIncomeLimit?: number;
  
  subsidyAmount?: number;
  subsidyType?: string;
  benefitsDescription?: string;
  
  launchDate?: string;
  deadline?: string;
  applicationStartDate?: string;
  applicationEndDate?: string;
  
  applicationProcess?: string;
  requiredDocuments: string[];
  officialWebsite?: string;
  contactDetails?: Record<string, any>;
  
  isActive: boolean;
  yearApplicable?: number;
  
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export type ApplicationStatus = 
  | 'pending'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'disbursed';

export interface SchemeApplication {
  id: string;
  schemeId: string;
  farmerId: string;
  status: ApplicationStatus;
  
  landSizeAtApplication?: number;
  incomeAtApplication?: number;
  documentsSubmitted: Array<{ documentName: string; fileUrl: string }>;
  
  rejectionReason?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  
  disbursedAmount?: number;
  disbursedAt?: string;
  
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
  
  // Joins
  scheme?: Partial<Scheme>;
  farmer?: {
    fullName: string;
    email: string;
  };
}

export interface SchemeFilters {
  state?: string;
  role?: string;
  crop?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export interface EligibilityResult {
  scheme: Scheme;
  isEligible: boolean;
  reasons: string[];
  missingCriteria: string[];
}

export interface EligibilityQuery {
  state?: string;
  role?: string;
  landSize?: number;
  income?: number;
  primaryCrops?: string[];
}
