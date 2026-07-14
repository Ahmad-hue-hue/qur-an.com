import { cn } from "@/lib/utils";
import type { MarhalahResultsRoster } from "@/lib/types";

function formatMark(score: number | null, maxScore: number | null): string {
  if (score == null || maxScore == null) return "—";
  return `${score}/${maxScore}`;
}

function formatOverall(percent: number | null): string {
  if (percent == null) return "—";
  return `${percent}%`;
}

export function formatRosterReg(reg: string | null | undefined): string {
  const value = reg?.trim();
  return value ? value : "—";
}

export function ResultsRosterTable({
  roster,
  className,
}: {
  roster: MarhalahResultsRoster;
  className?: string;
}) {
  const { columns, rows } = roster;

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No students in this marḥalah yet.
      </p>
    );
  }

  return (
    <div className={cn("overflow-x-auto rounded-xl border border-border", className)}>
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="sticky left-0 z-10 bg-muted/95 px-3 py-2.5 text-left font-medium whitespace-nowrap">
              Reg. no.
            </th>
            {columns.map((col) => (
              <th
                key={col.exercise_id}
                className="px-3 py-2.5 text-center font-medium tabular-nums whitespace-nowrap"
                title={col.title}
              >
                {col.order}
              </th>
            ))}
            <th className="px-3 py-2.5 text-center font-medium whitespace-nowrap">
              Exam
            </th>
            <th className="px-3 py-2.5 text-center font-medium whitespace-nowrap">
              Overall
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const scoreByExercise = new Map(
              row.lesson_scores.map((s) => [s.exercise_id, s])
            );
            return (
              <tr
                key={row.student_id}
                className="border-b border-border/70 last:border-0"
              >
                <td className="sticky left-0 z-10 bg-background px-3 py-2.5 font-mono text-xs whitespace-nowrap">
                  {formatRosterReg(row.registration_number)}
                </td>
                {columns.map((col) => {
                  const score = scoreByExercise.get(col.exercise_id);
                  return (
                    <td
                      key={col.exercise_id}
                      className="px-3 py-2.5 text-center tabular-nums text-muted-foreground"
                    >
                      {formatMark(score?.score ?? null, score?.max_score ?? null)}
                    </td>
                  );
                })}
                <td className="px-3 py-2.5 text-center tabular-nums">
                  {formatMark(row.exam_score, row.exam_max_score)}
                </td>
                <td className="px-3 py-2.5 text-center font-medium tabular-nums">
                  {formatOverall(row.overall_percent)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function rosterToPdfTable(roster: MarhalahResultsRoster): {
  head: string[];
  body: string[][];
} {
  const head = [
    "Reg. no.",
    ...roster.columns.map((col) => String(col.order)),
    "Exam",
    "Overall",
  ];
  const body = roster.rows.map((row) => {
    const scoreByExercise = new Map(
      row.lesson_scores.map((s) => [s.exercise_id, s])
    );
    return [
      formatRosterReg(row.registration_number),
      ...roster.columns.map((col) => {
        const score = scoreByExercise.get(col.exercise_id);
        return formatMark(score?.score ?? null, score?.max_score ?? null);
      }),
      formatMark(row.exam_score, row.exam_max_score),
      formatOverall(row.overall_percent),
    ];
  });
  return { head, body };
}
