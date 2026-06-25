"use client";

import { use } from "react";
import { AssessmentReviewPage } from "@/components/student/assessment-review-page";

export default function ExerciseReviewRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <AssessmentReviewPage exerciseId={parseInt(id)} />;
}
