"use client";

import { use } from "react";
import { AssessmentResultsPage } from "@/components/student/assessment-results-page";

export default function ExerciseResultsRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <AssessmentResultsPage
      kind="exercise"
      id={parseInt(id)}
      backHref={`/exercises/${id}`}
    />
  );
}
