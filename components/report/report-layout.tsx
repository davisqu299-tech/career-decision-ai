"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { DecisionComparison } from "@/types/decision-comparison";
import { WorkspaceLayout } from "@/components/layout/workspace-layout";
import { Button } from "@/components/ui/button";
import { confirmLeave } from "@/lib/hooks/use-leave-guard";

interface ReportLayoutProps {
  sessionTitle: string;
  comparison?: DecisionComparison | null;
  children: React.ReactNode;
}

export function ReportLayout({
  sessionTitle,
  comparison,
  children,
}: ReportLayoutProps) {
  const router = useRouter();

  const handleBack = () => {
    if (confirmLeave()) {
      router.push("/");
    }
  };

  return (
    <WorkspaceLayout comparison={comparison}>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <header className="shrink-0 border-b border-neutral-200 bg-white">
          <div className="mx-auto flex max-w-3xl items-center gap-4 px-6 py-4">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              返回
            </Button>
            <div className="flex-1">
              <p className="text-xs text-neutral-400">离职决策分析报告</p>
              <h1 className="text-sm font-medium text-neutral-700 line-clamp-1">
                {sessionTitle}
              </h1>
            </div>
          </div>
        </header>
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
