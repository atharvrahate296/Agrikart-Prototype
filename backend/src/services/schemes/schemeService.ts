import { createSupabaseAdminClient } from '../../config/supabase.js';
import { DatabaseError, NotFoundError, ValidationError, ConflictError } from '../../utils/errors';
import type { 
  Scheme, 
  SchemeApplication, 
  SchemeFilters, 
  EligibilityResult, 
  EligibilityQuery,
  ApplicationStatus
} from '../../types/scheme';

/**
 * Maps DB scheme to TypeScript Scheme
 */
function mapScheme(db: any): Scheme {
  return {
    id: db.id,
    name: db.name,
    slug: db.slug,
    description: db.description,
    agency: db.agency,
    eligibleStates: db.eligible_states || [],
    eligibleRoles: db.eligible_roles || [],
    minLandSize: db.min_land_size ? Number(db.min_land_size) : undefined,
    maxIncomeLimit: db.max_income_limit ? Number(db.max_income_limit) : undefined,
    subsidyAmount: db.subsidy_amount ? Number(db.subsidy_amount) : undefined,
    subsidyType: db.subsidy_type,
    benefitsDescription: db.benefits_description,
    launchDate: db.launch_date,
    deadline: db.deadline,
    applicationStartDate: db.application_start_date,
    applicationEndDate: db.application_end_date,
    applicationProcess: db.application_process,
    requiredDocuments: db.required_documents || [],
    officialWebsite: db.official_website,
    contactDetails: db.contact_details,
    isActive: db.is_active ?? true,
    yearApplicable: db.year_applicable,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    metadata: db.metadata,
  };
}

/**
 * Maps DB application to TypeScript SchemeApplication
 */
function mapApplication(db: any): SchemeApplication {
  return {
    id: db.id,
    schemeId: db.scheme_id,
    farmerId: db.farmer_id,
    status: db.status as ApplicationStatus,
    landSizeAtApplication: db.land_size_at_application ? Number(db.land_size_at_application) : undefined,
    incomeAtApplication: db.income_at_application ? Number(db.income_at_application) : undefined,
    documentsSubmitted: db.documents_submitted || [],
    rejectionReason: db.rejection_reason,
    submittedAt: db.submitted_at,
    reviewedAt: db.reviewed_at,
    reviewedBy: db.reviewed_by,
    disbursedAmount: db.disbursed_amount ? Number(db.disbursed_amount) : undefined,
    disbursedAt: db.disbursed_at,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    metadata: db.metadata,
    scheme: db.scheme ? mapScheme(db.scheme) : undefined,
    farmer: db.farmer ? {
      fullName: db.farmer.full_name,
      email: db.farmer.email
    } : undefined
  };
}

/**
 * Browse government schemes with state-wise filtering
 */
export async function listSchemes(filters: SchemeFilters = {}): Promise<{ schemes: Scheme[]; count: number }> {
  try {
    const supabase = createSupabaseAdminClient();
    let query = supabase.from('schemes').select('*', { count: 'exact' });

    if (filters.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    } else {
      query = query.eq('is_active', true);
    }

    if (filters.state) {
      // eligible_states is text[]: matches if 'All' is present or filters.state is in array
      query = query.or(`eligible_states.cs.{"${filters.state}"},eligible_states.cs.{"All"}`);
    }

    if (filters.role) {
      query = query.or(`eligible_roles.cs.{"${filters.role}"},eligible_roles.cs.{"All"}`);
    }

    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

    const { data, count, error } = await query;

    if (error) {
      throw new DatabaseError(`Failed to fetch schemes: ${error.message}`);
    }

    return {
      schemes: (data || []).map(mapScheme),
      count: count || 0,
    };
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError(`List schemes service failed: ${String(error)}`);
  }
}

/**
 * Fetch detailed scheme info by ID
 */
