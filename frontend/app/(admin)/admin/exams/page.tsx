"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import Link from "next/link";
import { adminApi } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons";

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdminExamsPage() {
  const queryClient = useQueryClient();
  const [marhalahId, setMarhalahId] = useState("1");
  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
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
    queryKey: ["admin-exams", marhalahId],
    queryFn: () => adminApi.getExams(parseInt(marhalahId)),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createExam({
        marhalah: parseInt(marhalahId),
        title: form.title,
        description: form.description,
        duration_minutes: parseInt(form.duration_minutes) || 60,
        start_date: new Date(form.start_date).toISOString(),
        end_date: new Date(form.end_date).toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-exams"] });
      toast.success("Exam created");
      setShowForm(false);
      setForm((prev) => ({ ...prev, title: "", description: "" }));
    },
    onError: (err: Error) => toast.error(err.message || "Create failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteExam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-exams"] });
      setPendingDelete(null);
      toast.success("Exam deleted");
    },
    onError: (err: Error) => toast.error(err.message || "Delete failed"),
  });

  return (
    <AppShell variant="admin">
      <PageHeader title="Exam Management">
        <Select value={marhalahId} onValueChange={(v) => setMarhalahId(v ?? "1")}>
          <SelectTrigger className="w-40 bg-emerald-mid/30 border-cream/20 text-cream mt-3">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4].map((n) => (
              <SelectItem key={n} value={String(n)}>
                Marḥalah {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          <Link key={exam.id} href={`/admin/exams/${exam.id}`}>
            <Card className="card-shadow hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{exam.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(exam.start_date), "MMM d")} –{" "}
                  {format(new Date(exam.end_date), "MMM d")} · {exam.duration_minutes}{" "}
                  min · {exam.question_count} questions · {exam.status}
                  {(exam.submission_count ?? 0) > 0 &&
                    ` · ${exam.submission_count} submission${exam.submission_count === 1 ? "" : "s"}`}
                </p>
                <p className="text-xs text-emerald-deep mt-1">Manage questions →</p>
              </div>
              <Link href={`/admin/exams/${exam.id}/submissions`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1 border-emerald-deep/30 text-emerald-deep"
                  onClick={(e) => e.stopPropagation()}
                >
                  Submissions
                </Button>
              </Link>
              <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPendingDelete({ id: exam.id, title: exam.title });
                  }}
                  disabled={deleteMutation.isPending}
                >
                  <HugeiconsIcon icon={Delete02Icon} size={16} />
                </Button>
              </CardContent>
            </Card>
          </Link>
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

    </AppShell>
  );
}
