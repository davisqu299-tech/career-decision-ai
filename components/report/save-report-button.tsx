"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ReportShareCard } from "@/components/report/report-share-card";
import { exportReportImage } from "@/lib/report/export-report-image";
import type { DecisionComparison } from "@/types/decision-comparison";
import type { DecisionSummary } from "@/types/decision";

interface SaveReportButtonProps {
  comparison?: DecisionComparison | null;
  summary: DecisionSummary;
  onDownloadSuccess?: () => void;
}

export function SaveReportButton({
  comparison,
  summary,
  onDownloadSuccess,
}: SaveReportButtonProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [generatedAt, setGeneratedAt] = useState(() => new Date());
  const logoSrc =
    typeof window !== "undefined"
      ? `${window.location.origin}/lychee-logo.png`
      : "/lychee-logo.png";

  const handleSave = async () => {
    const node = cardRef.current;
    if (!node) {
      toast.error("无法生成报告图片，请刷新页面后重试");
      return;
    }

    setIsExporting(true);
    try {
      flushSync(() => {
        setGeneratedAt(new Date());
      });

      await document.fonts.ready;
      await Promise.all(
        Array.from(node.querySelectorAll("img")).map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) {
                resolve();
                return;
              }
              img.onload = () => resolve();
              img.onerror = () => resolve();
            })
        )
      );
      await exportReportImage(node);
      toast.success("决策报告已保存到本地");
      onDownloadSuccess?.();
    } catch {
      toast.error("保存失败，请稍后重试");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed left-[-9999px] top-0 z-[-1]"
      >
        <ReportShareCard
          ref={cardRef}
          comparison={comparison}
          summary={summary}
          generatedAt={generatedAt}
          logoSrc={logoSrc}
        />
      </div>

      <Button onClick={handleSave} disabled={isExporting}>
        <Download className="h-4 w-4" />
        {isExporting ? "正在生成..." : "保存决策报告"}
      </Button>
    </>
  );
}
