import type { DecisionSummary } from "@/types/decision";
import { ReportModule } from "@/components/report/report-module";

export function ConclusionModule({ summary }: { summary: DecisionSummary }) {
  return (
    <ReportModule title="最终建议">
      <p className="text-xl font-medium leading-relaxed text-neutral-900">
        {summary.final_choice}
      </p>
    </ReportModule>
  );
}
