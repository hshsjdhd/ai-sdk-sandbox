"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage, type FileUIPart } from "ai";
import {
  MAX_FILES,
  MAX_ATTACHMENT_BYTES,
  validateAttachmentMessages,
  validateFile,
} from "../lib/attachments";
import {
  ArrowDown,
  FlaskConical,
  Leaf,
  MessageSquare,
  Plus,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { uploadAttachment } from "../lib/upload-attachment";
import { ChatComposer } from "./chat-composer";
import { ChatMessages } from "./chat-messages";
import { ChatWelcome } from "./chat-welcome";
import { ThemeSwitcher } from "./theme-switcher";

// 每次只发送最后一条输入 避免上下文爆炸 需要借助kv
const transport = new DefaultChatTransport({
  api: "/api/chat",
  headers: { "x-ai-sdk": "chat-lab" },

  // prepareSendMessagesRequest: ({ id, messages, body }) => {
  //   return {
  //     body: {
  //       id,
  //       messages: [messages[messages.length - 1]],
  //       ...body,
  //     },
  //   };
  // },
});

export function Chat({ model }: { model: string }) {
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<FileUIPart[]>([]);
  const [converting, setConverting] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string>();
  const readingRef = useRef(false);
  const [stopped, setStopped] = useState(false);
  const [showScroll, setShowScroll] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [persistedMessages, setPersistedMessages] = useState<UIMessage[]>(() =>
    JSON.parse(localStorage.getItem("chat-history") ?? "[]"),
  );

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
  } = useChat({
    transport,
    onFinish: ({ message }) => {
      setPersistedMessages((prev) => [...prev, message]);
      localStorage.setItem(
        "chat-history",
        JSON.stringify([...persistedMessages, message]),
      );
    },
  });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (followRef.current && scrollRef.current)
      scrollRef.current.scrollTop = messages.length
        ? scrollRef.current.scrollHeight
        : 0;
  }, [messages, status]);

  async function addFiles(selected: File[]) {
    if (busy || readingRef.current || !selected.length) return;
    setAttachmentError(undefined);
    readingRef.current = true;
    setConverting(true);
    try {
      if (files.length + selected.length > MAX_FILES)
        throw new Error("每条消息最多添加 4 个附件，请移除部分文件后重试。");
      selected.forEach((file) => validateFile(file.name, file.size));
      const used = validateAttachmentMessages([
        ...messages,
        { id: "pending", role: "user", parts: files },
      ]);
      if (
        used + selected.reduce((sum, file) => sum + file.size, 0) >
        MAX_ATTACHMENT_BYTES
      )
        throw new Error(
          "附件总大小（含对话历史）超过 10 MB，请开启新对话或移除附件。",
        );
      const failures: string[] = [];
      for (const file of selected) {
        try {
          const uploaded = await uploadAttachment(file);
          setFiles((current) => [...current, uploaded]);
        } catch (error) {
          failures.push(
            error instanceof Error ? error.message : `${file.name}：上传失败。`,
          );
        }
      }
      if (failures.length) setAttachmentError(failures.join("\n"));
    } catch (error) {
      setAttachmentError(
        error instanceof Error
          ? error.message
          : "附件读取失败，请重新选择文件。",
      );
    } finally {
      readingRef.current = false;
      setConverting(false);
    }
  }

  function send(text = input) {
    if ((!text.trim() && !files.length) || busy || readingRef.current) return;
    try {
      validateAttachmentMessages([
        ...messages,
        { id: "pending", role: "user", parts: files },
      ]);
    } catch (error) {
      setAttachmentError(
        error instanceof Error ? error.message : "附件无效，请检查后重新添加。",
      );
      return;
    }
    setFiles([]);
    setAttachmentError(undefined);
    setInput("");
    setStopped(false);
    clearError();
    followRef.current = true;
    void sendMessage(
      { text: text.trim(), files },
      { body: { sessionId: "sess_123", mood: "tired" } },
    );
    textareaRef.current?.focus();
  }

  function newChat() {
    if (busy || readingRef.current) return;
    setFiles([]);
    setAttachmentError(undefined);
    setMessages([]);
    clearError();
    setStopped(false);
    setInput("");
    setShowScroll(false);
    followRef.current = true;
    textareaRef.current?.focus();
  }

  function retry() {
    if (busy || readingRef.current) return;
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
        <button
          className="new-chat"
          onClick={newChat}
          disabled={busy || converting}
        >
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
            <ThemeSwitcher />
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
            disabled={busy || converting}
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
            <ChatWelcome busy={busy || converting} onSend={send} />
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
            files={files}
            converting={converting}
            attachmentError={attachmentError}
            onAddFiles={(selected) => void addFiles(selected)}
            onRemoveFile={(index) => {
              setFiles((current) => current.filter((_, i) => i !== index));
              setAttachmentError(undefined);
            }}
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
