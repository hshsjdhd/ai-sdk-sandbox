import { getToolName, type DynamicToolUIPart, type ToolUIPart } from "ai";
import {
  Check,
  ChevronDown,
  CircleAlert,
  Clock,
  Globe,
  LoaderCircle,
  Square,
  Wrench,
} from "lucide-react";
import { safeSourceUrl } from "../lib/web-search";

type ToolPart = ToolUIPart | DynamicToolUIPart;

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function toolSearchDetails(part: ToolPart) {
  const queries = new Set<string>();
  const sources = new Map<string, string>();
  if (getToolName(part) !== "web_search") return { queries: [], sources };
  const output = record(part.output);
  const action = record(output?.action);
  for (const data of [record(part.input), action]) {
    if (typeof data?.query === "string" && data.query.trim())
      queries.add(data.query);
    if (Array.isArray(data?.queries)) {
      for (const query of data.queries) {
        if (typeof query === "string" && query.trim()) queries.add(query);
      }
    }
  }
  if (Array.isArray(output?.sources)) {
    for (const item of output.sources) {
      const source = record(item);
      const url = typeof source?.url === "string" && safeSourceUrl(source.url);
      if (url && !sources.has(url)) {
        sources.set(
          url,
          typeof source?.title === "string" && source.title.trim()
            ? source.title
            : new URL(url).hostname,
        );
      }
    }
  }
  return { queries: [...queries], sources };
}

function toolStatus(part: ToolPart, active: boolean, stopped: boolean) {
  if (part.state === "output-error")
    return { kind: "error", label: "调用失败", Icon: CircleAlert };
  if (
    part.state === "output-denied" ||
    (part.state === "approval-responded" && !part.approval.approved)
  )
    return { kind: "denied", label: "已拒绝", Icon: Square };
  if (part.state === "output-available" && !part.preliminary)
    return { kind: "completed", label: "已完成", Icon: Check };
  if (stopped) return { kind: "interrupted", label: "已停止", Icon: Square };
  if (part.state === "approval-requested")
    return { kind: "approval", label: "等待审批", Icon: Clock };
  if (!active)
    return { kind: "interrupted", label: "已中断 · 未完成", Icon: Square };
  if (part.state === "approval-responded")
    return { kind: "running", label: "已批准 · 等待执行", Icon: Clock };
  return {
    kind: "running",
    label:
      part.state === "input-streaming"
        ? "正在接收参数"
        : part.state === "output-available"
          ? "正在接收结果"
          : "正在执行",
    Icon: LoaderCircle,
  };
}

function formatValue(value: unknown) {
  if (value === undefined) return undefined;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "无法显示此数据";
  }
}

const fieldLabels: Record<string, string> = {
  query: "查询内容",
  queries: "查询列表",
  action: "执行操作",
  type: "类型",
  sources: "来源列表",
  url: "链接",
  title: "标题",
  text: "文本",
  content: "内容",
  result: "结果",
  results: "结果列表",
  status: "状态",
  message: "说明",
  error: "错误",
};

function ToolValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value === null || value === undefined || value === "") {
    return (
      <span className="tool-value-empty">
        {value === "" ? "空文本" : "无值"}
      </span>
    );
  }
  if (typeof value === "boolean") {
    return <span className="tool-value-badge">{value ? "是" : "否"}</span>;
  }
  if (typeof value === "object") {
    const entries = Array.isArray(value)
      ? value.map((item, index) => [String(index + 1), item] as const)
      : Object.entries(value);
    if (!entries.length) {
      return (
        <span className="tool-value-empty">
          {Array.isArray(value) ? "空列表" : "无字段"}
        </span>
      );
    }
    if (depth >= 4) {
      return (
        <p className="tool-value-empty">嵌套内容较深，请展开原始数据查看。</p>
      );
    }
    const fields = (
      <dl className="tool-value-fields">
        {entries.map(([key, item]) => (
          <div className="tool-value-field" key={key}>
            <dt title={key}>
              {Array.isArray(value)
                ? `第 ${key} 项`
                : Object.hasOwn(fieldLabels, key)
                  ? fieldLabels[key]
                  : key}
            </dt>
            <dd>
              <ToolValue value={item} depth={depth + 1} />
            </dd>
          </div>
        ))}
      </dl>
    );
    return depth > 0 ? (
      <details
        className="tool-value-group"
        open={depth === 1 && entries.length <= 5}
      >
        <summary>
          <ChevronDown size={12} aria-hidden="true" />
          {entries.length} {Array.isArray(value) ? "项内容" : "个字段"}
        </summary>
        {fields}
      </details>
    ) : (
      fields
    );
  }
  const text = String(value);
  const url = typeof value === "string" ? safeSourceUrl(value) : undefined;
  return url ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      referrerPolicy="no-referrer"
    >
      {text}
    </a>
  ) : (
    <p className="tool-value-text">{text}</p>
  );
}

