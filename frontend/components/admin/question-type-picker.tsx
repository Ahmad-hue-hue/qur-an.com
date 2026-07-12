"use client";

import type { QuestionType } from "@/lib/types";
import { EXAM_QUESTION_TYPES, EXERCISE_QUESTION_TYPES } from "@/lib/exercise-questions";
import { cn } from "@/lib/utils";

const ALL_TYPES = [...EXERCISE_QUESTION_TYPES, ...EXAM_QUESTION_TYPES].filter(
  (entry, index, all) =>
    all.findIndex((item) => item.value === entry.value) === index
);

export function QuestionTypePicker({
  value,
  onChange,
  className,
  allowedTypes,
}: {
  value: QuestionType;
  onChange: (type: QuestionType) => void;
  className?: string;
  allowedTypes?: QuestionType[];
}) {
  const types = allowedTypes
    ? ALL_TYPES.filter((entry) => allowedTypes.includes(entry.value))
    : EXERCISE_QUESTION_TYPES;

  return (
    <div
      className={cn(
        "grid gap-2",
        types.length <= 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4",
        className
      )}
    >
      {types.map((t) => {
        const selected = value === t.value;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={cn(
              "rounded-xl border px-3 py-2.5 text-left text-sm transition-all btn-shadow",
              selected
                ? "border-emerald-deep bg-emerald-light text-emerald-deep"
                : "border-border bg-background hover:border-emerald-mid/40"
            )}
          >
            <span className="block font-medium">{t.short}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
