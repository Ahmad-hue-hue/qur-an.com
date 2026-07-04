/** Marḥalah 1 uses exercises + exams only; ḥalaqah and tadreeb start from Marḥalah 2. */
export function marhalahHasOralAssessments(marhalahNumber: number): boolean {
  return marhalahNumber > 1;
}
