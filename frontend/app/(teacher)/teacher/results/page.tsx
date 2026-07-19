"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { teacherApi } from "@/lib/api";
import { downloadResultsRosterPdf } from "@/lib/results-pdf";
import {
  ResultsRosterTable,
  rosterToPdfSections,
} from "@/components/shared/results-roster-table";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { SearchInput } from "@/components/layout/search-input";
import { TeacherMarhalahSelect } from "@/components/teacher/teacher-marhalah-select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HugeiconsIcon } from "@hugeicons/react";
import { Download01Icon } from "@hugeicons/core-free-icons";
import type { MarhalahResultsRoster } from "@/lib/types";

export default function TeacherResultsPage() {
  const [marhalahOverride, setMarhalahOverride] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["teacher-profile"],
    queryFn: teacherApi.getProfile,
  });

  const marhalahId =
    marhalahOverride ?? String(profile?.managed_marhalah ?? 1);
  const isAllMarhalahs = marhalahId === "all";
  const marhalahNumbers = isAllMarhalahs
    ? [1, 2, 3, 4]
    : [parseInt(marhalahId) || 1];

  const { data: rosters, isLoading } = useQuery({
    queryKey: ["teacher-results-roster", marhalahId],
    queryFn: () =>
      Promise.all(
        marhalahNumbers.map((number) =>
          teacherApi.getMarhalahResultsRoster(number)
        )
      ),
  });

  const filteredRosters = useMemo((): MarhalahResultsRoster[] => {
    if (!rosters) return [];
    const term = search.trim().toLowerCase();
    return rosters.map((roster) => ({
      ...roster,
      rows: term
        ? roster.rows.filter((row) =>
            (row.registration_number ?? "").toLowerCase().includes(term)
          )
        : roster.rows,
    }));
  }, [rosters, search]);

  const handleDownload = async () => {
    const pdfRosters = await Promise.all(
      marhalahNumbers.map((number) =>
        teacherApi.getMarhalahResultsRosterForPdf(number)
      )
    );
    if (!pdfRosters.some((roster) => roster.rows.length > 0)) {
      toast.error("No results to download yet.");
      return;
    }

    const sections = pdfRosters.flatMap((roster) =>
      rosterToPdfSections(roster).map((section) => ({
        ...section,
        title: isAllMarhalahs
          ? `MARHALAH ${roster.marhalah_number} — ${section.title}`
          : section.title,
      }))
    );

    await downloadResultsRosterPdf({
      title: "Marḥalah Results",
      subtitle: isAllMarhalahs ? "All Marḥalahs" : `Marḥalah ${marhalahId}`,
      filename: isAllMarhalahs ? "results-all-marhalahs.pdf" : `results-m${marhalahId}.pdf`,
      sections,
    });
    toast.success("PDF downloaded");
  };

  return (
    <AppShell variant="teacher">
      <PageHeader
        title="Results"
        subtitle="Lesson scores and final exam by registration number"
      >
        <Button
          type="button"
          variant="secondary"
          className="mt-3 gap-2 bg-cream/15 text-cream hover:bg-cream/25"
          onClick={handleDownload}
          disabled={isLoading}
        >
          <HugeiconsIcon icon={Download01Icon} size={18} />
          Download PDF
        </Button>
      </PageHeader>

      <div className="page-content space-y-4">
        <TeacherMarhalahSelect
          value={marhalahId}
          onValueChange={(v) => setMarhalahOverride(v ?? "1")}
          allowAll
        />
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder="Search registration number..."
        />

        {isLoading && <Skeleton className="h-48 w-full rounded-xl" />}

        {!isLoading && filteredRosters.map((roster) => (
          <section key={roster.marhalah_number} className="space-y-3">
            {isAllMarhalahs && (
              <h2 className="section-title">Marḥalah {roster.marhalah_number}</h2>
            )}
            <ResultsRosterTable roster={roster} />
          </section>
        ))}
      </div>
    </AppShell>
  );
}
