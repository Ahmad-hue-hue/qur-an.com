"use client";

import { use } from "react";
import { AssessmentResultsPage } from "@/components/student/assessment-results-page";

export default function ExamResultsRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <AssessmentResultsPage
      kind="exam"
      id={parseInt(id)}
      backHref={`/exams/${id}`}
    />
  );
}
