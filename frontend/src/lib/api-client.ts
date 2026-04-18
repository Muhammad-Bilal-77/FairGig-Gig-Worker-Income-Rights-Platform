/**
 * API Client for FairGig Backend
 * Handles JWT tokens, refresh, and request/response intercepting
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4001';
const EARNINGS_API_BASE = import.meta.env.VITE_EARNINGS_API_URL || 'http://localhost:4002';

export interface ApiError {
  error: string;
  message?: string;
  details?: Array<{ field: string; message: string }>;
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
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
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
    const error: ApiError = await response.json().catch(() => ({
      error: `HTTP ${response.status}: ${response.statusText}`,
    }));
    throw { status: response.status, ...error };
  }

  return response.json();
}

async function earningsRequest(
  endpoint: string,
  options: RequestInit & { requiresAuth?: boolean } = {}
): Promise<any> {
  const { requiresAuth = true, ...fetchOptions } = options;

  let url = `${EARNINGS_API_BASE}${endpoint}`;
  const headers: HeadersInit = {
    ...fetchOptions.headers,
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

    listPendingVerification: () =>
      earningsRequest('/api/earnings/shifts/pending-verification', {
        method: 'GET',
        requiresAuth: true,
      }),

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
};
