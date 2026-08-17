export type AttemptOutcomeFields = {
  exercise_pct: number | null;
  halaqah_pct: number | null;
  tadreeb_pct: number | null;
  exercises_complete: boolean | null;
  final_score: number | null;
};

/** Human-readable reasons a marhalah attempt failed, ranked most-specific first. */
export function attemptFailureReasons(
  attempt: AttemptOutcomeFields,
  nextThreshold?: number
): string[] {
  const reasons: string[] = [];
  if (!attempt.exercise_pct) reasons.push("Exercises not completed");
  if (!attempt.halaqah_pct) reasons.push("Ḥalaqah marks not entered");
  if (!attempt.tadreeb_pct) reasons.push("Tadreeb marks not entered");
  if (reasons.length === 0 && attempt.exercises_complete === false) {
    reasons.push("Some exercises were not completed");
  }
  if (reasons.length === 0) {
    reasons.push(
      nextThreshold != null
        ? `Final score ${attempt.final_score ?? 0}% was below the ${nextThreshold}% required to advance`
        : "Final score was below the required pass mark"
    );
  }
  return reasons;
}
