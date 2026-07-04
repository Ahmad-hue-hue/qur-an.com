import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/tajweed-logo.jpeg";

export function LoginLogo({
  className,
  size = 112,
  priority = false,
}: {
  className?: string;
  size?: number;
  priority?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-white shadow-[0_4px_24px_rgba(6,78,59,0.12)] ring-1 ring-emerald-deep/10",
        className
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={LOGO_SRC}
        alt="Tajweed Classes"
        width={size}
        height={size}
        priority={priority}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

export { LOGO_SRC as TAJWEED_LOGO_SRC };
