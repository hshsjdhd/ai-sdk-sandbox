import { createOpenAI } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  safeValidateUIMessages,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { setTimeout as delay } from "node:timers/promises";

export const app = new Hono().basePath("/api");

app.use(
  "/chat",
  bodyLimit({
    maxSize: 256 * 1024,
    onError: (c) => c.text("消息过长，请缩短后重试。", 413),
  }),
);
app.get("/health", (c) => c.json({ ok: true }));

function demoResponse(messages: UIMessage[], signal: AbortSignal) {
  const question =
    messages
      .findLast((message) => message.role === "user")
      ?.parts.filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("") || "你好";
  const text = `这是一次 **本地演示**，没有调用真实模型。\n\n你刚才说：\n\n> ${question.replace(/\n/g, "\n> ")}\n\n这个 MVP 已经把聊天流程串起来了：\n\n1. **发送消息**：通过 \`useChat\` 请求 Hono 接口。\n2. **流式渲染**：文字逐段到达，Markdown 同步更新。\n3. **随时停止**：点击输入框右侧的停止按钮，保留已收到的内容。\n\n\`\`\`typescript\nconst { messages, sendMessage, stop } = useChat();\n\`\`\`\n\n你可以继续追问，或者切换到「真实模型」体验真实回复。`;
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.write({ type: "start", messageId: crypto.randomUUID() });
      writer.write({ type: "text-start", id: "demo-text" });
      try {
        const characters = Array.from(text);
        for (let offset = 0; offset < characters.length; offset += 3) {
          await delay(35, undefined, { signal });
          writer.write({
            type: "text-delta",
            id: "demo-text",
            delta: characters.slice(offset, offset + 3).join(""),
          });
        }
        writer.write({ type: "text-end", id: "demo-text" });
        writer.write({ type: "finish" });
      } catch (error) {
        if (!signal.aborted) throw error;
      }
    },
    onError: () => "演示输出失败，请重试。",
  });
  return createUIMessageStreamResponse({ stream });
}

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
  const mode = "mode" in body ? body.mode : "live";
  if (mode === "demo") return demoResponse(messages, c.req.raw.signal);
  if (mode !== "live") return c.text("不支持的聊天模式。", 400);
  if (!process.env.OPENAI_API_KEY)
    return c.text(
      "请在 .env.local 配置 OPENAI_API_KEY，或切换到本地演示。",
      503,
    );

  const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || "https://ouyangai.com/v1",
  });
  const result = streamText({
    model: openai.chat(process.env.OPENAI_MODEL || "gpt-6-luna"),
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
