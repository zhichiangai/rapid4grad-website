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
    default: "RAPID4GRAD｜研究生畢業導航系統",
    template: "%s | RAPID4GRAD",
  },
  description:
    "整合研究進度、教授 Meeting、下一步、論文里程碑與風險提醒，幫助研究生看懂目前研究狀態與接下來最值得處理的事情。",
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "RAPID4GRAD｜研究生畢業導航系統",
      description:
        "整合研究進度、教授 Meeting、下一步、論文里程碑與風險提醒。",
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
    title: "RAPID4GRAD｜研究生畢業導航系統",
    description: "整合研究進度、教授 Meeting、下一步、論文里程碑與風險提醒。",
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
