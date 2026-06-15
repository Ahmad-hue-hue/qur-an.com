"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { authApi } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();
  const { refreshAuth } = useAuth();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
  });

  const registerMutation = useMutation({
    mutationFn: () => authApi.register(form),
    onSuccess: () => {
      refreshAuth();
      toast.success("Account created! Welcome to Tajweed Academy.");
      router.push("/dashboard");
    },
    onError: (err: Error) => toast.error(err.message || "Registration failed"),
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const canSubmit =
    form.first_name.trim() && form.last_name.trim() && form.phone.trim();

  return (
    <AppShell variant="auth">
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center mb-8">
          <p className="font-arabic text-2xl text-emerald-deep mb-1">بسم الله</p>
          <h1 className="text-2xl font-bold text-emerald-deep">Tajweed Academy</h1>
          <p className="text-muted-foreground text-sm mt-1">Create your student account</p>
        </div>

        <Card className="w-full max-w-sm card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Register</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={form.first_name}
                  onChange={(e) => update("first_name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={form.last_name}
                  onChange={(e) => update("last_name", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                type="tel"
                placeholder="966501234567"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Use this phone number to sign in later with your full name.
              </p>
            </div>
            <Button
              className="w-full bg-emerald-deep hover:bg-emerald-mid text-cream"
              disabled={registerMutation.isPending || !canSubmit}
              onClick={() => registerMutation.mutate()}
            >
              {registerMutation.isPending ? "Creating..." : "Create Account"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-emerald-deep font-medium">
                Login
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
