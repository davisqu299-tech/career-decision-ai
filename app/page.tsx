"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { HeroInput } from "@/components/home/hero-input";
import { createSession } from "@/lib/chat/session-store";

export default function HomePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (message: string) => {
    setIsSubmitting(true);
    const session = createSession(message);
    router.push(`/chat/${session.id}?initial=1`);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="space-y-3 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            Career Decision AI
          </h1>
          <p className="text-[15px] leading-relaxed text-neutral-500">
            帮助你理清离职困惑，通过结构化分析做出更理性的职业决策
          </p>
        </div>
        <HeroInput onSubmit={handleSubmit} disabled={isSubmitting} />
        <p className="text-center text-xs text-neutral-400">
          你的对话内容仅保存在本地浏览器，不会上传至第三方（API 调用除外）
        </p>
      </div>
    </main>
  );
}
