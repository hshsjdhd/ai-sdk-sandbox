import { ChatOpenAI } from "@langchain/openai";
import { createAgent } from "langchain";

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL,
  temperature: 0.2,
  maxTokens: 2000,
  useResponsesApi: false,
  timeout: 30_000,
  maxRetries: 2,
  zdrEnabled: true,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  modelKwargs: {
    reasoningEffort: "high",
  },
});
const agent = createAgent({
  model: model,
  systemPrompt: "你是一名面向前端开发者的助手，回答要清楚、简短。",
  tools: [],
});
const stream = await agent.stream(
  {
    messages: [
      {
        role: "user",
        content: "请用两句话确认 LangChain 与 DeepSeek 的关联以及区别。",
      },
    ],
  },
  { streamMode: "messages" },
);

process.stdout.write("agent stream result:\n");

for await (const [messageChunk, meta] of stream) {
  if (messageChunk.content) {
    process.stdout.write(messageChunk.text);
  }
}

process.stdout.write("\n");
