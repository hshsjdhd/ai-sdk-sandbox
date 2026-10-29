import { z } from "zod";

export const ReportSchema = z.object({
  title: z.string(),
  summary: z.string(),
  sections: z.array(
    z.object({
      heading: z.string(),
      body: z.string(),
    }),
  ),
  conclusion: z.string(),
});

export const ReportRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(2000),
});

export type Report = z.infer<typeof ReportSchema>;
