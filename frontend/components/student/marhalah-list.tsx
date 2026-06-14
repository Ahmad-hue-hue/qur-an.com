"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  LockIcon,
  SquareUnlock01Icon,
  CheckmarkCircle02Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import type { Marhalah } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MarhalahListProps {
  marhalahs: Marhalah[];
}

export function MarhalahList({ marhalahs }: MarhalahListProps) {
  return (
    <div className="space-y-3">
      {marhalahs.map((marhalah) => {
        const isLocked = marhalah.status === "locked";
        const content = (
          <Card
            className={cn(
              "card-shadow transition-all",
              isLocked
                ? "opacity-60 cursor-not-allowed"
                : "hover:shadow-md hover:border-emerald-mid/30"
            )}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  isLocked ? "bg-muted" : "bg-emerald-light"
                )}
              >
                <HugeiconsIcon
                  icon={
                    isLocked
                      ? LockIcon
                      : marhalah.status === "completed"
                        ? CheckmarkCircle02Icon
                        : SquareUnlock01Icon
                  }
                  size={20}
                  className={isLocked ? "text-muted-foreground" : "text-emerald-deep"}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-sm">{marhalah.title}</h3>
                  <StatusBadge status={marhalah.status} />
                </div>
                {!isLocked && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {marhalah.topics_completed}/{marhalah.topics_count} Topics
                    Completed
                  </p>
                )}
              </div>
              {!isLocked && (
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={18}
                  className="text-muted-foreground"
                />
              )}
            </CardContent>
          </Card>
        );

        if (isLocked) return <div key={marhalah.id}>{content}</div>;

        return (
          <Link key={marhalah.id} href={`/marhalah/${marhalah.id}`}>
            {content}
          </Link>
        );
      })}
    </div>
  );
}
