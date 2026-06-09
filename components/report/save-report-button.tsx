"use client";

import { useRef, useState } from "react";
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
  logoSrc?: string | null;
}

export function SaveReportButton({
  comparison,
  summary,
  logoSrc = null,
}: SaveReportButtonProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleSave = async () => {
    const node = cardRef.current;
    if (!node) {
      toast.error("无法生成报告图片，请刷新页面后重试");
      return;
    }

    setIsExporting(true);
    try {
      await exportReportImage(node);
      toast.success("决策报告已保存到本地");
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
