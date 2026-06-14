import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  variant?: "student" | "admin" | "auth";
  className?: string;
}

export function AppShell({
  children,
  variant = "student",
  className,
}: AppShellProps) {
  const hasNav = variant !== "auth";

  return (
    <div className={cn("flex flex-col min-h-screen", className)}>
      <main
        className={cn(
          "flex-1 w-full max-w-lg mx-auto",
          hasNav && "pb-20"
        )}
      >
        {children}
      </main>
    </div>
  );
}
