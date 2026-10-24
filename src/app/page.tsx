import { Chat } from "../components/chat";

export default function Page() {
  return <Chat model={process.env.OPENAI_MODEL || "gpt-6-luna"} />;
}
