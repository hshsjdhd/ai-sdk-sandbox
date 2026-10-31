import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "node:crypto";
import { Writable } from "node:stream";
import COS from "cos-nodejs-sdk-v5";
import type { FileUIPart } from "ai";
import {
  attachmentReferenceSize,
  REFERENCE_PREFIX,
  validateAttachmentBytes,
  validateFile,
} from "../lib/attachments";

const TTL = 24 * 60 * 60 * 1000;
type Reference = {
  key: string;
  filename: string;
  mediaType: string;
  size: number;
  digest: string;
  expires: number;
};
export function storage() {
  const SecretId = process.env.COS_SECRET_ID?.trim();
  const SecretKey = process.env.COS_SECRET_KEY?.trim();
  const Bucket = process.env.COS_BUCKET?.trim();
  const Region = process.env.COS_REGION?.trim();
  if (!SecretId || !SecretKey || !Bucket || !Region)
    throw new Error("COS 配置不完整。");
  const signingKey = createHmac("sha256", SecretKey)
    .update(
      JSON.stringify([
        "chat-attachment-reference-v1",
        SecretId,
        Bucket,
        Region,
      ]),
    )
    .digest();
  return {
    Bucket,
    Region,
    signingKey,
    cos: new COS({
      SecretId,
      SecretKey,
      Protocol: "https:",
      Timeout: 30_000,
      FileParallelLimit: 1,
    }),
  };
}
export function issueAttachment(
  key: string,
  filename: string,
  mediaType: string,
  bytes: Buffer,
): FileUIPart {
  const { signingKey } = storage();
  const data: Reference = {
    key,
    filename,
    mediaType,
    size: bytes.length,
    digest: createHash("sha256").update(bytes).digest("hex"),
    expires: Date.now() + TTL,
  };
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", signingKey, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(data), "utf8"),
    cipher.final(),
  ]);
  const token = Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString(
    "base64url",
  );
  return {
    type: "file",
    filename,
    mediaType,
    url: `${REFERENCE_PREFIX}${token}&size=${bytes.length}`,
  };
}
export function verifyAttachment(url: string): Reference {
  try {
    const size = attachmentReferenceSize(url);
    const token = url.slice(REFERENCE_PREFIX.length).split("&")[0];
    const raw = Buffer.from(token, "base64url");
    if (raw.toString("base64url") !== token) throw new Error();
    const decipher = createDecipheriv(
      "aes-256-gcm",
      storage().signingKey,
      raw.subarray(0, 12),
    );
    decipher.setAuthTag(raw.subarray(12, 28));
    const data = JSON.parse(
      Buffer.concat([
        decipher.update(raw.subarray(28)),
        decipher.final(),
      ]).toString("utf8"),
    ) as Reference;
    if (
      !/^uploads\/\d{4}-\d{2}-\d{2}\/[0-9a-f-]{36}\.[a-z0-9]{1,16}$/.test(
        data.key,
      ) ||
      typeof data.filename !== "string" ||
      validateFile(data.filename, data.size) !== data.mediaType ||
      data.size !== size ||
      !Number.isSafeInteger(data.expires) ||
      data.expires <= Date.now() ||
      data.expires > Date.now() + TTL ||
      !/^[a-f0-9]{64}$/.test(data.digest)
    )
      throw new Error();
    return data;
  } catch {
    throw new Error(
      "附件引用无效或已过期（24 小时），请开启新对话并重新上传。",
    );
  }
}
export async function signAttachment(reference: Reference): Promise<string> {
  const { cos, Bucket, Region } = storage();
  const seconds = Math.min(300, Math.floor((reference.expires - Date.now()) / 1000));
  if (seconds < 1) throw new Error("附件引用已过期，请重新上传。");
  return new Promise((resolve, reject) => {
    cos.getObjectUrl(
      {
        Bucket, Region, Key: reference.key, Sign: true, Method: "GET",
        Protocol: "https:", Expires: seconds,
        Query: { "response-content-type": reference.mediaType },
      },
      (error, data) => {
        if (error) reject(new Error("附件签名失败，请稍后重试。"));
        else resolve(data.Url);
      },
    );
  });
}

export async function loadAttachment(reference: Reference): Promise<Buffer> {
  const { cos, Bucket, Region } = storage();
  const chunks: Buffer[] = [];
  let size = 0;
  const output = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      size += chunk.length;
      if (size > reference.size)
        return callback(new Error("Attachment size exceeded"));
      chunks.push(Buffer.from(chunk));
      callback();
    },
  });
  try {
    await Promise.race([
      cos.getObject({
        Bucket,
        Region,
        Key: reference.key,
        Range: `bytes=0-${reference.size}`,
        Output: output,
      }),
      new Promise<never>((_resolve, reject) => output.once("error", reject)),
    ]);
    const bytes = Buffer.concat(chunks);
    if (
      size !== reference.size ||
      createHash("sha256").update(bytes).digest("hex") !== reference.digest
    )
      throw new Error("Attachment changed");
    validateAttachmentBytes(reference, bytes);
    return bytes;
  } catch {
    throw new Error(
      "附件读取失败或内容已变化，请检查 COS 读取权限、文件是否已清理，并重新上传。",
    );
  } finally {
    output.destroy();
  }
}
