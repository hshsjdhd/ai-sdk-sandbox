import { ArrowRight, Code2, Sparkles, WandSparkles } from "lucide-react";

const suggestions = [
  {
    icon: WandSparkles,
    title: "让灵感发生",
    text: "帮我想 5 个有趣的周末小项目，适合一个人完成。",
    description: "一起探索下一个好点子",
  },
  {
    icon: Code2,
    title: "把问题拆开",
    text: "用一个简单的例子解释什么是流式响应，并给出 TypeScript 代码。",
    description: "代码、概念，都可以聊聊",
  },
  {
    icon: Sparkles,
    title: "写得更好一点",
    text: "帮我写一段简短、自然的自我介绍，用于新团队的第一次见面。",
    description: "从第一句话开始",
  },
];

export function ChatWelcome({
  busy,
  onSend,
}: {
  busy: boolean;
  onSend: (text: string) => void;
}) {
  return (
    <section className="welcome">
      <div className="welcome-symbol">
        <Sparkles size={34} strokeWidth={1.4} />
        <span className="orbit-dot" />
      </div>
      <div className="eyebrow">A LITTLE SPACE FOR BIG IDEAS</div>
      <h1>
        你好，今天想聊些什么<span>？</span>
      </h1>
      <p className="welcome-description">
        一个想法，一个问题，或是一点好奇。
        <br />
        从这里开始，我们一起把它变得更清晰。
      </p>
      <div className="suggestions">
        {suggestions.map((item) => (
          <button
            key={item.title}
            onClick={() => onSend(item.text)}
            disabled={busy}
          >
            <item.icon size={21} strokeWidth={1.5} />
            <strong>{item.title}</strong>
            <span>{item.description}</span>
            <ArrowRight size={15} className="suggestion-arrow" />
          </button>
        ))}
      </div>
      <div className="welcome-caption">
        <span /> 随时发送，随时停下，按你的节奏来。
      </div>
    </section>
  );
}
