"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReportLayout } from "@/components/report/report-layout";
import { SaveReportButton } from "@/components/report/save-report-button";
import { reportModules } from "@/lib/report/module-registry";
import { getSession } from "@/lib/chat/session-store";
import {
  confirmLeave,
  useBeforeUnloadGuard,
} from "@/lib/hooks/use-leave-guard";
import type { Session } from "@/types/chat";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface ReportClientProps {
  sessionId: string;
}

export function ReportClient({ sessionId }: ReportClientProps) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  const hasReport = Boolean(session?.decisionSummary);
  useBeforeUnloadGuard(hasReport);

  useEffect(() => {
    setSession(getSession(sessionId));
  }, [sessionId]);

  const handleNewAnalysis = () => {
    if (confirmLeave()) {
      router.push("/");
    }
  };

  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (!session?.decisionSummary) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-50">
        <p className="text-neutral-500">报告尚未生成，请先完成对话分析</p>
        <Button asChild>
          <Link href={session ? `/chat/${sessionId}` : "/"}>
            {session ? "继续对话" : "返回首页"}
          </Link>
        </Button>
      </main>
    );
  }

  const summary = session.decisionSummary;

  return (
    <ReportLayout
      sessionTitle={session.title}
      comparison={session.decisionComparison}
    >
      {reportModules.map((mod) => {
        const Component = mod.component;
        return <Component key={mod.id} summary={summary} />;
      })}
      <div className="pt-2">
        <SaveReportButton
          comparison={session.decisionComparison}
          summary={summary}
        />
      </div>
      <div className="mt-10 flex justify-center border-t border-neutral-200 pt-8">
        <Button variant="outline" onClick={handleNewAnalysis}>
          开始新的分析
        </Button>
      </div>
    </ReportLayout>
  );
}
