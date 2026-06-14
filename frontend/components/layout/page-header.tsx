import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  arabicTitle?: string;
  backHref?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  arabicTitle,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mosque-header px-4 pt-6 pb-12 relative", className)}>
      <div className="relative z-10">
        {arabicTitle && (
          <p className="font-arabic text-gold text-lg mb-1">{arabicTitle}</p>
        )}
        <h1 className="text-xl font-semibold text-cream">{title}</h1>
        {subtitle && (
          <p className="text-cream/80 text-sm mt-1">{subtitle}</p>
        )}
        {children}
      </div>
    </div>
  );
}
