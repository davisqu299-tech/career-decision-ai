import type { Message } from "@/types/chat";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-xl px-4 py-3 text-[15px] leading-relaxed",
          isUser
            ? "bg-neutral-100 text-neutral-900"
            : "border border-neutral-200 bg-white text-neutral-800 shadow-sm"
        )}
      >
        {!isUser && (
          <p className="mb-1 text-xs font-medium text-neutral-400">AI 顾问</p>
        )}
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
