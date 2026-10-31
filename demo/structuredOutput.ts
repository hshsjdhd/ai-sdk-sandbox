import { generateText, Output, streamText } from "ai";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "http://43.153.35.81:8080/v1",
});
const EmotionSchema = z.object({
  primary: z.enum(["happy", "sad", "angry", "calm", "neutral"]),
  intensity: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  reason: z.string().describe("一句话解释为什么做出这个判断"),
});

const { output } = await generateText({
  model: openai("gpt-6.1-sol"),
  output: Output.array({
    element: z.object({ name: z.string(), age: z.number() }),
  }),
  prompt: "生成 3 个虚构人物。",
});
const { output: output1 } = await generateText({
  model: openai("gpt-6.1-sol"),

  output: Output.choice({
    options: ["happy", "sad", "angry", "neutral"],
  }),
  prompt: "这段话是什么情绪：今天被裁员了。",
});
const { output: output2 } = await generateText({
  model: openai("gpt-6.1-sol"),
  output: Output.json(),
  prompt: "用 JSON 返回今天的待办。",
});

const ReportSchema = z.object({
  title: z.string(),
  summary: z.string(),
  sections: z.array(
    z.object({
      heading: z.string(),
      body: z.string(),
    }),
  ),
  conclusion: z.string(),
});
const result = streamText({
  model: openai("gpt-6.1-sol"),
  instructions:
    "你是一位友好、清晰的中文助手。根据用户的语言回答，善用 Markdown，保持回答简洁实用。",
  output: Output.object({
    schema: ReportSchema,
  }),
  prompt: "请帮我写一份关于人工智能的报告。",
});

for await (const partial of result.textStream) {
  console.clear();
  console.log(JSON.stringify(partial, null, 2));
}
// 最终完整对象：已通过 schema 校验
const final = await result.output;

console.clear();
console.log("最终报告：");
console.log(JSON.stringify(final, null, 2));
// output 的类型自动推导为 EmotionSchema 的 infer 结果
// console.log(output2); // string
