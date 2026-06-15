"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { authApi } from "@/lib/api";
import { getDefaultRoute, getUserRole } from "@/lib/auth/token";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StudentLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshAuth, logout, isLoggedIn, role, isReady } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (searchParams.get("logout") === "1") {
      logout();
      refreshAuth();
      setShowForm(true);
      router.replace("/login");
      return;
    }
    if (!isLoggedIn) {
      setShowForm(true);
    }
  }, [searchParams, logout, refreshAuth, router, isLoggedIn]);

  const loginMutation = useMutation({
    mutationFn: () => authApi.loginStudent({ name, phone }),
    onSuccess: () => {
      refreshAuth();
      toast.success("Welcome back!");
      router.push(getDefaultRoute(getUserRole()));
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
          <p className="text-muted-foreground text-sm mt-1">Student Portal</p>
        </div>

        <Card className="w-full max-w-sm card-shadow">
          {alreadySignedIn ? (
            <CardContent className="p-6 space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                You are already signed in
                {role === "admin" ? " as admin" : ""}.
              </p>
              <Button
                className="w-full bg-emerald-deep hover:bg-emerald-mid text-cream"
                onClick={() => router.push(getDefaultRoute(role))}
              >
                Continue to {role === "admin" ? "Admin" : "Dashboard"}
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
                <CardTitle className="text-lg">Student Login</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Ahmad Hassan"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="966501234567"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full bg-emerald-deep hover:bg-emerald-mid text-cream"
                  disabled={loginMutation.isPending || !name.trim() || !phone.trim()}
                  onClick={() => loginMutation.mutate()}
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign In"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Accounts are created by your administrator.
                </p>
                <p className="text-center text-xs text-muted-foreground">
                  Demo: Ahmad Hassan / 966501234567
                </p>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
