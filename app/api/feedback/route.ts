import { NextResponse } from "next/server";
import { z } from "zod";
import { createFeedbackRecord } from "@/lib/feishu/feedback";

const feedbackRequestSchema = z
  .object({
    session_id: z.string().min(1),
    decision_topic: z.string(),
    feedback_type: z.enum(["positive", "negative"]),
    feedback_reason: z.string(),
    report_stay_seconds: z.number().int().min(0),
    downloaded_image: z.enum(["Y", "N"]),
  })
  .superRefine((data, ctx) => {
    if (data.feedback_type === "negative" && !data.feedback_reason.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "negative 反馈必须填写 feedback_reason",
        path: ["feedback_reason"],
      });
    }
  });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = feedbackRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "请求参数无效", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = {
      ...parsed.data,
      feedback_reason: parsed.data.feedback_reason.trim(),
    };

    try {
      await createFeedbackRecord(payload);
    } catch (error) {
      console.error("[api/feedback] feishu write failed", error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/feedback]", error);
    return NextResponse.json({ success: true });
  }
}