export async function getSchemeById(schemeId: string): Promise<Scheme> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('schemes')
      .select('*')
      .eq('id', schemeId)
      .single();

    if (error || !data) {
      throw new NotFoundError(`Government scheme not found: ${schemeId}`);
    }

    return mapScheme(data);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Get scheme by ID failed: ${String(error)}`);
  }
}

/**
 * Dynamically evaluate eligibility against active schemes
 */
export async function checkEligibility(
  userId?: string,
  criteria?: EligibilityQuery
): Promise<EligibilityResult[]> {
  try {
    const supabase = createSupabaseAdminClient();
    
    // 1. Resolve farmer parameters (from DB profile or criteria overrides)
    let state = criteria?.state;
    let role = criteria?.role || 'farmer';
    let landSize = criteria?.landSize;
    let income = criteria?.income;
    let crops = criteria?.primaryCrops || [];

    if (userId) {
      const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!pError && profile) {
        // Merge DB values if not overridden by criteria
        state = state || profile.state;
        role = role || profile.role;
        
        // Check if metadata contains farm properties (farm_size, annual_income, crops)
        const profileMeta = profile.metadata || {};
        landSize = landSize !== undefined ? landSize : (profileMeta.farm_size || profileMeta.farmSize);
        income = income !== undefined ? income : (profileMeta.annual_income || profileMeta.annualIncome);
        crops = crops.length > 0 ? crops : (profileMeta.primary_crops || profileMeta.primaryCrops || []);
      }
    }

    // 2. Fetch all active schemes
    const { data: dbSchemes, error: sError } = await supabase
      .from('schemes')
      .select('*')
      .eq('is_active', true);

    if (sError) {
      throw new DatabaseError(`Failed to load schemes for eligibility check: ${sError.message}`);
    }

    const schemesList = (dbSchemes || []).map(mapScheme);
    const results: EligibilityResult[] = [];

    // 3. Evaluate criteria for each scheme
    for (const scheme of schemesList) {
      const reasons: string[] = [];
      const missingCriteria: string[] = [];
      let isEligible = true;

      // State Check
      const states = scheme.eligibleStates;
      if (states.length > 0 && !states.includes('All')) {
        if (!state) {
          isEligible = false;
          missingCriteria.push('state');
          reasons.push('Farmer state location is not provided.');
        } else if (!states.includes(state)) {
          isEligible = false;
          reasons.push(`Scheme is only available in: ${states.join(', ')}.`);
        }
      }

      // Role Check
      const roles = scheme.eligibleRoles;
      if (roles.length > 0 && !roles.includes('All')) {
        if (!role) {
          isEligible = false;
          missingCriteria.push('role');
          reasons.push('User role is not defined.');
        } else if (!roles.includes(role)) {
          isEligible = false;
          reasons.push(`Scheme only applies to roles: ${roles.join(', ')}.`);
        }
      }

      // Land Size Check (minLandSize)
      if (scheme.minLandSize !== undefined && scheme.minLandSize > 0) {
        if (landSize === undefined || landSize === null) {
          isEligible = false;
          missingCriteria.push('landSize');
          reasons.push(`Requires minimum land ownership of ${scheme.minLandSize} hectares (farm size is unspecified).`);
        } else if (landSize < scheme.minLandSize) {
          isEligible = false;
          reasons.push(`Requires minimum land ownership of ${scheme.minLandSize} hectares. Farm size is ${landSize} hectares.`);
        }
      }

      // Income Limit Check (maxIncomeLimit)
      if (scheme.maxIncomeLimit !== undefined && scheme.maxIncomeLimit > 0) {
        if (income === undefined || income === null) {
          isEligible = false;
          missingCriteria.push('income');
          reasons.push(`Requires annual income below ₹${scheme.maxIncomeLimit} (annual income is unspecified).`);
        } else if (income > scheme.maxIncomeLimit) {
          isEligible = false;
          reasons.push(`Requires annual income below ₹${scheme.maxIncomeLimit}. Current income is ₹${income}.`);
        }
      }

      // Crop overlap Check (if scheme metadata contains eligible_crops)
      const eligibleCrops = scheme.metadata?.eligible_crops || scheme.metadata?.eligibleCrops;
      if (eligibleCrops && Array.isArray(eligibleCrops) && eligibleCrops.length > 0) {
        if (crops.length === 0) {
          isEligible = false;
          missingCriteria.push('primaryCrops');
          reasons.push(`Requires farming one of the following crops: ${eligibleCrops.join(', ')}.`);
        } else {
          const overlap = crops.some(c => eligibleCrops.includes(c));
          if (!overlap) {
            isEligible = false;
            reasons.push(`Scheme applies only to: ${eligibleCrops.join(', ')}. Farmer primary crops: ${crops.join(', ')}.`);
          }
        }
      }

      results.push({
        scheme,
        isEligible,
        reasons,
        missingCriteria,
      });
    }

    return results;
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Eligibility verification failed: ${String(error)}`);
  }
}

