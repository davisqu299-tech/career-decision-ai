import { NextResponse } from "next/server";
import { z } from "zod";
import { runDifyWithStream } from "@/lib/dify/client";
import { DifyClientError } from "@/lib/dify/types";
import {
  parseChatAnswer,
  tryDetectReportGeneratingDelta,
  tryDetectReportGeneratingFromPartialAnswer,
  tryParseDecisionComparisonFromPartial,
  tryParseDecisionFromPartial,
  tryParseFollowUpQuestionFromPartial,
} from "@/lib/dify/parser";
import { encodeSseEvent } from "@/lib/chat/sse-stream";
import type { ChatStreamServerEvent } from "@/types/chat-stream";
import type { ChatApiResponse } from "@/types/decision";
import {
  QuotaExceededError,
  QuotaService,
} from "@/lib/quota/quota-service.server";
import { isTurnstileEnabled } from "@/lib/turnstile/config";
import {
  TurnstileVerificationError,
  verifyTurnstileToken,
} from "@/lib/turnstile/verify-token";
import { getBrowserUuidFromRequest } from "@/lib/visitor/resolve-browser-uuid";
import { SYSTEM_UNAVAILABLE_MESSAGE } from "@/lib/chat/system-unavailable";

export const maxDuration = 600;
export const dynamic = "force-dynamic";

async function flushSseChunk(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

const chatRequestSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1),
  browserUuid: z.string().uuid().optional(),
  turnstileToken: z.string().optional(),
  conversationId: z.string().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .optional(),
});

function isInitialChatRequest(data: {
  conversationId?: string;
  history?: { role: "user" | "assistant"; content: string }[];
}): boolean {
  if (data.conversationId) {
    return false;
  }

  const hasAssistantReply = data.history?.some((item) => item.role === "assistant");
  return !hasAssistantReply;
}

function buildQuotaPayload(
  browserUuid: string,
  sessionId: string,
  response: ChatApiResponse
) {
  if (!response.analysis_completed) {
    return undefined;
  }

  const consumeResult = QuotaService.consumeOne({
    browserUuid,
    sessionId,
    event: "analysis_completed",
  });

  return {
    remaining: consumeResult.remaining,
    reset_time: consumeResult.resetTime,
  };
}

