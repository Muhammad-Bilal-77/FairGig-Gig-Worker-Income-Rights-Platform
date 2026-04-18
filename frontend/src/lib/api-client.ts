/**
 * API Client for FairGig Backend
 * Handles JWT tokens, refresh, and request/response intercepting
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4001';

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
};
