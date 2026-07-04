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
    <Image
      src={LOGO_SRC}
      alt="Tajweed Classes"
      width={size}
      height={size}
      priority={priority}
      className={cn("object-contain", className)}
    />
  );
}

export { LOGO_SRC as TAJWEED_LOGO_SRC };
