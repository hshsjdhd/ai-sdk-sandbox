import { randomUUID } from "node:crypto";
import { phaseTimer } from "../../../server/attachment-performance";
import { issueAttachment, storage } from "../../../server/attachment-storage";
import {
  validateAttachmentBytes,
  validateFile,
} from "../../../lib/attachments";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_BODY_BYTES = MAX_FILE_BYTES + 64 * 1024;

function json(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const uploadTimer = phaseTimer();
  let config: ReturnType<typeof storage>;
  try {
    config = storage();
  } catch {
    return json({ error: "COS 配置不完整。" }, 503);
  }
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^multipart\/form-data\s*;/i.test(contentType)) {
    return json({ error: "请使用 multipart/form-data 上传文件。" }, 415);
  }
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
    return json({ error: "上传请求过大，单文件上限为 5 MiB。" }, 413);
  }

  let form: FormData;
  try {
    if (!request.body) return json({ error: "缺少上传文件。" }, 400);
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BODY_BYTES) {
          await reader.cancel();
          return json({ error: "上传请求过大，单文件上限为 5 MiB。" }, 413);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    form = await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": contentType },
    }).formData();
  } catch {
    return json({ error: "上传表单无效。" }, 400);
  }

  const entries = [...form.entries()];
  const file = form.get("file");
  if (entries.length !== 1 || !file || typeof file === "string") {
    return json({ error: "仅允许一个名为 file 的文件字段。" }, 400);
  }
  if (file.size === 0) return json({ error: "不能上传空文件。" }, 400);
  if (file.size > MAX_FILE_BYTES) {
    return json({ error: "单文件大小不能超过 5 MiB。" }, 413);
  }

  const extension =
    /\.[a-zA-Z0-9]{1,16}$/.exec(file.name)?.[0].toLowerCase() ?? "";
  const Key = `uploads/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${extension}`;
  const { cos, Bucket, Region } = config;
  const bytes = Buffer.from(await file.arrayBuffer());
  let mediaType: string;
  try {
    mediaType = validateFile(file.name, bytes.length);
    validateAttachmentBytes({ filename: file.name, mediaType }, bytes);
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "文件无效。" },
      400,
    );
  }
  uploadTimer("upload-validation", { bytes: bytes.length });
  try {
    const cosTimer = phaseTimer();
    await cos.putObject({
      Bucket,
      Region,
      Key,
      Body: bytes,
      ContentLength: file.size,
      ContentType: "application/octet-stream",
      ContentDisposition: "attachment",
      ACL: "private",
    });
    cosTimer("cos-upload", { bytes: bytes.length });
    return json(
      { file: issueAttachment(Key, file.name, mediaType, bytes) },
      201,
    );
  } catch {
    return json({ error: "COS 上传失败，请检查配置、权限和网络后重试。" }, 502);
  }
}
