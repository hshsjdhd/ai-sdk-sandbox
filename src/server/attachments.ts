import type { UIMessage } from "ai";
import { unzipSync, strFromU8 } from "fflate";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import {
  MAX_ATTACHMENT_BYTES,
  MAX_EXTRACTED_CHARS,
  validateAttachmentMessages,
} from "../lib/attachments";

import { loadAttachment, signAttachment, verifyAttachment } from "./attachment-storage";
import { cachedAttachmentText, phaseTimer } from "./attachment-performance";
import type { Experimental_DownloadFunction as DownloadFunction } from "ai";

export function trustedAttachmentDownload(allowed: ReadonlySet<string>): DownloadFunction {
  return async (requests) => requests.map(({ url }) => {
    if (!allowed.has(url.href)) throw new Error("Untrusted attachment URL");
    return null;
  });
}

const parser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,
  processEntities: true,
});
function xml(text: string): any {
  if (/<!DOCTYPE|<!ENTITY/i.test(text) || XMLValidator.validate(text) !== true)
    throw new Error("Office 文档内容无效或不安全，请检查文件。");
  return parser.parse(text);
}
const array = (value: any): any[] =>
  value == null ? [] : Array.isArray(value) ? value : [value];
function textNodes(value: any): string[] {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, item]) =>
    key === "w:t" || key === "a:t" || key === "t"
      ? array(item).map((v) =>
          typeof v === "object" ? String(v["#text"] ?? "") : String(v),
        )
      : array(item).flatMap(textNodes),
  );
}
function officeText(bytes: Uint8Array, filename: string): string {
  let expanded = 0;
  let entries = 0;
  const files = unzipSync(bytes, {
    filter: (entry) => {
      entries++;
      expanded += entry.originalSize;
      if (entries > 2000 || expanded > 20 * 1024 * 1024)
        throw new Error(
          "Office 文档解压后超过 20 MB 或 2000 个条目的限制，请拆分文件。",
        );
      return /^(word\/document\.xml|ppt\/slides\/slide\d+\.xml|xl\/(sharedStrings|workbook)\.xml|xl\/worksheets\/sheet\d+\.xml)$/.test(
        entry.name,
      );
    },
  });
  const read = (name: string) => {
    if (!files[name])
      throw new Error("无法读取 Office 文档内容，不支持加密或损坏的文件。");
    return xml(strFromU8(files[name]));
  };
  let text: string;
  if (/\.docx$/i.test(filename)) {
    text = textNodes(read("word/document.xml")).join("\n");
  } else if (/\.pptx$/i.test(filename)) {
    const slides = Object.keys(files)
      .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    text = slides
      .map((name, i) => `Slide ${i + 1}\n${textNodes(read(name)).join("\n")}`)
      .join("\n\n");
  } else {
    const strings = files["xl/sharedStrings.xml"]
      ? array(read("xl/sharedStrings.xml").sst?.si).map((v) =>
          textNodes(v).join(""),
        )
      : [];
    const sheets = Object.keys(files)
      .filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    text = sheets
      .map(
        (name) =>
          `${name}\n` +
          array(read(name).worksheet?.sheetData?.row)
            .map((row) =>
              array(row.c)
                .map((cell) => {
                  const value =
                    cell["@_t"] === "s"
                      ? strings[Number(cell.v)]
                      : cell["@_t"] === "inlineStr"
                        ? textNodes(cell.is).join("")
                        : cell.v;
                  return `${cell["@_r"] ?? ""}: ${value ?? ""}`;
                })
                .join("\t"),
            )
            .join("\n"),
      )
      .join("\n\n");
  }
  if (!text.trim())
    throw new Error(
      "未找到可提取的文字，无法读取加密、纯图片或不支持的 Office 文档。",
    );
  return text;
}
export async function prepareAttachmentMessages(
  messages: UIMessage[],
  signedUrls: Set<string> = new Set(),
): Promise<UIMessage[]> {
  const preparation = phaseTimer();
  validateAttachmentMessages(messages);
  const references = new Map<string, ReturnType<typeof verifyAttachment>>();
  let total = 0;
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type !== "file") continue;
      const reference = verifyAttachment(part.url);
      if (
        reference.filename !== part.filename ||
        reference.mediaType !== part.mediaType
      )
        throw new Error("附件信息与上传记录不一致，请重新上传。");
      total += reference.size;
      if (total > MAX_ATTACHMENT_BYTES)
        throw new Error("附件总大小（含历史）超过 10 MB，请开启新对话。");
      references.set(part.url, reference);
    }
  }
  preparation("reference-validation", { files: references.size, bytes: total });
  const contents = new Map<string, { url?: string; text?: string }>();
  for (const [url, reference] of references) {
    const visual = reference.mediaType.startsWith("image/") || reference.mediaType === "application/pdf";
    if (visual && process.env.COS_MODEL_DIRECT_URLS === "1") {
      const timer = phaseTimer();
      const signed = await signAttachment(reference);
      signedUrls.add(new URL(signed).href);
      contents.set(url, { url: signed });
      timer("cos-sign");
      continue;
    }
    const load = async () => {
      const timer = phaseTimer();
      const bytes = await loadAttachment(reference);
      timer("cos-download", { bytes: bytes.length });
      return bytes;
    };
    if (visual) {
      const bytes = await load();
      contents.set(url, { url: `data:${reference.mediaType};base64,${bytes.toString("base64")}` });
      continue;
    }
    try {
      const text = await cachedAttachmentText(url, reference.expires, async () => {
        const bytes = await load();
        const timer = phaseTimer();
        const text = reference.mediaType.includes("officedocument")
          ? officeText(bytes, reference.filename)
          : new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        if (!text.trim() || text.includes("\0"))
          throw new Error("请使用包含有效文字的 UTF-8 编码文本文件。");
        if (reference.mediaType === "application/json") JSON.parse(text);
        if (text.length > MAX_EXTRACTED_CHARS)
          throw new Error("提取的文字超过单个文件 10 万字符的限制，请拆分文档。");
        timer("text-extraction", { chars: text.length });
        return text;
      });
      contents.set(url, { text });
    } catch (error) {
      throw new Error(
        `${reference.filename}：${error instanceof Error && /[\u4e00-\u9fff]/.test(error.message) ? error.message : "无法提取文档文字，请检查文件是否损坏、加密或编码不正确。"}`,
      );
    }
  }
  let extractedTotal = 0;
  const prepared = messages.map((message) => ({
    ...message,
    parts: message.parts.map((part) => {
      if (part.type !== "file") return part;
      const content = contents.get(part.url)!;
      if (content.url) return { ...part, url: content.url };
      extractedTotal += content.text!.length;
      if (extractedTotal > 4 * MAX_EXTRACTED_CHARS)
        throw new Error("提取的文字超过每次请求 40 万字符的限制，请开启新对话。");
      return { type: "text" as const, text: `Attachment: ${part.filename}\n${content.text}` };
    }),
  }));
  preparation("attachment-preparation", { files: references.size });
  return prepared;
}
