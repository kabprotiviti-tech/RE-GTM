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
    "Bloomberg Terminal for real estate moguls. Deterministic three-tier pricing, cashflow simulation, and AI-narrated GTM strategy for Tier-1 GCC developers.",
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
      <head>
        {/* Pre-paint script: applies the saved theme to <html> before React hydrates.
            Prevents the white flash on load. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var themes = {
                    obsidian: { ground: "#0A0A0A", surface: "#141414", surfaceRaised: "#1C1C1C", border: "#262626", borderStrong: "#3A3A3A", textHeading: "#FFFFFF", textBody: "#94A3B8", textMuted: "#64748B", accent: "#E2E8F0", accentStrong: "#F8FAFC", gold: "#D4AF37", goldMuted: "#B8941F", positive: "#10B981", negative: "#EF4444", chartGrid: "#1F1F1F", chartAxis: "#64748B" },
                    "carbon-slate": { ground: "#1E293B", surface: "#273449", surfaceRaised: "#334155", border: "#3F4D63", borderStrong: "#52617A", textHeading: "#F8FAFC", textBody: "#CBD5E1", textMuted: "#94A3B8", accent: "#E2E8F0", accentStrong: "#FFFFFF", gold: "#D4AF37", goldMuted: "#B8941F", positive: "#34D399", negative: "#F87171", chartGrid: "#334155", chartAxis: "#94A3B8" },
                    "midnight-azure": { ground: "#0F172A", surface: "#1E293B", surfaceRaised: "#293548", border: "#334155", borderStrong: "#475569", textHeading: "#F1F5F9", textBody: "#94A3B8", textMuted: "#64748B", accent: "#E2E8F0", accentStrong: "#FFFFFF", gold: "#D4AF37", goldMuted: "#A8881C", positive: "#22C55E", negative: "#EF4444", chartGrid: "#1E293B", chartAxis: "#64748B" },
                    "ivory-boardroom": { ground: "#F5F1E8", surface: "#FAF7EF", surfaceRaised: "#FFFFFF", border: "#E5DDC8", borderStrong: "#C9BEA0", textHeading: "#2B2419", textBody: "#5C5240", textMuted: "#8B7E66", accent: "#7A6B4F", accentStrong: "#5A4E38", gold: "#A8862C", goldMuted: "#8A6F24", positive: "#3F7D5A", negative: "#B23A3A", chartGrid: "#E5DDC8", chartAxis: "#8B7E66" },
                    "pearl-mist": { ground: "#F1F5F9", surface: "#FFFFFF", surfaceRaised: "#FAFBFD", border: "#E2E8F0", borderStrong: "#CBD5E1", textHeading: "#0F172A", textBody: "#475569", textMuted: "#64748B", accent: "#334155", accentStrong: "#0F172A", gold: "#B8860B", goldMuted: "#9A7309", positive: "#15803D", negative: "#B91C1C", chartGrid: "#E2E8F0", chartAxis: "#64748B" },
                    "platinum-light": { ground: "#FAFAFA", surface: "#FFFFFF", surfaceRaised: "#F5F5F5", border: "#E5E5E5", borderStrong: "#BDBDBD", textHeading: "#1A1A1A", textBody: "#525252", textMuted: "#737373", accent: "#404040", accentStrong: "#171717", gold: "#B8860B", goldMuted: "#9A7309", positive: "#166534", negative: "#991B1B", chartGrid: "#E5E5E5", chartAxis: "#737373" }
                  };
                  var saved = localStorage.getItem('capital-velocity-theme') || 'obsidian';
                  var t = themes[saved] || themes.obsidian;
                  var s = document.documentElement.style;
                  s.setProperty('--ground', t.ground);
                  s.setProperty('--surface', t.surface);
                  s.setProperty('--surface-raised', t.surfaceRaised);
                  s.setProperty('--border', t.border);
                  s.setProperty('--border-strong', t.borderStrong);
                  s.setProperty('--text-heading', t.textHeading);
                  s.setProperty('--text-body', t.textBody);
                  s.setProperty('--text-muted', t.textMuted);
                  s.setProperty('--accent', t.accent);
                  s.setProperty('--accent-strong', t.accentStrong);
                  s.setProperty('--gold', t.gold);
                  s.setProperty('--gold-muted', t.goldMuted);
                  s.setProperty('--positive', t.positive);
                  s.setProperty('--negative', t.negative);
                  s.setProperty('--chart-grid', t.chartGrid);
                  s.setProperty('--chart-axis', t.chartAxis);
                  document.documentElement.style.background = t.ground;
                  document.documentElement.style.color = t.textBody;
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
