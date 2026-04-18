// Frontend auth state - integrates with backend via api-client.ts
import { api, saveTokens, getAccessToken, clearTokens, getTokens } from './api-client';

export type Role = "worker" | "verifier" | "advocate";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  city: string;
  phone?: string;
  city_zone?: string;
  worker_category?: string;
  is_verified?: boolean;
  email_verified?: boolean;
  verification_status?: string;
  created_at?: string;
};

const KEY = "fairgig.user";

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function setUser(user: User) {
  localStorage.setItem(KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("fairgig:auth"));
}

export function clearUser() {
  localStorage.removeItem(KEY);
  clearTokens();
  window.dispatchEvent(new Event("fairgig:auth"));
}

export function isLoggedIn(): boolean {
  return !!getUser() && !!getAccessToken();
}

/**
 * Sign up a new user
 */
export async function signup(data: {
  email: string;
  password: string;
  full_name: string;
  role: Role;
  phone?: string;
  city?: string;
  city_zone?: string;
  worker_category?: string;
}): Promise<{ user: User; message: string }> {
  const response = await api.signup(data);
  // Don't auto-login yet - user needs to verify email first
  return response;
}

/**
 * Login existing user
 */
export async function login(email: string, password: string): Promise<User> {
  const response = await api.login(email, password);
  
  // Save tokens
  saveTokens({
    access_token: response.access_token,
    refresh_token: response.refresh_token,
    expires_in: response.expires_in,
  });

  // Save user
  const user: User = {
    id: response.user.id,
    name: response.user.full_name,
    email: response.user.email,
    role: response.user.role,
    city: response.user.city || '',
    phone: response.user.phone,
    city_zone: response.user.city_zone,
    worker_category: response.user.worker_category,
    is_verified: response.user.is_verified,
    email_verified: response.user.email_verified,
    verification_status: response.user.verification_status,
    created_at: response.user.created_at,
  };
  setUser(user);
  return user;
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string): Promise<boolean> {
  await api.verifyEmail(token);
  return true;
}

/**
 * Logout current user
 */
export function logout() {
  api.logout();
  clearUser();
}

export const ROLE_HOME: Record<Role, string> = {
  worker: "/app/worker",
  verifier: "/app/verifier",
  advocate: "/app/advocate",
};

export const ROLE_LABEL: Record<Role, string> = {
  worker: "Gig Worker",
  verifier: "Verifier",
  advocate: "Advocate / Analyst",
};
