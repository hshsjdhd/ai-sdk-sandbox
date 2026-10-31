import type { ChatStatus, FileUIPart } from "ai";
import { ATTACHMENT_ACCEPT, MAX_FILES } from "../lib/attachments";
import { AttachmentPreview } from "./attachment-preview";
import {
  ArrowUp,
  Leaf,
  LoaderCircle,
  Paperclip,
  RotateCcw,
  Square,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";

export function ChatComposer({
  files,
  converting,
  attachmentError,
  onAddFiles,
  onRemoveFile,
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
  files: FileUIPart[];
  converting: boolean;
  attachmentError?: string;
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
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
  const fileInput = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const busy = status === "submitted" || status === "streaming";
  const uploadDisabled = busy || converting || files.length >= MAX_FILES;
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
          <button disabled={busy || converting} onClick={onRetry}>
            <RotateCcw size={14} /> 重试
          </button>
        </div>
      )}
      {attachmentError && (
        <div className="error-banner" role="alert">
          {attachmentError}
        </div>
      )}
      <form
        onDragEnter={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          dragDepth.current++;
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (!dragDepth.current) setDragging(false);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = uploadDisabled ? "none" : "copy";
        }}
        onDrop={(e) => {
          e.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          if (!busy && !converting)
            onAddFiles(Array.from(e.dataTransfer.files));
        }}
        onPaste={(e) => {
          const images = Array.from(e.clipboardData.files).filter((file) =>
            file.type.startsWith("image/"),
          );
          if (images.length) {
            e.preventDefault();
            if (!busy && !converting) onAddFiles(images);
          }
        }}
        className={`composer ${busy ? "is-streaming" : ""} ${dragging ? "is-dragging" : ""}`}
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
      >
        <input
          ref={fileInput}
          type="file"
          hidden
          className="attachment-input"
          tabIndex={-1}
          aria-label="选择附件"
          accept={ATTACHMENT_ACCEPT}
          multiple
          disabled={busy || converting}
          onChange={(e) => {
            onAddFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
        {dragging && (
          <div className="attachment-drop-hint" role="status">
            <Upload size={24} aria-hidden="true" />
            <strong>
              {uploadDisabled ? "暂时无法添加附件" : "松开即可添加附件"}
            </strong>
            <span>
              {busy
                ? "请等待本次回复完成"
                : converting
                  ? "正在上传附件到 COS，请稍候"
                  : files.length >= MAX_FILES
                    ? "最多添加 4 个，请先移除部分附件"
                    : "图片、文档，让想法更完整"}
            </span>
          </div>
        )}
        <div className="attachment-status" role="status" aria-live="polite">
          {converting ? (
            <>
              <LoaderCircle
                className="attachment-spinner"
                size={14}
                aria-hidden="true"
              />
              正在读取并上传附件到 COS…
            </>
          ) : files.length > 0 ? (
            `已添加 ${files.length} / ${MAX_FILES} 个附件`
          ) : null}
        </div>
        {files.length > 0 && (
          <div className="attachment-list" aria-label="待发送附件">
            {files.map((file, index) => (
              <AttachmentPreview
                key={index}
                file={file}
                disabled={busy || converting}
                onRemove={() => onRemoveFile(index)}
              />
            ))}
          </div>
        )}
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
            <button
              type="button"
              className="attach-button"
              aria-label="添加附件"
              title={
                files.length >= MAX_FILES ? "已达 4 个附件上限" : "添加附件"
              }
              aria-describedby="attachment-help"
              disabled={uploadDisabled}
              onClick={() => fileInput.current?.click()}
            >
              <Paperclip size={17} aria-hidden="true" />
              <span>附件</span>
            </button>
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
                disabled={converting || (!input.trim() && !files.length)}
                aria-label="发送消息"
                title="发送消息"
              >
                <ArrowUp size={20} />
              </button>
            )}
          </div>
        </div>
      </form>
      <details className="attachment-help" id="attachment-help">
        <summary>支持拖入文件或粘贴图片 · 每个文件最大 5 MB</summary>
        <p>
          每条消息最多 4 个附件，含对话历史合计不超过 10 MB。支持 PNG / JPEG /
          WebP / GIF、PDF、TXT / MD / Markdown / CSV / TSV / JSON、DOCX / XLSX / PPTX；
          不支持旧版 DOC / XLS / PPT。
        </p>
        <p>
          代码与配置：HTML / HTM / CSS / SCSS / LESS、JS / JSX / MJS / CJS /
          TS / TSX / Vue / Svelte、PY / Java / C / CPP / H / HPP / CS / Go /
          RS / PHP / RB、SH / Bash / PS1 / SQL、YAML / YML / TOML / XML /
          INI / CONF / CFG / LOG。文本须为 UTF-8 编码，JSON 须符合严格语法。
          HTML 与代码仅作为纯文本提供给模型，不执行或渲染网页。
        </p>
      </details>
      <p className="composer-footer">
        AI 也会有不完美的答案，重要信息请再次确认。
        <span>
          MADE FOR EXPLORING <Leaf size={11} />
        </span>
      </p>
    </>
  );
}
