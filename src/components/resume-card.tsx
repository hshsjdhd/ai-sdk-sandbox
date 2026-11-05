"use client";
import { useObject } from "@ai-sdk/react";
import { ResumeScoreSchema } from "@/lib/resume-schema";

export function ResumeScoreCard() {
  const { object, submit, isLoading, error, stop } = useObject({
    api: "/api/resume",
    schema: ResumeScoreSchema,
  });

  return (
    <div>
      <button
        onClick={() =>
          submit({
            resumeText:
              "刚毕业大学生 只会html css 5没有真实项目经验 但是学历不错",
          })
        }
        disabled={isLoading}
      >
        开始评分
      </button>

      {object != null && (
        <div className="score-card">
          <h1>总分：{object.score}/100</h1>
          {object.summary && <p>{object.summary}</p>}

          <ul>
            {object.dimensions?.map((d, i) => (
              <li key={i}>
                <strong>{d?.name}</strong>：{d?.score}/10
                {d?.comment && <p>{d.comment}</p>}
              </li>
            ))}
          </ul>

          {object.recommendation && (
            <span className="recommendation">{object.recommendation}</span>
          )}

          {object.risks && object.risks.length > 0 && (
            <div className="risks">
              <h3>风险提示：</h3>
              <ul>
                {object.risks.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {isLoading && <button onClick={stop}>停止</button>}
      {error && <div>出错：{error.message}</div>}
    </div>
  );
}
