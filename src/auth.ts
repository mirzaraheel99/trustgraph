import { getSupabaseConfig, isSupabaseConfigured } from "./supabase";

const STORAGE_KEY = "trustgraph.supabase.session";

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthUser;
}

interface SupabaseAuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email?: string;
  };
}

function toSession(response: SupabaseAuthResponse): AuthSession {
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresAt: Date.now() + response.expires_in * 1000,
    user: {
      id: response.user.id,
      email: response.user.email ?? "unknown"
    }
  };
}

function persistSession(session: AuthSession | null) {
  if (typeof window === "undefined") return;

  if (!session) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function readStoredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  try {
    const session = JSON.parse(stored) as AuthSession;
    return session.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}

export async function signInWithPassword(email: string, password: string): Promise<AuthSession> {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Supabase is not configured for this deployment.");
  }

  const response = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    throw new Error("Sign in failed. Check the email, password, and Supabase Auth settings.");
  }

  const session = toSession((await response.json()) as SupabaseAuthResponse);
  persistSession(session);
  return session;
}

export async function signUpWithPassword(email: string, password: string): Promise<AuthSession | null> {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Supabase is not configured for this deployment.");
  }

  const response = await fetch(`${config.url}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    throw new Error("Sign up failed. Check Supabase Auth settings.");
  }

  const payload = (await response.json()) as Partial<SupabaseAuthResponse>;
  if (!payload.access_token || !payload.refresh_token || !payload.expires_in || !payload.user) {
    return null;
  }

  const session = toSession(payload as SupabaseAuthResponse);
  persistSession(session);
  return session;
}

export async function requestPasswordRecovery(email: string, redirectTo?: string): Promise<void> {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Supabase is not configured for this deployment.");
  }

  const response = await fetch(`${config.url}/auth/v1/recover`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, redirect_to: redirectTo })
  });

  if (!response.ok) {
    throw new Error("Password recovery request failed. Check Supabase Auth email settings.");
  }
}

export function signOut() {
  persistSession(null);
}

export function authModeLabel() {
  return isSupabaseConfigured() ? "Live Supabase Auth ready" : "Demo mode - add Supabase env vars";
}
