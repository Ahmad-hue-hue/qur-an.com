"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle02Icon,
  LockIcon,
  PlayCircleIcon,
} from "@hugeicons/core-free-icons";
import { Card, CardContent } from "@/components/ui/card";
import type { Topic } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TopicListProps {
  topics: Topic[];
}

export function TopicList({ topics }: TopicListProps) {
  return (
    <div className="space-y-2">
      {topics.map((topic) => {
        const isLocked = topic.status === "locked";
        const isActive = topic.status === "active";
        const isCompleted = topic.status === "completed";

        const content = (
          <Card
            className={cn(
              "card-shadow transition-all",
              isActive && "border-gold gold-glow",
              isLocked && "opacity-50 cursor-not-allowed",
              !isLocked && !isActive && "hover:shadow-md"
            )}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  isCompleted && "bg-emerald-light text-emerald-deep",
                  isActive && "bg-gold text-emerald-deep",
                  isLocked && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} />
                ) : isLocked ? (
                  <HugeiconsIcon icon={LockIcon} size={16} />
                ) : (
                  topic.order
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{topic.title}</p>
                {topic.arabic_title && (
                  <p className="font-arabic text-xs text-muted-foreground">
                    {topic.arabic_title}
                  </p>
                )}
              </div>
              {isActive && (
                <HugeiconsIcon
                  icon={PlayCircleIcon}
                  size={20}
                  className="text-gold"
                />
              )}
            </CardContent>
          </Card>
        );

        if (isLocked) return <div key={topic.id}>{content}</div>;

        return (
          <Link key={topic.id} href={`/topics/${topic.id}`}>
            {content}
          </Link>
        );
      })}
    </div>
  );
}
