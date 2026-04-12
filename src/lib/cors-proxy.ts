const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/**
 * Proxy a request through the cors-proxy edge function to bypass
 * browser CORS restrictions for allowed external APIs.
 */
export async function corsFetch(url: string, init?: RequestInit): Promise<Response> {
  const proxyUrl = `${SUPABASE_URL}/functions/v1/cors-proxy`;

  const res = await fetch(proxyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
    ...init,
  });

  return res;
}
