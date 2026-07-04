"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Menu01Icon } from "@hugeicons/core-free-icons";
import { LoginLogo } from "@/components/auth/login-logo";
import type { NavVariant } from "./nav-config";

function panelLabel(variant: NavVariant) {
  if (variant === "admin") return "Admin Panel";
  if (variant === "teacher") return "Teacher Panel";
  return "Student Portal";
}

interface AppHeaderProps {
  variant: NavVariant;
  onMenuOpen: () => void;
}

export function AppHeader({ variant, onMenuOpen }: AppHeaderProps) {
  return (
    <header className="glass-nav safe-area-top sticky top-0 z-40 flex items-center gap-3 border-b border-white/40 px-4 py-3 lg:hidden">
      <button
        type="button"
        onClick={onMenuOpen}
        aria-label="Open navigation menu"
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-emerald-deep/10 bg-white/70 text-emerald-deep shadow-sm transition-colors hover:bg-white"
      >
        <HugeiconsIcon icon={Menu01Icon} size={22} />
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <LoginLogo size={36} className="shrink-0 rounded-full" />
        <div className="min-w-0">
          <p className="truncate font-serif text-sm font-semibold text-emerald-deep">
            Tajweed Classes
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {panelLabel(variant)}
          </p>
        </div>
      </div>
    </header>
  );
}
