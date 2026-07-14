import {
  clearBrowserSessionMarker,
  markBrowserSessionActive,
} from "@/lib/auth/browser-session";
import { phoneAuthEmail } from "@/lib/phone-auth";
import { getSupabase } from "@/lib/supabase/client";
import { fetchUserRole } from "@/lib/supabase/role";
import { normalizePhone, splitFullName, SupabaseApiError } from "@/lib/supabase/utils";
import type { AdminLoginCredentials, StudentRegisterCredentials } from "@/lib/types";

async function resolvePhoneLoginEmail(phone: string): Promise<string> {
  const digits = normalizePhone(phone);
  if (!digits) {
    throw new SupabaseApiError("Enter a valid phone number.");
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("resolve_login_email_by_phone", {
    p_phone: digits,
  });

  if (!error && typeof data === "string" && data.trim()) {
    return data.trim().toLowerCase();
  }

  return phoneAuthEmail(digits, "student");
}

export const authApi = {
  registerStudent: async ({
    password,
    name,
    phone,
    gender,
  }: StudentRegisterCredentials) => {
    const { firstName, lastName } = splitFullName(name);
    const digits = normalizePhone(phone);
    if (!digits) {
      throw new SupabaseApiError("Enter a valid phone number.");
    }
    if (password.trim().length < 6) {
      throw new SupabaseApiError("Password must be at least 6 characters.");
    }

    const email = phoneAuthEmail(digits, "student");
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: digits,
          role: "student",
          gender,
        },
      },
    });
    if (error) throw new SupabaseApiError(error.message);
    if (!data.session) {
      throw new SupabaseApiError(
        "Registration succeeded, but sign-in did not complete. Try signing in with your phone number."
      );
    }

    await supabase
      .from("profiles")
      .update({
        phone: digits,
        email,
        gender,
        first_name: firstName,
        last_name: lastName,
      })
      .eq("id", data.user!.id);

    markBrowserSessionActive();
    return data.session;
  },

  loginWithPhone: async ({
    phone,
    password,
  }: {
    phone: string;
    password: string;
  }) => {
    const email = await resolvePhoneLoginEmail(phone);
    return authApi.login({ email, password });
  },

  login: async ({ email, password }: { email: string; password: string }) => {
    const supabase = getSupabase();
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error) {
      const message =
        error.message === "Invalid login credentials"
          ? "Invalid phone/email or password. Students and teachers sign in with phone; admins use Admin sign in."
          : error.message;
      throw new SupabaseApiError(message);
    }

    const role = await fetchUserRole(supabase, data.user.id, data.user);
    if (!role) {
      throw new SupabaseApiError("Could not load your account profile. Try again.");
    }

    markBrowserSessionActive();

    return { session: data.session, role };
  },

  /** @deprecated Use loginWithPhone() for students/teachers. */
  loginStudent: async ({ phone, password }: { phone: string; password: string }) => {
    const { session } = await authApi.loginWithPhone({ phone, password });
    return session;
  },

  /** @deprecated Use login() — admins use email on Admin sign in. */
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
    clearBrowserSessionMarker();
    const supabase = getSupabase();
    await supabase.auth.signOut();
  },
};
