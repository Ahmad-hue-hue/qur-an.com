import { cn } from "@/lib/utils";
import type { MarhalahResultsRoster } from "@/lib/types";

function formatMark(score: number | null, maxScore: number | null): string {
  if (score == null || maxScore == null) return "_";
  return String(score);
}

function formatTotal(
  row: MarhalahResultsRoster["rows"][number]
): string {
  const lessonTotal = row.lesson_scores.reduce(
    (total, score) => total + (score.score ?? 0),
    0
  );
  const total = lessonTotal + (row.exam_score ?? 0);
  return total > 0 ? String(total) : "_";
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
  const maleRows = rows.filter((row) => !row.registration_number?.endsWith("B"));
  const femaleRows = rows.filter((row) => row.registration_number?.endsWith("B"));

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No students in this marḥalah yet.
      </p>
    );
  }

  return (
    <div className={cn("space-y-5", className)}>
      <ResultsRegister title="WANAUME (A)" rows={maleRows} columns={columns} />
      <ResultsRegister title="WANAWAKE (B)" rows={femaleRows} columns={columns} />
    </div>
  );
}

function ResultsRegister({
  title,
  rows,
  columns,
}: {
  title: string;
  rows: MarhalahResultsRoster["rows"];
  columns: MarhalahResultsRoster["columns"];
}) {
  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-emerald-deep bg-emerald-light/35">
            <th className="sticky left-0 z-10 bg-emerald-light px-3 py-3 text-left font-semibold tracking-wide whitespace-nowrap">
              {title}
            </th>
            {columns.map((col) => (
              <th
                key={col.exercise_id}
                className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                title={col.title}
              >
                Zoezi {col.order}
              </th>
            ))}
            <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
              Mtihani
            </th>
            <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
              Jumla
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const scoreByExercise = new Map(
              row.lesson_scores.map((score) => [score.exercise_id, score])
            );
            return (
              <tr key={row.student_id} className="border-b border-border/70 last:border-0">
                <td className="sticky left-0 z-10 bg-background px-3 py-2.5 font-mono text-xs whitespace-nowrap">
                  {formatRosterReg(row.registration_number)}
                </td>
                {columns.map((col) => {
                  const score = scoreByExercise.get(col.exercise_id);
                  return (
                    <td key={col.exercise_id} className="px-3 py-2.5 text-center tabular-nums">
                      {formatMark(score?.score ?? null, score?.max_score ?? null)}
                    </td>
                  );
                })}
                <td className="px-3 py-2.5 text-center tabular-nums">
                  {formatMark(row.exam_score, row.exam_max_score)}
                </td>
                <td className="px-3 py-2.5 text-center font-semibold tabular-nums">
                  {formatTotal(row)}
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
    ...roster.columns.map((col) => `Zoezi ${col.order}`),
    "Mtihani",
    "Jumla",
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
      formatTotal(row),
    ];
  });
  return { head, body };
}
