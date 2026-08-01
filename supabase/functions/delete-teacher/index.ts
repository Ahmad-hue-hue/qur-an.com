import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing authorization");

  const supabase = adminClient();
  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Admin only");
  return supabase;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = await requireAdmin(req);
    const body = await req.json().catch(() => null);
    const teacher_id = body?.teacher_id as string | undefined;
    if (!teacher_id) {
      return jsonError("teacher_id required");
    }

    const { data: existing, error: fetchError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", teacher_id)
      .maybeSingle();

    if (fetchError) {
      return jsonError(fetchError.message);
    }

    if (!existing || existing.role !== "teacher") {
      return jsonError("Teacher not found", 404);
    }

    const { error: profileDeleteError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", teacher_id)
      .eq("role", "teacher");

    if (profileDeleteError) {
      return jsonError(profileDeleteError.message);
    }

    const { error: authDeleteError } =
      await supabase.auth.admin.deleteUser(teacher_id);

    if (authDeleteError) {
      // Profile already removed; auth user may already be gone after cascade.
      const message = authDeleteError.message || "Could not delete auth user";
      if (!/user not found|not found/i.test(message)) {
        return jsonError(message);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    const status =
      message === "Unauthorized" ||
      message === "Missing authorization" ||
      message === "Admin only"
        ? 401
        : 400;
    return jsonError(message, status);
  }
});
