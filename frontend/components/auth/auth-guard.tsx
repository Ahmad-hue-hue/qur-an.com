"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { useGuestOnly, useRequireAuth } from "@/hooks/use-auth";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface AuthGuardProps {
  children: ReactNode;
  role?: "student" | "admin";
}

export function AuthGuard({ children, role }: AuthGuardProps) {
  const auth = useRequireAuth(role);

  const isLoading =
    !auth.isReady ||
    !auth.isLoggedIn ||
    (auth.isLoggedIn && auth.role === null);

  const isAdminDenied =
    role === "admin" && auth.isReady && auth.isLoggedIn && auth.role === "student";

  const canRender =
    auth.isReady &&
    auth.isLoggedIn &&
    (role !== "admin" || auth.role === "admin") &&
    (role !== "student" || auth.role === "student");

  return (
    <>
      {isLoading && !isAdminDenied && (
        <div className="page-loading w-full max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      )}

      {isAdminDenied && (
        <div className="min-h-screen flex items-center justify-center p-6 bg-cream">
          <Card className="w-full max-w-md border-0 card-shadow">
            <CardContent className="p-6 space-y-4 text-center">
              <h1 className="font-serif text-2xl font-bold text-emerald-deep">
                Admin access required
              </h1>
              <p className="text-sm text-muted-foreground">
                This account is a student account. Sign in with an admin email to
                open the admin panel.
              </p>
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants(),
                  "w-full bg-emerald-deep hover:bg-emerald-mid text-cream"
                )}
              >
                Go to student dashboard
              </Link>
              <Link
                href="/login?next=/admin"
                className={cn(buttonVariants({ variant: "outline" }), "w-full")}
              >
                Sign in as admin
              </Link>
            </CardContent>
          </Card>
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
