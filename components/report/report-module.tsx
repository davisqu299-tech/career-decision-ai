import { cn } from "@/lib/utils";

interface ReportModuleProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "hero" | "quote";
}

export function ReportModule({
  title,
  children,
  className,
  variant = "default",
}: ReportModuleProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-neutral-200 bg-white p-6 shadow-sm",
        variant === "hero" && "border-neutral-300 bg-neutral-50",
        variant === "quote" && "border-l-4 border-l-neutral-800",
        className
      )}
    >
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-neutral-500">
        {title}
      </h2>
      {children}
    </section>
  );
}
