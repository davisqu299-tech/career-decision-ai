"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import type { Message } from "@/types/chat";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success("已复制到剪贴板");
    } catch {
      toast.error("复制失败，请手动选择文字复制");
    }
  };

  if (isUser) {
    return (
      <div className="flex w-full justify-end">
        <div className="flex max-w-[85%] flex-col items-end gap-1">
          <div className="rounded-xl bg-neutral-100 px-4 py-3 text-[15px] leading-relaxed text-neutral-900">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            aria-label="复制"
            className="h-7 w-7 text-neutral-400 hover:text-neutral-600"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full justify-start">
      <div className="max-w-[85%] rounded-xl border border-neutral-200 bg-white px-4 py-3 text-[15px] leading-relaxed text-neutral-800 shadow-sm">
        <p className="mb-1 text-xs font-medium text-neutral-400">AI 顾问</p>
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
