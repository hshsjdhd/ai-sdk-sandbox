import {
  loadAttachment,
  verifyAttachment,
} from "../../../server/attachment-storage";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "1";
  url.searchParams.delete("download");
  try {
    const reference = verifyAttachment(`${url.pathname}${url.search}`);
    const bytes = await loadAttachment(reference);
    const inline = !download && reference.mediaType.startsWith("image/");
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": inline
          ? reference.mediaType
          : "application/octet-stream",
        "Content-Length": String(bytes.length),
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(reference.filename).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16)}`)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Referrer-Policy": "no-referrer",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "附件不可用，请重新上传。",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
