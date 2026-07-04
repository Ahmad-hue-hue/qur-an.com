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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const { refreshAuth } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");

  const registerMutation = useMutation({
    mutationFn: () =>
      authApi.registerStudent({ email, password, name, phone, gender }),
    onSuccess: async () => {
      await refreshAuth();
      toast.success("Account created! Welcome to Tajweed Classes.");
      router.push("/dashboard");
    },
    onError: (err: Error) => toast.error(err.message || "Registration failed"),
  });

  const canSubmit =
    name.trim() && phone.trim() && email.trim() && password.length >= 6 && gender;

  return (
    <div className="min-h-screen bg-cream lg:grid lg:grid-cols-2">
      <AuthBrandPanel
        title="Join Tajweed Classes"
        subtitle="Start your structured Tajweed journey with lessons, exercises, and guided assessments."
      />
      <div className="flex min-h-screen flex-col safe-area-top">
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center px-6 py-12 sm:px-8">
          <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
            <LoginLogo className="mb-5 lg:hidden" size={96} priority />
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-mid">
              Tajweed Classes
            </p>
            <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-emerald-deep sm:text-3xl">
              Create account
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Start your student journey
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-6 sm:p-7">
            <div className="space-y-4">
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

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Gender
                  </Label>
                  <Select
                    value={gender}
                    onValueChange={(v) => setGender((v as "male" | "female") ?? "male")}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-border/60 bg-cream/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="mt-1 h-11 w-full rounded-xl btn-emerald"
                  disabled={registerMutation.isPending || !canSubmit}
                  onClick={() => registerMutation.mutate()}
                >
                  {registerMutation.isPending ? "Creating account..." : "Sign up"}
                </Button>

                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-11 w-full rounded-xl border-border/70 bg-transparent text-emerald-deep hover:bg-emerald-light/40"
                  )}
                >
                  Sign in instead
                </Link>
              </div>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground lg:text-left">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-emerald-deep hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
