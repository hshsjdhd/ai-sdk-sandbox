import type { FileUIPart } from "ai";
import { attachmentReferenceSize, readAttachment } from "./attachments";

export async function uploadAttachment(file: File) {
  const part = await readAttachment(file);
  const body = new FormData();
  body.append("file", file);
  let response: Response;
  try {
    response = await fetch("/api/upload", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new Error(`${file.name}：上传失败或超时，请检查网络后重新添加。`);
  }
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      `${file.name}：${typeof result?.error === "string" ? result.error : "上传失败，请稍后重新添加。"}`,
    );
  }
  const uploaded = result?.file as FileUIPart | undefined;
  if (
    !uploaded ||
    uploaded.type !== "file" ||
    uploaded.filename !== file.name ||
    uploaded.mediaType !== part.mediaType ||
    typeof uploaded.url !== "string" ||
    attachmentReferenceSize(uploaded.url) !== file.size
  ) {
    throw new Error(`${file.name}：上传响应无效，请重新添加。`);
  }
  return uploaded;
}
