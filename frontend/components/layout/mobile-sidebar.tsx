"use client";

import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { SideNavContent } from "./side-nav-content";
import type { NavVariant } from "./nav-config";

interface MobileSidebarProps {
  variant: NavVariant;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileSidebar({
  variant,
  open,
  onOpenChange,
}: MobileSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        showCloseButton
        className="glass-sidebar w-[min(88vw,18rem)] max-w-xs border-r border-sidebar-border p-0 text-sidebar-foreground sm:max-w-xs [&_[data-slot=sheet-close]]:text-sidebar-foreground [&_[data-slot=sheet-close]]:hover:bg-white/10"
      >
        <SideNavContent
          variant={variant}
          onNavigate={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
