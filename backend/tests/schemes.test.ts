/**
 * Government Schemes Unit & Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as schemeService from '../src/services/schemes/schemeService';
import { DatabaseError, NotFoundError, ValidationError, ConflictError } from '../src/utils/errors';
import { 
  validateEligibilityQuery, 
  validateApplyScheme, 
  validateUpdateApplicationStatus 
} from '../src/utils/scheme-validators';

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
let mockSchemesResult: { data: any[]; error: any } = { data: [], error: null };
let mockApplicationsResult: { data: any; error: any } = { data: [], error: null };
let mockInsertResult: { data: any; error: any } = { data: null, error: null };
let mockUpdateResult: { data: any; error: any } = { data: null, error: null };

const mockSupabaseClient = {
  from: vi.fn((tableName: string) => {
    if (tableName === 'profiles') {
      return new MockQueryChain(mockProfilesResult.data, mockProfilesResult.error);
    }
    if (tableName === 'schemes') {
      return new MockQueryChain(mockSchemesResult.data, mockSchemesResult.error, mockSchemesResult.data?.length || 0);
    }
    if (tableName === 'scheme_applications') {
      return {
        select: vi.fn(() => new MockQueryChain(mockApplicationsResult.data, mockApplicationsResult.error, mockApplicationsResult.data?.length || 0)),
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

describe('Government Schemes Service Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProfilesResult = { data: null, error: null };
    mockSchemesResult = { data: [], error: null };
    mockApplicationsResult = { data: [], error: null };
    mockInsertResult = { data: null, error: null };
    mockUpdateResult = { data: null, error: null };
  });

  describe('listSchemes', () => {
    it('should list active schemes and map them correctly', async () => {
      mockSchemesResult = {
        data: [
          {
            id: 'scheme-1',
            name: 'PM-KISAN',
            slug: 'pm-kisan',
            description: 'Income support scheme',
            agency: 'Central Government',
            eligible_states: ['All'],
            eligible_roles: ['farmer'],
            is_active: true,
            min_land_size: 0,
            max_income_limit: 200000,
          }
        ],
        error: null
      };

      const { schemes, count } = await schemeService.listSchemes();
      expect(schemes).toHaveLength(1);
      expect(count).toBe(1);
      expect(schemes[0].name).toBe('PM-KISAN');
      expect(schemes[0].eligibleStates).toContain('All');
      expect(schemes[0].isActive).toBe(true);
    });
  });

  describe('checkEligibility', () => {
    const mockActiveSchemes = [
      {
        id: 'scheme-state-limited',
        name: 'State Scheme',
        slug: 'state-scheme',
        description: 'State specific subsidy',
        agency: 'Maharashtra State Gov',
        eligible_states: ['Maharashtra'],
        eligible_roles: ['farmer'],
        is_active: true,
        min_land_size: 2,
        max_income_limit: 150000,
        metadata: {
          eligible_crops: ['Wheat', 'Rice']
        }
      },
      {
        id: 'scheme-open',
        name: 'General Scheme',
        slug: 'general-scheme',
        description: 'General support',
        agency: 'Ministry of Agri',
        eligible_states: ['All'],
        eligible_roles: ['farmer'],
        is_active: true,
        min_land_size: 0,
        max_income_limit: 0,
      }
    ];

    it('should determine eligibility correctly for qualified farmer', async () => {
      mockProfilesResult = {
        data: {
          id: 'user-1',
          state: 'Maharashtra',
          role: 'farmer',
          metadata: {
            farm_size: 3,
            annual_income: 120000,
            primary_crops: ['Wheat']
          }
        },
        error: null
      };
      
      mockSchemesResult = {
        data: mockActiveSchemes,
        error: null
      };

      const results = await schemeService.checkEligibility('user-1');
      expect(results).toHaveLength(2);

      const stateSchemeResult = results.find(r => r.scheme.id === 'scheme-state-limited');
      expect(stateSchemeResult?.isEligible).toBe(true);
      expect(stateSchemeResult?.reasons).toHaveLength(0);

      const openSchemeResult = results.find(r => r.scheme.id === 'scheme-open');
      expect(openSchemeResult?.isEligible).toBe(true);
    });

    it('should reject eligibility if farmer state is ineligible', async () => {
      mockProfilesResult = {
        data: {
          id: 'user-1',
          state: 'Punjab',
          role: 'farmer',
          metadata: {
            farm_size: 3,
            annual_income: 120000,
            primary_crops: ['Wheat']
          }
        },
        error: null
      };
      
      mockSchemesResult = {
        data: mockActiveSchemes,
        error: null
      };

      const results = await schemeService.checkEligibility('user-1');
      const stateSchemeResult = results.find(r => r.scheme.id === 'scheme-state-limited');
      expect(stateSchemeResult?.isEligible).toBe(false);
      expect(stateSchemeResult?.reasons[0]).toContain('Scheme is only available in: Maharashtra');
    });

    it('should reject eligibility if land size or income limits are violated', async () => {
      mockProfilesResult = {
        data: {
          id: 'user-1',
          state: 'Maharashtra',
          role: 'farmer',
          metadata: {
            farm_size: 1, // requires 2
            annual_income: 200000, // requires max 150000
            primary_crops: ['Wheat']
          }
        },
        error: null
      };
      
      mockSchemesResult = {
        data: mockActiveSchemes,
        error: null
      };

      const results = await schemeService.checkEligibility('user-1');
      const stateSchemeResult = results.find(r => r.scheme.id === 'scheme-state-limited');
      expect(stateSchemeResult?.isEligible).toBe(false);
      expect(stateSchemeResult?.reasons).toContain('Requires minimum land ownership of 2 hectares. Farm size is 1 hectares.');
      expect(stateSchemeResult?.reasons).toContain('Requires annual income below ₹150000. Current income is ₹200000.');
    });
  });

  describe('applyForScheme', () => {
    it('should create an application successfully', async () => {
      const mockScheme = {
        id: 'scheme-1',
        name: 'PM-KISAN',
        slug: 'pm-kisan',
        description: 'Income support',
        agency: 'Central Gov',
        is_active: true,
        deadline: new Date(Date.now() + 86400000).toISOString(),
      };

      mockSchemesResult = {
        data: [mockScheme],
        error: null
      };

      mockApplicationsResult = {
        data: [],
        error: null
      };

      const mockInsertedApp = {
        id: 'app-1',
        scheme_id: 'scheme-1',
        farmer_id: 'user-1',
        status: 'submitted',
      };
      
      mockInsertResult = {
        data: mockInsertedApp,
        error: null
      };

      const result = await schemeService.applyForScheme('user-1', 'scheme-1', {
        landSizeAtApplication: 2,
        incomeAtApplication: 100000,
        documentsSubmitted: [{ documentName: 'Aadhaar Card', fileUrl: 'https://docs.com/aadhaar.pdf' }]
      });

      expect(result.id).toBe('app-1');
      expect(result.status).toBe('submitted');
    });

    it('should reject application if scheme deadline has passed', async () => {
      const mockScheme = {
        id: 'scheme-1',
        name: 'PM-KISAN',
        slug: 'pm-kisan',
        is_active: true,
        deadline: new Date(Date.now() - 86400000).toISOString(),
      };

      mockSchemesResult = {
        data: [mockScheme],
        error: null
      };

      await expect(
        schemeService.applyForScheme('user-1', 'scheme-1', { documentsSubmitted: [] })
      ).rejects.toThrow(ValidationError);
    });

    it('should reject application if duplicate entry exists', async () => {
      const mockScheme = {
        id: 'scheme-1',
        name: 'PM-KISAN',
        slug: 'pm-kisan',
        is_active: true,
      };

      mockSchemesResult = {
        data: [mockScheme],
        error: null
      };

      mockApplicationsResult = {
        data: [{ id: 'app-existing' }],
        error: null
      };

      await expect(
        schemeService.applyForScheme('user-1', 'scheme-1', { documentsSubmitted: [] })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('updateApplicationStatus', () => {
    it('should transition to rejected status with reason', async () => {
      mockApplicationsResult = {
        data: { id: 'app-1', farmer_id: 'user-1' },
        error: null
      };

      const mockUpdatedRecord = {
        id: 'app-1',
        scheme_id: 'scheme-1',
        status: 'rejected',
        rejection_reason: 'Missing land records certificate',
        reviewed_by: 'expert-1',
      };

      mockUpdateResult = {
        data: mockUpdatedRecord,
        error: null
      };

      const result = await schemeService.updateApplicationStatus('expert-1', 'app-1', {
        status: 'rejected',
        rejectionReason: 'Missing land records certificate'
      });

      expect(result.status).toBe('rejected');
      expect(result.rejectionReason).toBe('Missing land records certificate');
    });

    it('should transition to disbursed status and log disbursement amount', async () => {
      mockApplicationsResult = {
        data: { id: 'app-1', farmer_id: 'user-1' },
        error: null
      };

      const mockUpdatedRecord = {
        id: 'app-1',
        scheme_id: 'scheme-1',
        status: 'disbursed',
        disbursed_amount: 15000,
        reviewed_by: 'expert-1',
      };

      mockUpdateResult = {
        data: mockUpdatedRecord,
        error: null
      };

      const result = await schemeService.updateApplicationStatus('expert-1', 'app-1', {
        status: 'disbursed',
        disbursedAmount: 15000
      });

      expect(result.status).toBe('disbursed');
      expect(result.disbursedAmount).toBe(15000);
    });
  });
});

describe('Government Schemes Zod Validators', () => {
  describe('validateEligibilityQuery', () => {
    it('should parse numeric query parameters and arrays correctly', () => {
      const payload = {
        state: 'Maharashtra',
        landSize: '2.5',
        income: '120000',
        primaryCrops: 'Wheat,Rice,Cotton',
      };

      const result = validateEligibilityQuery(payload);
      expect(result.landSize).toBe(2.5);
      expect(result.income).toBe(120000);
      expect(result.primaryCrops).toContain('Wheat');
      expect(result.primaryCrops).toContain('Cotton');
    });
  });

  describe('validateUpdateApplicationStatus', () => {
    it('should validate status change with correct rejection reason or disbursed amount', () => {
      const payloadRejected = {
        status: 'rejected',
        rejectionReason: 'Ineligible land size',
      };
      const resultRejected = validateUpdateApplicationStatus(payloadRejected);
      expect(resultRejected.status).toBe('rejected');

      const payloadDisbursed = {
        status: 'disbursed',
        disbursedAmount: 6000,
      };
      const resultDisbursed = validateUpdateApplicationStatus(payloadDisbursed);
      expect(resultDisbursed.status).toBe('disbursed');
    });

    it('should throw validation error on missing rejectionReason when status is rejected', () => {
      const payload = {
        status: 'rejected',
      };
      expect(() => validateUpdateApplicationStatus(payload)).toThrow();
    });

    it('should throw validation error on missing disbursedAmount when status is disbursed', () => {
      const payload = {
        status: 'disbursed',
      };
      expect(() => validateUpdateApplicationStatus(payload)).toThrow();
    });
  });
});

describe('Government Schemes API Router Structure', () => {
  it('should have mounted expected routes', async () => {
    // Import router dynamically to avoid test setup side effects
    const { default: router } = await import('../src/routes/schemes');
    
    const routes = router.stack
      .filter(r => r.route)
      .map(r => ({
        path: r.route.path,
        methods: Object.keys(r.route.methods),
      }));

    const paths = routes.map(r => r.path);
    expect(paths).toContain('/');
    expect(paths).toContain('/eligibility');
    expect(paths).toContain('/alerts/deadlines');
    expect(paths).toContain('/:id/apply');
    expect(paths).toContain('/applications');
    expect(paths).toContain('/applications/:id');
    expect(paths).toContain('/applications/:id/status');
    expect(paths).toContain('/:id');
  });
});

