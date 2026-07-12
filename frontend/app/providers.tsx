"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { ConfigMissing } from "@/components/config-missing";
import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";
import { InstallAppPrompt } from "@/components/pwa/install-app-prompt";
import { AuthProvider } from "@/hooks/use-auth";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  if (!isSupabaseConfigured()) {
    return <ConfigMissing />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RegisterServiceWorker />
        <InstallAppPrompt />
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            classNames: {
              toast: "card-shadow border-border",
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}
