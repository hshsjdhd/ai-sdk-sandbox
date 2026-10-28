import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  createUIMessageStream,
  safeValidateUIMessages,
  streamText,
  toUIMessageStream,
} from "ai";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "http://43.153.35.81:8080/v1",
});
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
  if (!process.env.OPENAI_API_KEY?.trim())
    return c.text(
      "请在项目根目录的环境文件中配置 OPENAI_API_KEY，并重启服务。",
      503,
    );
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // 先发一个业务数据：当前情绪
      writer.write({
        type: "data-emotion",
        data: { primary: "calm", intensity: 0.6 },
      });

      // 再调 LLM，把流合并进来
      const result = streamText({
        model: openai("gpt-6.1-sol"),
        instructions:
          "你是一位友好、清晰的中文助手。根据用户的语言回答，善用 Markdown，保持回答简洁实用。",
        messages: await convertToModelMessages(messages),
        abortSignal: c.req.raw.signal,
        providerOptions: {
          openai: {
            reasoningEffort: "medium",
            reasoningSummary: "auto",
          },
        },
        // 每个 step 结束（一次 LLM 调用完成）
        onStepFinish: async (step) => {
          console.log("[step]", step.finishReason, step.usage);
        },
        // 用户中止
        onAbort: async ({ steps }) => {
          console.log("用户中止，已完成", steps.length, "步");
        },
        onError: (event) => {
          console.error("[chat] Model stream failed:");
          console.dir(event, { depth: 6 });
        },
      });
      writer.merge(
        toUIMessageStream({
          stream: result.stream,
          originalMessages: messages,
          onEnd: ({ outcome }) => {
            if (outcome.status !== "completed") return;

            writer.write({
              type: "data-memories-used",
              data: { count: 3 },
            });
          },
          onError: (error) => {
            console.error("[chat] UI message stream failed:");
            console.dir(error, { depth: 6 });
            return "模型请求失败，请检查 API Key、接口地址和模型名称后重试。";
          },
        }),
      );
      // 最后再发一个业务数据：本次用到的记忆条数
      // writer.write({
      //   type: "data-memories-used",
      //   data: { count: 3 },
      // });
    },
  });

  return createUIMessageStreamResponse({
    stream,
  });
});

app.onError(
  () => new Response("服务暂时不可用，请稍后重试。", { status: 500 }),
);
