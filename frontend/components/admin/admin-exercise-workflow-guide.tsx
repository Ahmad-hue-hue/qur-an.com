"use client";

import { Card, CardContent } from "@/components/ui/card";

const STEPS = [
  {
    title: "Add the lesson exercise",
    body: "When editing a lesson, tap Add lesson exercise and add MCQ or True/False questions with the correct answer set.",
  },
  {
    title: "Set the Marḥalah exam",
    body: "On Content, set up the final exam for the Marḥalah with MCQ or True/False questions only.",
  },
  {
    title: "Students submit",
    body: "After each lesson, students take the exercise quiz. After the last lesson, they take the Marḥalah exam.",
  },
  {
    title: "Scores are automatic",
    body: "MCQ and True/False are graded instantly on submit. You only see each student's total mark.",
  },
] as const;

export function AdminExerciseWorkflowGuide() {
  return (
    <Card className="card-shadow border-emerald-deep/25 bg-emerald-light/20">
      <CardContent className="p-4 space-y-4">
        <div>
          <p className="font-semibold text-emerald-deep">How exercises & exams work</p>
          <p className="text-sm text-muted-foreground mt-1">
            Lesson exercises and Marḥalah exams use auto-graded MCQ and True/False only.
          </p>
        </div>

        <ol className="space-y-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-deep text-xs font-semibold text-cream">
                {index + 1}
              </span>
              <div>
                <p className="font-medium text-emerald-deep">{step.title}</p>
                <p className="text-muted-foreground mt-0.5">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
