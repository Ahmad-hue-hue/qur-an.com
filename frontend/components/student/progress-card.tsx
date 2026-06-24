"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ProgressCardProps {
  marhalahTitle: string;
  progressPercent: number;
  topicsCompleted: number;
  totalTopics: number;
  nextTopic?: string;
}

export function ProgressCard({
  marhalahTitle,
  progressPercent,
  topicsCompleted,
  totalTopics,
  nextTopic,
}: ProgressCardProps) {
  return (
    <Card className="bg-emerald-deep text-cream border-0 card-shadow -mt-6 mx-4 sm:mx-6 md:mx-8 relative z-20">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
          <div className="flex-1">
            <p className="text-cream/70 text-xs uppercase tracking-wide mb-1">
              Current Progress
            </p>
            <h2 className="text-lg font-semibold">{marhalahTitle}</h2>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-cream/70 mb-1.5">
                <span>
                  {topicsCompleted}/{totalTopics} Topics
                </span>
                <span>{progressPercent}%</span>
              </div>
              <Progress
                value={progressPercent}
                className="h-2 bg-emerald-mid/40 [&>div]:bg-gold"
              />
            </div>
            {nextTopic && (
              <p className="text-sm text-gold mt-3">
                Next: <span className="text-cream">{nextTopic}</span>
              </p>
            )}
          </div>
          <div className="flex flex-col items-center">
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-emerald-mid/40"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeDasharray={`${progressPercent} 100`}
                  strokeLinecap="round"
                  className="text-gold"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                {progressPercent}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
