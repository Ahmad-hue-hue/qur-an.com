"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Logout01Icon } from "@hugeicons/core-free-icons";
import { useSignOut } from "@/components/layout/sign-out-button";
import type { NavVariant } from "./nav-config";

interface MobileSignOutBarProps {
  variant: NavVariant;
}

/** Mobile sign-out for admin/teacher (students use Profile → Sign out). */
export function MobileSignOutBar({ variant }: MobileSignOutBarProps) {
  const signOut = useSignOut();

  if (variant === "student") return null;

  return (
    <div className="flex justify-end px-4 pt-3 lg:hidden">
      <button
        type="button"
        onClick={signOut}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-emerald-deep shadow-sm backdrop-blur-sm hover:bg-white/20"
      >
        <HugeiconsIcon icon={Logout01Icon} size={16} />
        Sign out
      </button>
    </div>
  );
}
