"use client";

import { Loader2 } from "lucide-react";
import { useGenerationStages } from "@/lib/hooks/use-generation-stages";

interface GenerationStageBannerProps {
  mode: "chat" | "report";
  isVisible: boolean;
  stageKey: number;
}

export function GenerationStageBanner({
  mode,
  isVisible,
  stageKey,
}: GenerationStageBannerProps) {
  const stageLabel = useGenerationStages({
    mode,
    activeKey: stageKey,
    isActive: isVisible,
  });

  if (!isVisible || !stageLabel) {
    return null;
  }

  return (
    <div className="shrink-0 border-b border-neutral-200 bg-white px-4 py-6 md:px-5 md:pt-24">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
        <p className="text-sm text-neutral-600">{stageLabel}</p>
      </div>
    </div>
  );
}
