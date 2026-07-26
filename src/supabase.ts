interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return {
    url: url.replace(/\/$/, ""),
    anonKey
  };
}

export function isSupabaseConfigured() {
  return getSupabaseConfig() !== null;
}

export async function supabaseRest<T>(path: string, init: RequestInit & { accessToken?: string } = {}): Promise<T> {
  const config = getSupabaseConfig();
  const { accessToken, ...requestInit } = init;

  if (!config) {
    throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  const response = await fetch(`${config.url}/rest/v1/${path.replace(/^\//, "")}`, {
    ...requestInit,
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${accessToken ?? config.anonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...requestInit.headers
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Supabase request failed: ${response.status} ${message}`);
  }

  return response.json() as Promise<T>;
}
