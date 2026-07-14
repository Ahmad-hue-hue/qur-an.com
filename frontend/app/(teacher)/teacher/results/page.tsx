"use client";

import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { teacherApi } from "@/lib/api";
import { formatAssessmentMark } from "@/lib/assessment-mark";
import { downloadResultsPdf } from "@/lib/results-pdf";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { TeacherMarhalahSelect } from "@/components/teacher/teacher-marhalah-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HugeiconsIcon } from "@hugeicons/react";
import { Download01Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";

export default function TeacherOverallResultsPage() {
  const [marhalahOverride, setMarhalahOverride] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["teacher-profile"],
    queryFn: teacherApi.getProfile,
  });

  const marhalahId =
    marhalahOverride ?? String(profile?.managed_marhalah ?? 1);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["teacher-overall-results", marhalahId],
    queryFn: teacherApi.getOverallResults,
  });

  const handleDownload = async () => {
    if (!rows?.length) {
      toast.error("No results to download yet.");
      return;
    }
    await downloadResultsPdf({
      title: "Overall Student Results",
      subtitle: `Marḥalah ${marhalahId} · Male & female`,
      filename: `overall-results-m${marhalahId}.pdf`,
      rows: rows.map((row) => ({
        label: row.phone,
        detail: [
          row.gender ?? "",
          row.registration_number ?? "",
          row.exercise_avg != null ? `Exercises ${row.exercise_avg}%` : null,
          row.exam_score != null && row.exam_max_score != null
            ? `Exam ${formatAssessmentMark(row.exam_score, row.exam_max_score)}`
            : null,
        ]
          .filter(Boolean)
          .join(" · "),
        score:
          row.overall_average != null ? `${row.overall_average}%` : "—",
      })),
    });
    toast.success("PDF downloaded");
  };

  return (
    <AppShell variant="teacher">
      <PageHeader
        title="Overall Results"
        subtitle="All students (male & female) shown by phone number"
      >
        <Button
          type="button"
          variant="secondary"
          className="mt-3 gap-2 bg-cream/15 text-cream hover:bg-cream/25"
          onClick={handleDownload}
          disabled={!rows?.length}
        >
          <HugeiconsIcon icon={Download01Icon} size={18} />
          Download PDF
        </Button>
      </PageHeader>

      <div className="page-content space-y-4">
        <TeacherMarhalahSelect
          value={marhalahId}
          onValueChange={(v) => setMarhalahOverride(v ?? "1")}
        />

        {isLoading &&
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}

        {!isLoading && (rows?.length ?? 0) === 0 && (
          <Card className="card-shadow">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No students in this marḥalah yet.
            </CardContent>
          </Card>
        )}

        {!isLoading &&
          rows?.map((row) => (
            <Card key={row.student_id} className="card-shadow">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium font-mono text-sm">{row.phone}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.gender === "female" ? "Female" : "Male"}
                    {row.registration_number
                      ? ` · ${row.registration_number}`
                      : ""}
                    {row.exercise_avg != null
                      ? ` · Exercises ${row.exercise_avg}%`
                      : ""}
                    {row.exam_score != null && row.exam_max_score != null
                      ? ` · Exam ${formatAssessmentMark(row.exam_score, row.exam_max_score)}`
                      : ""}
                  </p>
                </div>
                <p className="shrink-0 text-lg font-semibold text-emerald-deep">
                  {row.overall_average != null ? `${row.overall_average}%` : "—"}
                </p>
              </CardContent>
            </Card>
          ))}
      </div>
    </AppShell>
  );
}
