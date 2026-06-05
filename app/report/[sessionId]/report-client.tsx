"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ReportLayout } from "@/components/report/report-layout";
import { reportModules } from "@/lib/report/module-registry";
import { getSession } from "@/lib/chat/session-store";
import type { Session } from "@/types/chat";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface ReportClientProps {
  sessionId: string;
}

export function ReportClient({ sessionId }: ReportClientProps) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    setSession(getSession(sessionId));
  }, [sessionId]);

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
    <ReportLayout sessionTitle={session.title}>
      {reportModules.map((mod) => {
        const Component = mod.component;
        return <Component key={mod.id} summary={summary} />;
      })}
      <div className="flex justify-center pt-4">
        <Button variant="outline" asChild>
          <Link href="/">开始新的分析</Link>
        </Button>
      </div>
    </ReportLayout>
  );
}
