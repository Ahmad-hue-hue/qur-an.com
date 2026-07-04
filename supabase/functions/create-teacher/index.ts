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
      email,
      password,
      first_name,
      last_name,
      gender,
      managed_marhalah,
    } = await req.json();

    if (!email?.trim() || !password?.trim() || !first_name?.trim()) {
      return new Response(
        JSON.stringify({ error: "Email, password, and first name are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (gender !== "male" && gender !== "female") {
      return new Response(
        JSON.stringify({ error: "Gender must be male or female" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const marhalah = Number(managed_marhalah) || 1;
    if (marhalah < 1 || marhalah > 4) {
      return new Response(
        JSON.stringify({ error: "Managed marhalah must be between 1 and 4" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: first_name.trim(),
          last_name: (last_name ?? "").trim(),
          role: "teacher",
          gender,
          managed_marhalah: marhalah,
        },
      });

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        role: "teacher",
        gender,
        managed_marhalah: marhalah,
        first_name: first_name.trim(),
        last_name: (last_name ?? "").trim(),
        email: normalizedEmail,
      })
      .eq("id", authData.user.id);

    if (profileError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (fetchError || !profile) {
      return new Response(
        JSON.stringify({ error: fetchError?.message ?? "Teacher profile not found" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        profile,
        login_email: normalizedEmail,
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
