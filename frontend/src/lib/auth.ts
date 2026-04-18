// Lightweight client-side auth state for UI demo (no backend).
export type Role = "worker" | "verifier" | "advocate";

export type User = {
  name: string;
  email: string;
  role: Role;
  city: string;
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
  window.dispatchEvent(new Event("fairgig:auth"));
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
