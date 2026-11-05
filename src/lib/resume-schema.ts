import { z } from "zod";

export const ResumeScoreSchema = z.object({
  score: z.number().min(0).max(100).describe("简历总分 1-100"),
  summary: z.string().describe("一句话对候选人进行总结"),
  dimensions: z
    .array(
      z.object({
        name: z.string(),
        score: z.number().min(0).max(10),
        comment: z.string(),
      }),
    )
    .describe("各维度评分，每项有名称、0-10 分、简评"),
  recommendation: z.enum(["strong-hire", "hire", "lean-hire", "no-hire"]),
  risks: z.array(z.string()),
});
export type ResumeScore = z.infer<typeof ResumeScoreSchema>;
