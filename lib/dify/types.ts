export interface DifyWorkflowInputs {
  query: string;
}

export interface DifyWorkflowRunRequest {
  inputs: DifyWorkflowInputs;
  response_mode: "blocking" | "streaming";
  user: string;
}

export interface DifyChatMessageRequest {
  inputs: Record<string, unknown>;
  query: string;
  response_mode: "blocking" | "streaming";
  conversation_id?: string;
  user: string;
}

export interface DifyChatBlockingResponse {
  event: string;
  task_id: string;
  id: string;
  message_id: string;
  conversation_id: string;
  mode: string;
  answer: string;
  metadata?: Record<string, unknown>;
  created_at?: number;
}

export interface DifyChatStreamEvent {
  event: string;
  task_id?: string;
  message_id?: string;
  conversation_id?: string;
  answer?: string;
  message?: string;
  status?: number;
}

export interface DifyWorkflowFinishedData {
  id: string;
  workflow_id: string;
  status: string;
  outputs: Record<string, unknown> | null;
  error: string | null;
  elapsed_time?: number;
  total_tokens?: number;
  total_steps?: number;
  created_at?: number;
  finished_at?: number;
}

export interface DifyWorkflowBlockingResponse {
  task_id: string;
  workflow_run_id: string;
  data: DifyWorkflowFinishedData;
}

export class DifyClientError extends Error {
  constructor(
    message: string,
    public statusCode: number = 502
  ) {
    super(message);
    this.name = "DifyClientError";
  }
}
