# Chat Lab

Next.js App Router + Hono + AI SDK 7 的聊天 MVP。

## 启动

```sh
pnpm install
pnpm dev
```

打开 http://localhost:3000。未配置 API Key 时默认使用本地演示；它通过真实的 `useChat` / Hono / SSE 链路返回明确标注的演示内容，不会请求模型。在页面右上角切换「真实模型」即可调用模型，切换模式会清空当前会话。

真实模式在 `.env.local` 中配置（不要把密钥放入 `NEXT_PUBLIC_*`）：

```dotenv
OPENAI_API_KEY=your-api-key
# 默认沿用现有 CLI 示例的兼容接口，可改成其他 OpenAI 兼容地址
OPENAI_BASE_URL=https://ouyangai.com/v1
OPENAI_MODEL=gpt-6-luna
```

服务端使用 OpenAI Chat Completions 兼容协议。配置修改后重启服务。

## 功能

- 发送、多轮上下文、逐段流式渲染，生成中禁止重复发送。
- 停止生成：`useChat.stop()` 中断请求；Hono 将请求的 `AbortSignal` 传递给模型。保留已经收到的内容，可继续追问。
- Markdown、表格、代码块、可折叠思考内容、复制回复。
- 错误提示与重试、新对话、自动跟随滚动、中文输入法与手机端适配。
- 对话仅存在当前页面内存中，刷新后清空。生成期间不可切换模式或清空会话。

## 命令与结构

```sh
pnpm dev        # Next.js 开发模式
pnpm build      # 生产构建，包含类型检查
pnpm start      # 启动生产构建
pnpm typecheck  # 只检查 MVP；原有 CLI 示例不纳入检查
pnpm cli        # 原有 src/index.ts 示例
```

- `src/components/chat.tsx`：`useChat`、发送 / 停止及 UI。
- `src/server/chat.ts`：Hono `/api/chat`、消息校验、真实 / 演示流。
- `src/app/api/[[...route]]/route.ts`：Next.js 挂载 Hono。
- `src/app/globals.css`：响应式 UI。

健康检查：`GET /api/health`。本地验证先使用演示模式，真实模型调用需要有效密钥、模型及可用网络。Vercel 的取消转发通过 `vercel.json` 开启；其他部署环境也需要将客户端断开传播到请求信号，才能终止上游生成。

接口用法参考：[AI SDK Chatbot](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot)、[Stopping Streams](https://ai-sdk.dev/docs/advanced/stopping-streams)、[Hono on Next.js](https://hono.dev/docs/getting-started/nextjs)。
