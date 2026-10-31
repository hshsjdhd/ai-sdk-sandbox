import type { UIMessage } from "ai";

// Gateway requests must not depend on items stored by a previous upstream worker.
// Only sanitize the model-input copy; keep reasoning and metadata in the UI history.
export function statelessChatHistory(messages: UIMessage[]): UIMessage[] {
  return messages.map((message) => ({
    ...message,
    parts: message.parts
      // Native search IDs and sources are display-only, never replayable items.
      .filter((part) => part.type === "text" || part.type === "file")
      .map((part) => {
        if (part.type === "text") {
          const { providerMetadata, ...content } = part;
          return content;
        }
        if (part.type === "file") {
          const { providerMetadata, providerReference, ...content } = part;
          return content;
        }
        return part;
      }),
  }));
}
