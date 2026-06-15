"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function RegisterPage() {
  const router = useRouter();
  const { refreshAuth } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const registerMutation = useMutation({
    mutationFn: () => authApi.registerStudent({ name, phone }),
    onSuccess: () => {
      refreshAuth();
      toast.success("Account created! Welcome to Tajweed Academy.");
      router.push(getDefaultRoute(getUserRole()));
    },
    onError: (err: Error) => toast.error(err.message || "Registration failed"),
  });

  const canSubmit = name.trim() && phone.trim();

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 max-w-md mx-auto w-full">
        <LoginLogo className="w-24 h-20 mb-6" />

        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold text-emerald-deep tracking-tight">
            Join Tajweed Academy
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            Start your learning journey today
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
  );
}
