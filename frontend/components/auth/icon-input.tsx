import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
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
}: IconInputProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} className="text-sm font-medium text-foreground/80">
        {label}
      </Label>
      <div className="relative">
        <HugeiconsIcon
          icon={icon}
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-deep pointer-events-none"
        />
        <Input
          id={id}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10 h-12 rounded-xl bg-white border-border/80"
        />
      </div>
    </div>
  );
}
