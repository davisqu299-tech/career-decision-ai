"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { clearChatDraft, getChatDraft, setChatDraft } from "@/lib/chat/draft-store";

interface ChatInputProps {
  sessionId: string;
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  sessionId,
  onSend,
  disabled = false,
  placeholder = "继续补充你的情况…",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue(getChatDraft(sessionId));
  }, [sessionId]);

  useEffect(() => {
    const flushDraft = () => setChatDraft(sessionId, value);
    window.addEventListener("beforeunload", flushDraft);
    window.addEventListener("pagehide", flushDraft);
    return () => {
      window.removeEventListener("beforeunload", flushDraft);
      window.removeEventListener("pagehide", flushDraft);
    };
  }, [sessionId, value]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = (text: string) => {
    setValue(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setChatDraft(sessionId, text), 300);
  };

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    clearChatDraft(sessionId);
    onSend(trimmed);
    setValue("");
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-neutral-200 bg-white px-4 py-4">
      <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-2 shadow-sm">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={2}
          className="min-h-[44px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="shrink-0 rounded-lg"
          aria-label="发送"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      </div>
      <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-neutral-400">
        Enter 发送 · Shift+Enter 换行
      </p>
    </div>
  );
}
