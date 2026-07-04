import type { SupabaseClient, User } from "@supabase/supabase-js";

export type AppRole = "student" | "admin" | "teacher";

const VALID_ROLES: AppRole[] = ["student", "admin", "teacher"];

function normalizeRole(value: unknown): AppRole | null {
  if (typeof value === "string" && VALID_ROLES.includes(value as AppRole)) {
    return value as AppRole;
  }
  return null;
}

/** Read role from JWT user metadata when present (no network). */
export function roleFromUser(user: User | null | undefined): AppRole | null {
  if (!user) return null;
  return (
    normalizeRole(user.user_metadata?.role) ??
    normalizeRole(user.app_metadata?.role)
  );
}

export async function fetchUserRole(
  supabase: SupabaseClient,
  userId: string,
  user?: User | null
): Promise<AppRole | null> {
  const fromMetadata = roleFromUser(user ?? undefined);
  if (fromMetadata) {
    return fromMetadata;
  }

  const { data: rpcRole, error: rpcError } = await supabase.rpc("get_my_role");

  const fromRpc = normalizeRole(rpcRole);
  if (!rpcError && fromRpc) {
    return fromRpc;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch user role:", error.message);
    return null;
  }

  return normalizeRole(data?.role) ?? "student";
}
