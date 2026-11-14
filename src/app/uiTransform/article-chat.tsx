"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type {
  AgentStreamInput,
  ArticleChatChunk,
  ArticleChatMessage,
} from "./types";
export type { ArticleChatChunk, ArticleChatMessage } from "./types";

export interface ArticleChatComposerTool {
  id: string;
  label: string;
  onClick: (context: { resetHistory: () => void }) => void;
}

export function createArticleChatResetHistoryTool(): ArticleChatComposerTool {
  return {
    id: "reset-history",
    label: "清空历史",
    onClick: ({ resetHistory }) => resetHistory(),
  };
}

export interface ArticleChatProps {
  title: string;
  subtitle?: string;
  emptyText?: string;
  suggestions?: readonly { label: string; prompt: string }[];
  placeholder?: string;
  pendingText?: string;
  modelControlsEnabled?: false;
  modelSettingsReadOnly?: boolean;
  composerTools?: readonly ArticleChatComposerTool[];
  onRun: (input: AgentStreamInput) => AsyncIterable<ArticleChatChunk>;
}

export function ArticleChat({
  title,
  subtitle,
  emptyText,
  suggestions = [],
  placeholder,
  pendingText = "正在生成",
  composerTools = [],
  onRun,
}: ArticleChatProps) {
  const [messages, setMessages] = useState<ArticleChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const activeRun = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(
    () => () => {
      activeRun.current?.abort();
    },
    [],
  );
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);

  function stop() {
    activeRun.current?.abort();
    activeRun.current = null;
    setPending(false);
  }
  function resetHistory() {
    stop();
    setMessages([]);
    setError("");
  }
  async function send(prompt: string) {
    const content = prompt.trim();
    if (!content || activeRun.current) return;
    const abort = new AbortController();
    activeRun.current = abort;
    const history: ArticleChatMessage[] = [
      ...messages.filter((message) => message.content.trim()),
      { id: crypto.randomUUID(), role: "user", content },
    ];
    const id = crypto.randomUUID();
    setMessages([...history, { id, role: "assistant", content: "" }]);
    setDraft("");
    setError("");
    setPending(true);
    try {
      for await (const chunk of onRun({
        messages: history,
        abortSignal: abort.signal,
      })) {
        if (activeRun.current !== abort) break;
        setMessages((current) =>
          current.map((message) =>
            message.id === id
              ? {
                  ...message,
                  content: message.content + chunk.content,
                  model: chunk.model ?? message.model,
                }
              : message,
          ),
        );
      }
    } catch (cause) {
      if (activeRun.current === abort && !abort.signal.aborted) {
        setError(cause instanceof Error ? cause.message : "请求失败，请重试");
        setDraft(prompt);
      }
    } finally {
      if (activeRun.current === abort) {
        activeRun.current = null;
        setPending(false);
      }
    }
  }
  return (
    <main className="mx-auto flex h-dvh max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <header>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle ? <p className="mt-2 opacity-60">{subtitle}</p> : null}
      </header>
      <section
        aria-label="聊天记录"
        className="min-h-0 flex-1 space-y-6 overflow-y-auto"
      >
        {messages.length === 0 ? (
          <div className="py-12 text-center">
            <p className="opacity-60">{emptyText}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {suggestions.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="rounded-xl border p-3"
                  disabled={pending}
                  onClick={() => void send(item.prompt)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <article key={message.id} className="rounded-xl border p-4">
              <p className="mb-3 text-sm opacity-60">
                {message.role === "user" ? "你" : "助手"}
                {message.model ? " · " + message.model : ""}
              </p>
              <div className="break-words [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-black/5 [&_pre]:p-4 [&_p]:my-3 [&_ul]:list-inside [&_ul]:list-disc [&_ol]:list-inside [&_ol]:list-decimal [&_a]:underline">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>
            </article>
          ))
        )}
        <div ref={bottom} />
      </section>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send(draft);
        }}
        className="space-y-3"
      >
        {error ? (
          <p role="alert" className="text-red-600">
            {error}
          </p>
        ) : null}
        <p role="status" className="min-h-5 text-sm opacity-60">
          {pending ? pendingText : ""}
        </p>
        <textarea
          aria-label={placeholder ?? "输入消息"}
          placeholder={placeholder}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              void send(draft);
            }
          }}
          className="w-full resize-none rounded-xl border bg-transparent p-4"
        />
        <div className="flex items-center justify-between gap-3">
          <div>
            {composerTools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                className="rounded-lg border px-3 py-2"
                onClick={() => tool.onClick({ resetHistory })}
              >
                {tool.label}
              </button>
            ))}
          </div>
          {pending ? (
            <button
              type="button"
              onClick={stop}
              className="rounded-lg border px-4 py-2"
            >
              停止生成
            </button>
          ) : (
            <button
              type="submit"
              disabled={!draft.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white"
            >
              发送
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
