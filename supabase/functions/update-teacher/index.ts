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

class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError("Missing authorization");
  }

  const supabase = adminClient();
  const token = authHeader.slice("Bearer ".length);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) {
    throw new AuthError("Session expired or invalid. Sign in again.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new AuthError("Could not verify admin access");
  }
  if (profile?.role !== "admin") {
    throw new AuthError("Admin access required", 403);
  }

  return supabase;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = await requireAdmin(req);
    const {
      teacher_id,
      phone,
      password,
      first_name,
      last_name,
      gender,
      managed_marhalah,
    } = await req.json();

    if (!teacher_id) {
      return new Response(JSON.stringify({ error: "teacher_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existing, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", teacher_id)
      .eq("role", "teacher")
      .maybeSingle();

    if (fetchError || !existing) {
      return new Response(JSON.stringify({ error: "Teacher not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (gender && gender !== "male" && gender !== "female") {
      return new Response(
        JSON.stringify({ error: "Gender must be male or female" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const marhalah =
      managed_marhalah != null ? Number(managed_marhalah) : existing.managed_marhalah;
    if (marhalah != null && (marhalah < 1 || marhalah > 4)) {
      return new Response(
        JSON.stringify({ error: "Managed marhalah must be between 1 and 4" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const normalizedPhone = phone?.trim()
      ? phone.replace(/\D/g, "")
      : existing.phone?.replace(/\D/g, "") ?? "";

    const authPayload: {
      email?: string;
      password?: string;
      user_metadata?: Record<string, unknown>;
    } = {};

    if (normalizedPhone) {
      authPayload.email = `${normalizedPhone}@teachers.tajweed.local`;
    }

    if (password?.trim()) {
      if (password.trim().length < 6) {
        return new Response(
          JSON.stringify({ error: "Password must be at least 6 characters" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      authPayload.password = password.trim();
    }

    authPayload.user_metadata = {
      first_name: first_name?.trim() ?? existing.first_name,
      last_name: last_name?.trim() ?? existing.last_name ?? "",
      phone: normalizedPhone || existing.phone,
      role: "teacher",
      gender: gender ?? existing.gender,
      managed_marhalah: marhalah ?? existing.managed_marhalah,
    };

    const { error: authError } = await supabase.auth.admin.updateUserById(
      teacher_id,
      authPayload
    );
    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profileUpdate: Record<string, unknown> = {
      first_name: first_name?.trim() ?? existing.first_name,
      last_name: last_name?.trim() ?? existing.last_name ?? "",
      gender: gender ?? existing.gender,
      managed_marhalah: marhalah ?? existing.managed_marhalah,
    };
    if (normalizedPhone) {
      profileUpdate.phone = normalizedPhone;
      profileUpdate.email = `${normalizedPhone}@teachers.tajweed.local`;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update(profileUpdate)
      .eq("id", teacher_id);

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile, error: profileFetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", teacher_id)
      .single();

    if (profileFetchError || !profile) {
      return new Response(
        JSON.stringify({
          error: profileFetchError?.message ?? "Teacher profile not found",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        profile,
        login_phone: profile.phone ?? normalizedPhone,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const status = err instanceof AuthError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Failed";
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
