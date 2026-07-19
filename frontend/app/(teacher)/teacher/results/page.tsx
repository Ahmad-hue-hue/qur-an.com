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
  const marhalahNumber = parseInt(marhalahId) || 1;

  const { data: roster, isLoading } = useQuery({
    queryKey: ["teacher-results-roster", marhalahNumber],
    queryFn: () => teacherApi.getMarhalahResultsRoster(marhalahNumber),
  });

  const filteredRoster = useMemo((): MarhalahResultsRoster | undefined => {
    if (!roster) return undefined;
    const term = search.trim().toLowerCase();
    if (!term) return roster;
    return {
      ...roster,
      rows: roster.rows.filter((row) =>
        (row.registration_number ?? "").toLowerCase().includes(term)
      ),
    };
  }, [roster, search]);

  const handleDownload = async () => {
    const pdfRoster = await teacherApi.getMarhalahResultsRosterForPdf(
      marhalahNumber
    );
    if (!pdfRoster.rows.length) {
      toast.error("No results to download yet.");
      return;
    }
    await downloadResultsRosterPdf({
      title: "Marḥalah Results",
      subtitle: `Marḥalah ${marhalahNumber}`,
      filename: `results-m${marhalahNumber}.pdf`,
      sections: rosterToPdfSections(pdfRoster),
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
        />
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder="Search registration number..."
        />

        {isLoading && <Skeleton className="h-48 w-full rounded-xl" />}

        {!isLoading && filteredRoster && (
          <ResultsRosterTable roster={filteredRoster} />
        )}
      </div>
    </AppShell>
  );
}