/**
 * Apply to a government scheme
 */
export async function applyForScheme(
  userId: string,
  schemeId: string,
  input: {
    landSizeAtApplication?: number;
    incomeAtApplication?: number;
    documentsSubmitted: Array<{ documentName: string; fileUrl: string }>;
    metadata?: Record<string, any>;
  }
): Promise<SchemeApplication> {
  try {
    const supabase = createSupabaseAdminClient();

    // 1. Fetch scheme details to ensure active and deadline status
    const scheme = await getSchemeById(schemeId);
    if (!scheme.isActive) {
      throw new ValidationError('Cannot apply to an inactive government scheme.');
    }

    if (scheme.deadline) {
      const deadlineDate = new Date(scheme.deadline);
      if (deadlineDate < new Date()) {
        throw new ValidationError('Application deadline for this scheme has passed.');
      }
    }

    // 2. Check duplicate applications
    const { data: existingApp, error: appError } = await supabase
      .from('scheme_applications')
      .select('id')
      .eq('scheme_id', schemeId)
      .eq('farmer_id', userId)
      .maybeSingle();

    if (appError) {
      throw new DatabaseError(`Error checking application history: ${appError.message}`);
    }

    if (existingApp) {
      throw new ConflictError('You have already submitted an application for this government scheme.');
    }

    // 3. Create application
    const { data: newApp, error: insertError } = await supabase
      .from('scheme_applications')
      .insert([
        {
          scheme_id: schemeId,
          farmer_id: userId,
          status: 'submitted',
          land_size_at_application: input.landSizeAtApplication || null,
          income_at_application: input.incomeAtApplication || null,
          documents_submitted: input.documentsSubmitted,
          submitted_at: new Date().toISOString(),
          metadata: input.metadata || {},
        }
      ])
      .select(`
        *,
        scheme:schemes(*)
      `)
      .single();

    if (insertError || !newApp) {
      throw new DatabaseError(`Failed to save scheme application: ${insertError?.message}`);
    }

    return mapApplication(newApp);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof ConflictError || error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(`Scheme application submission failed: ${String(error)}`);
  }
}

/**
 * Fetch application history
 */
export async function getApplications(
  userId: string,
  role: string,
  filters: {
    status?: ApplicationStatus;
    schemeId?: string;
    farmerId?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ applications: SchemeApplication[]; count: number }> {
  try {
    const supabase = createSupabaseAdminClient();
    let query = supabase.from('scheme_applications').select(`
      *,
      scheme:schemes(*),
      farmer:profiles(full_name, email)
    `, { count: 'exact' });

    // Enforce role permission limits
    if (role === 'farmer') {
      query = query.eq('farmer_id', userId);
    } else if (filters.farmerId) {
      query = query.eq('farmer_id', filters.farmerId);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.schemeId) {
      query = query.eq('scheme_id', filters.schemeId);
    }

    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

    const { data, count, error } = await query;

    if (error) {
      throw new DatabaseError(`Failed to fetch scheme applications: ${error.message}`);
    }

    return {
      applications: (data || []).map(mapApplication),
      count: count || 0,
    };
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Get applications service failed: ${String(error)}`);
  }
}

/**
 * Fetch application details by ID
 */
export async function getApplicationById(
  applicationId: string,
  userId: string,
  role: string
): Promise<SchemeApplication> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('scheme_applications')
      .select(`
        *,
        scheme:schemes(*),
        farmer:profiles(full_name, email)
      `)
      .eq('id', applicationId)
      .single();

    if (error || !data) {
      throw new NotFoundError(`Scheme application not found: ${applicationId}`);
    }

    // Access authorization: farmer must own it, or role must be expert/admin
    if (data.farmer_id !== userId && !['expert', 'admin'].includes(role)) {
      throw new ValidationError('Not authorized to access this scheme application.');
    }

    return mapApplication(data);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError || error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Retrieve scheme application details failed: ${String(error)}`);
  }
}

