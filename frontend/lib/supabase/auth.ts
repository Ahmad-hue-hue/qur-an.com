import { getSupabase } from "@/lib/supabase/client";
import { normalizePhone, splitFullName, SupabaseApiError, throwIfError } from "@/lib/supabase/utils";
import type { AdminLoginCredentials, StudentRegisterCredentials } from "@/lib/types";

export const authApi = {
  registerStudent: async ({
    email,
    password,
    name,
    phone,
  }: StudentRegisterCredentials) => {
    const { firstName, lastName } = splitFullName(name);
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: normalizePhone(phone),
          role: "student",
        },
      },
    });
    if (error) throw new SupabaseApiError(error.message);
    if (!data.session) {
      throw new SupabaseApiError(
        "Registration succeeded. Check your email to confirm your account."
      );
    }
    return data.session;
  },

  loginStudent: async ({ email, password }: { email: string; password: string }) => {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new SupabaseApiError(error.message);
    return data.session;
  },

  loginAdmin: async ({ email, password }: AdminLoginCredentials) => {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new SupabaseApiError(error.message);

    const profile = throwIfError(
      await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single()
    ) as { role: string };

    if (profile.role !== "admin") {
      await supabase.auth.signOut();
      throw new SupabaseApiError("Admin access required");
    }

    return data.session;
  },

  logout: async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
  },
};
