"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { SideNavContent } from "./side-nav-content";
import type { NavVariant } from "./nav-config";

interface SideNavProps {
  variant?: NavVariant;
  className?: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function SideNav({
  variant = "student",
  className,
  mobileOpen = false,
  onMobileClose,
}: SideNavProps) {
  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] md:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={cn(
          "glass-sidebar fixed inset-y-0 right-0 z-50 flex h-full w-[min(88vw,16rem)] max-w-xs shrink-0 flex-col text-sidebar-foreground shadow-xl transition-transform duration-200 ease-out safe-area-top safe-area-bottom",
          "md:sticky md:top-0 md:z-auto md:h-screen md:w-64 md:max-w-none md:translate-x-0 md:shadow-none md:transition-none",
          mobileOpen ? "translate-x-0" : "translate-x-full md:translate-x-0",
          className
        )}
      >
        <button
          type="button"
          aria-label="Close menu"
          onClick={onMobileClose}
          className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-lg text-sidebar-foreground/80 transition-colors hover:bg-white/10 md:hidden"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={20} />
        </button>

        <div className="flex h-full min-h-0 flex-col pt-11 md:pt-0">
          <SideNavContent variant={variant} onNavigate={onMobileClose} />
        </div>
      </aside>
    </>
  );
}
