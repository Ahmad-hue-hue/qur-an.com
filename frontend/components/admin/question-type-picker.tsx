"use client";

import type { QuestionType } from "@/lib/types";
import { EXERCISE_QUESTION_TYPES } from "@/lib/exercise-questions";
import { cn } from "@/lib/utils";

export function QuestionTypePicker({
  value,
  onChange,
  className,
}: {
  value: QuestionType;
  onChange: (type: QuestionType) => void;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-4", className)}>
      {EXERCISE_QUESTION_TYPES.map((t) => {
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
