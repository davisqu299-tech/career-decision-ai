import type { DecisionSummary } from "@/types/decision";
import { ReportModule } from "@/components/report/report-module";

export function InsightsModule({ summary }: { summary: DecisionSummary }) {
  const items = summary.insights_and_actions.deep_insight
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <ReportModule title="深度洞察与行动建议">
      <ul className="space-y-3">
        {items.map((item, index) => (
          <li
            key={index}
            className="flex gap-3 text-[15px] leading-relaxed text-neutral-700"
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-medium text-neutral-600">
              {index + 1}
            </span>
            <span className="flex-1">{item.replace(/^\d+\.\s*/, "")}</span>
          </li>
        ))}
      </ul>
    </ReportModule>
  );
}
