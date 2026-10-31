import { APICallError, RetryError } from "ai";

export function reportChatError(error: unknown): string {
  const cause = RetryError.isInstance(error) ? error.lastError : error;
  const status = APICallError.isInstance(cause) ? cause.statusCode : undefined;
  const aborted = cause instanceof Error && cause.name === "AbortError";
  // Allowlist diagnostics: SDK errors can contain prompts, keys and signed URLs.
  console.error("[chat] Model request failed", {
    kind: aborted ? "aborted" : APICallError.isInstance(cause) ? "upstream" : "unknown",
    status,
    ...(RetryError.isInstance(error) ? { attempts: error.errors.length } : {}),
  });
  if (aborted) return "请求已停止。";
  if (status != null && status >= 500)
    return `模型上游服务暂时不可用（HTTP ${status}），请稍后重试。`;
  if (status === 401 || status === 403)
    return "模型服务认证或权限校验失败，请检查服务端配置。";
  if (status === 429) return "模型服务请求过于频繁或额度不足，请稍后重试。";
  return "模型请求失败，请稍后重试；若持续失败，请检查服务端配置。";
}
