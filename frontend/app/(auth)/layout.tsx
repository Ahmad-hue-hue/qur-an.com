import { GuestGuard } from "@/components/auth/auth-guard";
import { Suspense } from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <GuestGuard allowSignedIn>{children}</GuestGuard>
    </Suspense>
  );
}
