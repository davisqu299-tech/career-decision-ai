"use client";

import { useEffect, useState } from "react";

const CHAT_STAGE_LABELS = [
  "正在理解你的职业背景",
  "分析你的职业选择中",
  "正在识别重要信息",
] as const;

const REPORT_STAGE_LABELS = [
  "核心维度价值对比中",
  "正在识别容易被忽略的风险",
  "正在生成你的专属离职分析报告",
] as const;

const CHAT_STAGE_DELAYS_MS = [0, 8000, 8000] as const;
const REPORT_STAGE_DELAYS_MS = [0, 10000, 10000] as const;

interface UseGenerationStagesOptions {
  mode: "chat" | "report";
  activeKey: number;
  isActive: boolean;
}

export function useGenerationStages({
  mode,
  activeKey,
  isActive,
}: UseGenerationStagesOptions): string | null {
  const labels = mode === "chat" ? CHAT_STAGE_LABELS : REPORT_STAGE_LABELS;

  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setStageIndex(0);
      return;
    }

    setStageIndex(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    let cumulativeDelay = 0;
    const stageDelays =
      mode === "chat" ? CHAT_STAGE_DELAYS_MS : REPORT_STAGE_DELAYS_MS;

    for (let index = 1; index < labels.length; index += 1) {
      cumulativeDelay += stageDelays[index];
      const nextIndex = index;
      timers.push(
        setTimeout(() => {
          setStageIndex(nextIndex);
        }, cumulativeDelay)
      );
    }

    return () => {
      for (const timer of timers) {
        clearTimeout(timer);
      }
    };
  }, [activeKey, isActive, labels, mode]);

  if (!isActive) {
    return null;
  }

  return labels[stageIndex] ?? labels[labels.length - 1];
}
