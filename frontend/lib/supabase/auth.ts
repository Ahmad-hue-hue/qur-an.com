import { getSupabase } from "@/lib/supabase/client";
import { fetchUserRole } from "@/lib/supabase/role";
import { normalizePhone, splitFullName, SupabaseApiError } from "@/lib/supabase/utils";
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

  login: async ({ email, password }: { email: string; password: string }) => {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new SupabaseApiError(error.message);

    const role = await fetchUserRole(supabase, data.user.id);
    if (!role) {
      throw new SupabaseApiError("Could not load your account profile. Try again.");
    }

    await supabase.auth.refreshSession();

    return { session: data.session, role };
  },

  /** @deprecated Use login() — admins and students share the same sign-in page. */
  loginStudent: async ({ email, password }: { email: string; password: string }) => {
    const { session } = await authApi.login({ email, password });
    return session;
  },

  /** @deprecated Use login() — admins and students share the same sign-in page. */
  loginAdmin: async ({ email, password }: AdminLoginCredentials) => {
    const { session, role } = await authApi.login({ email, password });
    if (role !== "admin") {
      const supabase = getSupabase();
      await supabase.auth.signOut();
      throw new SupabaseApiError("Admin access required");
    }
    return session;
  },

  logout: async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
  },
};
