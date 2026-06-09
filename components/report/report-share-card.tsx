import { forwardRef } from "react";
import type { DecisionComparison } from "@/types/decision-comparison";
import type { DecisionSummary } from "@/types/decision";

interface ReportShareCardProps {
  comparison?: DecisionComparison | null;
  summary: DecisionSummary;
  logoSrc?: string | null;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
      {children}
    </p>
  );
}

function FieldValue({
  value,
  className = "text-[15px] leading-relaxed text-neutral-800",
}: {
  value?: string;
  className?: string;
}) {
  return (
    <p className={className}>
      {value?.trim() ? value : <span className="text-neutral-400">待生成</span>}
    </p>
  );
}

export const ReportShareCard = forwardRef<HTMLDivElement, ReportShareCardProps>(
  function ReportShareCard({ comparison, summary, logoSrc = null }, ref) {
    const insightItems = summary.insights_and_actions
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    return (
      <div
        ref={ref}
        className="box-border bg-white p-10 font-sans text-neutral-900"
        style={{ width: 800 }}
      >
        {/* Region 1: Decision context */}
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6">
          <FieldLabel>决策主题</FieldLabel>
          <FieldValue
            value={comparison?.decisionTopic}
            className="text-base leading-relaxed text-neutral-800"
          />

          <div className="mt-6 grid grid-cols-2 gap-6">
            <div>
              <FieldLabel>方案一</FieldLabel>
              <FieldValue value={comparison?.optionOne} />
            </div>
            <div>
              <FieldLabel>方案二</FieldLabel>
              <FieldValue value={comparison?.optionTwo} />
            </div>
          </div>
        </div>

        {/* Region 2: Recommendations */}
        <div className="mt-8 space-y-6">
          <div className="rounded-xl border-2 border-neutral-300 bg-neutral-50 p-6">
            <FieldLabel>最终建议</FieldLabel>
            <p className="text-2xl font-semibold leading-snug text-neutral-900">
              {summary.final_choice}
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <FieldLabel>核心推荐原因</FieldLabel>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-700">
              {summary.core_logic}
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <FieldLabel>洞察与行动建议</FieldLabel>
            <ul className="space-y-3">
              {insightItems.map((item, index) => (
                <li
                  key={index}
                  className="flex gap-3 text-[15px] leading-relaxed text-neutral-700"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-medium text-neutral-600">
                    {index + 1}
                  </span>
                  <span className="flex-1">
                    {item.replace(/^\d+\.\s*/, "")}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-neutral-200 border-l-4 border-l-neutral-800 bg-white p-6">
            <FieldLabel>问题本质</FieldLabel>
            <blockquote className="text-lg font-medium italic leading-relaxed text-neutral-800">
              「{summary.core_truth}」
            </blockquote>
          </div>
        </div>

        {/* Footer branding */}
        <div className="mt-8 flex items-center justify-end gap-2 border-t border-neutral-200 pt-6">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt="荔枝AI"
              className="h-8 w-8 object-contain"
            />
          ) : (
            <div
              className="flex h-8 w-8 items-center justify-center rounded border border-dashed border-neutral-300 bg-neutral-50 text-[10px] text-neutral-400"
              aria-hidden
            />
          )}
          <span className="text-sm font-medium text-neutral-600">荔枝AI</span>
        </div>
      </div>
    );
  }
);
