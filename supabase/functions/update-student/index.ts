import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

class AuthError extends Error {
  constructor(message: string, readonly status = 401) {
    super(message);
  }
}

async function requireStaff(req: Request) {
  const header = req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) throw new AuthError("Missing authorization");

  const supabase = adminClient();
  const { data: { user }, error } = await supabase.auth.getUser(header.slice(7));
  if (error || !user) throw new AuthError("Session expired or invalid");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, gender")
    .eq("id", user.id)
    .single();
  if (profileError || !profile) throw new AuthError("Could not verify staff access");
  if (profile.role !== "admin" && profile.role !== "teacher") {
    throw new AuthError("Staff access required", 403);
  }
  return { supabase, staff: profile };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { supabase, staff } = await requireStaff(req);
    const { student_id, ...changes } = await req.json();
    if (!student_id) throw new AuthError("Student required", 400);

    const { data: student, error: studentError } = await supabase
      .from("profiles")
      .select("id, role, gender, current_marhalah")
      .eq("id", student_id)
      .single();
    if (studentError || student?.role !== "student") {
      throw new AuthError("Student not found", 404);
    }

    if (
      staff.role === "teacher" &&
      (student.gender !== staff.gender || (changes.gender && changes.gender !== staff.gender))
    ) {
      throw new AuthError("Teachers can only manage students of their own gender", 403);
    }

    if (
      typeof changes.current_marhalah === "number" &&
      changes.current_marhalah > student.current_marhalah
    ) {
      if (changes.current_marhalah > student.current_marhalah + 1) {
        throw new AuthError("Cannot skip more than one stage at a time", 400);
      }
      const { data: eligible, error: eligibilityError } = await supabase.rpc(
        "can_promote_student",
        { p_student_id: student_id }
      );
      if (eligibilityError) throw new AuthError(eligibilityError.message, 400);
      if (!eligible) {
        throw new AuthError(
          "Student hasn't completed all requirements or the required pass mark yet",
          400
        );
      }

      const { data: nextMarhalah, error: nextMarhalahError } = await supabase
        .from("marhalahs")
        .select("id")
        .eq("number", changes.current_marhalah)
        .single();
      if (nextMarhalahError || !nextMarhalah) {
        throw new AuthError("Target Marḥalah not found", 400);
      }
      const { error: resetError } = await supabase.rpc("reset_marhalah_progress", {
        p_student_id: student_id,
        p_marhalah_id: nextMarhalah.id,
      });
      if (resetError) throw new AuthError(resetError.message, 400);
    }

    const update: Record<string, unknown> = {};
    for (const key of [
      "first_name",
      "last_name",
      "gender",
      "registration_number",
      "current_marhalah",
      "is_suspended",
    ]) {
      if (changes[key] !== undefined) update[key] = changes[key];
    }

    if (changes.phone) {
      const phone = String(changes.phone).replace(/\D/g, "");
      if (!phone) throw new AuthError("Enter a valid phone number", 400);
      update.phone = phone;
      update.email = `${phone}@students.tajweed.local`;
      const { error: authError } = await supabase.auth.admin.updateUserById(student_id, {
        email: update.email as string,
        email_confirm: true,
        user_metadata: { phone },
      });
      if (authError) throw new AuthError(authError.message, 400);
    }

    if (typeof changes.password === "string" && changes.password.trim()) {
      const password = changes.password.trim();
      if (password.length < 6) {
        throw new AuthError("Password must be at least 6 characters", 400);
      }
      const { error: passwordError } = await supabase.auth.admin.updateUserById(
        student_id,
        { password }
      );
      if (passwordError) throw new AuthError(passwordError.message, 400);
    }

    if (typeof update.registration_number === "string" && update.registration_number) {
      const { data: duplicate } = await supabase
        .from("profiles")
        .select("id")
        .eq("registration_number", update.registration_number)
        .neq("id", student_id)
        .maybeSingle();
      if (duplicate) throw new AuthError("Registration number already in use", 400);
    }

    const { data: profile, error: updateError } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", student_id)
      .select("*")
      .single();
    if (updateError) throw new AuthError(updateError.message, 400);

    return new Response(JSON.stringify({ profile }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed";
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
