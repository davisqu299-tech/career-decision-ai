import { forwardRef, type ReactNode } from "react";
import {
  Calendar,
  HelpCircle,
  Lightbulb,
  Star,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { DecisionComparison } from "@/types/decision-comparison";
import type { DecisionSummary } from "@/types/decision";
import {
  formatReportGeneratedDate,
  resolveInsightIcon,
} from "@/lib/report/insight-icon";
import { stripFinalChoiceEmojiForExport } from "@/lib/report/share-card-text";
import { splitCoreLogicParagraphs } from "@/lib/report/format-core-logic";

interface ReportShareCardProps {
  comparison?: DecisionComparison | null;
  summary: DecisionSummary;
  generatedAt: Date;
  logoSrc?: string;
}

interface ShareSectionProps {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  title: string;
  titleColor: string;
  borderColor?: string;
  bgColor?: string;
  children: ReactNode;
}

function ShareSection({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  titleColor,
  borderColor = "#e2e8f0",
  bgColor = "#ffffff",
  children,
}: ShareSectionProps) {
  return (
    <section
      className="rounded-2xl border p-6"
      style={{ borderColor, backgroundColor: bgColor }}
    >
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: iconBg }}
        >
          <Icon className="h-5 w-5" style={{ color: iconColor }} strokeWidth={2.2} />
        </div>
        <h3 className="text-lg font-bold" style={{ color: titleColor }}>
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

function InsightItemIcon({
  icon: Icon,
  bgColor,
  iconColor,
}: {
  icon: LucideIcon;
  bgColor: string;
  iconColor: string;
}) {
  return (
    <div
      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: bgColor }}
    >
      <Icon className="h-4 w-4" style={{ color: iconColor }} strokeWidth={2.2} />
    </div>
  );
}

export const ReportShareCard = forwardRef<HTMLDivElement, ReportShareCardProps>(
  function ReportShareCard(
    { comparison, summary, generatedAt, logoSrc = "/lychee-logo.png" },
    ref
  ) {
    const insightItems = summary.insights_and_actions
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^\d+\.\s*/, ""));

    return (
      <div
        ref={ref}
        className="box-border font-sans text-neutral-900"
        style={{ width: 800, backgroundColor: "#f1f5f9", padding: 32 }}
      >
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-[28px] font-bold leading-tight text-[#1e3a8a]">
              离职决策分析报告
            </h1>
            <p className="mt-2 text-[14px] leading-relaxed text-neutral-500">
              基于你的现状和职业诉求，为你提供客观分析与行动建议
            </p>
          </div>
          <div
            className="flex shrink-0 items-center gap-2 rounded-full px-4 py-2"
            style={{ backgroundColor: "#dbeafe" }}
          >
            <Calendar className="h-4 w-4 text-[#2563eb]" strokeWidth={2.2} />
            <span className="whitespace-nowrap text-[13px] font-medium text-[#1d4ed8]">
              报告生成时间：{formatReportGeneratedDate(generatedAt)}
            </span>
          </div>
        </div>

        <div className="space-y-5">
          {/* Decision topic */}
          <ShareSection
            icon={Target}
            iconBg="#dbeafe"
            iconColor="#2563eb"
            title="决策主题"
            titleColor="#1d4ed8"
            borderColor="#bfdbfe"
            bgColor="#eff6ff"
          >
            <p className="text-[15px] leading-relaxed text-neutral-700">
              {comparison?.decisionTopic?.trim() || "待生成"}
            </p>

            {(comparison?.optionOne || comparison?.optionTwo) && (
              <div
                className="mt-5 flex rounded-xl p-4"
                style={{ backgroundColor: "#dbeafe" }}
              >
                <div className="min-w-0 flex-1 pr-6">
                  <p className="text-[14px] font-semibold text-[#1e40af]">方案一</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-neutral-700">
                    {comparison?.optionOne?.trim() || "待生成"}
                  </p>
                </div>
                <div className="flex w-12 shrink-0 items-center justify-center self-center">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: "#3b82f6" }}
                  >
                    VS
                  </div>
                </div>
                <div className="min-w-0 flex-1 pl-6">
                  <p className="text-[14px] font-semibold text-[#1e40af]">方案二</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-neutral-700">
                    {comparison?.optionTwo?.trim() || "待生成"}
                  </p>
                </div>
              </div>
            )}
          </ShareSection>

          {/* Final recommendation — star left; title + content side by side */}
          <section
            className="rounded-2xl border p-6"
            style={{ borderColor: "#fcd34d", backgroundColor: "#fffbeb" }}
          >
            <div className="flex items-start gap-5">
              <div
                className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: "#fef3c7" }}
              >
                <Star
                  className="h-10 w-10"
                  style={{ color: "#d97706" }}
                  strokeWidth={2.2}
                  fill="#d97706"
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2 pt-0.5">
                <h3
                  className="text-lg font-bold leading-snug"
                  style={{ color: "#b45309" }}
                >
                  最终建议
                </h3>
                <p className="text-[20px] font-bold leading-snug text-neutral-900">
                  {stripFinalChoiceEmojiForExport(summary.final_choice)}
                </p>
              </div>
            </div>
          </section>

          {/* Core reasoning */}
          <ShareSection
            icon={Lightbulb}
            iconBg="#ede9fe"
            iconColor="#7c3aed"
            title="核心推荐原因"
            titleColor="#6d28d9"
            borderColor="#ddd6fe"
            bgColor="#faf5ff"
          >
            <div className="space-y-3">
              {splitCoreLogicParagraphs(summary.core_logic).map(
                (paragraph, index) => (
                  <p
                    key={index}
                    className="text-[15px] leading-relaxed text-neutral-700"
                  >
                    {paragraph}
                  </p>
                )
              )}
            </div>
          </ShareSection>

          {/* Insights */}
          <ShareSection
            icon={Users}
            iconBg="#dbeafe"
            iconColor="#2563eb"
            title="洞察与行动建议"
            titleColor="#1d4ed8"
            borderColor="#93c5fd"
            bgColor="#ffffff"
          >
            <ul className="space-y-4">
              {insightItems.map((item, index) => {
                const { icon, bgColor, iconColor } = resolveInsightIcon(
                  item,
                  index
                );
                return (
                  <li key={index} className="flex gap-3">
                    <InsightItemIcon
                      icon={icon}
                      bgColor={bgColor}
                      iconColor={iconColor}
                    />
                    <p className="flex-1 text-[15px] leading-relaxed text-neutral-700">
                      {item}
                    </p>
                  </li>
                );
              })}
            </ul>
          </ShareSection>

          {/* Core truth */}
          <ShareSection
            icon={HelpCircle}
            iconBg="#dbeafe"
            iconColor="#2563eb"
            title="问题本质"
            titleColor="#1d4ed8"
            borderColor="#bfdbfe"
            bgColor="#eff6ff"
          >
            <p className="text-[16px] font-semibold leading-relaxed text-[#1e40af]">
              「{summary.core_truth}」
            </p>
          </ShareSection>
        </div>

        {/* Footer */}
        <div className="mt-8 flex items-center justify-center gap-2 pt-4">
          <span className="text-[13px] text-neutral-500">报告由</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt=""
            className="h-7 w-auto object-contain"
            crossOrigin="anonymous"
          />
          <span className="text-[13px] text-neutral-500">
            荔枝AI 生成，仅供参考
          </span>
        </div>
      </div>
    );
  }
);
