"use client";

import type { DecisionComparison } from "@/types/decision-comparison";
import { WorkspaceLayout } from "@/components/layout/workspace-layout";

interface ReportLayoutProps {
  comparison?: DecisionComparison | null;
  generationBanner?: React.ReactNode;
  children: React.ReactNode;
}

export function ReportLayout({
  comparison,
  generationBanner,
  children,
}: ReportLayoutProps) {
  return (
    <WorkspaceLayout comparison={comparison} generationBanner={generationBanner}>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <main className="mx-auto w-full max-w-3xl space-y-8 px-6 py-10">
          <div className="mb-2">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
              你的离职决策报告
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-neutral-500">
              基于你提供的信息，AI 顾问为你整理了以下分析与建议。
            </p>
          </div>
          {children}
        </main>
      </div>
    </WorkspaceLayout>
  );
}
