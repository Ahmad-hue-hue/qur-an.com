"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";
import { getNavItems, type NavVariant } from "./nav-config";
import { useStudentNavItems } from "@/hooks/use-student-nav-items";
import { LoginLogo } from "@/components/auth/login-logo";
import { SignOutButton } from "@/components/layout/sign-out-button";

function panelLabel(variant: NavVariant) {
  if (variant === "admin") return "Admin Panel";
  if (variant === "teacher") return "Teacher Panel";
  return "Student Portal";
}

interface SideNavContentProps {
  variant?: NavVariant;
  className?: string;
  onNavigate?: () => void;
}

export function SideNavContent({
  variant = "student",
  className,
  onNavigate,
}: SideNavContentProps) {
  const pathname = usePathname();
  const studentItems = useStudentNavItems();
  const items = variant === "student" ? studentItems : getNavItems(variant);

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="border-b border-sidebar-border px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex items-center gap-3">
          <LoginLogo size={44} className="shrink-0 rounded-full" />
          <div className="min-w-0">
            <p className="font-serif text-lg font-semibold leading-tight text-sidebar-foreground">
              Tajweed Classes
            </p>
            <p className="mt-0.5 text-xs text-sidebar-foreground/70">
              {panelLabel(variant)}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {items.map((item) => {
          const isLessons = item.label === "Lessons";
          const isDashboard =
            item.href === "/admin" || item.href === "/teacher";
          const isActive = isLessons
            ? pathname.startsWith("/marhalah/") ||
              pathname.startsWith("/topics/")
            : isDashboard
              ? pathname === item.href
              : pathname === item.href ||
                pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
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

      <div className="space-y-1 border-t border-sidebar-border p-4">
        {variant === "admin" && (
          <Link
            href="/dashboard"
            onClick={onNavigate}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-sidebar-foreground/70 transition-colors hover:text-sidebar-foreground"
          >
            ← Student view
          </Link>
        )}
        <SignOutButton onSignOut={onNavigate} />
      </div>
    </div>
  );
}
