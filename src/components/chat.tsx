"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  ArrowDown,
  FlaskConical,
  Leaf,
  MessageSquare,
  Plus,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ChatComposer } from "./chat-composer";
import { ChatMessages } from "./chat-messages";
import { ChatWelcome } from "./chat-welcome";

const transport = new DefaultChatTransport({ api: "/api/chat" });

export function Chat({ model }: { model: string }) {
  const [input, setInput] = useState("");
  const [stopped, setStopped] = useState(false);
  const [showScroll, setShowScroll] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const followRef = useRef(true);
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

  useEffect(() => {
    if (followRef.current && scrollRef.current)
      scrollRef.current.scrollTop = messages.length
        ? scrollRef.current.scrollHeight
        : 0;
  }, [messages, status]);

  function send(text = input) {
    if (!text.trim() || busy) return;
    setInput("");
    setStopped(false);
    clearError();
    followRef.current = true;
    void sendMessage({ text: text.trim() });
    textareaRef.current?.focus();
  }

  function newChat() {
    if (busy) return;
    setMessages([]);
    clearError();
    setStopped(false);
    setInput("");
    setShowScroll(false);
    followRef.current = true;
    textareaRef.current?.focus();
  }

  function retry() {
    clearError();
    setStopped(false);
    followRef.current = true;
    void regenerate();
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
            </span>
            Chat Lab <span className="muted">/</span>
            <span className="model-label">{model}</span>
          </span>
          <button
            className="mobile-new-chat"
            aria-label="开启新对话"
            title="开启新对话"
            onClick={newChat}
            disabled={busy}
          >
            <Plus size={17} />
          </button>
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
            <ChatWelcome busy={busy} onSend={send} />
          ) : (
            <ChatMessages
              messages={messages}
              model={model}
              status={status}
              stopped={stopped}
            />
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
          <ChatComposer
            input={input}
            onInputChange={setInput}
            inputRef={textareaRef}
            status={status}
            stopped={stopped}
            error={error}
            onSend={() => send()}
            onStop={() => {
              setStopped(true);
              void stop();
            }}
            onRetry={retry}
          />
        </div>
      </main>
    </div>
  );
}