function ToolData({ value }: { value: unknown }) {
  let displayValue = value;
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (parsed !== null && typeof parsed === "object") displayValue = parsed;
    } catch {
      // Streaming arguments may not be complete JSON yet.
    }
  }
  return (
    <div className="tool-data">
      <div className="tool-data-preview">
        <ToolValue value={displayValue} />
      </div>
      <details className="tool-data-raw">
        <summary>
          <ChevronDown size={12} aria-hidden="true" />
          查看原始数据
        </summary>
        <pre>{formatValue(value)}</pre>
      </details>
    </div>
  );
}

export function ToolInvocationCard({
  part,
  active,
  stopped,
  sources = toolSearchDetails(part).sources,
}: {
  part: ToolPart;
  active: boolean;
  stopped: boolean;
  sources?: Map<string, string>;
}) {
  const name = getToolName(part);
  const search = name === "web_search";
  const { queries } = toolSearchDetails(part);
  const { kind, label, Icon } = toolStatus(part, active, stopped);
  const input =
    part.input !== undefined
      ? part.input
      : "rawInput" in part
        ? part.rawInput
        : undefined;
  const output = part.output;
  const reason = part.approval?.reason || part.approval?.requestReason;
  const hasDetails =
    input !== undefined ||
    output !== undefined ||
    !!part.errorText ||
    !!reason ||
    sources.size > 0;

  return (
    <section
      className={`tool-card tool-card-${kind}`}
      aria-label={`${name} 工具调用`}
    >
      <div className="tool-card-header">
        <span className="tool-card-icon" aria-hidden="true">
          {search ? <Globe size={16} /> : <Wrench size={16} />}
        </span>
        <div className="tool-card-title">
          <strong>{search ? "联网搜索" : name}</strong>
          <code>{name}</code>
        </div>
        <span
          className="tool-card-status"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <Icon
            size={13}
            aria-hidden="true"
            className={
              kind === "running" && Icon === LoaderCircle ? "spin" : undefined
            }
          />
          {label}
        </span>
      </div>
      {queries.length > 0 && (
        <div className="tool-card-queries">
          {queries.map((query) => (
            <p key={query}>
              <span>查询</span>
              {query}
            </p>
          ))}
        </div>
      )}
      {hasDetails && (
        <details className="tool-card-details">
          <summary>
            <ChevronDown size={13} aria-hidden="true" />
            调用详情
          </summary>
          <div className="tool-card-content">
            {part.errorText && (
              <div className="tool-card-error">
                <strong>错误</strong>
                <pre>{part.errorText}</pre>
              </div>
            )}
            {reason && (
              <div>
                <strong>审批说明</strong>
                <pre>{reason}</pre>
              </div>
            )}
            {input !== undefined && (
              <div>
                <strong>
                  输入{part.state === "input-streaming" ? "（接收中）" : ""}
                </strong>
                <ToolData value={input} />
              </div>
            )}
            {output !== undefined && (
              <div>
                <strong>
                  输出
                  {part.state === "output-available" && part.preliminary
                    ? "（部分结果）"
                    : ""}
                </strong>
                <ToolData value={output} />
              </div>
            )}
            {sources.size > 0 && (
              <div>
                <strong>搜索来源</strong>
                <ul>
                  {[...sources].map(([url, title]) => (
                    <li key={url}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        referrerPolicy="no-referrer"
                      >
                        {title}
                        <span>{new URL(url).hostname}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>
      )}
    </section>
  );
}
