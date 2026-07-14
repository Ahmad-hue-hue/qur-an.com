import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type FormattedTextProps = {
  children: ReactNode;
  className?: string;
  as?: "p" | "div" | "span";
};

/**
 * Preserves line breaks from admin textareas, with clear gaps between lines
 * so Arabic (and multiline) content does not sit tight on the next line.
 */
export function FormattedText({
  children,
  className,
  as: Component = "div",
}: FormattedTextProps) {
  if (typeof children === "string") {
    const lines = children.replace(/\r\n/g, "\n").split("\n");
    const hasBreaks = lines.length > 1;

    if (hasBreaks) {
      return (
        <Component className={cn("break-words", className)}>
          {lines.map((line, i) => (
            <span
              key={i}
              className={cn(
                "block",
                line.length === 0 ? "h-3" : "mb-2.5 last:mb-0"
              )}
            >
              {line}
            </span>
          ))}
        </Component>
      );
    }
  }

  return (
    <Component className={cn("whitespace-pre-wrap break-words", className)}>
      {children}
    </Component>
  );
}
