"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminApi } from "@/lib/api";
import { downloadResultsRosterPdf } from "@/lib/results-pdf";
import {
  ResultsRosterTable,
  rosterToPdfTable,
} from "@/components/shared/results-roster-table";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { SearchInput } from "@/components/layout/search-input";
import { MarhalahSelectWithEdit } from "@/components/admin/marhalah-select-with-edit";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HugeiconsIcon } from "@hugeicons/react";
import { Download01Icon } from "@hugeicons/core-free-icons";
import type { MarhalahResultsRoster } from "@/lib/types";

export default function AdminResultsPage() {
  const [marhalahId, setMarhalahId] = useState("1");
  const [search, setSearch] = useState("");
  const marhalahNumber = parseInt(marhalahId) || 1;

  const { data: roster, isLoading } = useQuery({
    queryKey: ["admin-results-roster", marhalahNumber],
    queryFn: () => adminApi.getMarhalahResultsRoster(marhalahNumber),
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
    if (!filteredRoster?.rows.length) {
      toast.error("No results to download yet.");
      return;
    }
    const { head, body } = rosterToPdfTable(filteredRoster);
    await downloadResultsRosterPdf({
      title: "Marḥalah Results",
      subtitle: `Marḥalah ${marhalahNumber}`,
      filename: `admin-results-m${marhalahNumber}.pdf`,
      head,
      body,
    });
    toast.success("PDF downloaded");
  };

  return (
    <AppShell variant="admin">
      <PageHeader
        title="Results"
        subtitle="Lesson scores and final exam by registration number"
      >
        <Button
          type="button"
          variant="secondary"
          className="mt-3 gap-2 bg-cream/15 text-cream hover:bg-cream/25"
          onClick={handleDownload}
          disabled={!filteredRoster?.rows.length}
        >
          <HugeiconsIcon icon={Download01Icon} size={18} />
          Download PDF
        </Button>
      </PageHeader>

      <div className="page-content space-y-4">
        <MarhalahSelectWithEdit
          value={marhalahId}
          onValueChange={(v) => setMarhalahId(v ?? "1")}
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
