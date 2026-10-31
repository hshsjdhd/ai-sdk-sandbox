import { performance } from "node:perf_hooks";

export function phaseTimer() {
  const start = performance.now();
  return (phase: string, counts: Record<string, number> = {}) => {
    if (process.env.ATTACHMENT_TIMINGS === "1")
      console.info("[chat-timing]", {
        phase,
        ms: Math.round(performance.now() - start),
        ...counts,
      });
  };
}

// Process-local, bounded cache; never persist document text or failed loads.
const cache = new Map<string, { text: string; expires: number; bytes: number }>();
let retainedBytes = 0;
const MAX_BYTES = 8 * 1024 * 1024;
export async function cachedAttachmentText(
  key: string,
  expires: number,
  load: () => Promise<string>,
): Promise<string> {
  const timer = phaseTimer();
  for (const [id, entry] of cache) {
    if (entry.expires <= Date.now()) {
      cache.delete(id);
      retainedBytes -= entry.bytes;
    }
  }
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    timer("text-cache", { hit: 1 });
    return hit.text;
  }
  const text = await load();
  const bytes = Buffer.byteLength(text, "utf8");
  if (bytes <= MAX_BYTES && expires > Date.now()) {
    const previous = cache.get(key);
    if (previous) {
      cache.delete(key);
      retainedBytes -= previous.bytes;
    }
    while (cache.size >= 64 || retainedBytes + bytes > MAX_BYTES) {
      const oldest = cache.keys().next().value!;
      retainedBytes -= cache.get(oldest)!.bytes;
      cache.delete(oldest);
    }
    cache.set(key, { text, bytes, expires: Math.min(expires, Date.now() + 300_000) });
    retainedBytes += bytes;
  }
  timer("text-cache", { hit: 0 });
  return text;
}
