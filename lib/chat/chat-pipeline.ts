import type { ChatStreamServerEvent } from "@/types/chat-stream";
import type { ChatPipelineEvent, PipelinePhase } from "@/types/chat-stream";
import { readSseStream } from "@/lib/chat/sse-stream";
import { SYSTEM_UNAVAILABLE_MESSAGE } from "@/lib/chat/system-unavailable";

type PipelineListener = (event: ChatPipelineEvent) => void;

interface PipelineEntry {
  phase: PipelinePhase;
  listeners: Set<PipelineListener>;
  abortController: AbortController | null;
  activePromise: Promise<void> | null;
}

const pipelines = new Map<string, PipelineEntry>();

function getEntry(sessionId: string): PipelineEntry {
  let entry = pipelines.get(sessionId);
  if (!entry) {
    entry = {
      phase: "idle",
      listeners: new Set(),
      abortController: null,
      activePromise: null,
    };
    pipelines.set(sessionId, entry);
  }
  return entry;
}

function emit(sessionId: string, event: ChatPipelineEvent): void {
  const entry = getEntry(sessionId);
  for (const listener of entry.listeners) {
    listener(event);
  }
}

function setPhase(sessionId: string, phase: PipelinePhase): void {
  getEntry(sessionId).phase = phase;
}

function mapServerEvent(
  serverEvent: ChatStreamServerEvent
): ChatPipelineEvent | null {
  switch (serverEvent.event) {
    case "report_generating":
      return {
        type: "report_generating",
        conversationId: serverEvent.conversationId,
      };
    case "decision_comparison":
      return {
        type: "decision_comparison",
        decision_comparison: serverEvent.decision_comparison,
        conversationId: serverEvent.conversationId,
      };
    case "result": {
      const payload = serverEvent.payload;
      if (payload.type === "follow_up") {
        return { type: "follow_up", data: payload };
      }
      if (payload.type === "decision") {
        return { type: "decision", data: payload };
      }
      if (payload.type === "report_generating") {
        return { type: "report_generating", conversationId: payload.conversationId };
      }
      return null;
    }
    case "error":
      return { type: "error", message: serverEvent.message };
    default:
      return null;
  }
}

export function getPipelineState(sessionId: string): {
  phase: PipelinePhase;
  isLoading: boolean;
} {
  const entry = getEntry(sessionId);
  return {
    phase: entry.phase,
    isLoading:
      entry.phase === "loading" || entry.phase === "report_generating",
  };
}

export function subscribeChatPipeline(
  sessionId: string,
  listener: PipelineListener
): () => void {
  const entry = getEntry(sessionId);
  entry.listeners.add(listener);
  return () => {
    entry.listeners.delete(listener);
  };
}

export function abortChatPipeline(sessionId: string): void {
  const entry = pipelines.get(sessionId);
  if (!entry) return;

  entry.abortController?.abort();
  entry.abortController = null;
  entry.phase = "idle";
  emit(sessionId, { type: "loading", isLoading: false });
}

export function startChatPipeline(
  sessionId: string,
  fetchStream: (signal: AbortSignal) => Promise<Response>
): Promise<void> {
  const entry = getEntry(sessionId);

  if (entry.phase === "loading" || entry.phase === "report_generating") {
    return entry.activePromise ?? Promise.resolve();
  }

  entry.abortController?.abort();
  const controller = new AbortController();
  entry.abortController = controller;
  setPhase(sessionId, "loading");
  emit(sessionId, { type: "loading", isLoading: true });

  let activePromise: Promise<void> | null = null;

  activePromise = (async () => {
    try {
      const response = await fetchStream(controller.signal);

      if (response.status === 499) {
        setPhase(sessionId, "idle");
        emit(sessionId, { type: "loading", isLoading: false });
        return;
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? "请求失败，请稍后重试"
        );
      }

      if (!response.body) {
        throw new Error("响应体为空");
      }

      for await (const serverEvent of readSseStream(response.body)) {
        if (controller.signal.aborted) return;

        if (serverEvent.event === "report_generating") {
          setPhase(sessionId, "report_generating");
        }

        if (serverEvent.event === "result") {
          setPhase(sessionId, "done");
        }

        const mapped = mapServerEvent(serverEvent);
        if (mapped) {
          emit(sessionId, mapped);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setPhase(sessionId, "idle");
        emit(sessionId, { type: "loading", isLoading: false });
        return;
      }

      setPhase(sessionId, "idle");
      emit(sessionId, {
        type: "error",
        message: SYSTEM_UNAVAILABLE_MESSAGE,
      });
    } finally {
      const current = pipelines.get(sessionId);
      if (current?.abortController === controller) {
        current.abortController = null;
      }
      if (getEntry(sessionId).phase !== "done") {
        emit(sessionId, { type: "loading", isLoading: false });
      }
      if (pipelines.get(sessionId)?.activePromise === activePromise) {
        getEntry(sessionId).activePromise = null;
      }
    }
  })();

  entry.activePromise = activePromise;
  return activePromise;
}
