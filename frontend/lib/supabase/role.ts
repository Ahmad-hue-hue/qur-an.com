import type { SupabaseClient } from "@supabase/supabase-js";

export type AppRole = "student" | "admin";

export async function fetchUserRole(
  supabase: SupabaseClient,
  userId: string
): Promise<AppRole | null> {
  const { data: rpcRole, error: rpcError } = await supabase.rpc("get_my_role");

  if (!rpcError && (rpcRole === "admin" || rpcRole === "student")) {
    return rpcRole;
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

  if (data?.role === "admin" || data?.role === "student") {
    return data.role;
  }

  return "student";
}
