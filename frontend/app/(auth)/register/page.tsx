"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  UserIcon,
  CallIcon,
  Mail01Icon,
  LockIcon,
} from "@hugeicons/core-free-icons";
import { authApi } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { LoginLogo } from "@/components/auth/login-logo";
import { IconInput } from "@/components/auth/icon-input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const { refreshAuth } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const registerMutation = useMutation({
    mutationFn: () =>
      authApi.registerStudent({ email, password, name, phone }),
    onSuccess: async () => {
      await refreshAuth();
      toast.success("Account created! Welcome to Tajweed Academy.");
      router.push("/dashboard");
    },
    onError: (err: Error) => toast.error(err.message || "Registration failed"),
  });

  const canSubmit =
    name.trim() && phone.trim() && email.trim() && password.length >= 6;

  return (
    <div className="min-h-screen bg-cream lg:grid lg:grid-cols-2">
      <AuthBrandPanel
        title="Join Tajweed Academy"
        subtitle="Start your structured Tajweed journey with lessons, exercises, and guided assessments."
      />
      <div className="flex min-h-screen flex-col safe-area-top">
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 sm:px-8 max-w-md mx-auto w-full lg:max-w-lg">
          <LoginLogo className="w-24 h-20 mb-6 lg:hidden" />

          <div className="text-center mb-8">
            <h1 className="font-serif text-3xl font-bold text-emerald-deep tracking-tight">
              Join Tajweed Academy
            </h1>
            <p className="text-muted-foreground text-sm mt-2">
              Create your student account
            </p>
          </div>

          <Card className="w-full border-0 card-shadow rounded-2xl bg-white">
            <CardContent className="p-6 pt-7">
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
                <IconInput
                  id="email"
                  label="Email"
                  icon={Mail01Icon}
                  placeholder="you@example.com"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={setEmail}
                />
                <IconInput
                  id="password"
                  label="Password"
                  icon={LockIcon}
                  placeholder="At least 6 characters"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={setPassword}
                />

                <Button
                  className="w-full h-12 rounded-xl bg-emerald-deep hover:bg-emerald-mid text-cream text-base font-medium mt-2"
                  disabled={registerMutation.isPending || !canSubmit}
                  onClick={() => registerMutation.mutate()}
                >
                  {registerMutation.isPending ? "Creating account..." : "Sign Up"}
                </Button>

                <div className="relative py-1">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs text-muted-foreground">
                    or
                  </span>
                </div>

                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "w-full h-12 rounded-xl border-2 border-emerald-deep text-emerald-deep hover:bg-emerald-light/50 text-base font-medium"
                  )}
                >
                  Login
                </Link>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-emerald-deep">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
