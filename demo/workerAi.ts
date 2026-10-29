import { createWorkersAI } from "workers-ai-provider";
import { generateText } from "ai";

// 在 Workers Handler 里
const workersai = createWorkersAI({
  accountId: "df624c0faaf5494802d60d57d76ff591",
  apiKey: process.env.AI!,
});

const result = await generateText({
  model: workersai("@cf/zai-org/glm-4.7-flash"),
  prompt: "wrangler.jsonc 文件是什么作用 是么时候会用到",
});

console.log(result.text);
