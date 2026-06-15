"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserIcon, CallIcon } from "@hugeicons/core-free-icons";
import { authApi } from "@/lib/api";
import { getDefaultRoute, getUserRole } from "@/lib/auth/token";
import { useAuth } from "@/hooks/use-auth";
import { LoginLogo } from "@/components/auth/login-logo";
import { IconInput } from "@/components/auth/icon-input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export default function StudentLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshAuth, logout, isLoggedIn, role, isReady } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const loggingOut = searchParams.get("logout") === "1";

  useEffect(() => {
    if (loggingOut) {
      logout();
      refreshAuth();
      router.replace("/login");
    }
  }, [loggingOut, logout, refreshAuth, router]);

  const loginMutation = useMutation({
    mutationFn: () => authApi.loginStudent({ name, phone }),
    onSuccess: () => {
      refreshAuth();
      toast.success("Welcome back!");
      router.push(getDefaultRoute(getUserRole()));
    },
    onError: (err: Error) => toast.error(err.message || "Invalid credentials"),
  });

  const alreadySignedIn = isReady && isLoggedIn && !loggingOut;

  return (
    <>
      {!isReady && (
        <div className="min-h-screen bg-cream flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      )}

      {isReady && (
    <div className="min-h-screen bg-cream flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 max-w-md mx-auto w-full">
        <LoginLogo className="w-24 h-20 mb-6" />

        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold text-emerald-deep tracking-tight">
            Welcome Back
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            Continue your learning journey
          </p>
        </div>

        <Card className="w-full border-0 card-shadow rounded-2xl bg-white">
          <CardContent className="p-6 pt-7">
            {alreadySignedIn ? (
              <div className="space-y-4 text-center py-2">
                <p className="text-sm text-muted-foreground">
                  You are already signed in{role === "admin" ? " as admin" : ""}.
                </p>
                <Button
                  className="w-full h-12 rounded-xl bg-emerald-deep hover:bg-emerald-mid text-cream text-base font-medium"
                  onClick={() => router.push(getDefaultRoute(role))}
                >
                  Continue
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-12 rounded-xl border-emerald-deep text-emerald-deep"
                  onClick={() => {
                    logout();
                    refreshAuth();
                  }}
                >
                  Sign out
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                <IconInput
                  id="name"
                  label="Full Name"
                  icon={UserIcon}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  value={name}
                  onChange={setName}
                />
                <IconInput
                  id="phone"
                  label="Phone Number"
                  icon={CallIcon}
                  placeholder="Enter your phone number"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={setPhone}
                />

                <Button
                  className="w-full h-12 rounded-xl bg-emerald-deep hover:bg-emerald-mid text-cream text-base font-medium mt-2"
                  disabled={loginMutation.isPending || !name.trim() || !phone.trim()}
                  onClick={() => loginMutation.mutate()}
                >
                  {loginMutation.isPending ? "Signing in..." : "Login"}
                </Button>

                <div className="relative py-1">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs text-muted-foreground">
                    or
                  </span>
                </div>

                <Link
                  href="/register"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "w-full h-12 rounded-xl border-2 border-emerald-deep text-emerald-deep hover:bg-emerald-light/50 text-base font-medium"
                  )}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {!alreadySignedIn && (
          <p className="text-center text-sm text-muted-foreground mt-8">
            New here?{" "}
            <Link href="/register" className="font-semibold text-emerald-deep">
              Sign up
            </Link>{" "}
            to get started.{" "}
            <span className="text-muted-foreground/60">·</span>{" "}
            <Link href="/admin" className="font-semibold text-emerald-deep">
              Admin panel
            </Link>
          </p>
        )}
      </div>
    </div>
      )}
    </>
  );
}
