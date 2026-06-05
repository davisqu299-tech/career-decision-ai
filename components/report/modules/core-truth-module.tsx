import type { DecisionSummary } from "@/types/decision";
import { ReportModule } from "@/components/report/report-module";

export function CoreTruthModule({ summary }: { summary: DecisionSummary }) {
  return (
    <ReportModule title="问题本质" variant="quote">
      <blockquote className="text-lg font-medium italic leading-relaxed text-neutral-800">
        「{summary.core_truth.problem_essence}」
      </blockquote>
    </ReportModule>
  );
}
