import type { DecisionSummary } from "@/types/decision";
import { ReportModule } from "@/components/report/report-module";
import { splitCoreLogicParagraphs } from "@/lib/report/format-core-logic";

export function ReasoningModule({ summary }: { summary: DecisionSummary }) {
  const paragraphs = splitCoreLogicParagraphs(summary.core_logic);

  return (
    <ReportModule title="核心推荐原因">
      <div className="space-y-4">
        {paragraphs.map((paragraph, index) => (
          <p
            key={index}
            className="text-lg leading-relaxed text-neutral-700"
          >
            {paragraph}
          </p>
        ))}
      </div>
    </ReportModule>
  );
}
