"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  Code2,
  Copy,
  FlaskConical,
  Leaf,
  LoaderCircle,
  MessageSquare,
  Plus,
  RotateCcw,
  Sparkles,
  Square,
  WandSparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const transport = new DefaultChatTransport({ api: "/api/chat" });
const suggestions = [
  {
    icon: WandSparkles,
    title: "让灵感发生",
    text: "帮我想 5 个有趣的周末小项目，适合一个人完成。",
    description: "一起探索下一个好点子",
  },
  {
    icon: Code2,
    title: "把问题拆开",
    text: "用一个简单的例子解释什么是流式响应，并给出 TypeScript 代码。",
    description: "代码、概念，都可以聊聊",
  },
  {
    icon: Sparkles,
    title: "写得更好一点",
    text: "帮我写一段简短、自然的自我介绍，用于新团队的第一次见面。",
    description: "从第一句话开始",
  },
];

export function Chat({
  model,
  hasApiKey,
}: {
  model: string;
  hasApiKey: boolean;
}) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState(hasApiKey ? "live" : "demo");
  const [stopped, setStopped] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const followRef = useRef(true);
  const [showScroll, setShowScroll] = useState(false);
  const {
    messages,
    sendMessage,
    status,
    stop,
    error,
    regenerate,
    setMessages,
    clearError,
  } = useChat({ transport });
  const busy = status === "submitted" || status === "streaming";
  const statusLabel =
    status === "submitted"
      ? "正在连接…"
      : status === "streaming"
        ? "正在生成…"
        : error
          ? "请求失败"
          : stopped
            ? "已停止生成"
            : "准备就绪";

  useEffect(() => {
    if (followRef.current && scrollRef.current)
      scrollRef.current.scrollTop = messages.length
        ? scrollRef.current.scrollHeight
        : 0;
  }, [messages, status]);
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  }, [input]);
  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  function send(text = input) {
    if (!text.trim() || busy) return;
    setInput("");
    setStopped(false);
    clearError();
    followRef.current = true;
    void sendMessage({ text: text.trim() }, { body: { mode } });
    textareaRef.current?.focus();
  }
  function newChat() {
    if (busy) return;
    setMessages([]);
    clearError();
    setStopped(false);
    setInput("");
    setCopyError(false);
    setShowScroll(false);
    setCopied(null);
    followRef.current = true;
    textareaRef.current?.focus();
  }
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
    <div className="workspace">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Chat Lab 首页">
          <span className="brand-mark">
            <Leaf size={22} />
          </span>
          chat lab<span className="brand-dot">.</span>
        </a>
        <button className="new-chat" onClick={newChat} disabled={busy}>
          <Plus size={17} /> 开启新对话 <span>＋</span>
        </button>
        <div className="sidebar-section">你的空间</div>
        <div className="active-chat">
          <MessageSquare size={17} />
          <span>
            {messages.length
              ? messages
                  .find((m) => m.role === "user")
                  ?.parts.filter((p) => p.type === "text")
                  .map((p) => p.text)
                  .join("")
              : "新的灵感"}
          </span>
          <span className="active-dot" />
        </div>
        <div className="sidebar-note">
          <FlaskConical size={20} />
          <p>
            留一点空间，
            <br />
            给还没成形的想法。
          </p>
          <span>AI SDK SANDBOX / 001</span>
        </div>
        <div className="profile">
          <span className="avatar">Y</span>
          <div>
            <strong>你的工作台</strong>
            <small>一点好奇，无限可能</small>
          </div>
          <span className="local-badge">LOCAL</span>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="page-label">
            Playground <span>/</span> <strong>对话</strong>
          </div>
          <div className="topbar-right">
            <span className="mvp-badge">MVP 01</span>
            <span className="connection">
              <i />
              本地工作台
            </span>
          </div>
        </header>
        <div className="chat-toolbar">
          <span>
            <span className="tiny-mark">
              <Sparkles size={14} />
            </span>{" "}
            Chat Lab <span className="muted">/</span>{" "}
            <span className="model-label">
              {mode === "demo" ? "本地演示" : model}
            </span>
          </span>
          <label className="mode-select">
            <select
              aria-label="聊天模式"
              value={mode}
              disabled={busy}
              onChange={(e) => {
                setMode(e.target.value);
                newChat();
              }}
            >
              <option value="live">真实模型</option>
              <option value="demo">本地演示</option>
            </select>
            <ChevronDown size={13} />
          </label>
        </div>

        <div
          className="conversation"
          ref={scrollRef}
          onScroll={() => {
            const el = scrollRef.current;
            if (el) {
              followRef.current =
                el.scrollHeight - el.scrollTop - el.clientHeight < 100;
              setShowScroll(!followRef.current);
            }
          }}
        >
          {messages.length === 0 ? (
            <section className="welcome">
              <div className="welcome-symbol">
                <Sparkles size={34} strokeWidth={1.4} />
                <span className="orbit-dot" />
              </div>
              <div className="eyebrow">A LITTLE SPACE FOR BIG IDEAS</div>
              <h1>
                你好，今天想聊些什么<span>？</span>
              </h1>
              <p className="welcome-description">
                一个想法，一个问题，或是一点好奇。
                <br />
                从这里开始，我们一起把它变得更清晰。
              </p>
              <div className="suggestions">
                {suggestions.map((item) => (
                  <button
                    key={item.title}
                    onClick={() => send(item.text)}
                    disabled={busy}
                  >
                    <item.icon size={21} strokeWidth={1.5} />
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                    <ArrowRight size={15} className="suggestion-arrow" />
                  </button>
                ))}
              </div>
              <div className="welcome-caption">
                <span /> 随时发送，随时停下，按你的节奏来。
              </div>
            </section>
          ) : (
            <div
              className="messages"
              role="log"
              aria-label="聊天记录"
              aria-busy={busy}
            >
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
                        <span>
                          {message.role === "assistant"
                            ? mode === "demo"
                              ? "本地演示"
                              : model
                            : ""}
                        </span>
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
            </div>
          )}
        </div>

        <div className="composer-region">
          {showScroll && (
            <button
              className="scroll-bottom"
              aria-label="滚动到底部"
              onClick={() => {
                followRef.current = true;
                scrollRef.current?.scrollTo({
                  top: scrollRef.current.scrollHeight,
                  behavior: "smooth",
                });
              }}
            >
              <ArrowDown size={17} />
            </button>
          )}
          {error && (
            <div className="error-banner" role="alert">
              <span>{error.message || "发送失败，请重试。"}</span>
              <button
                disabled={busy}
                onClick={() => {
                  clearError();
                  setStopped(false);
                  followRef.current = true;
                  void regenerate({ body: { mode } });
                }}
              >
                <RotateCcw size={14} /> 重试
              </button>
            </div>
          )}
          {copyError && (
            <div className="error-banner" role="status">
              无法访问剪贴板，请手动选择文字复制。
            </div>
          )}
          <form
            className={`composer ${busy ? "is-streaming" : ""}`}
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <textarea
              ref={textareaRef}
              aria-label="消息内容"
              placeholder="把你的想法写在这里…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={2}
              maxLength={12000}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <div className="composer-bottom">
              <div className="composer-status" role="status">
                <span
                  className={`status-dot ${busy ? "pulsing" : ""} ${error ? "status-error" : ""}`}
                />
                {statusLabel}
                <span className="demo-hint">
                  {mode === "demo" ? "· 不调用真实模型" : ""}
                </span>
              </div>
              <div className="composer-actions">
                <span className="keyboard-hint">
                  Enter 发送 · Shift + Enter 换行
                </span>
                {busy ? (
                  <button
                    className="send-button stop-button"
                    type="button"
                    aria-label="停止生成"
                    title="停止生成"
                    onClick={() => {
                      setStopped(true);
                      void stop();
                    }}
                  >
                    <Square size={15} fill="currentColor" />
                  </button>
                ) : (
                  <button
                    className="send-button"
                    type="submit"
                    disabled={!input.trim()}
                    aria-label="发送消息"
                    title="发送消息"
                  >
                    <ArrowUp size={20} />
                  </button>
                )}
              </div>
            </div>
          </form>
          <p className="composer-footer">
            AI 也会有不完美的答案，重要信息请再次确认。
            <span>
              MADE FOR EXPLORING <Leaf size={11} />
            </span>
          </p>
        </div>
      </main>
    </div>
  );
}
