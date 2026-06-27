import {
  ClipboardList,
  Coins,
  Eye,
  Heart,
  Send,
  type LucideIcon,
} from "lucide-react";

export interface InsightIconStyle {
  icon: LucideIcon;
  bgColor: string;
  iconColor: string;
}

const INSIGHT_PATTERNS: { keywords: RegExp; style: InsightIconStyle }[] = [
  {
    keywords: /健康|身体|休息|睡眠|精力|调养|身心/,
    style: { icon: Heart, bgColor: "#dcfce7", iconColor: "#16a34a" },
  },
  {
    keywords: /经济|财务|收入|社保|缓冲|资金|成本|保障|开销/,
    style: { icon: Coins, bgColor: "#ffedd5", iconColor: "#ea580c" },
  },
  {
    keywords: /行动|启动|步骤|计划|执行|落实|准备/,
    style: { icon: ClipboardList, bgColor: "#ccfbf1", iconColor: "#0d9488" },
  },
  {
    keywords: /转型|路径|求职|面试|机会|职业|下一份|重新找/,
    style: { icon: Send, bgColor: "#ede9fe", iconColor: "#7c3aed" },
  },
  {
    keywords: /盲区|现实|注意|风险|认知|局限|低估|高估/,
    style: { icon: Eye, bgColor: "#dbeafe", iconColor: "#2563eb" },
  },
];

const FALLBACK_STYLES: InsightIconStyle[] = [
  { icon: Eye, bgColor: "#dbeafe", iconColor: "#2563eb" },
  { icon: Heart, bgColor: "#dcfce7", iconColor: "#16a34a" },
  { icon: Send, bgColor: "#ede9fe", iconColor: "#7c3aed" },
  { icon: Coins, bgColor: "#ffedd5", iconColor: "#ea580c" },
  { icon: ClipboardList, bgColor: "#ccfbf1", iconColor: "#0d9488" },
];

export function resolveInsightIcon(text: string, index: number): InsightIconStyle {
  for (const pattern of INSIGHT_PATTERNS) {
    if (pattern.keywords.test(text)) {
      return pattern.style;
    }
  }
  return FALLBACK_STYLES[index % FALLBACK_STYLES.length];
}

export function formatReportGeneratedDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
