export interface ArticleChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
}

export interface ArticleChatChunk {
  content: string;
  model?: string;
}

export interface AgentStreamInput {
  messages: readonly ArticleChatMessage[];
  abortSignal: AbortSignal;
}
