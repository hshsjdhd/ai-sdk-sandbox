import model from "@/lib/model";
import { ResumeScoreSchema } from "@/lib/resume-schema";
import {
  createTextStreamResponse,
  createUIMessageStreamResponse,
  Output,
  streamText,
  toTextStream,
} from "ai";

export async function POST(request: Request) {
  console.log("POST /api/resume", request);
  55;

  const { resumeText } = await request.json();
  const result = streamText({
    model,
    output: Output.object({ schema: ResumeScoreSchema }),
    prompt: resumeText,
    abortSignal: request.signal,
    onError: ({ error }) => console.error("[resume] Generation failed:", error),
  });
  return createTextStreamResponse({
    stream: toTextStream({ stream: result.stream }),
  });
}
