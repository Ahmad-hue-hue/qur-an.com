import type { User } from "@/lib/types";

function searchTerm(query: string): string {
  return query.trim().toLowerCase();
}

function personNameFields(person: Pick<User, "first_name" | "last_name" | "email">) {
  const first = person.first_name?.toLowerCase() ?? "";
  const last = person.last_name?.toLowerCase() ?? "";
  return {
    first,
    last,
    full: `${first} ${last}`.trim(),
    email: person.email?.toLowerCase() ?? "",
  };
}

/** Client-side student list filter for admin/teacher search boxes. */
export function matchesStudentSearch(student: User, query: string): boolean {
  const term = searchTerm(query);
  if (!term) return true;

  const { first, last, full, email } = personNameFields(student);
  const phoneDigits = query.replace(/\D/g, "");
  const phone = (student.phone ?? "").replace(/\D/g, "");
  const registration = student.registration_number?.toLowerCase() ?? "";

  return (
    first.includes(term) ||
    last.includes(term) ||
    full.includes(term) ||
    email.includes(term) ||
    registration.includes(term) ||
    (phoneDigits.length > 0 && phone.includes(phoneDigits))
  );
}

/** Client-side teacher list filter. */
export function matchesTeacherSearch(teacher: User, query: string): boolean {
  const term = searchTerm(query);
  if (!term) return true;

  const { first, last, full, email } = personNameFields(teacher);
  const gender = teacher.gender === "female" ? "female" : "male";

  return (
    first.includes(term) ||
    last.includes(term) ||
    full.includes(term) ||
    email.includes(term) ||
    gender.includes(term) ||
    String(teacher.managed_marhalah ?? "").includes(term)
  );
}

/** Generic title/description filter for topics, exercises, exams, etc. */
export function matchesTextSearch(
  fields: Array<string | null | undefined>,
  query: string
): boolean {
  const term = searchTerm(query);
  if (!term) return true;
  return fields.some((field) => (field ?? "").toLowerCase().includes(term));
}
