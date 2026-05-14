import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DTSKILLS — 开放 Agent 技能生态",
  description: "发现并安装 AI 编程 Agent 的技能",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
