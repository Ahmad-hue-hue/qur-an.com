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

  const canRender =
    auth.isReady &&
    auth.isLoggedIn &&
    (role !== "admin" || auth.role === "admin") &&
    (role !== "student" || auth.role !== "admin");

  return (
    <>
      {(!auth.isReady || !auth.isLoggedIn) && (
        <div className="p-4 space-y-4 max-w-lg mx-auto">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      )}
      {canRender && children}
    </>
  );
}

export function GuestGuard({
  children,
  allowSignedIn = false,
}: {
  children: ReactNode;
  allowSignedIn?: boolean;
}) {
  const auth = useGuestOnly({ redirectIfSignedIn: !allowSignedIn });

  const canRender = auth.isReady && (allowSignedIn || !auth.isLoggedIn);

  return (
    <>
      {!auth.isReady && (
        <div className="min-h-screen flex items-center justify-center">
          <Skeleton className="h-64 w-full max-w-sm rounded-2xl" />
        </div>
      )}
      {canRender && children}
    </>
  );
}
