"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { studentApi } from "@/lib/api";
import { AppShell } from "@/components/layout/app-shell";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PageHeader } from "@/components/layout/page-header";
import { AudioPlayer } from "@/components/shared/audio-player";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Home01Icon,
  Bookmark01Icon,
  File01Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";

const throatLetters = ["ء", "ه", "ع", "ح", "غ", "خ"];

export default function TopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const topicId = parseInt(id);
  const queryClient = useQueryClient();
  const [completed, setCompleted] = useState(false);

  const { data: topic, isLoading } = useQuery({
    queryKey: ["topic", topicId],
    queryFn: () => studentApi.getTopic(topicId),
  });

  const completeMutation = useMutation({
    mutationFn: () => studentApi.completeTopic(topicId),
    onSuccess: () => {
      setCompleted(true);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      toast.success("Topic marked as completed!");
    },
  });

  if (isLoading) {
    return (
      <AppShell>
        <Skeleton className="h-32 w-full rounded-none" />
        <div className="p-4 space-y-4">
          <Skeleton className="h-48 w-full" />
        </div>
        <BottomNav />
      </AppShell>
    );
  }

  if (!topic) return null;

  const isDone = topic.is_completed || completed;

  return (
    <AppShell>
      <PageHeader title={topic.title} arabicTitle={topic.arabic_title}>
        <div className="flex items-center justify-between mt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-cream/80 text-sm hover:text-cream"
          >
            <HugeiconsIcon icon={Home01Icon} size={16} />
            Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-gold/20 text-gold border-0">
              Topic {topic.order} of 9
            </Badge>
            <HugeiconsIcon
              icon={Bookmark01Icon}
              size={18}
              className="text-cream/60"
            />
          </div>
        </div>
      </PageHeader>

      <div className="px-4 py-6 space-y-6">
        {topic.arabic_content && (
          <Card className="card-shadow">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-emerald-deep mb-2">
                Definition
              </h3>
              <p className="font-arabic text-lg leading-relaxed">
                {topic.arabic_content}
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="card-shadow">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-emerald-deep mb-2">
              Explanation
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {topic.content}
            </p>
          </CardContent>
        </Card>

        <section>
          <h3 className="text-sm font-semibold text-emerald-deep mb-3">
            The Six Throat Letters
          </h3>
          <div className="grid grid-cols-6 gap-2">
            {throatLetters.map((letter) => (
              <div
                key={letter}
                className="bg-emerald-light rounded-xl p-3 text-center card-shadow"
              >
                <span className="font-arabic text-2xl text-emerald-deep">
                  {letter}
                </span>
              </div>
            ))}
          </div>
        </section>

        {topic.examples && (
          <Card className="card-shadow">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-emerald-deep mb-3">
                Examples
              </h3>
              <div className="space-y-2">
                {topic.examples.split(" — ").map((ex, i) => (
                  <p key={i} className="font-arabic text-lg text-center py-2">
                    {ex}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <AudioPlayer src={topic.audio_url} title="Lesson Audio" />

        {topic.pdf_url && (
          <a href={topic.pdf_url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="w-full gap-2">
              <HugeiconsIcon icon={File01Icon} size={18} />
              Download PDF
            </Button>
          </a>
        )}

        <Button
          className="w-full h-12 bg-emerald-deep hover:bg-emerald-mid text-cream gap-2"
          disabled={isDone || completeMutation.isPending}
          onClick={() => completeMutation.mutate()}
        >
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} />
          {isDone ? "Completed" : "Mark as Completed"}
        </Button>
      </div>

      <BottomNav />
    </AppShell>
  );
}
