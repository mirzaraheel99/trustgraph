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

interface SupabaseUserResponse {
  id: string;
  email?: string;
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

async function readAuthError(response: Response, fallback: string) {
  const text = await response.text();
  if (!text) return fallback;

  try {
    const payload = JSON.parse(text) as { error?: string; error_description?: string; msg?: string; message?: string };
    return payload.error_description || payload.msg || payload.message || payload.error || fallback;
  } catch {
    return text;
  }
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

export function readStoredSessionUnsafe(): AuthSession | null {
  if (typeof window === "undefined") return null;

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as AuthSession;
  } catch {
    return null;
  }
}

export async function refreshStoredSession(session: AuthSession): Promise<AuthSession> {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Supabase is not configured for this deployment.");
  }

  const response = await fetch(`${config.url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ refresh_token: session.refreshToken })
  });

  if (!response.ok) {
    persistSession(null);
    throw new Error(`Session refresh failed: ${await readAuthError(response, "Login again to reconnect live database access.")}`);
  }

  const nextSession = toSession((await response.json()) as SupabaseAuthResponse);
  persistSession(nextSession);
  return nextSession;
}

export async function loadStoredSession(): Promise<AuthSession | null> {
  const session = readStoredSessionUnsafe();
  if (!session) return null;

  if (session.expiresAt > Date.now() + 60_000) {
    return session;
  }

  return refreshStoredSession(session);
}

export async function readSessionFromUrl(): Promise<AuthSession | null> {
  const config = getSupabaseConfig();
  if (!config || typeof window === "undefined") return null;

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const queryParams = new URLSearchParams(window.location.search);
  const accessToken = hashParams.get("access_token") ?? queryParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token") ?? queryParams.get("refresh_token");
  const expiresIn = Number(hashParams.get("expires_in") ?? queryParams.get("expires_in") ?? "0");

  if (!accessToken || !refreshToken || !expiresIn) {
    return null;
  }

  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Auth callback failed: ${await readAuthError(response, "Login again to reconnect live database access.")}`);
  }

  const user = (await response.json()) as SupabaseUserResponse;
  const session: AuthSession = {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + expiresIn * 1000,
    user: {
      id: user.id,
      email: user.email ?? "unknown"
    }
  };

  persistSession(session);

  const cleanUrl = `${window.location.origin}${window.location.pathname}`;
  window.history.replaceState({}, document.title, cleanUrl);
  return session;
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
    throw new Error(`Sign in failed: ${await readAuthError(response, "Check the email, password, and Supabase Auth settings.")}`);
  }

  const session = toSession((await response.json()) as SupabaseAuthResponse);
  persistSession(session);
  return session;
}

export async function signUpWithPassword(email: string, password: string, redirectTo?: string): Promise<AuthSession | null> {
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
    body: JSON.stringify({ email, password, options: redirectTo ? { email_redirect_to: redirectTo } : undefined })
  });

  if (!response.ok) {
    throw new Error(`Sign up failed: ${await readAuthError(response, "Check Supabase Auth settings.")}`);
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
    throw new Error(`Password recovery request failed: ${await readAuthError(response, "Check Supabase Auth email settings.")}`);
  }
}

export async function updatePassword(accessToken: string, password: string): Promise<void> {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Supabase is not configured for this deployment.");
  }

  const response = await fetch(`${config.url}/auth/v1/user`, {
    method: "PUT",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ password })
  });

  if (!response.ok) {
    throw new Error(`Password update failed: ${await readAuthError(response, "Use a valid recovery link or login again.")}`);
  }
}

export async function resendSignupConfirmation(email: string, redirectTo?: string): Promise<void> {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Supabase is not configured for this deployment.");
  }

  const response = await fetch(`${config.url}/auth/v1/resend`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email,
      type: "signup",
      options: redirectTo ? { email_redirect_to: redirectTo } : undefined
    })
  });

  if (!response.ok) {
    throw new Error(`Verification resend failed: ${await readAuthError(response, "Wait for the email rate limit to reset, then try again.")}`);
  }
}

export function signOut() {
  persistSession(null);
}

export function authModeLabel() {
  return isSupabaseConfigured() ? "Live Supabase Auth ready" : "Preview mode - add Supabase env vars";
}
