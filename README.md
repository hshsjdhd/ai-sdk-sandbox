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

聊天使用无状态 Responses 请求（`store: false`）：每次重放完整的文字和附件内容，但仅在模型输入副本中移除历史推理、文本/文件的 provider metadata 和文件 provider reference，不修改页面中的推理摘要或原始消息。SDK 默认会将带 `itemId` 的历史回答/推理转换为 `item_reference`，即使没有 `previous_response_id` 或 `conversation`；自定义网关未必能解析这些跨请求引用。仅设置 `store: false` 会跳过未加密推理，但仍会重放带加密内容的推理，因此同时清理历史以避免依赖网关可移植性。SDK 对已识别的推理模型可能自动请求加密推理内容，但不会将其重放给网关。COS 签名直链和附件缓存流程不变。

模型错误日志仅保留类别、HTTP 状态和重试次数，不记录原始错误、请求/响应体、凭据或签名 URL。上游 5xx 显示服务暂不可用，而非提示 API Key 错误。本地模拟可验证历史引用触发条件；真实网关 502 的内部原因仍需网关侧日志确认。

原有 CLI 示例也使用 `OPENAI_API_KEY`，接口地址由各示例独立配置。

## 功能

- 发送、多轮上下文、逐段流式渲染，生成中禁止重复发送。
- 停止生成：`useChat.stop()` 中断请求；Hono 将请求的 `AbortSignal` 传递给模型。保留已经收到的内容，可继续追问。
- Markdown、表格、代码块、可折叠思考内容、复制回复。
- 错误提示与重试、新对话、自动跟随滚动、中文输入法与手机端适配。
- 对话仅存在当前页面内存中，刷新后清空。生成期间不可清空会话。

## 附件

- 点击输入框中的「附件」按钮、拖入文件或粘贴图片；拖入时显示放置提示。附件卡片显示缩略图、文件类型和大小，发送前可移除，支持只发送附件。读取状态、限制说明与错误提示均为中文；详细格式说明可展开查看。已发送的原始文件可在对话中下载，支持手机端与暗黑模式。
- Supported: PNG, JPEG, WebP, GIF, PDF, UTF-8 TXT/MD/Markdown/CSV/TSV/JSON, and modern Office DOCX/XLSX/PPTX. Source/config extensions: HTML/HTM, CSS/SCSS/LESS, JS/JSX/MJS/CJS, TS/TSX, Vue/Svelte, PY/Java/C/CPP/H/HPP/CS/Go/RS/PHP/RB, SH/Bash/PS1/SQL, YAML/YML/TOML/XML/INI/CONF/CFG/LOG (case-insensitive). Legacy DOC/XLS/PPT, encrypted files, macros, and other extensions are not supported.
- HTML, source and configuration files are normalized to `text/plain` regardless of browser MIME guesses, decoded as UTF-8, and provided verbatim as labeled model text: never executed or rendered as active HTML. Previews show their filename extension, not a webpage; downloads remain inert binary attachments. Invalid UTF-8, NUL bytes and empty text are rejected during reading/upload and server loading; JSON still requires strict JSON syntax during model preparation. Code/config formats are not parsed or executed. COS references, actual byte/history limits, and optional direct image/PDF handling are unchanged.
- Images and PDF default to inline files; opt-in direct COS URLs are described below (the configured model must support them). Text and Office files are extracted on the server into labeled text for the model; Office formatting, drawings, embedded objects, formulas without cached results, notes, and OCR are not supported. Spreadsheet cells retain cell references. Extraction is not a faithful visual rendering.
- Limits: 4 files per message, 5 MiB per file, 10 MiB of original attachment bytes per request **including history**. Start a new chat when the budget is exhausted. Chat JSON contains small references, not base64; the existing 15 MiB request cap still applies to message text. Hosting platforms may impose smaller upload limits.
- Extracted text is limited to 100,000 characters per file / 400,000 per request; oversized extraction is rejected, not silently truncated. Office ZIP expansion is capped at 20 MiB / 2,000 entries. Invalid UTF-8/JSON, corrupt archives, and documents without extractable text return errors before any model call.
- Server and client validate types, signatures and byte budgets. Remote URLs and legacy data-URL chat attachments are rejected; extraction does not fetch external document links. Uploads return opaque, authenticated-encrypted references bound to one object, filename, type, byte length, SHA-256 digest and a 24-hour expiry. Browser history stores and sends only these references. Before model conversion the server verifies all references and history budgets. Inline reads use bounded streams and check actual bytes, digest and type. Text/Office extraction reuses a bounded process-local cache; opt-in direct image/PDF inputs bypass server downloads as described below. Do not attach sensitive documents to an untrusted model provider.

### Attachment latency and direct model URLs

Server-only settings (restart after changes):

```dotenv
COS_MODEL_DIRECT_URLS=0
ATTACHMENT_TIMINGS=1
OPENAI_MODEL=gpt-6.1-sol
```

