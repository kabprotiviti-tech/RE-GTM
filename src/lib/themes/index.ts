/**
 * frontend/lib/themes/index.ts
 * Project Capital Velocity — Theme System
 *
 * ARCHITECTURAL NOTE:
 * The original mandate locked a single Obsidian dark theme (#0A0A0A ground,
 * Platinum text, Muted Gold accent, Inter font, no Tailwind blue, no purple
 * gradients). That mandate is preserved as the flagship "Obsidian" theme.
 *
 * Phase 7b relaxes the single-theme constraint per stakeholder request:
 * the product now ships 6 themes spanning the light/dark spectrum, so the
 * UI works in a dimmed trading-floor boardroom (Obsidian) AND in a sunlit
 * afternoon Aldar sales gallery (Pearl Mist / Ivory Boardroom).
 *
 * DISCIPLINE PRESERVED ACROSS ALL THEMES:
 * - Inter typography (single family, no decorative fonts)
 * - Platinum / Muted Gold accent discipline (accents used sparingly,
 *   never as backgrounds, never as gradients)
 * - Generous 24-48px spacing (executive breathing room)
 * - Forbidden everywhere: Tailwind default blue #3B82F6, purple/violet
 *   gradients, emojis, bubbly rounded cards, illustration-pack icons
 * - Same data hierarchy and component structure — only the palette shifts
 *
 * Each theme is a typed ThemeSpec object. The frontend will swap themes via
 * a CSS-variable layer: components reference var(--ground), var(--text-heading),
 * etc., and the active theme sets those variables on a root wrapper.
 */

export type ThemeId =
  | "obsidian"
  | "carbon-slate"
  | "midnight-azure"
  | "ivory-boardroom"
  | "pearl-mist"
  | "platinum-light";

export interface ThemeSpec {
  id: ThemeId;
  name: string;           // Display name in the theme switcher
  tagline: string;        // One-line mood descriptor
  mode: "dark" | "light"; // High-level classification
  isFlagship?: boolean;   // Original mandate theme
  palette: {
    ground: string;           // Page background
    surface: string;          // Card / panel background
    surfaceRaised: string;    // Hovered / elevated card
    border: string;           // Hairline borders
    borderStrong: string;     // Section dividers
    textHeading: string;      // H1-H4, KPI numbers
    textBody: string;         // Paragraph copy
    textMuted: string;        // Captions, metadata
    accent: string;           // Primary accent (platinum or equivalent)
    accentStrong: string;     // Hover / active state of accent
    gold: string;             // Muted gold — reserved for mission-critical figures
    goldMuted: string;        // Gold on surfaces where full gold is too bright
    positive: string;         // Revenue / gain indicators
    negative: string;         // Carry cost / loss indicators
    chartGrid: string;        // Chart gridlines
    chartAxis: string;        // Chart axis labels
  };
  reference: string;      // Recognizable visual reference for the design mood
}

