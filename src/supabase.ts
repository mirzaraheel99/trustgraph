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

export async function supabaseStorageUpload(input: {
  bucket: string;
  path: string;
  file: File;
  accessToken: string;
}): Promise<{ path: string }> {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  const response = await fetch(
    `${config.url}/storage/v1/object/${encodeURIComponent(input.bucket)}/${input.path
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/")}`,
    {
      method: "POST",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": input.file.type || "application/octet-stream",
        "x-upsert": "false"
      },
      body: input.file
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Supabase storage upload failed: ${response.status} ${message}`);
  }

  return response.json() as Promise<{ path: string }>;
}

export async function supabaseStorageSignedUrl(input: {
  bucket: string;
  path: string;
  accessToken: string;
  expiresIn?: number;
}): Promise<{ signedURL: string }> {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  const response = await fetch(
    `${config.url}/storage/v1/object/sign/${encodeURIComponent(input.bucket)}/${input.path
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/")}`,
    {
      method: "POST",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ expiresIn: input.expiresIn ?? 300 })
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Supabase storage signed URL failed: ${response.status} ${message}`);
  }

  return response.json() as Promise<{ signedURL: string }>;
}

export async function supabaseRpc<T>(
  functionName: string,
  body: Record<string, unknown>,
  init: RequestInit & { accessToken?: string } = {}
): Promise<T> {
  return supabaseRest<T>(`rpc/${functionName}`, {
    ...init,
    method: "POST",
    body: JSON.stringify(body)
  });
}
