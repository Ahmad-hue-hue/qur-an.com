"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { useGuestOnly, useRequireAuth } from "@/hooks/use-auth";
import { getDefaultRoute } from "@/lib/auth/token";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type GuardRole = "student" | "admin" | "teacher";

interface AuthGuardProps {
  children: ReactNode;
  role?: GuardRole;
}

export function AuthGuard({ children, role }: AuthGuardProps) {
  const auth = useRequireAuth(role);

  const isLoading =
    !auth.isReady ||
    !auth.isLoggedIn ||
    (auth.isLoggedIn && auth.role === null);

  const isRoleDenied =
    role != null &&
    auth.isReady &&
    auth.isLoggedIn &&
    auth.role !== role;

  const canRender =
    auth.isReady &&
    auth.isLoggedIn &&
    (role == null || auth.role === role);

  const roleLabel =
    role === "admin" ? "Admin" : role === "teacher" ? "Teacher" : "Student";

  return (
    <>
      {isLoading && !isRoleDenied && (
        <div className="page-loading w-full max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      )}

      {isRoleDenied && (
        <div className="min-h-screen flex items-center justify-center p-6 bg-cream">
          <Card className="w-full max-w-md border-0 card-shadow">
            <CardContent className="p-6 space-y-4 text-center">
              <h1 className="font-serif text-2xl font-bold text-emerald-deep">
                {roleLabel} access required
              </h1>
              <p className="text-sm text-muted-foreground">
                This account cannot open the {roleLabel.toLowerCase()} panel. Sign
                in with the correct credentials on the login page.
              </p>
              <Link
                href={getDefaultRoute(auth.role)}
                className={cn(
                  buttonVariants(),
                  "w-full btn-emerald"
                )}
              >
                Go to my dashboard
              </Link>
              <Link
                href={
                  role === "admin"
                    ? "/login?next=/admin"
                    : role === "teacher"
                      ? "/login?next=/teacher"
                      : "/login"
                }
                className={cn(buttonVariants({ variant: "outline" }), "w-full")}
              >
                Sign in with {roleLabel.toLowerCase()} credentials
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
