export const FEEDBACK_REASONS = [
  "分析不够深入",
  "没理解我的情况",
  "建议太空泛",
  "内容太长",
  "内容太短",
  "结论不合理",
  "其他",
] as const;

export type FeedbackReason = (typeof FEEDBACK_REASONS)[number];

export type FeedbackType = "positive" | "negative";
export type DownloadedImage = "Y" | "N";

export interface FeedbackRequestBody {
  session_id: string;
  decision_topic: string;
  feedback_type: FeedbackType;
  feedback_reason: string;
  report_stay_seconds: number;
  downloaded_image: DownloadedImage;
}
