"use client";

import { ArticleChat, createArticleChatResetHistoryTool } from "./article-chat";
import { runStreamingChat } from "./controller";

const resetHistoryTool = createArticleChatResetHistoryTool();

export default function AgentStreamingDemo() {
  const suggesttions = [
    {
      label: "解释 AIMessageChunk",
      prompt: "请解释 AIMessageChunk 是什么，以及它和 AIMessage 有什么区别。",
    },
    {
      label: "写一个 Agent 流式示例",
      prompt: [
        "请用 TypeScript 写一个最小的 createAgent() 流式示例，",
        "并解释每一步。",
      ].join(""),
    },
  ];

  return (
    <ArticleChat
      title="Agent 流式输出"
      subtitle="LangChain createAgent() · streamMode: messages"
      emptyText="发送一个问题，观察 Agent 生成的消息块如何立即显示"
      suggestions={suggesttions}
      placeholder="输入一个前端或 LangChain 问题..."
      pendingText="Agent 正在生成"
      modelControlsEnabled={false}
      modelSettingsReadOnly
      composerTools={[resetHistoryTool]}
      onRun={runStreamingChat}
    />
  );
}
