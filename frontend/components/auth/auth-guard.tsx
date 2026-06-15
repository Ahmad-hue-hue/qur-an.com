"use client";

import { type ReactNode } from "react";
import { useGuestOnly, useRequireAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";

interface AuthGuardProps {
  children: ReactNode;
  role?: "student" | "admin";
}

export function AuthGuard({ children, role }: AuthGuardProps) {
  const auth = useRequireAuth(role);

  if (!auth.isReady || !auth.isLoggedIn) {
    return (
      <div className="p-4 space-y-4 max-w-lg mx-auto">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (role === "admin" && auth.role !== "admin") return null;
  if (role === "student" && auth.role === "admin") return null;

  return <>{children}</>;
}

export function GuestGuard({ children }: { children: ReactNode }) {
  const auth = useGuestOnly();

  if (!auth.isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-64 w-full max-w-sm rounded-2xl" />
      </div>
    );
  }

  if (auth.isLoggedIn) return null;

  return <>{children}</>;
}
