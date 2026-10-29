"use client";

import { useObject } from "@ai-sdk/react";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  FileJson,
  Leaf,
  RotateCcw,
  Sparkles,
  Square,
} from "lucide-react";
import { ReportSchema, type Report } from "../lib/report-schema";
import styles from "./report-example.module.css";
import { ThemeSwitcher } from "./theme-switcher";

export function ReportExample({ model }: { model: string }) {
  const [prompt, setPrompt] = useState("写一份 300 字左右的 AI 伴侣产品周报。");
  const [finalReport, setFinalReport] = useState<Report>();
  const [stopped, setStopped] = useState(false);
  const { object, submit, isLoading, error, stop, clear } = useObject({
    api: "/api/report",
    schema: ReportSchema,
    onFinish({ object: completed, error: validationError }) {
      if (!validationError && completed) setFinalReport(completed);
    },
  });
  const status = isLoading
    ? "正在生成，字段将逐步出现…"
    : stopped
      ? "已停止，保留部分结果"
      : error
        ? "生成失败，可重新生成"
        : finalReport
          ? "生成完成，已通过 Schema 校验"
          : "等待生成";

  return (
    <div className="workspace">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Chat Lab 首页">
          <span className="brand-mark">
            <Leaf size={22} />
          </span>
          chat lab<span className="brand-dot">.</span>
        </Link>
        <Link className="new-chat" href="/">
          <ArrowLeft size={17} /> 返回聊天
        </Link>
        <div className="sidebar-section">示例实验室</div>
        <div className="active-chat">
          <FileJson size={17} />
          <span>结构化报告</span>
          <span className="active-dot" />
        </div>
        <div className="sidebar-note">
          <Sparkles size={20} />
          <p>
            让灵感，
            <br />
            逐步长成结构。
          </p>
          <span>AI SDK / USE OBJECT</span>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="page-label">
            Playground <span>/</span> <strong>结构化报告</strong>
          </div>
          <div className="topbar-right">
            <ThemeSwitcher />
            <Link href="/" className={styles.back}>
              <ArrowLeft size={15} /> 返回聊天
            </Link>
          </div>
        </header>
        <div className={styles.content}>
          <div className={styles.intro}>
            <span className={styles.eyebrow}>USE OBJECT / STREAMING JSON</span>
            <h1>把想法，变成一份报告。</h1>
            <p>
              streamText 生成 JSON，useObject
              将流式数据解析为对象。此示例独立于聊天页面。
            </p>
            <span className={styles.model}>模型：{model}</span>
          </div>
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              if (isLoading || !prompt.trim()) return;
              setFinalReport(undefined);
              setStopped(false);
              submit({ prompt: prompt.trim() });
            }}
          >
            <label htmlFor="report-prompt">报告要求</label>
            <textarea
              id="report-prompt"
              value={prompt}
              maxLength={2000}
              required
              disabled={isLoading}
              onChange={(event) => setPrompt(event.target.value)}
              rows={3}
            />
            <div className={styles.actions}>
              <span>{prompt.length} / 2000</span>
              <button
                type="button"
                disabled={isLoading || (!object && !error && !stopped)}
                onClick={() => {
                  clear();
                  setFinalReport(undefined);
                  setStopped(false);
                }}
              >
                <RotateCcw size={15} /> 清空结果
              </button>
              {isLoading ? (
                <button
                  type="button"
                  onClick={() => {
                    stop();
                    setStopped(true);
                  }}
                >
                  <Square size={14} /> 停止生成
                </button>
              ) : (
                <button
                  type="submit"
                  className={styles.primary}
                  disabled={!prompt.trim()}
                >
                  <Sparkles size={15} /> {error ? "重新生成" : "生成报告"}
                </button>
              )}
            </div>
          </form>
          <p role="status" className={styles.status}>
            {status}
          </p>
          {error && (
            <p role="alert" className={styles.error}>
              生成失败：{error.message}
              。请检查接口配置、网络及模型是否支持结构化输出，然后重试。
            </p>
          )}
          <div className={styles.grid}>
            <article className={styles.panel} aria-busy={isLoading}>
              <div className={styles.panelLabel}>实时报告预览</div>
              {object ? (
                <>
                  <h2>{object.title || "正在生成标题…"}</h2>
                  {object.summary && (
                    <p className={styles.summary}>{object.summary}</p>
                  )}
                  {object.sections?.map((section, index) => (
                    <section key={index}>
                      <h3>{section?.heading}</h3>
                      <p>{section?.body}</p>
                    </section>
                  ))}
                  {object.conclusion && (
                    <section>
                      <h3>结论</h3>
                      <p>{object.conclusion}</p>
                    </section>
                  )}
                </>
              ) : (
                <p className={styles.empty}>
                  输入报告要求，观察标题、摘要、章节与结论逐步出现。
                </p>
              )}
            </article>
            <div className={styles.panel}>
              <div className={styles.panelLabel}>object · 实时部分对象</div>
              <pre className={styles.json}>
                {object
                  ? JSON.stringify(object, null, 2)
                  : "// 等待 JSON 数据流…"}
              </pre>
            </div>
          </div>
          {finalReport && (
            <details className={styles.panel}>
              <summary>onFinish · 最终完整对象（Schema 校验通过）</summary>
              <pre className={styles.json}>
                {JSON.stringify(finalReport, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </main>
    </div>
  );
}
