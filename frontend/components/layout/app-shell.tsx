import { cn } from "@/lib/utils";
import { SideNav } from "./side-nav";
import { BottomNav } from "./bottom-nav";

interface AppShellProps {
  children: React.ReactNode;
  variant?: "student" | "admin" | "auth";
  className?: string;
}

const mainWidth = {
  student:
    "w-full max-w-lg md:max-w-2xl lg:max-w-none xl:max-w-5xl lg:mx-auto",
  admin: "w-full max-w-full lg:max-w-6xl xl:max-w-7xl lg:mx-auto",
  auth: "w-full max-w-md sm:max-w-lg mx-auto",
};

export function AppShell({
  children,
  variant = "student",
  className,
}: AppShellProps) {
  const hasNav = variant !== "auth";

  if (!hasNav) {
    return (
      <div className={cn("flex flex-col min-h-screen", className)}>
        <main className={cn("flex-1", mainWidth.auth)}>{children}</main>
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-screen", className)}>
      <SideNav variant={variant} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main
          className={cn(
            "flex-1",
            mainWidth[variant],
            "pb-20 lg:pb-6"
          )}
        >
          {children}
        </main>
        <BottomNav variant={variant} />
      </div>
    </div>
  );
}
