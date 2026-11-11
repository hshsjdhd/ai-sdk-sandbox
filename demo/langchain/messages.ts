import { createAgent, SystemMessage, tool } from "langchain";
import { z } from "zod";
import { model } from "./model";
const getWeather = tool(async ({ city }) => `${city} 今天晴朗。`, {
  name: "get_weather",
  description: "查询城市天气",
  schema: z.object({
    city: z.string(),
  }),
});
const agent = createAgent({ model, tools: [getWeather] });
const modelWithTools = model.bindTools([getWeather]);
const response = await agent.invoke({
  messages: [
    {
      role: "user",
      content: "旧金山天气如何",
    },
  ],
});
console.log(response.messages.at(-1)?.content);
console.log("-------------------");
// for (const toolCall of response.tool_calls ?? []) {
//   console.log(toolCall.name);
//   console.log(toolCall.args);
//   console.log(toolCall.id);
// }

import { AIMessage, HumanMessage, ToolMessage } from "langchain";

const aiMessage = new AIMessage({
  content: [],
  tool_calls: [
    {
      name: "get_weather",
      args: { city: "旧金山" },
      id: "call_123",
    },
  ],
});

const toolMessage = new ToolMessage({
  content: "旧金山今天晴下大雨。",
  tool_call_id: "call_123",
  name: "get_weather",
});

const messages = [
  // new HumanMessage("旧金山今天的天气怎么样？"),
  new HumanMessage({
    contentBlocks: [
      { type: "text", text: "请描述这张图片,并识别这个女人是谁" },

      {
        type: "file",

        url: "https://n.sinaimg.cn/sinakd20113/92/w1646h1646/20230316/e13e-161aa3eaeb452e5162068a0ef4a20c9b.jpg",
      },
    ],
  }),
  aiMessage,
  new SystemMessage("绘声绘色描述"),
  toolMessage,
];

const res = await model.invoke(messages);
console.log(res.text);

import { AIMessageChunk } from "langchain";

const chunks = await model.stream("用三句话介绍 LangChain。");
let finalChunk: AIMessageChunk | undefined;

for await (const chunk of chunks) {
  process.stdout.write(chunk.text);
  finalChunk = finalChunk ? finalChunk.concat(chunk) : chunk;
}

console.log("\n完整消息：", finalChunk?.text);
console.log("-------------");

import { load } from "@langchain/core/load";

const message = new HumanMessage("法国的首都是哪里？");
const serialized = message.toJSON();

const restored = await load<HumanMessage>(JSON.stringify(serialized));
console.log(restored.text);
