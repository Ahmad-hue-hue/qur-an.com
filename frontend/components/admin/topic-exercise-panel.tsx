"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminApi } from "@/lib/api";
import type { Topic } from "@/lib/types";
import { totalQuestionMarks } from "@/lib/assessment-mark";
import { TOPIC_EXERCISE_QUESTION_TYPES } from "@/lib/topic-assessment";
import { AssessmentQuestionsDialog } from "@/components/admin/assessment-questions-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function TopicExercisePanel({ topic }: { topic: Topic }) {
  const queryClient = useQueryClient();
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [createdExerciseId, setCreatedExerciseId] = useState<number | undefined>();
  const exerciseId = createdExerciseId ?? topic.exercise_id;

  const { data: exerciseDetail } = useQuery({
    queryKey: ["admin-exercise", exerciseId],
    queryFn: () => adminApi.getExercise(exerciseId!),
    enabled: Boolean(exerciseId),
  });

  const questionCount =
    exerciseDetail?.question_count ?? topic.exercise_question_count ?? 0;
  const totalMarks = totalQuestionMarks(exerciseDetail?.questions ?? []);

  const setupMutation = useMutation({
    mutationFn: () => adminApi.ensureTopicExercise(topic.id),
    onSuccess: (detail) => {
      setCreatedExerciseId(detail.id);
      queryClient.invalidateQueries({ queryKey: ["admin-topic", String(topic.id)] });
      setQuestionsOpen(true);
      toast.success("Lesson exercise ready");
    },
    onError: (err: Error) => toast.error(err.message || "Could not create exercise"),
  });

  return (
    <>
      <Card className="card-shadow">
        <CardContent className="p-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-emerald-deep">Lesson Exercise</h3>
            <p className="text-xs text-muted-foreground mt-1">
              MCQ or True/False only. Scored automatically when the student submits.
            </p>
          </div>

          {exerciseId ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {questionCount} question{questionCount === 1 ? "" : "s"} · {totalMarks}{" "}
                mark{totalMarks === 1 ? "" : "s"} total
              </span>
              <Button
                size="sm"
                className="btn-emerald"
                onClick={() => setQuestionsOpen(true)}
              >
                Manage questions
              </Button>
            </div>
          ) : null}

          {!exerciseId ? (
            <Button
              size="sm"
              className="btn-emerald"
              disabled={setupMutation.isPending}
              onClick={() => setupMutation.mutate()}
            >
              {setupMutation.isPending ? "Creating..." : "Add lesson exercise"}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {exerciseId && (
        <AssessmentQuestionsDialog
          kind="exercise"
          assessmentId={exerciseId}
          assessmentTitle={`${topic.title} — Exercise`}
          open={questionsOpen}
          onOpenChange={setQuestionsOpen}
          allowedTypes={TOPIC_EXERCISE_QUESTION_TYPES}
        />
      )}
    </>
  );
}
