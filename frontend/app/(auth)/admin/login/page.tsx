"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { authApi } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshAuth, logout, isLoggedIn, role, isReady } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (searchParams.get("logout") === "1") {
      logout();
      refreshAuth();
      setShowForm(true);
      router.replace("/admin/login");
      return;
    }
    if (!isLoggedIn) {
      setShowForm(true);
    }
  }, [searchParams, logout, refreshAuth, router, isLoggedIn]);

  const loginMutation = useMutation({
    mutationFn: () => authApi.loginAdmin({ email, password }),
    onSuccess: () => {
      refreshAuth();
      toast.success("Welcome, Admin!");
      router.push("/admin");
    },
    onError: (err: Error) => toast.error(err.message || "Invalid credentials"),
  });

  const alreadySignedIn = isReady && isLoggedIn && !showForm;

  if (!isReady) {
    return (
      <AppShell variant="auth">
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell variant="auth">
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center mb-8">
          <p className="font-arabic text-2xl text-emerald-deep mb-1">بسم الله</p>
          <h1 className="text-2xl font-bold text-emerald-deep">Tajweed Academy</h1>
          <p className="text-muted-foreground text-sm mt-1">Administration Portal</p>
        </div>

        <Card className="w-full max-w-sm card-shadow border-emerald-deep/20">
          {alreadySignedIn ? (
            <CardContent className="p-6 space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                You are already signed in{role === "student" ? " as a student" : ""}.
              </p>
              <Button
                className="w-full bg-emerald-deep hover:bg-emerald-mid text-cream"
                onClick={() => router.push(role === "admin" ? "/admin" : "/dashboard")}
              >
                Continue
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  logout();
                  refreshAuth();
                  setShowForm(true);
                }}
              >
                Sign out and use another account
              </Button>
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="text-lg">Admin Login</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@tajweed.academy"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full bg-emerald-deep hover:bg-emerald-mid text-cream"
                  disabled={loginMutation.isPending || !email || !password}
                  onClick={() => loginMutation.mutate()}
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign In"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Authorized personnel only. All access is logged.
                </p>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
