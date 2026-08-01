"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { marhalahHasOralAssessments } from "@/lib/marhalah-scores";

type ManualScoreRow = {
  type: string;
  score: number;
  max_score: number;
};

type ManualMarksApi = {
  getManualScores: (
    studentId: string,
    marhalah: number
  ) => Promise<ManualScoreRow[]>;
  upsertManualScore: (data: {
    student_id: string;
    marhalah: number;
    type: "halaqah" | "tadreeb";
    score: number;
  }) => Promise<void>;
};

export function ManualMarksPanel({
  studentId,
  marhalah,
  api,
  queryKeyPrefix,
}: {
  studentId: string;
  marhalah: number;
  api: ManualMarksApi;
  queryKeyPrefix: string;
}) {
  const queryClient = useQueryClient();
  const [halaqahScore, setHalaqahScore] = useState("");
  const [tadreebScore, setTadreebScore] = useState("");
  const showOral = marhalahHasOralAssessments(marhalah);

  const { data: manualScores } = useQuery({
    queryKey: [queryKeyPrefix, studentId, marhalah],
    queryFn: () => api.getManualScores(studentId, marhalah),
    enabled: showOral,
  });

  const halaqah = manualScores?.find((s) => s.type === "halaqah");
  const tadreeb = manualScores?.find((s) => s.type === "tadreeb");

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (halaqahScore.trim()) {
        await api.upsertManualScore({
          student_id: studentId,
          marhalah,
          type: "halaqah",
          score: parseFloat(halaqahScore),
        });
      }
      if (tadreebScore.trim()) {
        await api.upsertManualScore({
          student_id: studentId,
          marhalah,
          type: "tadreeb",
          score: parseFloat(tadreebScore),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [queryKeyPrefix, studentId, marhalah],
      });
      queryClient.invalidateQueries({ queryKey: ["teacher-results-roster"] });
      queryClient.invalidateQueries({ queryKey: ["admin-results-roster"] });
      setHalaqahScore("");
      setTadreebScore("");
      toast.success("Marks saved");
    },
    onError: (err: Error) => toast.error(err.message || "Save failed"),
  });

  if (!showOral) {
    return (
      <Card className="card-shadow">
        <CardContent className="p-5 text-sm text-muted-foreground">
          Marḥalah 1 uses exercises and exams only — ḥalaqah and tadreeb scores
          are not recorded for this stage.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-shadow">
      <CardContent className="p-5 space-y-4">
        <p className="font-medium text-emerald-deep">Manual marks</p>
        <p className="text-sm text-muted-foreground">
          Set ḥalaqah and tadreeb scores for Marḥalah {marhalah}.
        </p>

        <div className="space-y-2">
          <Label>Ḥalaqah score (max 20)</Label>
          <Input
            type="number"
            min={0}
            max={20}
            step={0.5}
            placeholder={halaqah ? String(halaqah.score) : "0"}
            value={halaqahScore}
            onChange={(e) => setHalaqahScore(e.target.value)}
          />
          {halaqah && !halaqahScore && (
            <p className="text-xs text-muted-foreground">
              Current: {halaqah.score}/{halaqah.max_score}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Tadreeb score (max 20)</Label>
          <Input
            type="number"
            min={0}
            max={20}
            step={0.5}
            placeholder={tadreeb ? String(tadreeb.score) : "0"}
            value={tadreebScore}
            onChange={(e) => setTadreebScore(e.target.value)}
          />
          {tadreeb && !tadreebScore && (
            <p className="text-xs text-muted-foreground">
              Current: {tadreeb.score}/{tadreeb.max_score}
            </p>
          )}
        </div>

        <Button
          className="w-full btn-emerald"
          disabled={
            saveMutation.isPending ||
            (!halaqahScore.trim() && !tadreebScore.trim())
          }
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? "Saving..." : "Save marks"}
        </Button>
      </CardContent>
    </Card>
  );
}
