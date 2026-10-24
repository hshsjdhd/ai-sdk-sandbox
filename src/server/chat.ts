import { createOpenAI } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  safeValidateUIMessages,
  streamText,
  toUIMessageStream,
} from "ai";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";

export const app = new Hono().basePath("/api");

app.use(
  "/chat",
  bodyLimit({
    maxSize: 256 * 1024,
    onError: (c) => c.text("消息过长，请缩短后重试。", 413),
  }),
);
app.get("/health", (c) => c.json({ ok: true }));

app.post("/chat", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.text("请求格式无效。", 400);
  }

  if (!body || typeof body !== "object" || !("messages" in body)) {
    return c.text("缺少聊天消息。", 400);
  }
  const validation = await safeValidateUIMessages({ messages: body.messages });
  if (!validation.success || !validation.data.length)
    return c.text("聊天消息格式无效。", 400);
  const messages = validation.data;
  if (
    messages.some(
      (message) =>
        !["user", "assistant"].includes(message.role) ||
        message.parts.some(
          (part) => !["text", "reasoning", "step-start"].includes(part.type),
        ),
    )
  ) {
    return c.text("当前仅支持文字对话。", 400);
  }
  if (!process.env.OPENAI_API_KEY)
    return c.text("请在 .env.local 配置 OPENAI_API_KEY。", 503);

  const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || "https://ouyangai.com/v1",
  });
  const result = streamText({
    model: "openai/gpt-6-luna",
    instructions:
      "你是一位友好、清晰的中文助手。根据用户的语言回答，善用 Markdown，保持回答简洁实用。",
    messages: await convertToModelMessages(messages),
    abortSignal: c.req.raw.signal,
    maxOutputTokens: 4096,
    onError: () =>
      console.error(
        "[chat] Model stream failed. Check provider configuration and availability.",
      ),
  });
  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      onError: () => "模型请求失败，请检查 API Key、接口地址和模型名称后重试。",
    }),
  });
});

app.onError(
  () => new Response("服务暂时不可用，请稍后重试。", { status: 500 }),
);
