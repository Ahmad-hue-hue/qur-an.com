export function normalizeQuestionMarks(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : parseInt(String(value ?? "").trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, 9999);
}

export function marksInputValue(value: unknown): string {
  return String(normalizeQuestionMarks(value));
}
