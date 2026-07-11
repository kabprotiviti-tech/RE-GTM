import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Project Capital Velocity — Off-Plan Capital & Yield Optimisation",
  description:
    "Deterministic three-tier pricing, cashflow simulation, and AI-narrated GTM strategy for Tier-1 GCC developers.",
  keywords: ["PropTech", "Dubai Real Estate", "Off-Plan", "Pricing Engine", "Capital Velocity", "Emaar", "Aldar"],
  authors: [{ name: "Project Capital Velocity" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} style={{ background: "#FAFAFA", color: "#1A1A1A" }}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
