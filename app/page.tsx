"use client";



import { useRouter } from "next/navigation";

import { useState } from "react";

import { toast } from "sonner";

import { HeroInput } from "@/components/home/hero-input";

import { clearHomeDraft } from "@/lib/chat/draft-store";

import { createSession } from "@/lib/chat/session-store";

import { AnalysisQuotaService } from "@/lib/quota/analysis-quota-service";
import { setPendingTurnstileToken } from "@/lib/turnstile/turnstile-service";
import { VisitorService } from "@/lib/visitor/visitor-service";



const HERO_TITLES = [

  "每一个重要选择，都值得认真思考",

  "一起把这件事想清楚",

  "下一步，你想怎么走？",

] as const;



function pickRandomHeroTitle(): string {

  return HERO_TITLES[Math.floor(Math.random() * HERO_TITLES.length)];

}



export default function HomePage() {

  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [heroTitle] = useState(() => pickRandomHeroTitle());



  const handleSubmit = async (message: string, turnstileToken?: string) => {

    setIsSubmitting(true);

    try {
      VisitorService.initialize();
      const quota = await AnalysisQuotaService.fetchQuota();



      if (!quota.allowed) {

        const { title, detail } = AnalysisQuotaService.getBlockedMessages(

          quota.reset_time

        );

        toast.error(title);

        toast(detail);

        setIsSubmitting(false);

        return;

      }



      clearHomeDraft();

      const session = createSession(message);

      if (turnstileToken) {

        setPendingTurnstileToken(session.id, turnstileToken);

      }

      await router.push(`/chat/${session.id}?initial=1`);

    } catch (error) {

      setIsSubmitting(false);

      toast.error(

        error instanceof Error ? error.message : "无法进入对话页，请重试"

      );

    }

  };



  return (

    <main className="flex min-h-screen flex-col bg-neutral-50 px-6">

      <div className="mx-auto flex w-full max-w-[880px] flex-col items-center pt-[26vh] pb-16">

        <div className="mb-12 flex w-full flex-col items-center space-y-5 text-center">

          <h1

            suppressHydrationWarning

            className="text-4xl font-semibold tracking-tight text-neutral-900 md:text-5xl md:leading-tight"

          >

            {heroTitle}

          </h1>

          <p className="max-w-[680px] text-pretty text-[15px] leading-relaxed text-neutral-500 md:text-base">

            帮你理清离职困惑，通过结构化分析为您提供多维度职业分析和个性化建议

          </p>

        </div>



        <div className="flex w-full flex-col items-center">

          <div className="w-full max-w-[820px]">
            <HeroInput onSubmit={handleSubmit} disabled={isSubmitting} />
          </div>



          <p className="mt-8 text-center text-sm text-neutral-500">

            💡 输入越详细的背景信息，AI 的分析会更加准确和全面。

          </p>

        </div>



        <p className="mt-12 text-center text-xs text-neutral-400">

          你的对话内容仅保存在本地浏览器，不会上传至第三方（API 调用除外）

        </p>

      </div>

    </main>

  );

}

