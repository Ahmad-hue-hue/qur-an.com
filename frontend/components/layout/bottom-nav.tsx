"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Home01Icon,
  BookOpen01Icon,
  Task01Icon,
  UserIcon,
  DashboardSquare01Icon,
  UserGroupIcon,
  File01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

const studentNav = [
  { href: "/dashboard", label: "Home", icon: Home01Icon },
  { href: "/marhalah/1", label: "Lessons", icon: BookOpen01Icon },
  { href: "/assessments", label: "Assessments", icon: Task01Icon },
  { href: "/profile", label: "Profile", icon: UserIcon },
];

const adminNav = [
  { href: "/admin", label: "Dashboard", icon: DashboardSquare01Icon },
  { href: "/admin/students", label: "Students", icon: UserGroupIcon },
  { href: "/admin/topics", label: "Content", icon: File01Icon },
  { href: "/admin/exercises", label: "Assessments", icon: Task01Icon },
];

interface BottomNavProps {
  variant?: "student" | "admin";
}

export function BottomNav({ variant = "student" }: BottomNavProps) {
  const pathname = usePathname();
  const items = variant === "admin" ? adminNav : studentNav;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border card-shadow safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[64px]",
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
