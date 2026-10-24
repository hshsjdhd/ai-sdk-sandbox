import { generateText } from "ai";
import { APICallError, NoSuchModelError } from "ai";
try {
  const { text, usage } = await generateText({
    model: "openai/gpt-6-luna",
    prompt: "用三句话介绍 Vercel AI SDK 的三层架构。",
  });

  console.log("\n---", text);
  console.log("总 token：", usage);
} catch (error) {
  if (APICallError.isInstance(error)) {
    console.log("HTTP 状态：", error.statusCode);
    console.log("响应体：", error.responseBody);
    console.log("是否可重试：", error.isRetryable);
  }
}
