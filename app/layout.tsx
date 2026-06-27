import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { SiteHeader } from "@/components/layout/site-header";
import { VisitorInitializer } from "@/components/visitor/visitor-initializer";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Career Decision AI",
  description: "AI 驱动的离职决策分析助手",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.variable} font-sans antialiased`}>
        <VisitorInitializer />
        <SiteHeader className="fixed left-0 top-0 z-50 px-6 py-5 md:px-8" />
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
