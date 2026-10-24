# Chat Lab

Next.js App Router + Hono + AI SDK 7 的聊天 MVP。

## 启动

```sh
pnpm install
pnpm dev
```

打开 http://localhost:3000。页面通过 `useChat` 请求 Hono 接口，并通过 SSE 流式渲染模型回复。

在 `.env.local` 中配置（不要把密钥放入 `NEXT_PUBLIC_*`）：

```dotenv
AI_GATEWAY_API_KEY=your-vercel-ai-gateway-api-key
```

聊天接口使用 AI SDK 默认的 Vercel AI Gateway，通过 `openai/gpt-6.1-sol` 指定模型，不手动创建 OpenAI Provider。模型需在 Gateway 中可用；Vercel 环境也可使用 `VERCEL_OIDC_TOKEN` 身份认证。配置修改后重启服务。

接口请求中等推理强度和自动推理摘要；是否返回摘要取决于 Gateway 对应模型的支持情况。有推理摘要时，页面显示可折叠内容。

原有 CLI 示例仍使用 `OPENAI_API_KEY`，与网页聊天接口的 Gateway 配置独立。

## 功能

- 发送、多轮上下文、逐段流式渲染，生成中禁止重复发送。
- 停止生成：`useChat.stop()` 中断请求；Hono 将请求的 `AbortSignal` 传递给模型。保留已经收到的内容，可继续追问。
- Markdown、表格、代码块、可折叠思考内容、复制回复。
- 错误提示与重试、新对话、自动跟随滚动、中文输入法与手机端适配。
- 对话仅存在当前页面内存中，刷新后清空。生成期间不可清空会话。

## 命令与结构

```sh
pnpm dev        # Next.js 开发模式
pnpm build      # 生产构建，包含类型检查
pnpm start      # 启动生产构建
pnpm typecheck  # 只检查 MVP；原有 CLI 示例不纳入检查
pnpm cli        # 原有 src/index.ts 示例
```

- `src/components/chat.tsx`：`useChat`、会话操作、页面布局与滚动控制。
- `src/components/chat-welcome.tsx`：欢迎区与快捷提问。
- `src/components/chat-messages.tsx`：消息渲染、Markdown 与复制回复。
- `src/components/chat-composer.tsx`：输入框、发送 / 停止按钮、错误与重试提示。
- `src/server/chat.ts`：Hono `/api/chat`、消息校验与模型流。
- `src/app/api/[[...route]]/route.ts`：Next.js 挂载 Hono。
- `src/app/globals.css`：响应式 UI。

健康检查：`GET /api/health`。模型调用需要有效密钥、模型及可用网络。Vercel 的取消转发通过 `vercel.json` 开启；其他部署环境也需要将客户端断开传播到请求信号，才能终止上游生成。

接口用法参考：[AI SDK Chatbot](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot)、[Stopping Streams](https://ai-sdk.dev/docs/advanced/stopping-streams)、[Hono on Next.js](https://hono.dev/docs/getting-started/nextjs)。
