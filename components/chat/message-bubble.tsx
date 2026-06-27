"use client";

import { useEffect, useState } from "react";
import { Copy, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { Message } from "@/types/chat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface MessageBubbleProps {
  message: Message;
  showEdit?: boolean;
  isEditing?: boolean;
  onStartEdit?: () => void;
  onConfirmEdit?: (newContent: string) => void;
  onCancelEdit?: () => void;
}

export function MessageBubble({
  message,
  showEdit = false,
  isEditing = false,
  onStartEdit,
  onConfirmEdit,
  onCancelEdit,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [draft, setDraft] = useState(message.content);

  useEffect(() => {
    if (isEditing) {
      setDraft(message.content);
    }
  }, [isEditing, message.content]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success("已复制到剪贴板");
    } catch {
      toast.error("复制失败，请手动选择文字复制");
    }
  };

  const handleConfirm = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      toast.error("消息内容不能为空");
      return;
    }
    onConfirmEdit?.(trimmed);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancelEdit?.();
    }
  };

  if (isUser) {
    return (
      <div className="flex w-full justify-end">
        <div className="flex max-w-[85%] flex-col items-end gap-1">
          {isEditing ? (
            <div className="w-full min-w-[240px] space-y-2 rounded-xl bg-neutral-100 px-4 py-3">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[80px] resize-none border-neutral-200 bg-white text-lg"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCancelEdit}
                  className="h-8 text-neutral-600"
                >
                  取消
                </Button>
                <Button size="sm" onClick={handleConfirm} className="h-8">
                  确认
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-xl bg-neutral-100 px-4 py-3 text-lg leading-relaxed text-neutral-900">
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopy}
                  aria-label="复制"
                  className="h-9 w-9 text-neutral-400 hover:text-neutral-600"
                >
                  <Copy className="h-5 w-5" />
                </Button>
                {showEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onStartEdit}
                    aria-label="修改"
                    className="h-9 w-9 text-neutral-400 hover:text-neutral-600"
                  >
                    <Pencil className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full justify-start">
      <div className="max-w-[85%] rounded-xl border border-neutral-200 bg-white px-4 py-3 text-lg leading-relaxed text-neutral-800 shadow-sm">
        <p className="mb-1 text-sm font-medium text-neutral-400">小荔</p>
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
