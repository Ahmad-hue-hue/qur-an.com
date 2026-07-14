import { normalizePhone } from "@/lib/supabase/utils";

export const STUDENT_PHONE_EMAIL_DOMAIN = "students.tajweed.local";
export const TEACHER_PHONE_EMAIL_DOMAIN = "teachers.tajweed.local";

export function phoneAuthEmail(
  phone: string,
  role: "student" | "teacher" = "student"
): string {
  const digits = normalizePhone(phone);
  const domain =
    role === "teacher" ? TEACHER_PHONE_EMAIL_DOMAIN : STUDENT_PHONE_EMAIL_DOMAIN;
  return `${digits}@${domain}`;
}

export function formatPhoneDisplay(phone: string | null | undefined): string {
  const digits = normalizePhone(phone ?? "");
  return digits || "—";
}

export function isSyntheticPhoneEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.trim().toLowerCase();
  return (
    lower.endsWith(`@${STUDENT_PHONE_EMAIL_DOMAIN}`) ||
    lower.endsWith(`@${TEACHER_PHONE_EMAIL_DOMAIN}`)
  );
}