function createChatStream(
  handler: (
    write: (event: ChatStreamServerEvent) => Promise<void>
  ) => Promise<void>
): Response {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = async (event: ChatStreamServerEvent) => {
        controller.enqueue(encodeSseEvent(event));
        await flushSseChunk();
      };

      try {
        await handler(write);
      } catch (error) {
        console.error("[api/chat] stream error:", error);
        controller.enqueue(
          encodeSseEvent({ event: "error", message: SYSTEM_UNAVAILABLE_MESSAGE })
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

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

    const browserUuid = await getBrowserUuidFromRequest(parsed.data.browserUuid);
    if (!browserUuid) {
      return NextResponse.json({ error: "无效的访客标识" }, { status: 400 });
    }

    if (isTurnstileEnabled() && isInitialChatRequest(parsed.data)) {
      const token = parsed.data.turnstileToken?.trim();
      if (!token) {
        return NextResponse.json(
          { error: "验证失败，请稍后重试。" },
          { status: 403 }
        );
      }

      try {
        await verifyTurnstileToken(token);
      } catch (error) {
        if (error instanceof TurnstileVerificationError) {
          return NextResponse.json({ error: error.message }, { status: 403 });
        }
        throw error;
      }
    }

    if (isInitialChatRequest(parsed.data)) {
      try {
        QuotaService.assertAllowed(browserUuid);
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
        throw error;
      }
    }

    return createChatStream(async (write) => {
      let reportGeneratingSent = false;
      let prevAnswer = "";
      let lastSeenQuestion: string | undefined;
      let conversationId = parsed.data.conversationId ?? "";

      const emitReportGeneratingIfNeeded = async (answer: string) => {
        if (reportGeneratingSent) return;

        const detected =
          tryDetectReportGeneratingDelta(prevAnswer, answer) ||
          tryDetectReportGeneratingFromPartialAnswer(answer);

        if (!detected) return;

        reportGeneratingSent = true;
        await write({
          event: "report_generating",
          ...(conversationId ? { conversationId } : {}),
        });
      };

      const emitIntermediateComparison = async (answer: string) => {
        const decisionComparison = tryParseDecisionComparisonFromPartial(answer);
        if (decisionComparison) {
          await write({
            event: "decision_comparison",
            decision_comparison: decisionComparison,
            ...(conversationId ? { conversationId } : {}),
          });
        }
      };

      let response: ChatApiResponse;
      let resolvedConversationId = conversationId;

      try {
        const result = await runDifyWithStream({
          sessionId: parsed.data.sessionId,
          browserUuid,
          message: parsed.data.message,
          history: parsed.data.history,
          conversationId: parsed.data.conversationId,
          signal: request.signal,
          onPartialAnswer: async (answer) => {
            const question = tryParseFollowUpQuestionFromPartial(answer);
            if (question) {
              lastSeenQuestion = question;
            }

            await emitReportGeneratingIfNeeded(answer);
            prevAnswer = answer;
            await emitIntermediateComparison(answer);
          },
        });

        response = result.response;
        resolvedConversationId = result.conversationId || conversationId;
      } catch (error) {
        const recoveredDecision = tryParseDecisionFromPartial(prevAnswer);
        const recoveredQuestion =
          lastSeenQuestion ?? tryParseFollowUpQuestionFromPartial(prevAnswer);
        // #region agent log
        fetch("http://127.0.0.1:7255/ingest/63f3ec50-0b6a-42df-9327-acdddaa35630", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "155530",
          },
          body: JSON.stringify({
            sessionId: "155530",
            location: "route.ts:runDifyCatch",
            message: "runDifyWithStream failed",
            data: {
              errorMsg: error instanceof Error ? error.message : String(error),
              recoveredDecisionSet: !!recoveredDecision,
              recoveredQuestionSet: !!recoveredQuestion,
              prevAnswerLen: prevAnswer.length,
              prevHasDecisionField: /"final_choice"\s*:/.test(prevAnswer),
            },
            timestamp: Date.now(),
            hypothesisId: "H3",
          }),
        }).catch(() => {});
        // #endregion
        if (recoveredDecision) {
          response = recoveredDecision;
        } else if (recoveredQuestion) {
          const decisionComparison =
            tryParseDecisionComparisonFromPartial(prevAnswer);
          response = {
            type: "follow_up",
            strategy_id: "default",
            question: recoveredQuestion,
            ...(decisionComparison
              ? { decision_comparison: decisionComparison }
              : {}),
          };
        } else {
          throw error;
        }
      }

      if (response.type !== "decision") {
        const decisionFromPartial = tryParseDecisionFromPartial(prevAnswer);
        if (decisionFromPartial) {
          response = decisionFromPartial;
        }
      }

      const existingDecisionComparison =
        "decision_comparison" in response
          ? response.decision_comparison
          : undefined;

      if (
        lastSeenQuestion &&
        response.type !== "decision" &&
        response.type !== "follow_up" &&
        response.type !== "report_generating"
      ) {
        response = {
          type: "follow_up",
          strategy_id: "default",
          question: lastSeenQuestion,
          ...(existingDecisionComparison
            ? { decision_comparison: existingDecisionComparison }
            : {}),
        };
      }

      conversationId = resolvedConversationId || conversationId;

      if (
        !reportGeneratingSent &&
        response.type === "report_generating"
      ) {
        reportGeneratingSent = true;
        await write({
          event: "report_generating",
          ...(conversationId ? { conversationId } : {}),
        });
      }

      const quotaPayload = buildQuotaPayload(
        browserUuid,
        parsed.data.sessionId,
        response
      );

      await write({
        event: "result",
        payload: {
          ...response,
          conversationId,
          ...(quotaPayload ? { quota: quotaPayload } : {}),
        },
      });
      // #region agent log
      fetch("http://127.0.0.1:7255/ingest/63f3ec50-0b6a-42df-9327-acdddaa35630", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "155530",
        },
        body: JSON.stringify({
          sessionId: "155530",
          location: "route.ts:writeResult",
          message: "writing result event",
          data: {
            responseType: response.type,
            hasQuestion:
              response.type === "follow_up" ? !!response.question : false,
          },
          timestamp: Date.now(),
          hypothesisId: "H5",
          runId: "post-fix",
        }),
      }).catch(() => {});
      // #endregion
    });
  } catch (error) {
    if (error instanceof DifyClientError) {
      if (error.statusCode === 499) {
        return new NextResponse(null, { status: 499 });
      }
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
