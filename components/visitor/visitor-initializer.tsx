"use client";

import { useEffect } from "react";
import { AnalysisQuotaService } from "@/lib/quota/analysis-quota-service";
import { VisitorService } from "@/lib/visitor/visitor-service";

export function VisitorInitializer() {
  useEffect(() => {
    VisitorService.initialize();
    void AnalysisQuotaService.fetchQuota().catch(() => {
      // silent prefetch; authoritative checks happen on submit
    });
  }, []);

  return null;
}
