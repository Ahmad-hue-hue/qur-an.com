"use client";

import type { Question, QuestionType } from "@/lib/types";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function renderBlankText(text: string) {
  const parts = text.split(/_{2,}/);
  if (parts.length === 1) return text;
  return parts.map((part, i) => (
    <span key={i}>
      {part}
      {i < parts.length - 1 && (
        <span className="inline-block min-w-16 border-b-2 border-emerald-deep mx-1" />
      )}
    </span>
  ));
}

export function AssessmentQuestionInput({
  question,
  value,
  onChange,
  readOnly = false,
}: {
  question: Question;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}) {
  const type = question.type as QuestionType;

  if (type === "mcq") {
    if (!question.options?.length) {
      return (
        <p className="text-sm text-muted-foreground">
          This question has no answer options yet.
        </p>
      );
    }

    return (
      <RadioGroup
        value={value}
        onValueChange={readOnly ? undefined : onChange}
        className={cn("space-y-2", readOnly && "pointer-events-none opacity-90")}
      >
        {question.options.map((opt, i) => {
          const letter = String.fromCharCode(65 + i);
          const selected = value === opt;
          return (
            <Label
              key={i}
              htmlFor={`opt-${question.id}-${i}`}
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl border card-shadow transition-all",
                readOnly ? "cursor-default" : "cursor-pointer",
                selected
                  ? "border-emerald-deep bg-emerald-light"
                  : "border-border hover:border-emerald-mid/30"
              )}
            >
              <span
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  selected
                    ? "bg-emerald-deep text-cream"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {letter}
              </span>
              <span
                className={cn(
                  "flex-1",
                  /[\u0600-\u06FF]/.test(opt) && "font-arabic text-lg"
                )}
              >
                {opt}
              </span>
              <RadioGroupItem
                value={opt}
                id={`opt-${question.id}-${i}`}
                className="sr-only"
              />
            </Label>
          );
        })}
      </RadioGroup>
    );
  }

  if (type === "true_false") {
    return (
      <RadioGroup
        value={value}
        onValueChange={readOnly ? undefined : onChange}
        className={cn(
          "grid grid-cols-1 gap-3 sm:grid-cols-2",
          readOnly && "pointer-events-none opacity-90"
        )}
      >
        {[
          { value: "true", label: "True" },
          { value: "false", label: "False" },
        ].map((opt) => {
          const selected = value === opt.value;
          return (
            <Label
              key={opt.value}
              htmlFor={`tf-${question.id}-${opt.value}`}
              className={cn(
                "flex items-center justify-center p-4 rounded-xl border card-shadow font-medium transition-all",
                readOnly ? "cursor-default" : "cursor-pointer",
                selected
                  ? "border-emerald-deep bg-emerald-light text-emerald-deep"
                  : "border-border hover:border-emerald-mid/30"
              )}
            >
              {opt.label}
              <RadioGroupItem
                value={opt.value}
                id={`tf-${question.id}-${opt.value}`}
                className="sr-only"
              />
            </Label>
          );
        })}
      </RadioGroup>
    );
  }

  if (type === "fill_blank") {
    return (
      <div className="space-y-2">
        <Input
          placeholder="Type your answer..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          className={cn("h-12 text-base", readOnly && "bg-muted/40 cursor-default")}
        />
      </div>
    );
  }

  if (type === "fill_gap") {
    return (
      <div className="space-y-2">
        <Textarea
          placeholder="Type your answer..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          className={cn("min-h-32", readOnly && "bg-muted/40 cursor-default resize-none")}
        />
        {!readOnly && (
          <p className="text-xs text-muted-foreground">
            This answer will be reviewed by your teacher.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Textarea
        placeholder="Type your answer..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        className={cn("min-h-32", readOnly && "bg-muted/40 cursor-default resize-none")}
      />
      {type === "written" && !readOnly && (
        <p className="text-xs text-muted-foreground">
          This answer will be reviewed by your teacher.
        </p>
      )}
    </div>
  );
}

export function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
