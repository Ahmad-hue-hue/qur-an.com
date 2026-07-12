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
      toast.success("Marḥalah exam ready");
    },
    onError: (err: Error) => toast.error(err.message || "Could not create exam"),
  });

  return (
    <>
      <Card className="card-shadow border-emerald-deep/20 bg-emerald-light/20">
        <CardContent className="p-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-emerald-deep">
              Marḥalah {marhalahNumber} Final Exam
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              MCQ and True/False only. Scores are calculated automatically when
              students submit after completing every lesson.
            </p>
          </div>

          {isLoading && (
            <p className="text-xs text-muted-foreground">Loading exam...</p>
          )}

          {!isLoading && exam && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {exam.question_count} question{exam.question_count === 1 ? "" : "s"} ·{" "}
                {totalMarks} mark{totalMarks === 1 ? "" : "s"} total
              </span>
              <Button
                size="sm"
                className="btn-emerald"
                onClick={() => setQuestionsOpen(true)}
              >
                Manage exam questions
              </Button>
            </div>
          )}

          {exam && <AssessmentMarksPanel kind="exam" assessmentId={exam.id} />}

          {!isLoading && !exam && (
            <Button
              size="sm"
              className="btn-emerald"
              disabled={setupMutation.isPending}
              onClick={() => setupMutation.mutate()}
            >
              {setupMutation.isPending ? "Creating..." : "Set up Marḥalah exam"}
            </Button>
          )}
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
