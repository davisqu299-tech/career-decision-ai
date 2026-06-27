import { NextResponse } from "next/server";
import { z } from "zod";
import {
  QuotaExceededError,
  QuotaService,
} from "@/lib/quota/quota-service.server";
import { getBrowserUuidFromRequest } from "@/lib/visitor/resolve-browser-uuid";

export const dynamic = "force-dynamic";

const consumeRequestSchema = z.object({  browser_uuid: z.string().uuid().optional(),
  event: z.literal("analysis_completed"),
  session_id: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = consumeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "请求参数无效", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const browserUuid = await getBrowserUuidFromRequest(parsed.data.browser_uuid);
    if (!browserUuid) {
      return NextResponse.json({ error: "无效的访客标识" }, { status: 400 });
    }

    const result = QuotaService.consumeOne({
      browserUuid,
      sessionId: parsed.data.session_id,
      event: parsed.data.event,
    });

    return NextResponse.json({
      remaining: result.remaining,
      reset_time: result.resetTime,
      consumed: result.consumed,
    });
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return NextResponse.json(
        {
          error: error.message,
          reset_time: error.resetTime,
        },
        { status: 403 }
      );
    }

    console.error("[api/quota/consume]", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
