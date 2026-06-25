"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";
import { getNavItems, type NavVariant } from "./nav-config";

interface BottomNavProps {
  variant?: NavVariant;
  className?: string;
}

export function BottomNav({ variant = "student", className }: BottomNavProps) {
  const pathname = usePathname();
  const items = getNavItems(variant);

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white card-shadow safe-area-bottom lg:hidden",
        className
      )}
    >
      <div className="mx-auto flex w-full max-w-lg items-center justify-around px-2 py-2 sm:max-w-2xl md:max-w-2xl xl:max-w-5xl">
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-[56px] flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 transition-colors sm:min-w-[64px] sm:px-3",
                isActive
                  ? "text-emerald-deep"
                  : "text-muted-foreground hover:text-emerald-mid"
              )}
            >
              <HugeiconsIcon
                icon={item.icon}
                size={22}
                className={cn(isActive && "text-gold")}
              />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
