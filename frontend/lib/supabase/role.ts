import type { SupabaseClient } from "@supabase/supabase-js";

export type AppRole = "student" | "admin" | "teacher";

const VALID_ROLES: AppRole[] = ["student", "admin", "teacher"];

function normalizeRole(value: unknown): AppRole | null {
  if (typeof value === "string" && VALID_ROLES.includes(value as AppRole)) {
    return value as AppRole;
  }
  return null;
}

export async function fetchUserRole(
  supabase: SupabaseClient,
  userId: string
): Promise<AppRole | null> {
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
