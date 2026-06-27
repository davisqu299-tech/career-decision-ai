"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getHomeDraft, setHomeDraft } from "@/lib/chat/draft-store";
import { useInvisibleTurnstile } from "@/lib/turnstile/turnstile-service";

interface HeroInputProps {
  onSubmit: (message: string, turnstileToken?: string) => void | Promise<void>;
  disabled?: boolean;
}

export function HeroInput({ onSubmit, disabled = false }: HeroInputProps) {
  const [value, setValue] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { enabled, isReady, execute, reset, containerRef } =
    useInvisibleTurnstile();

  useEffect(() => {
    setValue(getHomeDraft());
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = (text: string) => {
    setValue(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setHomeDraft(text), 300);
  };

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (!trimmed || disabled || isVerifying) return;

    if (enabled && !isReady) {
      toast.error("验证失败，请稍后重试。");
      return;
    }

    setIsVerifying(true);
    try {
      const turnstileToken = enabled ? await execute() : undefined;
      await onSubmit(trimmed, turnstileToken || undefined);
    } catch {
      reset();
      toast.error("验证失败，请稍后重试。");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const submitDisabled =
    disabled || isVerifying || !value.trim() || (enabled && !isReady);

  return (
    <div className="w-full rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="描述你的工作情况以及当前的离职困惑"
        disabled={disabled || isVerifying}
        rows={4}
        className="min-h-[140px] resize-none border-0 bg-white px-1 py-1 text-[15px] leading-relaxed shadow-none focus-visible:ring-0 md:min-h-[148px] md:text-base"
      />
      <div className="mt-4 flex items-end justify-end gap-3">
        <div ref={containerRef} className="hidden" aria-hidden="true" />
        <Button
          onClick={() => void handleSubmit()}
          disabled={submitDisabled}
          size="icon"
          aria-label="开始分析"
          className="h-14 w-14 rounded-full"
        >
          <ArrowUp className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
