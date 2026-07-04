"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import Link from "next/link";
import { teacherApi } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { AssessmentQuestionsDialog } from "@/components/admin/assessment-questions-dialog";
import { TeacherMarhalahSelect } from "@/components/teacher/teacher-marhalah-select";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Delete02Icon, Edit02Icon } from "@hugeicons/core-free-icons";

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function TeacherExamsPage() {
  const queryClient = useQueryClient();
  const [marhalahId, setMarhalahId] = useState("1");
  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    id: number;
    title: string;
  } | null>(null);
  const [questionEditor, setQuestionEditor] = useState<{
    id: number;
    title: string;
  } | null>(null);
  const now = new Date();
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [form, setForm] = useState({
    title: "",
    description: "",
    duration_minutes: "60",
    start_date: toLocalInputValue(now),
    end_date: toLocalInputValue(weekLater),
  });

  const { data: exams, isLoading } = useQuery({
    queryKey: ["teacher-exams", marhalahId],
    queryFn: () => teacherApi.getExams(parseInt(marhalahId)),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      teacherApi.createExam({
        marhalah: parseInt(marhalahId),
        title: form.title,
        description: form.description,
        duration_minutes: parseInt(form.duration_minutes) || 60,
        start_date: new Date(form.start_date).toISOString(),
        end_date: new Date(form.end_date).toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-exams"] });
      toast.success("Exam created");
      setShowForm(false);
      setForm((prev) => ({ ...prev, title: "", description: "" }));
    },
    onError: (err: Error) => toast.error(err.message || "Create failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => teacherApi.deleteExam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-exams"] });
      setPendingDelete(null);
      toast.success("Exam deleted");
    },
    onError: (err: Error) => toast.error(err.message || "Delete failed"),
  });

  return (
    <AppShell variant="teacher">
      <PageHeader title="Exams">
        <div className="mt-3">
          <TeacherMarhalahSelect
            value={marhalahId}
            onValueChange={(v) => setMarhalahId(v ?? "1")}
          />
        </div>
        <Link
          href="/teacher/exercises"
          className="inline-block text-sm text-cream/80 mt-2 hover:text-cream"
        >
          ← Back to exercises
        </Link>
      </PageHeader>

      <div className="page-content">
        <Button
          className="w-full bg-emerald-deep hover:bg-emerald-mid text-cream gap-2"
          onClick={() => setShowForm((v) => !v)}
        >
          <HugeiconsIcon icon={Add01Icon} size={18} />
          {showForm ? "Cancel" : "Create Exam"}
        </Button>

        {showForm && (
          <Card className="card-shadow">
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.duration_minutes}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, duration_minutes: e.target.value }))
                  }
                />
              </div>
              <div className="form-grid-2">
                <div className="space-y-2">
                  <Label>Start</Label>
                  <Input
                    type="datetime-local"
                    value={form.start_date}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, start_date: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>End</Label>
                  <Input
                    type="datetime-local"
                    value={form.end_date}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, end_date: e.target.value }))
                    }
                  />
                </div>
              </div>
              <Button
                className="w-full bg-emerald-deep hover:bg-emerald-mid text-cream"
                disabled={!form.title.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? "Creating..." : "Save Exam"}
              </Button>
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
        )}

        {exams?.map((exam) => (
          <Card key={exam.id} className="card-shadow">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{exam.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(exam.start_date), "MMM d")} –{" "}
                    {format(new Date(exam.end_date), "MMM d")} · {exam.duration_minutes}{" "}
                    min · {exam.question_count} questions · {exam.status}
                    {(exam.submission_count ?? 0) > 0 &&
                      ` · ${exam.submission_count} submission${exam.submission_count === 1 ? "" : "s"}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Edit questions"
                    onClick={() =>
                      setQuestionEditor({ id: exam.id, title: exam.title })
                    }
                  >
                    <HugeiconsIcon icon={Edit02Icon} size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() =>
                      setPendingDelete({ id: exam.id, title: exam.title })
                    }
                    disabled={deleteMutation.isPending}
                    aria-label="Delete exam"
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={16} />
                  </Button>
                </div>
              </div>
              <Link href={`/teacher/exams/${exam.id}/submissions`}>
                <Button
                  variant="outline"
                  className="w-full gap-2 border-emerald-deep/30 text-emerald-deep"
                >
                  Grade & results
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}

        {!isLoading && exams?.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No exams for this marḥalah yet.
          </p>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete exam?"
        description={`Are you sure you want to delete "${pendingDelete?.title}"? This cannot be undone.`}
        confirmLabel="Delete Exam"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
      />

      <AssessmentQuestionsDialog
        kind="exam"
        assessmentId={questionEditor?.id ?? 0}
        assessmentTitle={questionEditor?.title ?? ""}
        open={!!questionEditor}
        onOpenChange={(open) => !open && setQuestionEditor(null)}
        api={teacherApi}
        cachePrefix="teacher"
      />

    </AppShell>
  );
}
