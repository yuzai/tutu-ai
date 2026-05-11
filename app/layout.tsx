import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "赛博图图小镇",
  description: "用 LLM 驱动的《大耳朵图图》多智能体仿真",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="font-cartoon text-stone-800 min-h-screen">{children}</body>
    </html>
  );
}
