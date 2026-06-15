"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LoginPage() {
  const router = useRouter();
  const { refreshAuth } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const studentLogin = useMutation({
    mutationFn: () => authApi.loginStudent({ name, phone }),
    onSuccess: () => {
      refreshAuth();
      toast.success("Welcome back!");
      router.push(getDefaultRoute(getUserRole()));
    },
    onError: (err: Error) => toast.error(err.message || "Invalid credentials"),
  });

  const adminLogin = useMutation({
    mutationFn: () => authApi.loginAdmin({ email, password }),
    onSuccess: () => {
      refreshAuth();
      toast.success("Welcome, Admin!");
      router.push("/admin");
    },
    onError: (err: Error) => toast.error(err.message || "Invalid credentials"),
  });

  return (
    <AppShell variant="auth">
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center mb-8">
          <p className="font-arabic text-2xl text-emerald-deep mb-1">بسم الله</p>
          <h1 className="text-2xl font-bold text-emerald-deep">Tajweed Academy</h1>
          <p className="text-muted-foreground text-sm mt-1">Sign in to continue learning</p>
        </div>

        <Card className="w-full max-w-sm card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Login</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="student">
              <TabsList className="w-full mb-4">
                <TabsTrigger value="student" className="flex-1">
                  Student
                </TabsTrigger>
                <TabsTrigger value="admin" className="flex-1">
                  Admin
                </TabsTrigger>
              </TabsList>

              <TabsContent value="student" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Ahmad Hassan"
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
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full bg-emerald-deep hover:bg-emerald-mid text-cream"
                  disabled={studentLogin.isPending || !name.trim() || !phone.trim()}
                  onClick={() => studentLogin.mutate()}
                >
                  {studentLogin.isPending ? "Signing in..." : "Sign In"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Demo: Ahmad Hassan / 966501234567
                </p>
              </TabsContent>

              <TabsContent value="admin" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@tajweed.academy"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full bg-emerald-deep hover:bg-emerald-mid text-cream"
                  disabled={adminLogin.isPending || !email || !password}
                  onClick={() => adminLogin.mutate()}
                >
                  {adminLogin.isPending ? "Signing in..." : "Admin Sign In"}
                </Button>
              </TabsContent>
            </Tabs>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-emerald-deep font-medium">
                Register
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
