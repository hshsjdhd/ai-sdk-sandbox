import { ChatOpenAI, type ChatOpenAIFields } from "@langchain/openai";
import { createMiddleware, type ModelRequest } from "langchain";

export type BuildModelOptions = Partial<ChatOpenAIFields>;

export function buildModel(
  request: ModelRequest,
  modelName?: string,
  options?: BuildModelOptions,
): ChatOpenAI {
  const baseModel = request.model;

  if (!(baseModel instanceof ChatOpenAI)) {
    throw new Error("buildModel 仅支持基于 ChatOpenAI 实例派生模型");
  }

  const baseFields = baseModel.lc_kwargs as ChatOpenAIFields;
  const mergedConfiguration =
    baseFields.configuration || options?.configuration
      ? {
          ...baseFields.configuration,
          ...options?.configuration,
        }
      : undefined;

  const mergedModelKwargs =
    baseFields.modelKwargs || options?.modelKwargs
      ? {
          ...baseFields.modelKwargs,
          ...options?.modelKwargs,
        }
      : undefined;

  return new ChatOpenAI({
    ...baseFields,
    ...options,
    ...(modelName ? { model: modelName } : {}),
    ...(mergedConfiguration ? { configuration: mergedConfiguration } : {}),
    ...(mergedModelKwargs ? { modelKwargs: mergedModelKwargs } : {}),
  });
}

export const selectModelMiddleware = createMiddleware({
  name: "selectModel",
  wrapModelCall: (request, handler) => {
    console.log(">>>>>>", request, handler);
    const model = buildModel(request, "gpt-6.1-sol");
    return handler({ ...request, model });
  },
});
