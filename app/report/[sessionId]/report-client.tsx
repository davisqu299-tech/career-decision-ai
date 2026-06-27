"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GenerationStageBanner } from "@/components/generation/generation-stage-banner";
import { ReportLayout } from "@/components/report/report-layout";
import { ReportFeedback } from "@/components/report/report-feedback";
import { SaveReportButton } from "@/components/report/save-report-button";
import { reportModules } from "@/lib/report/module-registry";
import { applyChatApiResponse } from "@/lib/chat/apply-chat-response";
import {
  getPipelineState,
  subscribeChatPipeline,
} from "@/lib/chat/chat-pipeline";
import {
  getSession,
  setDecisionComparison,
  setDifyConversationId,
} from "@/lib/chat/session-store";
import { applySystemUnavailableResponse } from "@/lib/chat/system-unavailable";
import {
  confirmLeave,
  useBeforeUnloadGuard,
} from "@/lib/hooks/use-leave-guard";
import type { Session } from "@/types/chat";
import type { DownloadedImage } from "@/types/feedback";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const DOWNLOADED_PREFIX = "career-ai:downloaded:";

function getDownloadedKey(sessionId: string): string {
  return `${DOWNLOADED_PREFIX}${sessionId}`;
}

function hasDownloadedReport(sessionId: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(getDownloadedKey(sessionId)) === "1";
}

function markDownloadedReport(sessionId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(getDownloadedKey(sessionId), "1");
}

function ReportGeneratingSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

interface ReportClientProps {
  sessionId: string;
}

export function ReportClient({ sessionId }: ReportClientProps) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [generationStageKey, setGenerationStageKey] = useState(0);
  const enteredAtRef = useRef<number>(Date.now());
  const [hasDownloaded, setHasDownloaded] = useState(false);

  const hasReport = Boolean(session?.decisionSummary);
  useBeforeUnloadGuard(hasReport);

  useEffect(() => {
    setSession(getSession(sessionId));
    enteredAtRef.current = Date.now();
    setHasDownloaded(hasDownloadedReport(sessionId));
    setPipelineLoading(getPipelineState(sessionId).isLoading);
  }, [sessionId]);

  useEffect(() => {
    return subscribeChatPipeline(sessionId, (event) => {
      if (event.type === "loading") {
        setPipelineLoading(event.isLoading);
        if (!event.isLoading) {
          setSession(getSession(sessionId));
        }
      }

      if (event.type === "report_generating") {
        if (getSession(sessionId)?.decisionSummary) {
          return;
        }
        setGenerationStageKey((key) => key + 1);
        setPipelineLoading(true);
      }

      if (event.type === "decision_comparison") {
        if (event.conversationId) {
          setDifyConversationId(sessionId, event.conversationId);
        }
        setDecisionComparison(sessionId, event.decision_comparison);
        setSession(getSession(sessionId));
      }

      if (event.type === "follow_up") {
        const current = getSession(sessionId);
        if (current?.status === "generating_report") {
          return;
        }
        applyChatApiResponse(sessionId, event.data);
        setSession(getSession(sessionId));
        setPipelineLoading(false);
        router.push(`/chat/${sessionId}`);
        return;
      }

      if (event.type === "decision") {
        applyChatApiResponse(sessionId, event.data);
        setSession(getSession(sessionId));
        setPipelineLoading(false);
      }

      if (event.type === "error") {
        applySystemUnavailableResponse(sessionId);
        setSession(getSession(sessionId));
        setPipelineLoading(false);
        router.push(`/chat/${sessionId}`);
      }
    });
  }, [sessionId, router]);

  const getReportStaySeconds = useCallback(
    () => Math.floor((Date.now() - enteredAtRef.current) / 1000),
    []
  );

  const handleDownloadSuccess = useCallback(() => {
    markDownloadedReport(sessionId);
    setHasDownloaded(true);
  }, [sessionId]);

  const downloadedImage: DownloadedImage = hasDownloaded ? "Y" : "N";

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

  const isGenerating =
    !session?.decisionSummary &&
    (session?.status === "generating_report" || pipelineLoading);

  if (!session?.decisionSummary && !isGenerating) {
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

  if (isGenerating && session) {
    return (
      <ReportLayout
        comparison={session.decisionComparison}
        generationBanner={
          <GenerationStageBanner
            mode="report"
            isVisible
            stageKey={generationStageKey}
          />
        }
      >
        <ReportGeneratingSkeleton />
      </ReportLayout>
    );
  }

  if (!session?.decisionSummary) {
    return null;
  }

  const summary = session.decisionSummary;

  return (
    <ReportLayout comparison={session.decisionComparison}>
      {reportModules.map((mod) => {
        const Component = mod.component;
        return <Component key={mod.id} summary={summary} />;
      })}
      <div className="mt-12 space-y-6">
        <ReportFeedback
          sessionId={sessionId}
          decisionTopic={session.title}
          getReportStaySeconds={getReportStaySeconds}
          downloadedImage={downloadedImage}
        />
        <div className="flex justify-end">
          <SaveReportButton
            comparison={session.decisionComparison}
            summary={summary}
            onDownloadSuccess={handleDownloadSuccess}
          />
        </div>
      </div>
      <div className="mt-10 flex justify-center border-t border-neutral-200 pt-8">
        <Button variant="outline" onClick={handleNewAnalysis}>
          开始新的分析
        </Button>
      </div>
    </ReportLayout>
  );
}
