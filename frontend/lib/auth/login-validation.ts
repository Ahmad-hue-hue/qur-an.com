import { normalizePhone } from "@/lib/supabase/utils";

export function validateEmail(value: string): string | undefined {
  if (!value.trim()) return "Email is required";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value.trim())) return "Enter a valid email address";
  return undefined;
}

export function validatePhone(value: string): string | undefined {
  if (!value.trim()) return "Phone number is required";
  if (normalizePhone(value).length < 8) return "Enter a valid phone number";
  return undefined;
}

export function validateLoginPassword(value: string): string | undefined {
  if (!value) return "Password is required";
  return undefined;
}
