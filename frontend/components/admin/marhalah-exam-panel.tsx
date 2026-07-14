"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminApi } from "@/lib/api";
import { totalQuestionMarks } from "@/lib/assessment-mark";
import { AUTO_GRADED_QUESTION_TYPES } from "@/lib/topic-assessment";
import { AssessmentMarksPanel } from "@/components/admin/assessment-marks-panel";
import { AssessmentQuestionsDialog } from "@/components/admin/assessment-questions-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function MarhalahExamPanel({ marhalahNumber }: { marhalahNumber: number }) {
  const queryClient = useQueryClient();
  const [questionsOpen, setQuestionsOpen] = useState(false);

  const { data: exams, isLoading } = useQuery({
    queryKey: ["admin-exams", marhalahNumber],
    queryFn: () => adminApi.getExams(marhalahNumber),
  });

  const exam = exams?.[0];

  const { data: examDetail } = useQuery({
    queryKey: ["admin-exam", exam?.id],
    queryFn: () => adminApi.getExam(exam!.id),
    enabled: Boolean(exam?.id),
  });

  const totalMarks = totalQuestionMarks(examDetail?.questions ?? []);

  const setupMutation = useMutation({
    mutationFn: () => adminApi.ensureMarhalahExam(marhalahNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-exams", marhalahNumber] });
      setQuestionsOpen(true);
      toast.success("Exam ready");
    },
    onError: (err: Error) => toast.error(err.message || "Could not create exam"),
  });

  return (
    <>
      <Card className="card-shadow">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-medium">Final exam</h3>
              {isLoading ? (
                <p className="text-xs text-muted-foreground mt-0.5">Loading…</p>
              ) : exam ? (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {exam.question_count} question
                  {exam.question_count === 1 ? "" : "s"}
                  {examDetail ? ` · ${totalMarks} marks` : ""}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Not set up yet
                </p>
              )}
            </div>
            {exam ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setQuestionsOpen(true)}
              >
                Questions
              </Button>
            ) : (
              !isLoading && (
                <Button
                  size="sm"
                  className="btn-emerald"
                  disabled={setupMutation.isPending}
                  onClick={() => setupMutation.mutate()}
                >
                  {setupMutation.isPending ? "…" : "Set up"}
                </Button>
              )
            )}
          </div>

          {exam ? (
            <AssessmentMarksPanel kind="exam" assessmentId={exam.id} />
          ) : null}
        </CardContent>
      </Card>

      {exam && (
        <AssessmentQuestionsDialog
          kind="exam"
          assessmentId={exam.id}
          assessmentTitle={exam.title}
          open={questionsOpen}
          onOpenChange={setQuestionsOpen}
          allowedTypes={AUTO_GRADED_QUESTION_TYPES}
        />
      )}
    </>
  );
}
