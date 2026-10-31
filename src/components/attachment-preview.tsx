import type { FileUIPart } from "ai";
import { Download, FileText, X } from "lucide-react";
import { attachmentReferenceSize } from "../lib/attachments";

export function AttachmentPreview({
  file,
  onRemove,
  disabled,
}: {
  file: FileUIPart;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  let bytes = 0;
  try {
    bytes = attachmentReferenceSize(file.url);
  } catch {
    /* Untrusted historical URLs are never rendered. */
  }
  const safe = bytes > 0;
  const image =
    safe &&
    ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
      file.mediaType,
    );
  const name = file.filename ?? "未命名附件";
  const extension = file.filename?.split(".").pop()?.toUpperCase() ?? "文件";
  const size =
    bytes >= 1024 * 1024
      ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
      : `${Math.max(1, Math.ceil(bytes / 1024))} KB`;

  return (
    <div className="attachment-card">
      <div className={`attachment-icon ${image ? "attachment-image" : ""}`}>
        {image ? (
          // The controlled endpoint verifies the capability before serving image bytes.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={file.url} alt={name} />
        ) : (
          <FileText size={21} aria-hidden="true" />
        )}
      </div>
      <div className="attachment-info">
        <span className="attachment-name" title={name}>
          {name}
        </span>
        <span className="attachment-meta">
          {extension}
          {safe ? ` · ${size}` : ""}
        </span>
      </div>
      {onRemove ? (
        <button
          className="attachment-action"
          type="button"
          disabled={disabled}
          onClick={onRemove}
          aria-label={`移除附件：${name}`}
          title="移除附件"
        >
          <X size={15} aria-hidden="true" />
        </button>
      ) : (
        safe && (
          <a
            className="attachment-action"
            href={`${file.url}&download=1`}
            referrerPolicy="no-referrer"
            download={file.filename}
            aria-label={`下载附件：${name}`}
            title="下载附件"
          >
            <Download size={15} aria-hidden="true" />
          </a>
        )
      )}
    </div>
  );
}
