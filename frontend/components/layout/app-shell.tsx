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
    "w-full min-w-0 max-w-lg md:max-w-2xl lg:max-w-none xl:max-w-5xl lg:mx-auto",
  admin:
    "w-full min-w-0 max-w-full lg:max-w-6xl xl:max-w-7xl lg:mx-auto lg:px-6 xl:px-8",
  auth: "w-full min-w-0 max-w-md sm:max-w-lg mx-auto",
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
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <main
          className={cn(
            "flex-1 w-full",
            mainWidth[variant],
            "pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-8"
          )}
        >
          {children}
        </main>
        <BottomNav variant={variant} />
      </div>
    </div>
  );
}
