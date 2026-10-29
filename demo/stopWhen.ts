import { streamText, stepCountIs, tool, hasToolCall } from "ai";
import { z } from "zod";

const emotionSchema = z.enum(["happy", "sad", "calm", "anxious"]);

const classifyEmotion = tool({
  description: "模拟情绪分类，固定返回平静情绪，不代表真实分析结果",
  inputSchema: z.object({
    text: z.string().describe("用户描述情绪的原文"),
  }),
  execute: async ({ text }) => ({
    text,
    emotion: "calm" as const,
    simulated: true,
  }),
});

const searchMusic = tool({
  description: "根据情绪从本地模拟曲库推荐一首歌",
  inputSchema: z.object({
    emotion: emotionSchema.describe("情绪分类工具返回的情绪"),
  }),
  execute: async ({ emotion }) => {
    const music = {
      happy: { title: "稻香", artist: "周杰伦" },
      sad: { title: "平凡之路", artist: "朴树" },
      calm: { title: "晴天", artist: "周杰伦" },
      anxious: { title: "夜空中最亮的星", artist: "逃跑计划" },
    };
    return { emotion, ...music[emotion], simulated: true };
  },
});

const logEmotion = tool({
  description: "模拟记录今天的情绪，仅返回记录内容，不实际保存数据",
  inputSchema: z.object({
    emotion: emotionSchema.describe("情绪分类工具返回的情绪"),
    note: z.string().describe("情绪记录备注"),
  }),
  execute: async ({ emotion, note }) => ({
    emotion,
    note,
    recordedAt: new Date().toISOString(),
    simulated: true,
  }),
});

const result = streamText({
  model: "openai/gpt-6.1-sol",
  messages: [
    {
      role: "user",
      content: "帮我记录今天的情绪并推荐一首适合听的歌,我今天很开心",
    },
  ],
  tools: {
    classifyEmotion,
    searchMusic,
    logEmotion,
  },
  stopWhen: [stepCountIs(5)],
  prepareStep: async ({ stepNumber, steps, messages }) => {
    console.log(stepNumber, steps, messages);
    // 第一步：强制用结构化工具分类情绪
    if (stepNumber === 0) {
      return {
        toolChoice: { type: "tool", toolName: "classifyEmotion" },
      };
    }
    if (stepNumber === 2) {
      return {
        messages: [
          ...messages,
          { role: "system", content: "请基于前两步的结果生成最终回复。" },
        ],
      };
    }
    // 最后一步：禁用所有工具，强制生成文本
    if (stepNumber === 4) {
      return { toolChoice: "none" };
    }

    // 其他 step 保持默认
    return undefined;
  },
});

for await (const part of result.stream) {
  if (part.type === "text-delta") process.stdout.write(part.text);
  if (part.type === "tool-call") console.log("\n[调用]", part.toolName);
  if (part.type === "tool-result") console.log("\n[结果]", part.output);
  if (part.type === "finish-step") console.log("\n[step 完成]");
  if (part.type === "finish") console.log("\n[全部完成]", part.finishReason);
}
// 拿到所有 step
// const steps = await result.steps;
// for (const [i, step] of steps.entries()) {
//   console.log(`Step ${i + 1}:`);
//   console.log("  - text:", step.text);
//   console.log("  - toolCalls:", step.toolCalls);
//   console.log("  - toolResults:", step.toolResults);
//   console.log("  - usage:", step.usage);
//   console.log("  - finishReason:", step.finishReason);
// }
