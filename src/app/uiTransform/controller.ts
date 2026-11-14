import type { ArticleChatChunk, AgentStreamInput } from "./types";
import { createAgentStream } from "./agent";
export async function* runStreamingChat(
  input: AgentStreamInput,
): AsyncGenerator<ArticleChatChunk> {
  const startedAt = performance.now();
  const elapsed = () => Math.round(performance.now() - startedAt);

  const { model, stream } = await createAgentStream(input);

  let hasContent = false;
  let count = 0;
  let firstTextAt: number | undefined;
  let previousTextAt: number | undefined;
  let totalCharacters = 0;

  for await (const [messageChunk] of stream) {
    const content = readTextContent(messageChunk.content);
    if (!content) continue;

    const now = performance.now();
    firstTextAt ??= now;
    totalCharacters += content.length;

    previousTextAt = now;
    hasContent = true;
    yield { content, model };
  }

  if (!hasContent) {
    throw new Error("Agent 没有返回可显示的文字内容");
  }
}

function readTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object" && typeof part.text === "string")
        return part.text;
      return "";
    })
    .join("");
}
