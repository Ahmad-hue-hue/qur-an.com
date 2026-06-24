import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

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
  if (typeof window === "undefined") {
    return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
  }
  if (!client) {
    client = createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
  }
  return client;
}

export function getSupabase(): SupabaseClient {
  return createClient();
}
