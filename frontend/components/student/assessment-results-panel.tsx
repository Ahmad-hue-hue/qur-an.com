"use client";

import Link from "next/link";
import { formatAssessmentMark } from "@/lib/assessment-mark";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export function AssessmentResultsPanel({
  title,
  score,
  maxScore,
}: {
  title: string;
  score: number;
  maxScore: number;
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
          <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
            Back to dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