/**
 * Update application review status (Expert/Admin only)
 */
export async function updateApplicationStatus(
  expertId: string,
  applicationId: string,
  input: {
    status: ApplicationStatus;
    rejectionReason?: string;
    disbursedAmount?: number;
    metadata?: Record<string, any>;
  }
): Promise<SchemeApplication> {
  try {
    const supabase = createSupabaseAdminClient();

    // 1. Fetch current application to verify existence
    const { data: appData, error: fetchError } = await supabase
      .from('scheme_applications')
      .select('id, farmer_id, metadata')
      .eq('id', applicationId)
      .single();

    if (fetchError || !appData) {
      throw new NotFoundError(`Scheme application not found: ${applicationId}`);
    }

    // 2. Build update fields
    const updates: any = {
      status: input.status,
      reviewed_by: expertId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (input.status === 'rejected') {
      updates.rejection_reason = input.rejectionReason || 'No reason provided by reviewer.';
    } else {
      updates.rejection_reason = null; // Clear if transitioned back to positive
    }

    if (input.status === 'disbursed') {
      updates.disbursed_amount = input.disbursedAmount || 0;
      updates.disbursed_at = new Date().toISOString();
    }

    if (input.metadata) {
      updates.metadata = { ...appData.metadata, ...input.metadata };
    }

    // 3. Perform update query
    const { data: updated, error: updateError } = await supabase
      .from('scheme_applications')
      .update(updates)
      .eq('id', applicationId)
      .select(`
        *,
        scheme:schemes(*),
        farmer:profiles(full_name, email)
      `)
      .single();

    if (updateError || !updated) {
      throw new DatabaseError(`Failed to update scheme application review status: ${updateError?.message}`);
    }

    return mapApplication(updated);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Update scheme application status failed: ${String(error)}`);
  }
}

/**
 * Fetch deadline alerts for schemes that the farmer qualifies for but hasn't applied to
 */
export async function getDeadlineAlerts(userId: string): Promise<any[]> {
  try {
    const supabase = createSupabaseAdminClient();

    // 1. Evaluate farmer's eligibility
    const eligibilityList = await checkEligibility(userId);
    const eligibleSchemes = eligibilityList.filter(item => item.isEligible).map(item => item.scheme);

    if (eligibleSchemes.length === 0) {
      return [];
    }

    // 2. Fetch schemes already applied to by the farmer
    const { data: appliedApps, error: appError } = await supabase
      .from('scheme_applications')
      .select('scheme_id')
      .eq('farmer_id', userId);

    if (appError) {
      throw new DatabaseError(`Failed to load applications for deadline matching: ${appError.message}`);
    }

    const appliedSchemeIds = new Set((appliedApps || []).map(a => a.scheme_id));

    // 3. Filter eligible schemes with upcoming deadlines
    const alerts: any[] = [];
    const now = new Date();
    const alertHorizonDays = 30; // Alert if deadline is within 30 days

    for (const scheme of eligibleSchemes) {
      // Exclude if already applied
      if (appliedSchemeIds.has(scheme.id)) {
        continue;
      }

      if (!scheme.deadline) {
        continue;
      }

      const deadlineDate = new Date(scheme.deadline);
      const timeDiff = deadlineDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

      // Check if deadline is in the future and within the alert horizon
      if (daysRemaining >= 0 && daysRemaining <= alertHorizonDays) {
        alerts.push({
          schemeId: scheme.id,
          schemeName: scheme.name,
          slug: scheme.slug,
          deadline: scheme.deadline,
          daysRemaining,
          severity: daysRemaining <= 7 ? 'critical' : 'warning',
          message: `Application deadline for "${scheme.name}" is in ${daysRemaining} days (${new Date(scheme.deadline).toLocaleDateString()}). Apply now!`,
        });
      }
    }

    return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Compile scheme deadline alerts failed: ${String(error)}`);
  }
}
