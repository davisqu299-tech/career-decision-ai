import type { DecisionComparison } from "@/types/decision-comparison";
import { DecisionComparisonPanel } from "@/components/decision/decision-comparison-panel";

interface WorkspaceLayoutProps {
  comparison?: DecisionComparison | null;
  generationBanner?: React.ReactNode;
  children: React.ReactNode;
}

export function WorkspaceLayout({
  comparison,
  generationBanner,
  children,
}: WorkspaceLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <div className="hidden w-1/4 shrink-0 overflow-y-auto border-r border-neutral-200 bg-white p-4 pt-24 md:block md:p-5 md:pt-24">
        <DecisionComparisonPanel data={comparison} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {generationBanner}
        {children}
      </div>
    </div>
  );
}
