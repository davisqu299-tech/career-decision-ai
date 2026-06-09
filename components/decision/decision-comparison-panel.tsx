import type { DecisionComparison } from "@/types/decision-comparison";

interface ComparisonFieldProps {
  label: string;
  value?: string;
}

function ComparisonField({ label, value }: ComparisonFieldProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-lg font-semibold text-neutral-700 md:text-xl">{label}</p>
      <p className="text-lg leading-relaxed text-neutral-800 md:text-xl md:leading-relaxed">
        {value?.trim() ? (
          value
        ) : (
          <span className="text-neutral-400">待生成</span>
        )}
      </p>
    </div>
  );
}

interface DecisionComparisonPanelProps {
  data?: DecisionComparison | null;
}

export function DecisionComparisonPanel({
  data,
}: DecisionComparisonPanelProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col">
      <h2 className="shrink-0 text-xl font-semibold tracking-tight text-neutral-900 md:text-2xl">
        决策对比
      </h2>
      <div className="mt-6 flex flex-col space-y-7 md:space-y-8">
        <ComparisonField label="决策主题" value={data?.decisionTopic} />
        <ComparisonField label="方案一" value={data?.optionOne} />
        <ComparisonField label="方案二" value={data?.optionTwo} />
      </div>
    </aside>
  );
}
