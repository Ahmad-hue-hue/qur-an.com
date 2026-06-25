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
    <div
      className={cn(
        "mosque-header relative page-inset-x pt-6 pb-10 sm:pb-12 md:pt-8 lg:rounded-b-2xl",
        className
      )}
    >
      <div className="relative z-10">
        {arabicTitle && (
          <p className="font-arabic text-gold text-base sm:text-lg mb-1">
            {arabicTitle}
          </p>
        )}
        <h1 className="text-xl font-semibold text-cream sm:text-2xl md:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="text-cream/80 text-sm mt-1 sm:text-base">{subtitle}</p>
        )}
        {children}
      </div>
    </div>
  );
}
