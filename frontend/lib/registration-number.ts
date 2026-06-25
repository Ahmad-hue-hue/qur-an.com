/** Matches Supabase `assign_registration_number` — {marhalah}.{year-digit}.{seq}{letter} */
export function nextRegistrationNumber(
  marhalah: number,
  enrolledAt: Date,
  existingNumbers: string[]
): string {
  const cohortDigit = String(enrolledAt.getFullYear()).slice(-1);
  const prefix = `${marhalah}.${cohortDigit}.`;
  let maxSeq = 0;

  for (const reg of existingNumbers) {
    if (!reg.startsWith(prefix)) continue;
    const match = reg.match(/\.(\d+)[A-Z]$/);
    if (match) maxSeq = Math.max(maxSeq, Number(match[1]));
  }

  return `${prefix}${maxSeq + 1}A`;
}
