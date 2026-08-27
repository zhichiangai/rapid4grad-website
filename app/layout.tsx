import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.rapid4grad.com",
  ),
  title: {
    default: "RAPID4GRAD | Meeting 前，先知道教授會怎麼問",
    template: "%s | RAPID4GRAD",
  },
  description:
    "RAPID4GRAD 是研究生 AI 工作導航系統，提供 ChatGPT、Claude、Gemini、Grok 的研究 Prompt Pack，以及 Codex、Claude Code、Cursor、GitHub Copilot、OpenCode 的 Agent 執行包與研究 Skill 工作流。",
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "RAPID4GRAD | Meeting 前，先知道教授會怎麼問",
      description:
        "從研究分析到直接執行，一次準備 Chat AI Prompt Pack 與 Coding / Research Agent 執行工作流。",
    url: "/",
    siteName: "RAPID4GRAD",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "RAPID4GRAD",
      },
    ],
    locale: "zh_TW",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RAPID4GRAD",
    description: "研究 Prompt 與 Agent 工作流，一次準備好。",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