- Set `COS_MODEL_DIRECT_URLS=1` only after confirming your configured gateway/model supports **Responses API** `input_file.file_url` for PDFs and `input_image.image_url` for images, and can fetch HTTPS COS URLs with signed query strings. Installed `@ai-sdk/openai` 4.0.74 explicitly supports these shapes and declares both URL types; this does **not** establish capabilities of the custom gateway or GPT-6 model names. Direct mode defaults off because remote capability has not been verified. Set it back to `0` to use the existing inline path; there is no automatic retry/duplicate paid model call.
- Direct mode verifies every opaque reference and metadata/budget on every turn, then creates fresh object-scoped GET signatures lasting at most five minutes and never beyond reference expiry. Only URLs minted for that request may pass through AI SDK's download hook; other remote inputs are rejected, never fetched. Signed URLs are sent only to the model gateway, not saved in browser history. The bucket stays private. Providers may retain requests: trust the gateway before enabling. The default gateway uses HTTP; set server-only `OPENAI_BASE_URL` to a trusted HTTPS Responses-compatible endpoint before enabling direct links in production.
- Direct mode relies on upload-time byte validation and immutable random object keys: it does not re-download/re-hash the object, so privileged COS writers could replace it. Restrict writes/deletes and do not overwrite upload keys. Inline mode continues to verify the digest. Deletion/replacement, inaccessible URLs, or provider queues longer than signature lifetime can fail; retry generates fresh signatures while the 24-hour reference remains valid.
- Text/Office remains extracted text, not a URL. Successful extraction is cached for up to five minutes (never past reference expiry), with LRU limits of 64 entries / 8 MiB UTF-8 text per server process. All history limits and reference authentication still run on hits. Cache hits avoid repeated COS downloads/extraction, but document changes/deletion may remain invisible until eviction/expiry. Restarts, separate workers and serverless cold starts lose the cache; concurrent initial requests may duplicate work. No document text is written to disk.
- `ATTACHMENT_TIMINGS=1` enables numeric, content-free phase logs: upload body/type validation, COS upload, reference validation, COS signing/download, extraction/cache hit, attachment preparation, model-message conversion, model first chunk and completion. Durations are milliseconds; preparation includes its child phases, model phases start at `streamText` and include provider queue/network/reasoning time. First chunk is not necessarily first visible text. No filenames, references, signed URLs, credentials or document contents are logged. Disable with `0` or unset. Small files can still incur substantial provider reasoning/queue latency; direct mode cannot eliminate that latency or model token costs.

## 腾讯云 COS 文件上传

接口 `POST /api/upload` 由服务端转存至已有 COS 存储桶，聊天选择、拖入或粘贴附件时自动调用。先校验并读取文件，再上传 COS，成功后才加入待发送附件；上传期间禁止发送、新建对话和重复添加。多文件依次上传，失败文件显示错误并可重新添加，成功文件保留。

预览、下载和模型解析通过服务端校验引用后读取私有 COS 文件。`GET /api/attachments?ref=...&size=...` 仅允许读取引用绑定的对象；`&download=1` 强制下载。图片可预览，其他类型强制作为二进制附件下载，响应禁止缓存并设置 nosniff / CSP。浏览器不接收桶名、对象路径或 COS 密钥。引用 24 小时后过期，须开启新对话并重新上传；COS 密钥或桶配置轮换也会使旧引用失效。移除附件、清空对话或刷新不会删除对象；建议配置生命周期规则，保留时间至少覆盖引用有效期。重试可能产生重复对象。

在 `.env.local` 配置以下服务端变量，修改后重启服务；不要使用 `NEXT_PUBLIC_*`，也不要将密钥写入前端代码或提交 Git：

```dotenv
COS_SECRET_ID=your-secret-id
COS_SECRET_KEY=your-secret-key
COS_BUCKET=your-bucket-1250000000
COS_REGION=ap-guangzhou
```

`COS_BUCKET` 必须包含 APPID 后缀，`COS_REGION` 必须是桶实际地域。建议使用仅授权目标桶 `uploads/*` 前缀的 CAM 子账号密钥，授予 `cos:PutObject` 和 `cos:GetObject`（现有密钥若已有读取权限则无需新增）；接口显式设置私有 ACL，如权限策略要求，还需 `cos:PutObjectACL`。不要使用主账号密钥。

调用示例（PowerShell，无需 Token 或 Authorization 请求头）：

```powershell
curl.exe -X POST http://localhost:3000/api/upload `
  -F "file=@D:\files\example.pdf"
```

成功返回 HTTP 201：

```json
{
  "file": {
    "type": "file",
    "filename": "example.pdf",
    "mediaType": "application/pdf",
    "url": "/api/attachments?ref=OPAQUE_AUTHENTICATED_REFERENCE&size=1024"
  }
}
```

- 仅接受一个名为 `file` 的文件字段，不接受其他字段；非空文件最大 5 MiB，整个 multipart 请求最大 5 MiB + 64 KiB，读取过程中也会限制实际请求大小。
- 文件保存为 `uploads/YYYY-MM-DD/随机 UUID.扩展名`，不接受客户端指定路径；所有文件按附件、二进制类型和私有 ACL 保存。服务端校验上述支持格式、实际大小和文件签名；不做病毒扫描，文字/Office 的完整解析在聊天发送时进行。
- **上传仍无需 Token 或登录，任何能访问接口的人都能上传并消耗存储和流量**；`COS_UPLOAD_TOKEN` 不再读取。引用使用由服务端 COS 密钥和桶配置派生的独立 AES-256-GCM 密钥保护，无法修改对象路径或访问整个桶，但它是可转发的 bearer capability：持有者可在过期前读取和重放该文件。没有用户隔离、逐文件撤销、配额或速率限制。不要分享引用；网关日志应隐藏查询参数，禁止缓存下载响应。仅建议在可信网络使用；公网部署前加入身份验证、授权、限流、配额、扫描和 HTTPS。删除对象或轮换密钥可使引用失效。
- 错误响应为 `{ "error": "说明" }`：400 表单/文件无效，413 超限，415 请求类型不支持，503 配置缺失，502 COS 上传失败。不会返回 COS 密钥或上游原始错误。
- 部署平台可能先于应用拒绝大请求，例如 Vercel Functions 的请求体限制约 4.5 MB；5 MiB 应用限制不保证部署平台可接收。如需更大文件，请采用浏览器临时授权直传或支持对应大小的自托管环境。

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
