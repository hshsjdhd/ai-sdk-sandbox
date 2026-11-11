import { ChatOpenAI } from "@langchain/openai";

export const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL ?? "gpt-3.5-turbo",
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
  },
});
