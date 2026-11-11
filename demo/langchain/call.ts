import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

const response = await model.invoke([
  {
    role: "system",
    content: "你是一名面向前端开发者的助手，回答要清楚、简短。",
  },
  {
    role: "user",
    content: "请用两句话确认 LangChain 与 DeepSeek 的关联以及区别。",
  },
]);

console.log("invoke result:");
console.log(response.text);
console.log(response);
