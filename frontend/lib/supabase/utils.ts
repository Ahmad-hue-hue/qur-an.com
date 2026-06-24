export class SupabaseApiError extends Error {
  constructor(
    message: string,
    public status = 400,
    public data?: unknown
  ) {
    super(message);
    this.name = "SupabaseApiError";
  }
}

export function throwIfError<T>(
  result: { data: T; error: { message: string; code?: string } | null }
): T {
  if (result.error) {
    throw new SupabaseApiError(result.error.message);
  }
  return result.data as T;
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function splitFullName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export function mapProfileRow(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    email: (row.email as string) ?? "",
    first_name: (row.first_name as string) ?? "",
    last_name: (row.last_name as string) ?? "",
    phone: (row.phone as string | null) ?? undefined,
    role: (row.role as "student" | "admin") ?? "student",
    registration_number: (row.registration_number as string | null) ?? null,
    is_suspended: Boolean(row.is_suspended),
    current_marhalah: Number(row.current_marhalah ?? 1),
    date_joined: (row.created_at as string) ?? new Date().toISOString(),
  };
}
