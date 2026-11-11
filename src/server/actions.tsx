"use server";

import { streamUI } from "@ai-sdk/rsc";
import { z } from "zod";
import model from "@/lib/model";
export async function askCompanion(question: string) {
  const result = await streamUI({
    model,
    prompt: question,

    // 普通文本，流式渲染一个 <TextBubble>
    text: ({ content, done }) => (
      <TextBubble text={content} streaming={!done} />
    ),

    // 工具：返回的是组件，而不是数据
    tools: {
      getWeather: {
        description: "查询城市天气",
        inputSchema: z.object({ city: z.string() }),
        generate: async function* ({ city }) {
          yield <WeatherSkeleton />; // 调用中，骨架屏
          const weather = await fetchWeather(city);
          return <WeatherCard data={weather} />; // 拿到数据，换完整卡片
        },
      },
    },
  });

  return result.value; // 这是一个 React element
}
