/**
 * API Client for FairGig Backend
 * Handles JWT tokens, refresh, and request/response intercepting
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4001';
const EARNINGS_API_BASE = import.meta.env.VITE_EARNINGS_API_URL || 'http://localhost:4002';
const ANOMALY_API_BASE = import.meta.env.VITE_ANOMALY_API_URL || 'http://localhost:4003';
const CERTIFICATE_API_BASE = import.meta.env.VITE_CERTIFICATE_API_URL || 'http://localhost:4006';
export const GRIEVANCE_API_BASE = import.meta.env.VITE_GRIEVANCE_API_URL || 'http://localhost:4004';

export interface ApiError {
  error: string;
  message?: string;
  details?: Array<{ field: string; message: string }>;
}

function formatUnknownError(input: unknown): string {
  if (typeof input === 'string') {
    return input;
  }

  if (Array.isArray(input)) {
    const messages = input
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'msg' in item) {
          return String((item as { msg?: unknown }).msg ?? 'Validation error');
        }
        return '';
      })
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join('; ');
    }
  }

  if (input && typeof input === 'object' && 'detail' in input) {
    return formatUnknownError((input as { detail?: unknown }).detail);
  }

  if (input && typeof input === 'object' && 'error' in input) {
    return formatUnknownError((input as { error?: unknown }).error);
  }

  return 'Request failed';
}

async function buildApiError(response: Response): Promise<ApiError & { status: number }> {
  const fallback = `HTTP ${response.status}: ${response.statusText}`;
  const payload = await response.json().catch(() => ({ error: fallback }));
  const normalizedMessage = formatUnknownError(payload) || fallback;

  return {
    status: response.status,
    error: normalizedMessage,
    message: normalizedMessage,
    details: Array.isArray((payload as { error?: unknown })?.error)
      ? ((payload as { error?: Array<{ loc?: unknown[]; msg?: unknown }> }).error || []).map((item) => ({
          field: Array.isArray(item.loc) ? item.loc.join('.') : 'unknown',
          message: String(item.msg ?? 'Validation error'),
        }))
      : undefined,
  };
}

export interface WorkerAccount {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  role: 'worker';
  city?: string | null;
  city_zone?: string | null;
  worker_category?: string | null;
  is_active: boolean;
  is_verified: boolean;
  email_verified: boolean;
  verification_status: string;
  last_login_at?: string | null;
  created_at: string;
}

export type SubmissionStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'FLAGGED'
  | 'UNVERIFIABLE'
  | 'NO_SCREENSHOT';

export interface VerificationSubmission {
  id: string;
  worker_id: string;
  platform: string;
  city_zone: string;
  worker_category: string;
  shift_date: string;
  hours_worked: number | string;
  gross_earned: number | string;
  platform_deduction: number | string;
  net_received: number | string;
  effective_hourly_rate: number | string;
  deduction_rate: number | string;
  screenshot_url: string | null;
  screenshot_public_id?: string | null;
  verify_status: SubmissionStatus;
  verified_by?: string | null;
  verified_at?: string | null;
  verifier_note?: string | null;
  import_source: string;
  created_at: string;
  updated_at: string;
  worker_full_name: string | null;
  worker_email: string | null;
  worker_city: string | null;
  worker_profile_city_zone: string | null;
  verifier_full_name?: string | null;
  verifier_email?: string | null;
}

interface Tokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

const TOKEN_KEY = 'fairgig.tokens';

export function saveTokens(tokens: Tokens) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

export function getTokens(): Tokens | null {
  try {
    const stored = localStorage.getItem(TOKEN_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  const tokens = getTokens();
  return tokens?.access_token || null;
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
}

async function refreshAccessToken(): Promise<string | null> {
  const tokens = getTokens();
  if (!tokens?.refresh_token) {
    clearTokens();
    return null;
  }

  try {
    const response = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: tokens.refresh_token }),
    });

    if (!response.ok) {
      clearTokens();
      return null;
    }

    const newTokens = await response.json();
    saveTokens(newTokens);
    return newTokens.access_token;
  } catch {
    clearTokens();
    return null;
  }
}

async function apiRequest(
  endpoint: string,
  options: RequestInit & { requiresAuth?: boolean } = {}
): Promise<any> {
  const { requiresAuth = false, ...fetchOptions } = options;

  let url = `${API_BASE}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  // Add auth token if required
  if (requiresAuth) {
    let token = getAccessToken();
    
    if (!token) {
      token = await refreshAccessToken();
    }

    if (!token) {
      throw new Error('Authentication required');
    }

    headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  // If 401 and we have a refresh token, try refreshing
  if (response.status === 401 && requiresAuth && getTokens()?.refresh_token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, {
        ...fetchOptions,
        headers,
      });
    }
  }

  if (!response.ok) {
    throw await buildApiError(response);
  }

  return response.json();
}

async function earningsRequest(
  endpoint: string,
  options: RequestInit & { requiresAuth?: boolean } = {}
): Promise<any> {
  const { requiresAuth = true, ...fetchOptions } = options;

  let url = `${EARNINGS_API_BASE}${endpoint}`;
  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  };

  // Don't set Content-Type for FormData
  if (!(fetchOptions.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Add auth token if required
  if (requiresAuth) {
    let token = getAccessToken();
    
    if (!token) {
      token = await refreshAccessToken();
    }

    if (!token) {
      throw new Error('Authentication required');
    }

    headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  // If 401 and we have a refresh token, try refreshing
  if (response.status === 401 && requiresAuth && getTokens()?.refresh_token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, {
        ...fetchOptions,
        headers,
      });
    }
  }

  if (!response.ok) {
    throw await buildApiError(response);
  }

  return response.json();
}

async function certificateRequest(
  endpoint: string,
  options: RequestInit & { requiresAuth?: boolean } = {}
): Promise<any> {
  const { requiresAuth = true, ...fetchOptions } = options;

  let url = `${CERTIFICATE_API_BASE}${endpoint}`;
  const headers: HeadersInit = {
    ...fetchOptions.headers,
  };

  if (!(fetchOptions.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (requiresAuth) {
    let token = getAccessToken();

    if (!token) {
      token = await refreshAccessToken();
    }

    if (!token) {
      throw new Error('Authentication required');
    }

    headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (response.status === 401 && requiresAuth && getTokens()?.refresh_token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, {
        ...fetchOptions,
        headers,
      });
    }
  }

  if (!response.ok) {
    throw await buildApiError(response);
  }

  return response.json();
}

async function anomalyRequest(
  endpoint: string,
  options: RequestInit & { requiresAuth?: boolean } = {}
): Promise<any> {
  const { requiresAuth = true, ...fetchOptions } = options;

  let url = `${ANOMALY_API_BASE}${endpoint}`;
  const headers: HeadersInit = {
    ...fetchOptions.headers,
  };

  if (!(fetchOptions.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (requiresAuth) {
    let token = getAccessToken();

    if (!token) {
      token = await refreshAccessToken();
    }

    if (!token) {
      throw new Error('Authentication required');
    }

    headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (response.status === 401 && requiresAuth && getTokens()?.refresh_token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, {
        ...fetchOptions,
        headers,
      });
    }
  }

  if (!response.ok) {
    throw await buildApiError(response);
  }

  return response.json();
}

async function grievanceRequest(
  endpoint: string,
  options: RequestInit & { requiresAuth?: boolean } = {}
): Promise<any> {
  const { requiresAuth = false, ...fetchOptions } = options;

  let url = `${GRIEVANCE_API_BASE}${endpoint}`;
  const headers: HeadersInit = {
    ...fetchOptions.headers,
  };

  if (!(fetchOptions.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (requiresAuth) {
    let token = getAccessToken();
    if (!token) {
      token = await refreshAccessToken();
    }
    if (!token) {
      throw new Error('Authentication required');
    }
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    // Optional auth: attach token if it exists but don't fail if it doesn't
    const token = getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  let response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (response.status === 401 && requiresAuth && getTokens()?.refresh_token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, {
        ...fetchOptions,
        headers,
      });
    }
  }

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      error: `HTTP ${response.status}: ${response.statusText}`,
    }));
    throw { status: response.status, ...error };
  }

  return response.json();
}

export const api = {
  // Auth endpoints
  signup: (data: {
    email: string;
    password: string;
    full_name: string;
    role: 'worker' | 'verifier' | 'advocate';
    phone?: string;
    city?: string;
    city_zone?: string;
    worker_category?: string;
  }) =>
    apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (email: string, password: string) =>
    apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  verifyEmail: (token: string) =>
    apiRequest('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  resendVerificationEmail: (email: string) =>
    apiRequest('/api/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  // Protected endpoints
  getProfile: () =>
    apiRequest('/api/auth/me', {
      method: 'GET',
      requiresAuth: true,
    }),

  updateProfile: (data: any) =>
    apiRequest('/api/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
      requiresAuth: true,
    }),

  listWorkers: (params?: {
    include_inactive?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ success: boolean; data: WorkerAccount[]; count: number }> => {
    const query = new URLSearchParams();
    if (params?.include_inactive) query.append('include_inactive', 'true');
    if (params?.search) query.append('search', params.search);
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());

    const queryString = query.toString();
    return apiRequest(`/api/auth/workers${queryString ? '?' + queryString : ''}`, {
      method: 'GET',
      requiresAuth: true,
    });
  },

  setWorkerActiveStatus: (
    workerId: string,
    isActive: boolean,
  ): Promise<{ success: boolean; data: WorkerAccount }> =>
    apiRequest(`/api/auth/workers/${workerId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive }),
      requiresAuth: true,
    }),

  logout: () => {
    clearTokens();
  },

  // Earnings endpoints
  earnings: {
    createShift: (shiftData: {
      platform: string;
      city_zone: string;
      worker_category: string;
      shift_date: string; // ISO date
      hours_worked: number;
      gross_earned: number;
      platform_deduction: number;
      net_received: number;
      screenshot_url?: string;
    }) =>
      earningsRequest('/api/earnings/shifts', {
        method: 'POST',
        body: JSON.stringify(shiftData),
        requiresAuth: true,
      }),

    listShifts: (params?: {
      from_date?: string;
      to_date?: string;
      platform?: string;
      limit?: number;
      offset?: number;
    }) => {
      const query = new URLSearchParams();
      if (params?.from_date) query.append('from_date', params.from_date);
      if (params?.to_date) query.append('to_date', params.to_date);
      if (params?.platform) query.append('platform', params.platform);
      if (params?.limit) query.append('limit', params.limit.toString());
      if (params?.offset) query.append('offset', params.offset.toString());

      const queryString = query.toString();
      return earningsRequest(`/api/earnings/shifts${queryString ? '?' + queryString : ''}`, {
        method: 'GET',
        requiresAuth: true,
      });
    },

    getShift: (shiftId: string) =>
      earningsRequest(`/api/earnings/shifts/${shiftId}`, {
        method: 'GET',
        requiresAuth: true,
      }),

    updateScreenshot: (shiftId: string, screenshotUrl: string) =>
      earningsRequest(`/api/earnings/shifts/${shiftId}/screenshot?screenshot_url=${encodeURIComponent(screenshotUrl)}`, {
        method: 'POST',
        requiresAuth: true,
      }),

    deleteShift: (shiftId: string) =>
      earningsRequest(`/api/earnings/shifts/${shiftId}`, {
        method: 'DELETE',
        requiresAuth: true,
      }),

    uploadCsv: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return earningsRequest('/api/earnings/shifts/import', {
        method: 'POST',
        body: formData,
        requiresAuth: true,
      });
    },

    // Analytics endpoints
    getSummary: (params?: {
      from_date?: string;
      to_date?: string;
    }) => {
      const query = new URLSearchParams();
      if (params?.from_date) query.append('from_date', params.from_date);
      if (params?.to_date) query.append('to_date', params.to_date);
      
      return earningsRequest(`/api/earnings/summary${query.toString() ? '?' + query.toString() : ''}`, {
        method: 'GET',
        requiresAuth: true,
      });
    },

    getMedian: (params?: {
      city_zone?: string;
      platform?: string;
      worker_category?: string;
    }) => {
      const query = new URLSearchParams();
      if (params?.city_zone) query.append('city_zone', params.city_zone);
      if (params?.platform) query.append('platform', params.platform);
      if (params?.worker_category) query.append('worker_category', params.worker_category);
      
      return earningsRequest(`/api/earnings/median${query.toString() ? '?' + query.toString() : ''}`, {
        method: 'GET',
        requiresAuth: true,
      });
    },

    listPendingVerification: () =>
      earningsRequest('/api/earnings/shifts/pending-verification', {
        method: 'GET',
        requiresAuth: true,
      }),

    listSubmissions: (params?: {
      statuses?: string[];
      from_date?: string;
      to_date?: string;
      platform?: string;
      city_zone?: string;
      worker_category?: string;
      worker_query?: string;
      only_with_screenshot?: boolean;
      limit?: number;
      offset?: number;
    }) => {
      const query = new URLSearchParams();
      if (params?.statuses?.length) query.append('statuses', params.statuses.join(','));
      if (params?.from_date) query.append('from_date', params.from_date);
      if (params?.to_date) query.append('to_date', params.to_date);
      if (params?.platform) query.append('platform', params.platform);
      if (params?.city_zone) query.append('city_zone', params.city_zone);
      if (params?.worker_category) query.append('worker_category', params.worker_category);
      if (params?.worker_query) query.append('worker_query', params.worker_query);
      if (typeof params?.only_with_screenshot === 'boolean') {
        query.append('only_with_screenshot', String(params.only_with_screenshot));
      }
      if (typeof params?.limit === 'number') query.append('limit', String(params.limit));
      if (typeof params?.offset === 'number') query.append('offset', String(params.offset));

      return earningsRequest(`/api/earnings/shifts/submissions${query.toString() ? '?' + query.toString() : ''}`, {
        method: 'GET',
        requiresAuth: true,
      });
    },

    verifyShift: (
      shiftId: string,
      data: {
        status: 'CONFIRMED' | 'FLAGGED' | 'UNVERIFIABLE';
        note?: string;
      }
    ) =>
      earningsRequest(`/api/earnings/shifts/${shiftId}/verify`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        requiresAuth: true,
      }),
  },

  certificate: {
    generate: (data: { from_date: string; to_date: string }) =>
      certificateRequest('/api/certificates/generate', {
        method: 'POST',
        body: JSON.stringify(data),
        requiresAuth: true,
      }),

    list: () =>
      certificateRequest('/api/certificates', {
        method: 'GET',
        requiresAuth: true,
      }),

    getSummary: (certRef: string) =>
      certificateRequest(`/api/certificates/${encodeURIComponent(certRef)}/json`, {
        method: 'GET',
        requiresAuth: true,
      }),

    getViewUrl: (certRef: string, download = false, type?: string) => {
      const token = getAccessToken();
      const baseUrl = `${CERTIFICATE_API_BASE}/api/certificates/${encodeURIComponent(certRef)}`;
      const queryParams = new URLSearchParams();
      if (token) queryParams.append('token', token);
      if (download) queryParams.append('download', '1');
      if (type) queryParams.append('type', type);
      const qs = queryParams.toString();
      return qs ? `${baseUrl}?${qs}` : baseUrl;
    }
  },

  anomaly: {
    getWorkerAnalysis: (workerId: string) =>
      anomalyRequest(`/api/anomaly/worker/${workerId}`, {
        method: 'GET',
        requiresAuth: true,
      }),
  },

  grievance: {
    listComplaints: (params: { platform?: string; city_zone?: string; poster_id?: string; page?: number } = {}) => {
      const qs = new URLSearchParams();
      if (params.platform) qs.append('platform', params.platform);
      if (params.city_zone) qs.append('city_zone', params.city_zone);
      if (params.poster_id) qs.append('poster_id', params.poster_id);
      if (params.page) qs.append('page', params.page.toString());
      return grievanceRequest(`/api/grievance/complaints?${qs.toString()}`);
    },

    getComplaint: (id: string) =>
      grievanceRequest(`/api/grievance/complaints/${id}`),

    createComplaint: (data: {
      platform: string;
      category: string;
      title: string;
      description: string;
      city_zone?: string;
      anonymous?: boolean;
      images?: string[];
    }) =>
      grievanceRequest('/api/grievance/complaints', {
        method: 'POST',
        body: JSON.stringify(data),
        requiresAuth: true,
      }),

    upvote: (id: string) =>
      grievanceRequest(`/api/grievance/complaints/${id}/upvote`, {
        method: 'POST',
        requiresAuth: true,
      }),

    getComments: (id: string) =>
      grievanceRequest(`/api/grievance/complaints/${id}/comments`),

    addComment: (id: string, body: string) =>
      grievanceRequest(`/api/grievance/complaints/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body }),
        requiresAuth: true,
      }),

    getNotifications: () =>
      grievanceRequest('/api/grievance/notifications', {
        requiresAuth: true,
      }),

    markNotificationRead: (id: string) =>
      grievanceRequest(`/api/grievance/notifications/${id}/read`, {
        method: 'PATCH',
        requiresAuth: true,
      }),

    getStats: () => grievanceRequest('/api/grievance/stats'),
  },
};
