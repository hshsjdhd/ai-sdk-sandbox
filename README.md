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
OPENAI_API_KEY=your-provider-api-key
```

Next.js 自动加载项目根目录的 `.env.local` 或 `.env`，无需给 `next dev` 添加 `--env-file`。聊天接口通过 OpenAI Provider 连接 `src/server/chat.ts` 中配置的自定义接口，密钥必须由该接口服务提供。已有进程环境变量优先于环境文件；配置修改后重启服务。

接口请求中等推理强度和自动推理摘要；是否返回摘要取决于接口和模型的支持情况。有推理摘要时，页面显示可折叠内容。

原有 CLI 示例也使用 `OPENAI_API_KEY`，接口地址由各示例独立配置。

## 功能

- 发送、多轮上下文、逐段流式渲染，生成中禁止重复发送。
- 停止生成：`useChat.stop()` 中断请求；Hono 将请求的 `AbortSignal` 传递给模型。保留已经收到的内容，可继续追问。
- Markdown、表格、代码块、可折叠思考内容、复制回复。
- 错误提示与重试、新对话、自动跟随滚动、中文输入法与手机端适配。
- 对话仅存在当前页面内存中，刷新后清空。生成期间不可清空会话。

## 样式与暗黑模式

- 已接入 Tailwind CSS v4，通过 `postcss.config.mjs` 加载；可以直接使用工具类和 `dark:` 变体。
- `src/app/globals.css` 保留原有样式，不启用 Preflight 重置，避免影响 Markdown 与既有页面布局；现有样式放在 `base` 层，工具类可正常覆盖。
- 页面采用黑白灰中性色，浅色为白底深色文字，暗黑为近黑底浅色文字，主按钮随主题反转；错误状态保留红色提示。
- 聊天页和报告页右上角均可选择浅色、暗黑或跟随系统，默认跟随系统。选择通过 `next-themes` 保存在本地，并在标签页间同步。
- `ThemeProvider` 在首次绘制前应用根元素的 `.dark` 类，刷新时保持主题；全局 CSS 变量同时适配现有组件与报告页面。

## useObject 结构化报告示例

打开 http://localhost:3000/report。该页面与 `/` 聊天页面、`/api/chat` 接口独立，不会修改聊天状态。

- 输入报告要求，实时查看报告预览和 `object` 的部分 JSON。
- 支持停止生成并保留部分结果、清空结果及失败后重新生成。
- `onFinish` 中获取校验通过的完整报告，页面下方可展开查看。
- 前后端共用 `src/lib/report-schema.ts`；`POST /api/report` 使用 `streamText` + `Output.object`，通过 `toTextStreamResponse()` 返回 JSON 文本流，由前端 `useObject` 解析。

复用服务端 `OPENAI_API_KEY`，另支持以下可选环境变量（仅影响报告示例）：

```dotenv
OPENAI_BASE_URL=http://your-openai-compatible-endpoint/v1
OPENAI_REPORT_MODEL=gpt-6.1-sol
```

不设置接口地址时沿用聊天示例的自定义接口地址；模型需要支持结构化输出。报告接口接受 `{ "prompt": "报告要求" }`，要求为 1 至 2000 字。生成失败或最终对象校验失败时显示错误，不会将部分对象标记为完成。报告数据仅保存在当前页面内存中。

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
