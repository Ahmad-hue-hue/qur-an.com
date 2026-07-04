"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail01Icon, LockIcon } from "@hugeicons/core-free-icons";
import { authApi } from "@/lib/api";
import { markBrowserSessionActive } from "@/lib/auth/browser-session";
import { getDefaultRoute } from "@/lib/auth/token";
import { useAuth } from "@/hooks/use-auth";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { LoginLogo } from "@/components/auth/login-logo";
import { IconInput } from "@/components/auth/icon-input";
import { Button, buttonVariants } from "@/components/ui/button";
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

      markBrowserSessionActive();
      setRole(loginRole);
      await refreshAuth();
      toast.success(
        loginRole === "admin"
          ? "Welcome, admin!"
          : loginRole === "teacher"
            ? "Welcome, teacher!"
            : "Welcome back!"
      );
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
  const formTitle = wantsAdmin ? "Admin Sign In" : "Sign in";
  const formSubtitle = wantsAdmin
    ? "Admin email and password"
    : "Use your email and password to continue";

  return (
    <>
      {!isReady && (
        <div className="flex min-h-screen items-center justify-center bg-cream">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      )}

      {isReady && (
        <div className="min-h-screen bg-cream lg:grid lg:grid-cols-2">
          <AuthBrandPanel title={brandTitle} subtitle={brandSubtitle} />

          <div className="flex min-h-screen flex-col safe-area-top">
            <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center px-6 py-12 sm:px-8">
              <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
                <LoginLogo className="mb-5 lg:hidden" size={96} priority />
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-mid">
                  Tajweed Classes
                </p>
                <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-emerald-deep sm:text-3xl">
                  {formTitle}
                </h1>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  {formSubtitle}
                </p>
              </div>

              <div className="glass-panel rounded-2xl p-6 sm:p-7">
                {showSignedInPrompt ? (
                  <div className="space-y-3 py-1 text-center">
                    <p className="text-sm text-muted-foreground">
                      You are already signed in{role === "admin" ? " as admin" : ""}.
                    </p>
                    <Button
                      className="h-11 w-full rounded-xl btn-emerald"
                      onClick={() => router.push(getDefaultRoute(role))}
                    >
                      Continue
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-11 w-full rounded-xl text-emerald-deep hover:bg-emerald-light/50"
                      onClick={() => {
                        logout();
                        refreshAuth();
                      }}
                    >
                      Sign out
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {switchingToAdmin && (
                      <p className="rounded-xl bg-emerald-light/40 px-3 py-2.5 text-center text-sm text-muted-foreground">
                        Signed in as a student. Enter admin credentials below.
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
                      className="mt-1 h-11 w-full rounded-xl btn-emerald"
                      disabled={
                        loginMutation.isPending || !email.trim() || !password.trim()
                      }
                      onClick={() => loginMutation.mutate()}
                    >
                      {loginMutation.isPending
                        ? "Signing in..."
                        : wantsAdmin
                          ? "Sign in to admin"
                          : "Sign in"}
                    </Button>

                    {!wantsAdmin && (
                      <Link
                        href="/register"
                        className={cn(
                          buttonVariants({ variant: "outline" }),
                          "h-11 w-full rounded-xl border-border/70 bg-transparent text-emerald-deep hover:bg-emerald-light/40"
                        )}
                      >
                        Create account
                      </Link>
                    )}

                    {wantsAdmin && (
                      <Link
                        href="/login"
                        className={cn(
                          buttonVariants({ variant: "ghost" }),
                          "h-11 w-full rounded-xl text-muted-foreground hover:text-emerald-deep"
                        )}
                      >
                        Student sign in
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {!showSignedInPrompt && !wantsAdmin && (
                <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground lg:text-left">
                  Admin or teacher? Use your assigned credentials — no sign up
                  required.{" "}
                  <Link
                    href="/login?next=/admin"
                    className="font-medium text-emerald-deep hover:underline"
                  >
                    Admin sign in
                  </Link>
                </p>
              )}

              {!showSignedInPrompt && wantsAdmin && (
                <p className="mt-6 text-center text-xs text-muted-foreground lg:text-left">
                  Only admin accounts can access the admin panel.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
