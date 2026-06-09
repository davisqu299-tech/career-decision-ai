"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getHomeDraft, setHomeDraft } from "@/lib/chat/draft-store";

interface HeroInputProps {
  onSubmit: (message: string) => void;
  disabled?: boolean;
}

export function HeroInput({ onSubmit, disabled = false }: HeroInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="描述你的工作情况以及当前的离职困惑"
        disabled={disabled}
        rows={4}
        className="min-h-[120px] resize-none border-0 text-[15px] leading-relaxed shadow-none focus-visible:ring-0"
      />
      <div className="mt-2 flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className="gap-2 rounded-lg"
        >
          开始分析
          <ArrowUp className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
