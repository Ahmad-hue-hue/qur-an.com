"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";
import { getNavItems, type NavVariant } from "./nav-config";
import { useStudentNavItems } from "@/hooks/use-student-nav-items";
import { LoginLogo } from "@/components/auth/login-logo";
import { SignOutButton } from "@/components/layout/sign-out-button";

interface SideNavProps {
  variant?: NavVariant;
  className?: string;
}

export function SideNav({ variant = "student", className }: SideNavProps) {
  const pathname = usePathname();
  const studentItems = useStudentNavItems();
  const items = variant === "student" ? studentItems : getNavItems(variant);

  return (
    <aside
      className={cn(
        "glass-sidebar sticky top-0 hidden h-screen w-64 shrink-0 flex-col text-sidebar-foreground lg:flex",
        className
      )}
    >
      <div className="border-b border-sidebar-border px-6 py-5">
        <div className="flex items-center gap-3">
          <LoginLogo size={44} className="shrink-0 rounded-full" />
          <div className="min-w-0">
            <p className="font-serif text-lg font-semibold text-sidebar-foreground leading-tight">
              Tajweed Classes
            </p>
            <p className="text-xs text-sidebar-foreground/70 mt-0.5">
              {variant === "admin"
                ? "Admin Panel"
                : variant === "teacher"
                  ? "Teacher Panel"
                  : "Student Portal"}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {items.map((item) => {
          const isLessons = item.label === "Lessons";
          const isActive = isLessons
            ? pathname.startsWith("/marhalah/") || pathname.startsWith("/topics/")
            : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-white/15 text-sidebar-accent-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_12px_rgba(0,0,0,0.12)] backdrop-blur-sm"
                  : "text-sidebar-foreground/80 hover:bg-white/10 hover:text-sidebar-foreground"
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

      <div className="border-t border-sidebar-border p-4 space-y-1">
        {variant === "admin" && (
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
          >
            ← Student view
          </Link>
        )}
        <SignOutButton />
      </div>
    </aside>
  );
}
