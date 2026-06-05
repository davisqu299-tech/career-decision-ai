import type { DecisionSummary } from "@/types/decision";
import { ReportModule } from "@/components/report/report-module";

export function ReasoningModule({ summary }: { summary: DecisionSummary }) {
  return (
    <ReportModule title="核心逻辑">
      <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-700">
        {summary.reasoning.core_logic}
      </p>
    </ReportModule>
  );
}
