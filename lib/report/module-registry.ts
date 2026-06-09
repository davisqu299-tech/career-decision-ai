import type { ComponentType } from "react";
import type { DecisionSummary } from "@/types/decision";
import { ConclusionModule } from "@/components/report/modules/conclusion-module";
import { ReasoningModule } from "@/components/report/modules/reasoning-module";
import { InsightsModule } from "@/components/report/modules/insights-module";
import { CoreTruthModule } from "@/components/report/modules/core-truth-module";

export interface ReportModuleConfig {
  id: string;
  title: string;
  order: number;
  component: ComponentType<{ summary: DecisionSummary }>;
}

export const reportModules: ReportModuleConfig[] = [
  {
    id: "conclusion",
    title: "最终建议",
    order: 1,
    component: ConclusionModule,
  },
  {
    id: "core-truth",
    title: "问题本质",
    order: 2,
    component: CoreTruthModule,
  },
  {
    id: "reasoning",
    title: "核心推荐原因",
    order: 3,
    component: ReasoningModule,
  },
  {
    id: "insights",
    title: "洞察与行动建议",
    order: 4,
    component: InsightsModule,
  },
].sort((a, b) => a.order - b.order);
