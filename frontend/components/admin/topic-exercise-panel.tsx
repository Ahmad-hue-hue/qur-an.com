"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminApi } from "@/lib/api";
import type { Topic } from "@/lib/types";
import { TOPIC_EXERCISE_QUESTION_TYPES } from "@/lib/topic-assessment";
import { AssessmentQuestionsDialog } from "@/components/admin/assessment-questions-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function TopicExercisePanel({ topic }: { topic: Topic }) {
  const queryClient = useQueryClient();
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [createdExerciseId, setCreatedExerciseId] = useState<number | undefined>();
  const exerciseId = createdExerciseId ?? topic.exercise_id;

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

  if (topic.is_last_lesson) {
    return (
      <Card className="card-shadow border-dashed">
        <CardContent className="p-4 text-sm text-muted-foreground">
          This is the final lesson in the Marḥalah. Students take the Marḥalah exam
          after completing it — no lesson exercise here.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="card-shadow">
        <CardContent className="p-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-emerald-deep">Lesson Exercise</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Students answer this MCQ or True/False quiz after finishing the lesson.
            </p>
          </div>

          {exerciseId ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {topic.exercise_question_count ?? 0} question
                {(topic.exercise_question_count ?? 0) === 1 ? "" : "s"}
              </span>
              <Button
                size="sm"
                className="btn-emerald"
                onClick={() => setQuestionsOpen(true)}
              >
                Manage questions
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              className="btn-emerald"
              disabled={setupMutation.isPending}
              onClick={() => setupMutation.mutate()}
            >
              {setupMutation.isPending ? "Creating..." : "Add lesson exercise"}
            </Button>
          )}
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
