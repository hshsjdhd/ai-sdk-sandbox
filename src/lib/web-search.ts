export function safeSourceUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password)
      return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}
