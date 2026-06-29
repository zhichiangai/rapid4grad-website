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
    "RAPID4GRAD 是研究生畢業導航系統，協助研究生用 7 題檢查狀態，產生可貼到 ChatGPT、Claude、Gemini、Grok 的學術 AI 指令。",
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "RAPID4GRAD | Meeting 前，先知道教授會怎麼問",
    description:
      "選擇研究階段、Meeting 情境與卡關痛點，產生可貼到外部 AI 的學術指令。",
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
    description: "Meeting 前，先知道教授會怎麼問。",
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
