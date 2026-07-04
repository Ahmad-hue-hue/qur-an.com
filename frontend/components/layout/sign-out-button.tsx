"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Logout01Icon } from "@hugeicons/core-free-icons";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function useSignOut() {
  const { logout } = useAuth();
  const router = useRouter();

  return useCallback(() => {
    logout();
    router.push("/login?logout=1");
  }, [logout, router]);
}

interface SignOutButtonProps {
  className?: string;
  showIcon?: boolean;
  onSignOut?: () => void;
}

export function SignOutButton({
  className,
  showIcon = true,
  onSignOut,
}: SignOutButtonProps) {
  const signOut = useSignOut();

  return (
    <button
      type="button"
      onClick={() => {
        signOut();
        onSignOut?.();
      }}
      className={cn(
        "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-white/10 hover:text-destructive",
        className
      )}
    >
      {showIcon && <HugeiconsIcon icon={Logout01Icon} size={18} />}
      Sign out
    </button>
  );
}
