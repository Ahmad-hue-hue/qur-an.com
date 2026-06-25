"use client";

import { format } from "date-fns";
import type {
  ExerciseAnswerGrade,
  ExerciseSubmissionAdmin,
  QuestionAdmin,
} from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  GRADE_TONE_CLASSES,
  gradeResultLabel,
  gradeResultTone,
  isManualQuestionType,
  questionTypeLabel,
} from "@/lib/exercise-grading";
import { QUESTION_TYPE_LABELS } from "@/lib/exercise-questions";

function buildFallbackGrades(
  submission: ExerciseSubmissionAdmin,
  questions: QuestionAdmin[]
): ExerciseAnswerGrade[] {
  return questions.map((q) => ({
    id: q.id,
    question_id: q.id,
    question_text: q.text,
    question_type: q.type,
    answer_text: submission.answers[String(q.id)] ?? "",
    correct_answer: q.correct_answer,
    score: null,
    max_score: q.max_score ?? 1,
    graded_at: null,
  }));
}

function AnswerGradeRow({ grade }: { grade: ExerciseAnswerGrade }) {
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
        {!isManualQuestionType(grade.question_type) && (
          <span className="text-[11px] text-muted-foreground">Auto-graded</span>
        )}
      </div>
      <p className="text-sm font-medium">{grade.question_text}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg bg-muted/40 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Student answer
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
      </div>
      {grade.feedback && (
        <p className="text-xs text-muted-foreground">Feedback: {grade.feedback}</p>
      )}
    </div>
  );
}

export function ExerciseSubmissionsPanel({
  submissions,
  questions,
}: {
  submissions?: ExerciseSubmissionAdmin[];
  questions?: QuestionAdmin[];
}) {
  if (!submissions?.length) {
    return (
      <div className="space-y-2 pt-2">
        <h2 className="font-semibold text-sm">Student submissions</h2>
        <Card className="card-shadow">
          <CardContent className="p-4 text-sm text-muted-foreground text-center">
            No submissions yet. Answers will appear here after students submit.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-2">
      <h2 className="font-semibold text-sm">
        Student submissions ({submissions.length})
      </h2>

      {submissions.map((submission) => {
        const grades =
          submission.answer_grades.length > 0
            ? submission.answer_grades
            : buildFallbackGrades(submission, questions ?? []);

        return (
          <Card key={submission.id} className="card-shadow">
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{submission.student_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Submitted{" "}
                    {format(new Date(submission.submitted_at), "MMM d, yyyy · h:mm a")}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm font-semibold text-emerald-deep">
                    {submission.score}/{submission.max_score}
                  </p>
                  <StatusBadge
                    status={
                      submission.grading_status === "pending_manual"
                        ? "open"
                        : "completed"
                    }
                  />
                  {submission.grading_status === "pending_manual" && (
                    <p className="text-[11px] text-amber-700">Manual review needed</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {grades.map((grade) => (
                  <AnswerGradeRow key={`${submission.id}-${grade.question_id}`} grade={grade} />
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function ExerciseGradingGuide() {
  return (
    <Card className="card-shadow border-emerald-deep/20 bg-emerald-light/20">
      <CardContent className="p-4 text-sm space-y-2">
        <p className="font-medium text-emerald-deep">How grading works</p>
        <ul className="text-muted-foreground text-xs space-y-1 list-disc pl-4">
          <li>
            <strong>MCQ, True/False, Fill blank</strong> are auto-graded instantly when
            a student submits.
          </li>
          <li>
            <strong>Fill the gap</strong> answers stay pending until you enter a score
            in Manual grading below.
          </li>
          <li>
            Set the correct answer when creating auto-graded questions so the system
            can mark them.
          </li>
        </ul>
        <p className="text-xs text-muted-foreground">
          Types: {Object.values(QUESTION_TYPE_LABELS).join(" · ")}
        </p>
      </CardContent>
    </Card>
  );
}
