"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  FEEDBACK_REASONS,
  type FeedbackReason,
} from "@/types/feedback";
import { cn } from "@/lib/utils";

interface NegativeFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    reasons: FeedbackReason[];
    otherText?: string;
  }) => Promise<boolean>;
}

export function NegativeFeedbackDialog({
  open,
  onOpenChange,
  onSubmit,
}: NegativeFeedbackDialogProps) {
  const [selected, setSelected] = useState<FeedbackReason[]>([]);
  const [otherText, setOtherText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showOtherInput = selected.includes("其他");
  const canSubmit =
    selected.length > 0 && (!showOtherInput || otherText.trim().length > 0);

  const toggleReason = (reason: FeedbackReason) => {
    setSelected((prev) =>
      prev.includes(reason)
        ? prev.filter((r) => r !== reason)
        : [...prev, reason]
    );
  };

  const resetForm = () => {
    setSelected([]);
    setOtherText("");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      resetForm();
    }
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      const ok = await onSubmit({
        reasons: selected,
        otherText: showOtherInput ? otherText.trim() : undefined,
      });
      if (ok) {
        resetForm();
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>帮助我们改进</DialogTitle>
          <DialogDescription>
            请选择你觉得不满意的地方（可多选）
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-3 py-2">
          {FEEDBACK_REASONS.map((reason) => {
            const checked = selected.includes(reason);
            return (
              <li key={reason}>
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                    checked
                      ? "border-neutral-400 bg-neutral-50"
                      : "border-neutral-200 hover:bg-neutral-50"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleReason(reason)}
                    className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-400"
                  />
                  <span className="text-neutral-800">{reason}</span>
                </label>
              </li>
            );
          })}
        </ul>

        {showOtherInput && (
          <Textarea
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            placeholder="请描述你的具体反馈..."
            rows={3}
            className="resize-none text-sm"
          />
        )}

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? "提交中..." : "确认提交"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
