"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { SideNav } from "./side-nav";
import { AppHeader } from "./app-header";
import type { NavVariant } from "./nav-config";

interface AppShellProps {
  children: React.ReactNode;
  variant?: NavVariant | "auth";
  className?: string;
}

const mainWidth = {
  student:
    "w-full min-w-0 max-w-lg md:max-w-2xl lg:max-w-none xl:max-w-5xl lg:mx-auto",
  admin:
    "w-full min-w-0 max-w-full lg:max-w-6xl xl:max-w-7xl lg:mx-auto lg:px-6 xl:px-8",
  teacher:
    "w-full min-w-0 max-w-full lg:max-w-6xl xl:max-w-7xl lg:mx-auto lg:px-6 xl:px-8",
  auth: "w-full min-w-0 max-w-md sm:max-w-lg mx-auto",
};

export function AppShell({
  children,
  variant = "student",
  className,
}: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const hasNav = variant !== "auth";

  if (!hasNav) {
    return (
      <div className={cn("flex min-h-screen flex-col", className)}>
        <main className={cn("flex-1", mainWidth.auth)}>{children}</main>
      </div>
    );
  }

  const navVariant = variant as NavVariant;

  return (
    <div className={cn("flex min-h-screen", className)}>
      <div className="relative flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <AppHeader
          variant={navVariant}
          onMenuOpen={() => setMobileNavOpen(true)}
        />
        <main
          className={cn(
            "w-full flex-1",
            mainWidth[navVariant],
            "pb-6 md:pb-8 safe-area-bottom"
          )}
        >
          {children}
        </main>
      </div>
      <SideNav
        variant={navVariant}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
    </div>
  );
}
