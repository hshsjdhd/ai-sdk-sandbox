import { ChatOpenAI } from "@langchain/openai";
import { createAgent } from "langchain";
import type { AgentStreamInput } from "./types";

const model = new ChatOpenAI({
  apiKey: "sk-0180068011f478ece3b3e7b1b8f2f248f03083a9d8184b18876db0dc30aa8eff",
  model: "gpt-6.1-sol",
  temperature: 0.2,
  maxTokens: 2000,
  useResponsesApi: true,
  timeout: 30_000,
  maxRetries: 2,
  zdrEnabled: true,
  configuration: {
    baseURL:
      typeof window === "undefined"
        ? "https://smellytwo.site/v1"
        : new URL("/model-proxy", window.location.origin).href,
  },
});
const SYSTEM_PROMPT = [
  "你是一名温和、简洁的前端开发助手。",
  "回答时先给出结论，再补充必要的解释；",
  "如果问题适合使用代码，请给出短小的 TypeScript 示例。",
].join("\n");
const agent = createAgent({
  model: model,
  systemPrompt: SYSTEM_PROMPT,
  tools: [],
});
// 创建 Agent 流，用于流式输出回答
export async function createAgentStream({
  messages,
  abortSignal,
}: AgentStreamInput) {
  const agentMessages = messages.map(({ role, content }) => ({
    role,
    content,
  }));

  const startedAt = performance.now();
  console.log("[agent] 开始 agent.stream");
  const stream = await agent.stream(
    { messages: agentMessages },
    {
      signal: abortSignal,
      streamMode: "messages",
    },
  );

  console.log(
    "[agent] agent.stream 返回",
    Math.round(performance.now() - startedAt),
    "ms",
  );

  return {
    model: model.model,
    stream,
  };
}
