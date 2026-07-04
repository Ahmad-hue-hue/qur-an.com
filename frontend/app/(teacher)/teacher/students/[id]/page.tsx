"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { teacherApi } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";

export default function TeacherStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [halaqahScore, setHalaqahScore] = useState("");
  const [tadreebScore, setTadreebScore] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["teacher-profile"],
    queryFn: teacherApi.getProfile,
  });

  const { data: students, isLoading } = useQuery({
    queryKey: ["teacher-students"],
    queryFn: teacherApi.getStudents,
  });

  const student = students?.find((s) => s.id === id);
  const marhalah = profile?.managed_marhalah ?? 1;

  const { data: manualScores } = useQuery({
    queryKey: ["teacher-manual-scores", id, marhalah],
    queryFn: () => teacherApi.getManualScores(id, marhalah),
    enabled: Boolean(student),
  });

  const halaqah = manualScores?.find((s) => s.type === "halaqah");
  const tadreeb = manualScores?.find((s) => s.type === "tadreeb");

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (halaqahScore.trim()) {
        await teacherApi.upsertManualScore({
          student_id: id,
          marhalah,
          type: "halaqah",
          score: parseFloat(halaqahScore),
        });
      }
      if (tadreebScore.trim()) {
        await teacherApi.upsertManualScore({
          student_id: id,
          marhalah,
          type: "tadreeb",
          score: parseFloat(tadreebScore),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["teacher-manual-scores", id, marhalah],
      });
      toast.success("Marks saved");
    },
    onError: (err: Error) => toast.error(err.message || "Save failed"),
  });

  return (
    <AppShell variant="teacher">
      {isLoading && <Skeleton className="h-32 w-full" />}

      {student && (
        <>
          <PageHeader title={`${student.first_name} ${student.last_name}`}>
            <Link
              href="/teacher/students"
              className="inline-flex items-center gap-1 text-cream/80 text-sm mt-2"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
              Back to students
            </Link>
          </PageHeader>

          <div className="page-content max-w-2xl space-y-4">
            <Card className="card-shadow">
              <CardContent className="p-5 space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Registration:</span>{" "}
                  {student.registration_number || "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Marḥalah:</span> {marhalah}
                </p>
              </CardContent>
            </Card>

            <Card className="card-shadow">
              <CardContent className="p-5 space-y-4">
                <p className="font-medium text-emerald-deep">Manual marks</p>
                <p className="text-sm text-muted-foreground">
                  Set ḥalaqah and tadreeb scores for Marḥalah {marhalah}.
                </p>

                <div className="space-y-2">
                  <Label>Ḥalaqah score (max 20)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    step={0.5}
                    placeholder={halaqah ? String(halaqah.score) : "0"}
                    value={halaqahScore}
                    onChange={(e) => setHalaqahScore(e.target.value)}
                  />
                  {halaqah && !halaqahScore && (
                    <p className="text-xs text-muted-foreground">
                      Current: {halaqah.score}/{halaqah.max_score}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Tadreeb score (max 20)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    step={0.5}
                    placeholder={tadreeb ? String(tadreeb.score) : "0"}
                    value={tadreebScore}
                    onChange={(e) => setTadreebScore(e.target.value)}
                  />
                  {tadreeb && !tadreebScore && (
                    <p className="text-xs text-muted-foreground">
                      Current: {tadreeb.score}/{tadreeb.max_score}
                    </p>
                  )}
                </div>

                <Button
                  className="w-full bg-emerald-deep hover:bg-emerald-mid text-cream"
                  disabled={
                    saveMutation.isPending ||
                    (!halaqahScore.trim() && !tadreebScore.trim())
                  }
                  onClick={() => saveMutation.mutate()}
                >
                  {saveMutation.isPending ? "Saving..." : "Save marks"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </AppShell>
  );
}
