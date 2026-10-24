import { customProvider } from "ai";

// 默认走 OpenAI，如果你没 key，把下面一行改成你要的 Provider 即可
const defaultProvider = {
  chat: 'openai("gpt-6-luna")',
  chatPro: 'openai("gpt-4o")',
  reasoning: 'openai("o3-mini")',
  structured: 'openai("gpt-4o-mini")',
};

// Anthropic 备份线
const anthropicProvider = {
  chat: 'anthropic("claude-sonnet-4-5")',
  chatPro: 'anthropic("claude-opus-4-6")',
  reasoning: 'anthropic("claude-opus-4-6")',
  structured: 'anthropic("claude-sonnet-4-5")',
};

export const models = defaultProvider;
// export const models = anthropicProvider

// 专供 Workers 环境用（[AI SDK × Hono](/15-ai-sdk-with-hono) 会用到）
// export function getWorkersAIModels(binding: Ai) {
//   const { createWorkersAI } = require("workers-ai-provider");
//   const workersai = createWorkersAI({ binding });
//   return {
//     chat: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
//     chatPro: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
//     reasoning: workersai("@cf/deepseek-ai/deepseek-r1-distill-qwen-32b"),
//     structured: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
//   };
// }
