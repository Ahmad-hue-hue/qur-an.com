import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  if (url.includes("placeholder") || url.includes("your-project")) return false;
  if (key === "placeholder-anon-key" || key.includes("your-anon")) return false;
  return true;
}

export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL. Copy frontend/.env.example to .env.local"
    );
  }
  return url;
}

export function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy frontend/.env.example to .env.local"
    );
  }
  return key;
}

export function createClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (typeof window === "undefined") {
    return createBrowserClient(url, key);
  }

  if (!client) {
    client = createBrowserClient(url, key, {
      cookies: {
        getAll() {
          return document.cookie
            .split(";")
            .map((part) => part.trim())
            .filter(Boolean)
            .map((cookie) => {
              const eq = cookie.indexOf("=");
              const name = eq === -1 ? cookie : cookie.slice(0, eq);
              const value = eq === -1 ? "" : cookie.slice(eq + 1);
              return { name, value: decodeURIComponent(value) };
            });
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const encoded = encodeURIComponent(value);
            const parts = [`${name}=${encoded}`, "path=/"];
            if (options?.maxAge) parts.push(`max-age=${options.maxAge}`);
            if (options?.sameSite) parts.push(`samesite=${options.sameSite}`);
            if (options?.secure) parts.push("secure");
            document.cookie = parts.join("; ");
          });
        },
      },
    });
  }
  return client;
}

export function getSupabase(): SupabaseClient {
  return createClient();
}
