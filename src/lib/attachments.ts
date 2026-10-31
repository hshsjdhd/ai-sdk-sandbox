import type { FileUIPart, UIMessage } from "ai";
import { safeSourceUrl } from "./web-search";

export const MAX_FILES = 4;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_REQUEST_BYTES = 15 * 1024 * 1024;
export const MAX_EXTRACTED_CHARS = 100_000;
export const FILE_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  json: "application/json",
  // Source files are inert UTF-8 text, regardless of browser MIME guesses.
  html: "text/plain",
  htm: "text/plain",
  css: "text/plain",
  scss: "text/plain",
  less: "text/plain",
  js: "text/plain",
  jsx: "text/plain",
  mjs: "text/plain",
  cjs: "text/plain",
  ts: "text/plain",
  tsx: "text/plain",
  vue: "text/plain",
  svelte: "text/plain",
  py: "text/plain",
  java: "text/plain",
  c: "text/plain",
  cpp: "text/plain",
  h: "text/plain",
  hpp: "text/plain",
  cs: "text/plain",
  go: "text/plain",
  rs: "text/plain",
  php: "text/plain",
  rb: "text/plain",
  sh: "text/plain",
  bash: "text/plain",
  ps1: "text/plain",
  sql: "text/plain",
  yaml: "text/plain",
  yml: "text/plain",
  toml: "text/plain",
  xml: "text/plain",
  ini: "text/plain",
  conf: "text/plain",
  cfg: "text/plain",
  log: "text/plain",
  markdown: "text/markdown",
  tsv: "text/plain",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};
export const ATTACHMENT_ACCEPT = Object.keys(FILE_TYPES)
  .map((x) => `.${x}`)
  .join(",");
export function attachmentType(name: string): string {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  const type = Object.hasOwn(FILE_TYPES, extension) ? FILE_TYPES[extension] : undefined;
  if (!type)
    throw new Error(
      "不支持此文件格式。请选择图片、PDF、文本、HTML、常见代码或配置文件、DOCX、XLSX 或 PPTX；具体格式见附件说明，不支持旧版 DOC / XLS / PPT。",
    );
  if (name.length > 240 || /[\x00-\x1f]/.test(name))
    throw new Error("文件名无效或过长，请修改后重试。");
  return type;
}
export function validateFile(name: string, size: number) {
  const mediaType = attachmentType(name);
  if (size <= 0 || size > MAX_FILE_BYTES)
    throw new Error(`${name}：文件不能为空，且不能超过 5 MB。`);
  return mediaType;
}
export const REFERENCE_PREFIX = "/api/attachments?ref=";
export function attachmentReferenceSize(url: string): number {
  const match =
    /^\/api\/attachments\?ref=([A-Za-z0-9_-]{40,4096})&size=([1-9][0-9]{0,6})$/.exec(
      url,
    );
  if (!match || Number(match[2]) > MAX_FILE_BYTES)
    throw new Error(
      "附件引用无效，请重新上传文件；不支持外部链接或旧版内嵌附件。",
    );
  return Number(match[2]);
}
export function validateAttachmentBytes(
  part: Pick<FileUIPart, "filename" | "mediaType">,
  bytes: Uint8Array,
): Uint8Array {
  if (
    !part.filename ||
    validateFile(part.filename, bytes.length) !== part.mediaType
  )
    throw new Error("附件扩展名与文件类型不一致，请检查文件。");
  return checkSignature(part, bytes);
}
export function decodeAttachment(part: FileUIPart): Uint8Array {
  const prefix = `data:${part.mediaType};base64,`;
  if (!part.url.startsWith(prefix))
    throw new Error("仅支持本地文件附件，不支持远程链接。");
  const encoded = part.url.slice(prefix.length);
  if (
    encoded.length > Math.ceil(MAX_FILE_BYTES / 3) * 4 ||
    encoded.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)
  )
    throw new Error("附件数据无效或文件过大，请重新选择。");
  const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  if (
    !part.filename ||
    validateFile(part.filename, bytes.length) !== part.mediaType
  )
    throw new Error("附件扩展名与文件类型不一致，请检查文件。");
  return checkSignature(part, bytes);
}
function checkSignature(
  part: Pick<FileUIPart, "filename" | "mediaType">,
  bytes: Uint8Array,
): Uint8Array {
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.slice(start, end));
  const valid =
    part.mediaType === "image/png"
      ? bytes.slice(0, 8).join() === "137,80,78,71,13,10,26,10"
      : part.mediaType === "image/jpeg"
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : part.mediaType === "image/gif"
          ? ["GIF87a", "GIF89a"].includes(ascii(0, 6))
          : part.mediaType === "image/webp"
            ? ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP"
            : part.mediaType === "application/pdf"
              ? ascii(0, 5) === "%PDF-"
              : part.mediaType.includes("officedocument")
                ? ascii(0, 4) === "PK\x03\x04"
                : true;
  if (!valid)
    throw new Error(`${part.filename}：文件内容与类型不一致，请检查文件。`);
  if (part.mediaType.startsWith("text/") || part.mediaType === "application/json") {
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new Error(`${part.filename}：请使用有效的 UTF-8 编码文本文件。`);
    }
    if (!text.trim() || text.includes("\0"))
      throw new Error(`${part.filename}：请使用包含有效文字且无 NUL 字符的文本文件。`);
  }
  return bytes;
}
export function validateAttachmentMessages(messages: UIMessage[]): number {
  let total = 0;
  for (const message of messages) {
    const files = message.parts.filter((p) => p.type === "file");
    if (files.length > MAX_FILES)
      throw new Error("每条消息最多添加 4 个附件，请移除部分文件后重试。");
    for (const part of message.parts) {
      if (
        ![
          "text",
          "reasoning",
          "step-start",
          "file",
          "data-emotion",
          "data-memories-used",
          "tool-web_search",
          "source-url",
        ].includes(part.type)
      )
        throw new Error("消息中包含不支持的内容。");
      if (part.type === "tool-web_search" || part.type === "source-url") {
        if (message.role !== "assistant")
          throw new Error("搜索与来源仅允许出现在助手消息中。");
        if (part.type === "source-url" && !safeSourceUrl(part.url))
          throw new Error("来源链接无效，仅支持 HTTP(S) 链接。");
        if (part.type === "tool-web_search" && part.providerExecuted !== true)
          throw new Error("仅支持模型原生联网搜索。");
      }
      if (part.type === "file") {
        if (message.role !== "user")
          throw new Error("只有用户消息可以包含附件。");
        const size = attachmentReferenceSize(part.url);
        if (
          !part.filename ||
          validateFile(part.filename, size) !== part.mediaType
        )
          throw new Error("附件类型无效，请重新上传。");
        total += size;
        if (total > MAX_ATTACHMENT_BYTES)
          throw new Error(
            "附件总大小（含对话历史）超过 10 MB，请开启新对话或移除待发送的附件。",
          );
      }
    }
  }
  return total;
}
export async function readAttachment(file: File): Promise<FileUIPart> {
  const mediaType = validateFile(file.name, file.size);
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new Error(`${file.name}：读取失败，请重新选择文件。`));
    reader.onabort = () => reject(new Error(`${file.name}：已取消读取。`));
    reader.onload = () =>
      resolve(
        `data:${mediaType};base64,${String(reader.result).split(",")[1]}`,
      );
    reader.readAsDataURL(file);
  });
  const part: FileUIPart = {
    type: "file",
    filename: file.name,
    mediaType,
    url,
  };
  decodeAttachment(part);
  return part;
}
