import type { DecisionSummary } from "@/types/decision";
import { ReportModule } from "@/components/report/report-module";

export function CoreTruthModule({ summary }: { summary: DecisionSummary }) {
  return (
    <ReportModule title="问题本质">
      <p className="text-lg leading-relaxed text-neutral-800">
        「{summary.core_truth}」
      </p>
    </ReportModule>
  );
}
