"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NegativeFeedbackDialog } from "@/components/report/negative-feedback-dialog";
import type { DownloadedImage, FeedbackReason } from "@/types/feedback";

const STORAGE_PREFIX = "career-ai:feedback:";

function getFeedbackKey(sessionId: string): string {
  return `${STORAGE_PREFIX}${sessionId}`;
}

function hasSubmittedFeedback(sessionId: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(getFeedbackKey(sessionId)) === "1";
}

function markFeedbackSubmitted(sessionId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(getFeedbackKey(sessionId), "1");
}

function buildFeedbackReason(
  reasons: FeedbackReason[],
  otherText?: string
): string {
  const parts: string[] = reasons.filter((r) => r !== "其他").slice();

  if (reasons.includes("其他") && otherText?.trim()) {
    parts.push(otherText.trim());
  }

  return parts.join("、");
}

interface ReportFeedbackProps {
  sessionId: string;
  decisionTopic: string;
  getReportStaySeconds: () => number;
  downloadedImage: DownloadedImage;
}

export function ReportFeedback({
  sessionId,
  decisionTopic,
  getReportStaySeconds,
  downloadedImage,
}: ReportFeedbackProps) {
  const [submitted, setSubmitted] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setSubmitted(hasSubmittedFeedback(sessionId));
  }, [sessionId]);

  const submitFeedback = useCallback(
    async (payload: {
      feedback_type: "positive" | "negative";
      feedback_reason: string;
    }) => {
      setIsSubmitting(true);
      try {
        const response = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            decision_topic: decisionTopic,
            feedback_type: payload.feedback_type,
            feedback_reason: payload.feedback_reason,
            report_stay_seconds: getReportStaySeconds(),
            downloaded_image: downloadedImage,
          }),
        });

        const data = (await response.json().catch(() => ({}))) as {
          success?: boolean;
          error?: string;
        };

        if (!response.ok || !data.success) {
          throw new Error(data.error ?? "提交失败，请稍后重试");
        }

        markFeedbackSubmitted(sessionId);
        setSubmitted(true);
        toast.success(
          payload.feedback_type === "positive" ? "感谢反馈" : "反馈已收到"
        );
        return true;
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "提交失败，请稍后重试"
        );
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [sessionId, decisionTopic, getReportStaySeconds, downloadedImage]
  );

  const handleHelpful = async () => {
    if (submitted || isSubmitting) return;
    await submitFeedback({ feedback_type: "positive", feedback_reason: "" });
  };

  const handleNegativeSubmit = async (data: {
    reasons: FeedbackReason[];
    otherText?: string;
  }) => {
    return submitFeedback({
      feedback_type: "negative",
      feedback_reason: buildFeedbackReason(data.reasons, data.otherText),
    });
  };

  return (
    <>
      <div className="space-y-4 text-center">
        <p className="text-[15px] text-neutral-600">
          这份决策分析对你有帮助吗？
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="outline"
            disabled={submitted || isSubmitting}
            onClick={handleHelpful}
          >
            {submitted ? "已反馈" : "👍 有帮助"}
          </Button>
          <Button
            variant="outline"
            disabled={submitted || isSubmitting}
            onClick={() => setDialogOpen(true)}
          >
            {submitted ? "已反馈" : "👎 没帮助"}
          </Button>
        </div>
      </div>

      <NegativeFeedbackDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleNegativeSubmit}
      />
    </>
  );
}
