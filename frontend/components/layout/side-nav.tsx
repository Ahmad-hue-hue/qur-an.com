"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";
import { getNavItems, type NavVariant } from "./nav-config";

interface SideNavProps {
  variant?: NavVariant;
  className?: string;
}

export function SideNav({ variant = "student", className }: SideNavProps) {
  const pathname = usePathname();
  const items = getNavItems(variant);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex",
        className
      )}
    >
      <div className="border-b border-sidebar-border px-6 py-5">
        <p className="font-serif text-lg font-semibold text-sidebar-foreground">
          Tajweed Academy
        </p>
        <p className="text-xs text-sidebar-foreground/70 mt-0.5">
          {variant === "admin" ? "Admin Panel" : "Student Portal"}
        </p>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )}
            >
              <HugeiconsIcon
                icon={item.icon}
                size={20}
                className={cn(isActive && "text-sidebar-primary")}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {variant === "admin" && (
        <div className="border-t border-sidebar-border p-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
          >
            ← Student view
          </Link>
        </div>
      )}
    </aside>
  );
}
