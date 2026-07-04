"use client";

import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

/** Search field wired for Base UI Input (`onValueChange`) so filtering updates live. */
export function SearchInput({
  value,
  onValueChange,
  placeholder = "Search...",
  className,
  inputClassName,
}: SearchInputProps) {
  return (
    <div className={cn("relative min-w-0", className)}>
      <HugeiconsIcon
        icon={Search01Icon}
        size={18}
        className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        placeholder={placeholder}
        className={cn("w-full pl-10", inputClassName)}
        value={value}
        onValueChange={onValueChange}
      />
    </div>
  );
}
