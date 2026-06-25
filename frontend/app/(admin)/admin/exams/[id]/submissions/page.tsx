"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import { AssessmentSubmissionsView } from "@/components/admin/assessment-submissions-view";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";

export default function AdminExamSubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const examId = parseInt(id);

  const { data: exam, isLoading } = useQuery({
    queryKey: ["admin-exam", examId],
    queryFn: () => adminApi.getExam(examId),
  });

  return (
    <AppShell variant="admin">
      <PageHeader title="Exam submissions">
        <Link
          href={`/admin/exams/${examId}`}
          className="inline-flex items-center gap-1 text-sm text-cream/80 hover:text-cream mt-2"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          Back to questions
        </Link>
      </PageHeader>

      <div className="page-content">
        {isLoading && (
          <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
        )}
        {exam && (
          <AssessmentSubmissionsView
            kind="exam"
            assessmentId={examId}
            title={exam.title}
            questions={exam.questions}
          />
        )}
      </div>
    </AppShell>
  );
}
