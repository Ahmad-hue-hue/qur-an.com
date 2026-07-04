import { getSupabase } from "@/lib/supabase/client";

const BROWSER_SESSION_KEY = "tajweed-browser-session";

/** Clears persisted auth when this tab/window has not logged in yet. */
export async function ensureActiveBrowserSession(): Promise<boolean> {
  if (typeof window === "undefined") return true;

  const active = sessionStorage.getItem(BROWSER_SESSION_KEY);
  if (active) return true;

  await getSupabase().auth.signOut({ scope: "local" });
  return false;
}

export function markBrowserSessionActive(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(BROWSER_SESSION_KEY, "1");
}

export function clearBrowserSessionMarker(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(BROWSER_SESSION_KEY);
}
