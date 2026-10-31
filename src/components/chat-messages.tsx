import type { ChatStatus, UIMessage } from "ai";
import { Check, Copy, Leaf, LoaderCircle, Square } from "lucide-react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AttachmentPreview } from "./attachment-preview";

export function ChatMessages({
  messages,
  model,
  status,
  stopped,
}: {
  messages: UIMessage[];
  model: string;
  status: ChatStatus;
  stopped: boolean;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  async function copyMessage(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setCopyError(false);
    } catch {
      setCopyError(true);
    }
  }

  return (
    <div className="messages" role="log" aria-label="聊天记录" aria-busy={busy}>
      {messages.map((message) => {
        const text = message.parts
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("");
        return (
          <article
            key={message.id}
            className={`message message-${message.role}`}
          >
            <div
              className={`message-avatar ${message.role === "user" ? "user-avatar" : ""}`}
            >
              {message.role === "user" ? "Y" : <Leaf size={18} />}
            </div>
            <div className="message-body">
              <div className="message-author">
                {message.role === "user" ? "你" : "Chat Lab"}
                <span>{message.role === "assistant" ? model : ""}</span>
              </div>
              {message.parts.map((part, index) =>
                part.type === "reasoning" ? (
                  <details className="reasoning" key={index}>
                    <summary>思考过程</summary>
                    <div className="markdown">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {part.text}
                      </ReactMarkdown>
                    </div>
                  </details>
                ) : part.type === "text" ? (
                  <div
                    className={
                      message.role === "user" ? "user-text" : "markdown"
                    }
                    key={index}
                  >
                    {message.role === "user" ? (
                      part.text
                    ) : (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {part.text}
                      </ReactMarkdown>
                    )}
                  </div>
                ) : part.type === "file" ? (
                  <AttachmentPreview key={index} file={part} />
                ) : null,
              )}
              {message.role === "assistant" && text && (
                <button
                  className="copy-button"
                  aria-label="复制回复"
                  onClick={() => void copyMessage(message.id, text)}
                >
                  {copied === message.id ? (
                    <Check size={14} />
                  ) : (
                    <Copy size={14} />
                  )}
                  {copied === message.id ? "已复制" : "复制"}
                </button>
              )}
            </div>
          </article>
        );
      })}
      {status === "submitted" && (
        <div className="thinking">
          <LoaderCircle size={16} className="spin" /> 正在思考，请稍候…
        </div>
      )}
      {stopped && !busy && (
        <div className="stopped-note">
          <Square size={11} />
          已停止生成，已收到的内容会保留。
        </div>
      )}
      {copyError && (
        <div className="error-banner" role="status">
          无法访问剪贴板，请手动选择文字复制。
        </div>
      )}
    </div>
  );
}
