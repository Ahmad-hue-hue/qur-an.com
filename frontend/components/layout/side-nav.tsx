"use client";

import { cn } from "@/lib/utils";
import { SideNavContent } from "./side-nav-content";
import type { NavVariant } from "./nav-config";

interface SideNavProps {
  variant?: NavVariant;
  className?: string;
}

export function SideNav({ variant = "student", className }: SideNavProps) {
  return (
    <aside
      className={cn(
        "glass-sidebar sticky top-0 hidden h-screen w-64 shrink-0 flex-col text-sidebar-foreground lg:flex",
        className
      )}
    >
      <SideNavContent variant={variant} />
    </aside>
  );
}
