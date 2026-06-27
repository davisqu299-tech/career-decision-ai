import { NextResponse } from "next/server";
import { QuotaService } from "@/lib/quota/quota-service.server";
import { getBrowserUuidFromRequest } from "@/lib/visitor/resolve-browser-uuid";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {  try {
    const { searchParams } = new URL(request.url);
    const browserUuid = await getBrowserUuidFromRequest(
      searchParams.get("browser_uuid") ?? undefined
    );

    if (!browserUuid) {
      return NextResponse.json({ error: "无效的访客标识" }, { status: 400 });
    }

    const status = QuotaService.getStatus(browserUuid);

    return NextResponse.json({
      remaining: status.remaining,
      allowed: status.allowed,
      reset_time: status.resetTime,
      first_visit_time: status.firstVisitTime,
      last_analysis_time: status.lastAnalysisTime,
    });
  } catch (error) {
    console.error("[api/quota]", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
