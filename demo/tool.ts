import { streamText, tool } from "ai";
import { z } from "zod";
import { models } from "./models";

const getWeather = tool({
  description: "获取指定城市的天气",
  inputSchema: z.object({
    city: z.string().describe("城市名，中英文都可以"),
    unit: z.enum(["celsius", "fahrenheit"]).default("celsius"),
  }),
  execute: async ({ city, unit }) => {
    return {
      city,
      unit,
      temp: unit === "celsius" ? 22 : 71.6,
      condition: "sunny",
    };
  },
});
const result = streamText({
  model: "openai/gpt-6.1-sol",
  messages: [{ role: "user", content: "帮我查一下北京的天气" }],
  tools: { getWeather },
  toolChoice: "required",
});

for await (const part of result.stream) {
  switch (part.type) {
    case "tool-call":
      console.log("LLM 决定调", part.toolName, part.input);
      break;
    case "tool-result":
      console.log("执行结果", part.output);
      break;
    case "tool-error":
      console.error("工具执行失败", part.toolName, part.error);
      break;
    case "error":
      console.error("流错误", part.error);
      break;
  }
}
