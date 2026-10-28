import { generateText, Output } from "ai";
import { z } from "zod";

const EmotionSchema = z.object({
  primary: z.enum(["happy", "sad", "angry", "calm", "neutral"]),
  intensity: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  reason: z.string().describe("一句话解释为什么做出这个判断"),
});

const { output } = await generateText({
  model: "openai/gpt-6.1-sol",
  output: Output.array({
    element: z.object({ name: z.string(), age: z.number() }),
  }),
  prompt: "生成 3 个虚构人物。",
});
const { output: output1 } = await generateText({
  model: "openai/gpt-6.1-sol",

  output: Output.choice({
    options: ["happy", "sad", "angry", "neutral"],
  }),
  prompt: "这段话是什么情绪：今天被裁员了。",
});
const { output: output2 } = await generateText({
  model: "openai/gpt-6.1-sol",

  output: Output.json(),
  prompt: "用 JSON 返回今天的待办。",
});
// output 的类型自动推导为 EmotionSchema 的 infer 结果
console.log(output2); // string
