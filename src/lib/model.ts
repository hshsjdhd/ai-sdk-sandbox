import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || "http://43.153.35.81:8080/v1",
});

export default openai(process.env.OPENAI_REPORT_MODEL || "gpt-6.1-sol");
