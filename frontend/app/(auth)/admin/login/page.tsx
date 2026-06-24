"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail01Icon, LockIcon } from "@hugeicons/core-free-icons";
import { authApi } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { LoginLogo } from "@/components/auth/login-logo";
import { IconInput } from "@/components/auth/icon-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminLoginPage() {
  const router = useRouter();
  const { refreshAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: () => authApi.loginAdmin({ email, password }),
    onSuccess: async () => {
      await refreshAuth();
      toast.success("Welcome, admin!");
      router.push("/admin");
    },
    onError: (err: Error) => toast.error(err.message || "Login failed"),
  });

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-5 py-10">
      <LoginLogo className="w-24 h-20 mb-6" />
      <div className="text-center mb-8">
        <h1 className="font-serif text-3xl font-bold text-emerald-deep">Admin Login</h1>
        <p className="text-muted-foreground text-sm mt-2">
          Sign in with your admin credentials
        </p>
      </div>

      <Card className="w-full max-w-md border-0 card-shadow rounded-2xl bg-white">
        <CardContent className="p-6 pt-7 space-y-5">
          <IconInput
            id="admin-email"
            label="Email"
            icon={Mail01Icon}
            placeholder="admin@example.com"
            type="email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
          />
          <IconInput
            id="admin-password"
            label="Password"
            icon={LockIcon}
            placeholder="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
          />
          <Button
            className="w-full h-12 rounded-xl bg-emerald-deep hover:bg-emerald-mid text-cream"
            disabled={loginMutation.isPending || !email.trim() || !password.trim()}
            onClick={() => loginMutation.mutate()}
          >
            {loginMutation.isPending ? "Signing in..." : "Login as Admin"}
          </Button>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground mt-8">
        <Link href="/login" className="font-semibold text-emerald-deep">
          Student login
        </Link>
      </p>
    </div>
  );
}
