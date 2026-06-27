"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Message } from "@/types/chat";
import { getLastUserMessageId } from "@/lib/chat/session-store";
import { MessageBubble } from "@/components/chat/message-bubble";

interface ChatAreaProps {
  messages: Message[];
  editingMessageId?: string | null;
  onStartEdit?: (messageId: string) => void;
  onConfirmEdit?: (messageId: string, newContent: string) => void;
  onCancelEdit?: () => void;
}

export function ChatArea({
  messages,
  editingMessageId = null,
  onStartEdit,
  onConfirmEdit,
  onCancelEdit,
}: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastUserMessageId = useMemo(
    () => getLastUserMessageId(messages),
    [messages]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, editingMessageId]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        {messages.length === 0 && (
          <p className="text-center text-sm text-neutral-400">
            开始描述你的离职困惑，AI 将为你分析
          </p>
        )}
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            showEdit={
              message.id === lastUserMessageId && editingMessageId !== message.id
            }
            isEditing={editingMessageId === message.id}
            onStartEdit={() => onStartEdit?.(message.id)}
            onConfirmEdit={(newContent) =>
              onConfirmEdit?.(message.id, newContent)
            }
            onCancelEdit={onCancelEdit}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
