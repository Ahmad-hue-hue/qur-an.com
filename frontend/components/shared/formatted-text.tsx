import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type FormattedTextProps = {
  children: ReactNode;
  className?: string;
  as?: "p" | "div" | "span";
};

/** Preserves line breaks and spacing from admin textareas. */
export function FormattedText({
  children,
  className,
  as: Component = "p",
}: FormattedTextProps) {
  return (
    <Component className={cn("whitespace-pre-wrap break-words", className)}>
      {children}
    </Component>
  );
}
