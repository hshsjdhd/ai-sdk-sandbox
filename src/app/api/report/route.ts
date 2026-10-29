import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText } from "ai";
import { ReportRequestSchema, ReportSchema } from "../../../lib/report-schema";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: unknown;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).length > 16 * 1024) {
      return new Response("请求过大，请缩短后重试。", { status: 413 });
    }
    body = JSON.parse(text);
  } catch {
    return new Response("请求格式无效。", { status: 400 });
  }

  const validation = ReportRequestSchema.safeParse(body);
  if (!validation.success) {
    return new Response("请输入 1 至 2000 字的报告要求。", { status: 400 });
  }
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return new Response("请配置 OPENAI_API_KEY，并重启服务。", { status: 503 });
  }

  const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || "http://43.153.35.81:8080/v1",
  });
  const result = streamText({
    model: openai(process.env.OPENAI_REPORT_MODEL || "gpt-6.1-sol"),
    instructions: `你是一位清晰、严谨的中文报告助手。根据用户要求生成约 300 字的报告，包含标题、摘要、章节和结论。不要编造实时数据或来源。各字段使用纯文本。严格按以下顺序输出 JSON 属性：
title → summary → sections → conclusion。
先完成标题，再完成摘要，然后逐章输出正文，最后输出结论。
不要先输出 conclusion。`,
    output: Output.object({ schema: ReportSchema }),
    prompt: validation.data.prompt,
    abortSignal: request.signal,
    onError: ({ error }) => console.error("[report] Generation failed:", error),
  });

  return result.toTextStreamResponse();
}
