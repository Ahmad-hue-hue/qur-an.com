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
    const { first_name, last_name, phone, gender, current_marhalah } =
      await req.json();

    if (!first_name?.trim() || !phone?.trim()) {
      return new Response(JSON.stringify({ error: "Name and phone are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (gender !== "male" && gender !== "female") {
      return new Response(JSON.stringify({ error: "Gender must be male or female" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const marhalah = Number(current_marhalah) || 1;
    if (marhalah < 1 || marhalah > 4) {
      return new Response(
        JSON.stringify({ error: "Marḥalah must be between 1 and 4" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const normalizedPhone = phone.replace(/\D/g, "");
    const email = `${normalizedPhone}@students.tajweed.local`;
    const password = crypto.randomUUID() + crypto.randomUUID();

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name,
          last_name: last_name ?? "",
          phone: normalizedPhone,
          role: "student",
          gender,
        },
      });

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const studentId = authData.user.id;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        gender,
        current_marhalah: marhalah,
      })
      .eq("id", studentId);

    if (profileError) {
      await supabase.auth.admin.deleteUser(studentId);
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: regError } = await supabase.rpc("assign_registration_number", {
      p_student_id: studentId,
    });

    if (regError) {
      console.error("assign_registration_number failed:", regError.message);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", studentId)
      .single();

    return new Response(
      JSON.stringify({
        profile,
        login_email: email,
        temporary_password: password,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Failed" }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
