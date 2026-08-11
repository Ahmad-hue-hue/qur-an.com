"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import { ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface IconInputProps {
  id: string;
  label: string;
  icon: IconSvgElement;
  placeholder: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  className?: string;
  error?: string;
}

export function IconInput({
  id,
  label,
  icon,
  placeholder,
  type = "text",
  value,
  onChange,
  autoComplete,
  className,
  error,
}: IconInputProps) {
  const isPassword = type === "password";
  const [showPassword, setShowPassword] = useState(false);
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </Label>
      <div className="relative">
        <HugeiconsIcon
          icon={icon}
          size={17}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-deep/70 pointer-events-none"
        />
        <Input
          id={id}
          type={inputType}
          placeholder={placeholder}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={cn(
            "h-11 rounded-xl border-border/60 bg-cream/30 pl-10 shadow-none transition-colors",
            "placeholder:text-muted-foreground/50 focus-visible:border-emerald-deep/30 focus-visible:ring-emerald-deep/15",
            isPassword && "pr-11",
            error && "border-destructive/60 focus-visible:border-destructive/60 focus-visible:ring-destructive/15"
          )}
        />
        {isPassword && (
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-emerald-deep transition-colors"
          >
            <HugeiconsIcon icon={showPassword ? ViewOffIcon : ViewIcon} size={18} />
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
