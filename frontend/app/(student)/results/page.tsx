"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { studentApi } from "@/lib/api";
import { formatAssessmentMark } from "@/lib/assessment-mark";
import { formatPhoneDisplay } from "@/lib/phone-auth";
import { downloadResultsRosterPdf } from "@/lib/results-pdf";
import {
  ResultsRosterTable,
  rosterToPdfSections,
} from "@/components/shared/results-roster-table";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HugeiconsIcon } from "@hugeicons/react";
import { Download01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";

export default function StudentResultsDashboardPage() {
  const [selectedMarhalah, setSelectedMarhalah] = useState<number | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: studentApi.getProfile,
  });

  const { data: marhalahs } = useQuery({
    queryKey: ["marhalahs"],
    queryFn: studentApi.getMarhalahs,
  });

  const { data: submissions, isLoading } = useQuery({
    queryKey: ["my-submissions"],
    queryFn: studentApi.getMySubmissions,
  });

  const { data: attemptHistory } = useQuery({
    queryKey: ["my-attempt-history"],
    queryFn: studentApi.getAttemptHistory,
  });

  const phone = formatPhoneDisplay(profile?.phone);
  const reachedMarhalahs = (marhalahs ?? []).filter((m) => m.status !== "locked");
  const marhalahNumber =
    selectedMarhalah ?? profile?.current_marhalah ?? 1;
  const { data: roster } = useQuery({
    queryKey: ["student-results-roster", marhalahNumber],
    queryFn: () => studentApi.getMarhalahResultsRoster(marhalahNumber),
    enabled: Boolean(profile),
  });

  const handleDownload = async () => {
    if (!roster?.rows.length) {
      toast.error("No results to download yet.");
      return;
    }
    await downloadResultsRosterPdf({
      title: "My Results",
      subtitle: `Marḥalah ${marhalahNumber}`,
      filename: `results-${profile?.registration_number || "student"}.pdf`,
      sections: rosterToPdfSections(roster),
    });
    toast.success("PDF downloaded");
  };

  return (
    <AppShell>
      <PageHeader
        title="My Results"
        subtitle={phone !== "—" ? `Phone ${phone}` : "Your submissions"}
      >
        <Button
          type="button"
          variant="secondary"
          className="mt-3 gap-2 bg-cream/15 text-cream hover:bg-cream/25"
          onClick={handleDownload}
          disabled={!roster?.rows.length}
        >
          <HugeiconsIcon icon={Download01Icon} size={18} />
          Download PDF
        </Button>
      </PageHeader>

      <div className="page-content space-y-3">
        <Card className="card-shadow">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium text-emerald-deep">
              Marḥalah results
            </p>
            {reachedMarhalahs.length > 1 && (
              <Select
                value={String(marhalahNumber)}
                onValueChange={(v) => setSelectedMarhalah(parseInt(v ?? "1") || 1)}
              >
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reachedMarhalahs.map((m) => (
                    <SelectItem key={m.number} value={String(m.number)}>
                      {m.title || `Marḥalah ${m.number}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {roster && roster.rows.length > 0 ? (
              <ResultsRosterTable roster={roster} />
            ) : (
              <p className="text-sm text-muted-foreground">
                No results recorded for this Marḥalah yet.
              </p>
            )}
          </CardContent>
        </Card>

        {attemptHistory && attemptHistory.length > 0 && (
          <Card className="card-shadow">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium text-emerald-deep">
                Previous attempts
              </p>
              {attemptHistory.map((attempt) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      Marḥalah {attempt.marhalah_number} · Attempt {attempt.attempt_number}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(attempt.concluded_at), "MMM d, yyyy · h:mm a")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-emerald-deep">
                      {attempt.final_score ?? 0}%
                    </p>
                    <p className={attempt.passed ? "text-xs text-emerald-deep" : "text-xs text-red-600"}>
                      {attempt.passed ? "Passed" : "Not passed · restarted"}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}

        {!isLoading && (submissions?.length ?? 0) === 0 && (
          <Card className="card-shadow">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No submissions yet. Complete an exercise or exam to see results here.
            </CardContent>
          </Card>
        )}

        {!isLoading &&
          submissions?.map((row) => (
            <Link key={`${row.kind}-${row.id}`} href={row.href}>
              <Card className="card-shadow hover:shadow-md transition-shadow mb-3">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{row.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.kind === "exam" ? "Exam" : "Exercise"} ·{" "}
                      {format(new Date(row.submitted_at), "MMM d, yyyy · h:mm a")}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold text-emerald-deep">
                    {formatAssessmentMark(row.score, row.max_score)}
                  </p>
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    size={18}
                    className="shrink-0 text-muted-foreground"
                  />
                </CardContent>
              </Card>
            </Link>
          ))}
      </div>
    </AppShell>
  );
}
