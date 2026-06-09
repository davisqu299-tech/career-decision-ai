import type { DecisionComparison } from "@/types/decision-comparison";
import { DecisionComparisonPanel } from "@/components/decision/decision-comparison-panel";

interface WorkspaceLayoutProps {
  comparison?: DecisionComparison | null;
  children: React.ReactNode;
}

export function WorkspaceLayout({
  comparison,
  children,
}: WorkspaceLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <div className="hidden w-1/4 shrink-0 overflow-y-auto border-r border-neutral-200 bg-white p-4 md:block md:p-5">
        <DecisionComparisonPanel data={comparison} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
