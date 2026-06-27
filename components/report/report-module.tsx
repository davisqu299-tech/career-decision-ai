import { cn } from "@/lib/utils";

interface ReportModuleProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function ReportModule({
  title,
  children,
  className,
}: ReportModuleProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-neutral-200 bg-white p-6 shadow-sm",
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
