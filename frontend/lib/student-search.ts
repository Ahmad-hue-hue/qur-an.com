import type { User } from "@/lib/types";

/** Client-side student list filter for admin/teacher search boxes. */
export function matchesStudentSearch(student: User, query: string): boolean {
  const term = query.trim().toLowerCase();
  if (!term) return true;

  const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
  const phoneDigits = query.replace(/\D/g, "");
  const registration = student.registration_number?.toLowerCase() ?? "";
  const email = student.email?.toLowerCase() ?? "";
  const phone = student.phone ?? "";

  return (
    fullName.includes(term) ||
    email.includes(term) ||
    registration.includes(term) ||
    (phoneDigits.length > 0 && phone.includes(phoneDigits))
  );
}
