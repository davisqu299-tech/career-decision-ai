import type { DecisionSummary } from "@/types/decision";
import { ReportModule } from "@/components/report/report-module";

export function ReasoningModule({ summary }: { summary: DecisionSummary }) {
  return (
    <ReportModule title="核心推荐原因">
      <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-700">
        {summary.core_logic}
      </p>
    </ReportModule>
  );
}
