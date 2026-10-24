import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://ouyangai.com/v1",
});

import { generateText, streamText } from "ai";
import { readFile } from "fs/promises";

// 推理模型（o1 / o3 / o4-mini）
const result = streamText({
  model: "openai/gpt-6-luna",

  allowSystemInMessages: true,
  messages: [
    {
      role: "system",
      content:
        "你是一名诙谐幽默的教师, 语言生动 使人能很容易理解你的语言 都会给出生动形象的例子",
    },
    {
      role: "user",
      content: [
        { type: "text", text: "这个pdf有什么内容" },
        {
          type: "file",
          mediaType: "application/pdf",
          data: await readFile("./过程检验单.pdf"),
        },
      ],
    },
  ],

  providerOptions: {
    openai: {
      reasoningEffort: "medium", // low | medium | high
    },
  },
});

for await (const part of result.stream) {
  switch (part.type) {
    case "text-delta":
      process.stdout.write(part.text);
      break;
    case "reasoning-delta":
      console.log("[思考]", part.text);
      break;
    case "tool-call":
      console.log("[工具调用]", part.toolName, part.input);
      break;
    case "tool-result":
      console.log("[工具结果]", part.output);
      break;
    case "finish":
      console.log("[完成]", part.finishReason, part.totalUsage);
      break;
    case "error":
      console.error("[错误]", part.error);
      break;
    default:
      console.log(part);
  }
}
