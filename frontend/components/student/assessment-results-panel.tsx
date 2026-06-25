"use client";

import type { ExerciseAnswerGrade, GradingStatus } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  GRADE_TONE_CLASSES,
  gradeResultLabel,
  gradeResultTone,
  isManualQuestionType,
  questionTypeLabel,
} from "@/lib/exercise-grading";

function AnswerResultRow({ grade }: { grade: ExerciseAnswerGrade }) {
  const tone = gradeResultTone(grade);

  return (
    <div className="rounded-xl border border-border/70 p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-emerald-deep">
          {questionTypeLabel(grade.question_type)}
        </span>
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${GRADE_TONE_CLASSES[tone]}`}
        >
          {gradeResultLabel(grade)}
        </span>
      </div>
      <p className="text-sm font-medium">{grade.question_text}</p>
      <div className="rounded-lg bg-muted/40 p-3">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Your answer
        </p>
        <p className="text-sm mt-1">{grade.answer_text || "(no answer)"}</p>
      </div>
      {grade.correct_answer && !isManualQuestionType(grade.question_type) && (
        <div className="rounded-lg bg-muted/40 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Correct answer
          </p>
          <p className="text-sm mt-1">{grade.correct_answer}</p>
        </div>
      )}
      {grade.feedback && (
        <div className="rounded-lg border border-emerald-deep/20 bg-emerald-light/30 p-3">
          <p className="text-[11px] uppercase tracking-wide text-emerald-deep">
            Teacher feedback
          </p>
          <p className="text-sm mt-1">{grade.feedback}</p>
        </div>
      )}
    </div>
  );
}

export function AssessmentResultsPanel({
  title,
  score,
  maxScore,
  gradingStatus,
  answerGrades,
}: {
  title: string;
  score: number;
  maxScore: number;
  gradingStatus?: GradingStatus;
  answerGrades: ExerciseAnswerGrade[];
}) {
  return (
    <div className="page-content max-w-3xl mx-auto space-y-4">
      <Card className="card-shadow">
        <CardContent className="p-6 text-center space-y-3">
          <StatusBadge
            status={gradingStatus === "pending_manual" ? "open" : "completed"}
          />
          <p className="text-xl font-semibold text-emerald-deep">{title}</p>
          <p className="text-2xl font-bold text-emerald-deep">
            {score}/{maxScore}
          </p>
          {gradingStatus === "pending_manual" && (
            <p className="text-sm text-amber-700">
              Some answers are still being reviewed by your teacher.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="font-semibold text-sm">Your answers</h2>
        {answerGrades.map((grade) => (
          <AnswerResultRow key={grade.question_id} grade={grade} />
        ))}
      </div>
    </div>
  );
}
