export function totalQuestionMarks(questions: { max_score?: number }[]): number {
  return questions.reduce((sum, question) => sum + (question.max_score ?? 1), 0);
}

export function formatAssessmentMark(score: number, maxScore: number): string {
  if (maxScore <= 0) return "No questions";
  const pct = Math.round((score / maxScore) * 100);
  return `${score}/${maxScore} (${pct}%)`;
}

export function formatQuestionMark(maxScore?: number): string {
  const marks = maxScore ?? 1;
  return `${marks} mark${marks === 1 ? "" : "s"}`;
}
