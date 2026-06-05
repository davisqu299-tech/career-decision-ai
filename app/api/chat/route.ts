import { NextResponse } from "next/server";
import { z } from "zod";
import { runWorkflow } from "@/lib/dify/client";
import { DifyClientError } from "@/lib/dify/types";

const chatRequestSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = chatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "请求参数无效", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await runWorkflow({
      sessionId: parsed.data.sessionId,
      message: parsed.data.message,
      history: parsed.data.history,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DifyClientError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    console.error("[api/chat]", error);
    return NextResponse.json(
      { error: "服务器内部错误" },
      { status: 500 }
    );
  }
}
