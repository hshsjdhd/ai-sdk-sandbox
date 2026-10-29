import type { Metadata } from "next";
import { ReportExample } from "../../components/report-example";

export const metadata: Metadata = {
  title: "结构化报告 · Chat Lab",
};

export default function ReportPage() {
  return (
    <ReportExample model={process.env.OPENAI_REPORT_MODEL || "gpt-6.1-sol"} />
  );
}
