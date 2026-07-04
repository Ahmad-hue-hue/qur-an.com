"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ClickableListCardProps {
  href: string;
  className?: string;
  children: React.ReactNode;
}

/** Full-width tappable row card for admin/teacher lists (mobile-friendly). */
export function ClickableListCard({
  href,
  className,
  children,
}: ClickableListCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-deep/40 focus-visible:ring-offset-2",
        className
      )}
    >
      <Card className="card-shadow h-full cursor-pointer transition-shadow hover:shadow-md active:scale-[0.99]">
        <CardContent className="p-4">{children}</CardContent>
      </Card>
    </Link>
  );
}
