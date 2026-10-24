import type { ChatStatus } from "ai";
import { ArrowUp, Leaf, RotateCcw, Square } from "lucide-react";
import { useEffect, type RefObject } from "react";

export function ChatComposer({
  input,
  onInputChange,
  inputRef,
  status,
  stopped,
  error,
  onSend,
  onStop,
  onRetry,
}: {
  input: string;
  onInputChange: (value: string) => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  status: ChatStatus;
  stopped: boolean;
  error: Error | undefined;
  onSend: () => void;
  onStop: () => void;
  onRetry: () => void;
}) {
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
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  }, [input, inputRef]);

  return (
    <>
      {error && (
        <div className="error-banner" role="alert">
          <span>{error.message || "发送失败，请重试。"}</span>
          <button disabled={busy} onClick={onRetry}>
            <RotateCcw size={14} /> 重试
          </button>
        </div>
      )}
      <form
        className={`composer ${busy ? "is-streaming" : ""}`}
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
      >
        <textarea
          ref={inputRef}
          aria-label="消息内容"
          placeholder="把你的想法写在这里…"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          rows={2}
          maxLength={12000}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <div className="composer-bottom">
          <div className="composer-status" role="status">
            <span
              className={`status-dot ${busy ? "pulsing" : ""} ${error ? "status-error" : ""}`}
            />
            {statusLabel}
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
                onClick={onStop}
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
    </>
  );
}
