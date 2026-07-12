"use client";

import Link from "next/link";
import { formatAssessmentMark } from "@/lib/assessment-mark";
import type { ExerciseAnswerGrade } from "@/lib/types";
import { AssessmentAnswerReviewCard } from "@/components/student/assessment-answer-review";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export function AssessmentResultsPanel({
  title,
  score,
  maxScore,
  answerGrades = [],
}: {
  title: string;
  score: number;
  maxScore: number;
  answerGrades?: ExerciseAnswerGrade[];
}) {
  return (
    <div className="page-content max-w-3xl mx-auto space-y-4">
      <Card className="card-shadow">
        <CardContent className="p-8 text-center space-y-4">
          <p className="text-xl font-semibold text-emerald-deep">{title}</p>
          <div>
            <p className="text-sm text-muted-foreground">Your score</p>
            <p className="text-4xl font-bold text-emerald-deep mt-1">
              {formatAssessmentMark(score, maxScore)}
            </p>
          </div>
        </CardContent>
      </Card>

      {answerGrades.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-emerald-deep px-1">
            Answer review
          </h2>
          {answerGrades.map((grade, index) => (
            <AssessmentAnswerReviewCard
              key={grade.id}
              grade={grade}
              index={index}
            />
          ))}
        </div>
      )}

      <div className="flex justify-center pb-4">
        <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
