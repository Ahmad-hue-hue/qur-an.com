"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail01Icon, LockIcon } from "@hugeicons/core-free-icons";
import { authApi } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { getDefaultRoute } from "@/lib/auth/token";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { LoginLogo } from "@/components/auth/login-logo";
import { IconInput } from "@/components/auth/icon-input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const wantsAdmin = Boolean(nextPath?.startsWith("/admin"));
  const { refreshAuth, logout, isLoggedIn, role, isReady, setRole } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const loggingOut = searchParams.get("logout") === "1";

  useEffect(() => {
    if (loggingOut) {
      logout();
      refreshAuth();
      router.replace(wantsAdmin ? "/login?next=/admin" : "/login");
    }
  }, [loggingOut, logout, refreshAuth, router, wantsAdmin]);

  const loginMutation = useMutation({
    mutationFn: () =>
      authApi.login({ email: email.trim().toLowerCase(), password }),
    onSuccess: async ({ role: loginRole }) => {
      if (wantsAdmin && loginRole !== "admin") {
        await authApi.logout();
        await refreshAuth();
        toast.error("This account is not an admin. Use an admin email and password.");
        return;
      }

      setRole(loginRole);
      await refreshAuth();
      toast.success(loginRole === "admin" ? "Welcome, admin!" : "Welcome back!");
      const destination =
        nextPath && nextPath.startsWith("/") ? nextPath : getDefaultRoute(loginRole);
      router.push(destination);
    },
    onError: (err: Error) => toast.error(err.message || "Invalid credentials"),
  });

  const alreadySignedIn = isReady && isLoggedIn && !loggingOut;
  const switchingToAdmin = wantsAdmin && alreadySignedIn && role === "student";
  const showLoginForm = !alreadySignedIn || switchingToAdmin;
  const showSignedInPrompt = alreadySignedIn && !showLoginForm;

  const brandTitle = wantsAdmin ? "Admin Sign In" : "Welcome Back";
  const brandSubtitle = wantsAdmin
    ? "Enter your admin email and password to open the panel."
    : "Continue your Tajweed learning journey with structured lessons and assessments.";
  const formSubtitle = wantsAdmin
    ? "Admin email and password"
    : "Sign in with your email and password";

  return (
    <>
      {!isReady && (
        <div className="min-h-screen bg-cream flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      )}

      {isReady && (
        <div className="min-h-screen bg-cream lg:grid lg:grid-cols-2">
          <AuthBrandPanel title={brandTitle} subtitle={brandSubtitle} />
          <div className="flex min-h-screen flex-col safe-area-top">
            <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 sm:px-8 max-w-md mx-auto w-full lg:max-w-lg">
              <LoginLogo className="w-24 h-20 mb-6 lg:hidden" />

              <div className="text-center mb-8">
                <h1 className="font-serif text-3xl font-bold text-emerald-deep tracking-tight">
                  {wantsAdmin ? "Admin Sign In" : "Welcome Back"}
                </h1>
                <p className="text-muted-foreground text-sm mt-2">{formSubtitle}</p>
                {!wantsAdmin && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Admin? Use your admin email and password — no sign up required.
                  </p>
                )}
              </div>

              <Card className="w-full border-0 card-shadow rounded-2xl bg-white">
                <CardContent className="p-6 pt-7">
                  {showSignedInPrompt ? (
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
                      {switchingToAdmin && (
                        <p className="text-sm text-muted-foreground text-center rounded-lg bg-muted/50 px-3 py-2">
                          You are signed in as a student. Enter your admin credentials
                          below to open the admin panel.
                        </p>
                      )}

                      <IconInput
                        id="email"
                        label="Email"
                        icon={Mail01Icon}
                        placeholder={wantsAdmin ? "admin@gmail.com" : "you@example.com"}
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={setEmail}
                      />
                      <IconInput
                        id="password"
                        label="Password"
                        icon={LockIcon}
                        placeholder="Enter your password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={setPassword}
                      />

                      <Button
                        className="w-full h-12 rounded-xl bg-emerald-deep hover:bg-emerald-mid text-cream text-base font-medium mt-2"
                        disabled={
                          loginMutation.isPending || !email.trim() || !password.trim()
                        }
                        onClick={() => loginMutation.mutate()}
                      >
                        {loginMutation.isPending
                          ? "Signing in..."
                          : wantsAdmin
                            ? "Sign in to admin"
                            : "Login"}
                      </Button>

                      {!wantsAdmin && (
                        <>
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
                        </>
                      )}

                      {wantsAdmin && (
                        <Link
                          href="/login"
                          className={cn(
                            buttonVariants({ variant: "outline" }),
                            "w-full h-12 rounded-xl border-emerald-deep text-emerald-deep"
                          )}
                        >
                          Student sign in
                        </Link>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {!showSignedInPrompt && !wantsAdmin && (
                <p className="text-center text-sm text-muted-foreground mt-8">
                  New here?{" "}
                  <Link href="/register" className="font-semibold text-emerald-deep">
                    Sign up
                  </Link>{" "}
                  to get started.
                </p>
              )}

              {!showSignedInPrompt && wantsAdmin && (
                <p className="text-center text-sm text-muted-foreground mt-8">
                  Admins and students use the same login page — only admin accounts
                  can access the panel.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