export const THEMES: Record<ThemeId, ThemeSpec> = {
  // ===========================================================================
  // 1. OBSIDIAN — flagship, original mandate
  // ===========================================================================
  obsidian: {
    id: "obsidian",
    name: "Obsidian",
    tagline: "Bloomberg Terminal for real estate oligarchs",
    mode: "dark",
    isFlagship: true,
    palette: {
      ground: "#0A0A0A",
      surface: "#141414",
      surfaceRaised: "#1C1C1C",
      border: "#262626",
      borderStrong: "#3A3A3A",
      textHeading: "#FFFFFF",
      textBody: "#94A3B8",
      textMuted: "#64748B",
      accent: "#E2E8F0",
      accentStrong: "#F8FAFC",
      gold: "#D4AF37",
      goldMuted: "#B8941F",
      positive: "#10B981",
      negative: "#EF4444",
      chartGrid: "#1F1F1F",
      chartAxis: "#64748B",
    },
    reference: "Bloomberg Terminal / Apple Pro Display XDR dark mode",
  },

  // ===========================================================================
  // 2. CARBON SLATE — softer dark, McKinsey deck feel
  // ===========================================================================
  "carbon-slate": {
    id: "carbon-slate",
    name: "Carbon Slate",
    tagline: "Deep blue-gray, warmer than pure black",
    mode: "dark",
    palette: {
      ground: "#1E293B",
      surface: "#273449",
      surfaceRaised: "#334155",
      border: "#3F4D63",
      borderStrong: "#52617A",
      textHeading: "#F8FAFC",
      textBody: "#CBD5E1",
      textMuted: "#94A3B8",
      accent: "#E2E8F0",
      accentStrong: "#FFFFFF",
      gold: "#D4AF37",
      goldMuted: "#B8941F",
      positive: "#34D399",
      negative: "#F87171",
      chartGrid: "#334155",
      chartAxis: "#94A3B8",
    },
    reference: "McKinsey internal deck template / Linear dark mode",
  },

  // ===========================================================================
  // 3. MIDNIGHT AZURE — Goldman Sachs research note feel
  // ===========================================================================
  "midnight-azure": {
    id: "midnight-azure",
    name: "Midnight Azure",
    tagline: "Deep navy ground, ice-white headings",
    mode: "dark",
    palette: {
      ground: "#0F172A",
      surface: "#1E293B",
      surfaceRaised: "#293548",
      border: "#334155",
      borderStrong: "#475569",
      textHeading: "#F1F5F9",
      textBody: "#94A3B8",
      textMuted: "#64748B",
      accent: "#E2E8F0",
      accentStrong: "#FFFFFF",
      gold: "#D4AF37",
      goldMuted: "#A8881C",
      positive: "#22C55E",
      negative: "#EF4444",
      chartGrid: "#1E293B",
      chartAxis: "#64748B",
    },
    reference: "Goldman Sachs equity research note / Stripe midnight mode",
  },

  // ===========================================================================
  // 4. IVORY BOARDROOM — warm cream, Aldar/Emaar brochure feel
  // ===========================================================================
  "ivory-boardroom": {
    id: "ivory-boardroom",
    name: "Ivory Boardroom",
    tagline: "Warm cream, espresso headings, bronze accent",
    mode: "light",
    palette: {
      ground: "#F5F1E8",
      surface: "#FAF7EF",
      surfaceRaised: "#FFFFFF",
      border: "#E5DDC8",
      borderStrong: "#C9BEA0",
      textHeading: "#2B2419",
      textBody: "#5C5240",
      textMuted: "#8B7E66",
      accent: "#7A6B4F",
      accentStrong: "#5A4E38",
      gold: "#A8862C",
      goldMuted: "#8A6F24",
      positive: "#3F7D5A",
      negative: "#B23A3A",
      chartGrid: "#E5DDC8",
      chartAxis: "#8B7E66",
    },
    reference: "Aldar Properties annual report / Emaar sales brochure print edition",
  },

  // ===========================================================================
  // 5. PEARL MIST — very light cool gray, BCG report cover feel
  // ===========================================================================
  "pearl-mist": {
    id: "pearl-mist",
    name: "Pearl Mist",
    tagline: "Cool pearl gray, navy headings, muted gold accent",
    mode: "light",
    palette: {
      ground: "#F1F5F9",
      surface: "#FFFFFF",
      surfaceRaised: "#FAFBFD",
      border: "#E2E8F0",
      borderStrong: "#CBD5E1",
      textHeading: "#0F172A",
      textBody: "#475569",
      textMuted: "#64748B",
      accent: "#334155",
      accentStrong: "#0F172A",
      gold: "#B8860B",
      goldMuted: "#9A7309",
      positive: "#15803D",
      negative: "#B91C1C",
      chartGrid: "#E2E8F0",
      chartAxis: "#64748B",
    },
    reference: "BCG quarterly report cover / Notion light mode",
  },

  // ===========================================================================
  // 6. PLATINUM LIGHT — crisp white, charcoal headings, FT print feel
  // ===========================================================================
  "platinum-light": {
    id: "platinum-light",
    name: "Platinum Light",
    tagline: "Crisp white ground, charcoal headings, muted gold",
    mode: "light",
    palette: {
      ground: "#FAFAFA",
      surface: "#FFFFFF",
      surfaceRaised: "#F5F5F5",
      border: "#E5E5E5",
      borderStrong: "#BDBDBD",
      textHeading: "#1A1A1A",
      textBody: "#525252",
      textMuted: "#737373",
      accent: "#404040",
      accentStrong: "#171717",
      gold: "#B8860B",
      goldMuted: "#9A7309",
      positive: "#166534",
      negative: "#991B1B",
      chartGrid: "#E5E5E5",
      chartAxis: "#737373",
    },
    reference: "Financial Times print edition / Apple Pages default light",
  },
};

// ---------------------------------------------------------------------------
// Convenience: ordered list for theme switcher UI
// ---------------------------------------------------------------------------

export const THEME_LIST: ThemeSpec[] = [
  THEMES["obsidian"],
  THEMES["carbon-slate"],
  THEMES["midnight-azure"],
  THEMES["ivory-boardroom"],
  THEMES["pearl-mist"],
  THEMES["platinum-light"],
];

// ---------------------------------------------------------------------------
// CSS-variable generator — produces the inline style object that, when applied
// to a root wrapper, makes all child components theme-aware via var(--xxx).
// ---------------------------------------------------------------------------

export function themeToCssVariables(theme: ThemeSpec): Record<string, string> {
  const p = theme.palette;
  return {
    "--ground": p.ground,
    "--surface": p.surface,
    "--surface-raised": p.surfaceRaised,
    "--border": p.border,
    "--border-strong": p.borderStrong,
    "--text-heading": p.textHeading,
    "--text-body": p.textBody,
    "--text-muted": p.textMuted,
    "--accent": p.accent,
    "--accent-strong": p.accentStrong,
    "--gold": p.gold,
    "--gold-muted": p.goldMuted,
    "--positive": p.positive,
    "--negative": p.negative,
    "--chart-grid": p.chartGrid,
    "--chart-axis": p.chartAxis,
  } as Record<string, string>;
}

// ---------------------------------------------------------------------------
// Persistence helpers — the active theme is stored in localStorage so the
// user's preference survives reloads. The FastAPI/Next.js layer will wire
// this into a React context provider.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "capital-velocity-theme";

export function getDefaultThemeId(): ThemeId {
  // Flagship theme is the default — preserves the original mandate unless
  // the user explicitly switches.
  return "obsidian";
}

export function loadThemeId(): ThemeId {
  if (typeof window === "undefined") return getDefaultThemeId();
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && stored in THEMES) return stored as ThemeId;
  } catch {
    // localStorage may be unavailable (private mode, SSR) — fall through to default.
  }
  return getDefaultThemeId();
}

export function saveThemeId(id: ThemeId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Best-effort persistence; theme still works in-session if storage fails.
  }
}
