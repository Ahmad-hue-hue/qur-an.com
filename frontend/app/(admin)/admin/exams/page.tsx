"use client";

import { AppShell } from "@/components/layout/app-shell";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon } from "@hugeicons/core-free-icons";

export default function AdminExamsPage() {
  return (
    <AppShell variant="admin">
      <PageHeader title="Exam Management" />

      <div className="px-4 py-6 space-y-4">
        <Button className="w-full bg-emerald-deep hover:bg-emerald-mid text-cream gap-2">
          <HugeiconsIcon icon={Add01Icon} size={18} />
          Create Exam
        </Button>

        <Card className="card-shadow">
          <CardContent className="p-5 text-center text-muted-foreground text-sm">
            Configure exams with duration, schedule, MCQ and written questions.
            Students can attempt only during the active period.
          </CardContent>
        </Card>
      </div>

      <BottomNav variant="admin" />
    </AppShell>
  );
}
