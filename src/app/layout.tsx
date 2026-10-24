import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chat Lab · AI SDK Sandbox",
  description:
    "A small space for big ideas. Streaming chat powered by Next.js, Hono and AI SDK.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
