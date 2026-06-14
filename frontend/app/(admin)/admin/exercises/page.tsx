"use client";

import { AppShell } from "@/components/layout/app-shell";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon } from "@hugeicons/core-free-icons";

export default function AdminExercisesPage() {
  return (
    <AppShell variant="admin">
      <PageHeader title="Exercise Management" />

      <div className="px-4 py-6 space-y-4">
        <Button className="w-full bg-emerald-deep hover:bg-emerald-mid text-cream gap-2">
          <HugeiconsIcon icon={Add01Icon} size={18} />
          Create Exercise
        </Button>

        <Card className="card-shadow">
          <CardContent className="p-5 text-center text-muted-foreground text-sm">
            Configure MCQ and written questions with start/end dates.
            Students can submit once during the active period.
          </CardContent>
        </Card>
      </div>

      <BottomNav variant="admin" />
    </AppShell>
  );
}
