"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, Check } from "lucide-react";
import {
  THEME_LIST,
  themeToCssVariables,
  loadThemeId,
  saveThemeId,
  type ThemeId,
  type ThemeSpec,
} from "@/lib/themes";

interface ThemeSwitcherProps {
  activeThemeId: ThemeId;
  onThemeChange: (id: ThemeId) => void;
}

export function ThemeSwitcher({ activeThemeId, onThemeChange }: ThemeSwitcherProps) {
  const [open, setOpen] = useState(false);
  const activeTheme = THEME_LIST.find((t) => t.id === activeThemeId) || THEME_LIST[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-md border text-xs font-medium transition-all"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
          color: "var(--text-body)",
        }}
      >
        <Palette size={14} style={{ color: "var(--gold)" }} />
        <span>{activeTheme.name}</span>
        <span
          className="ml-1 inline-block w-2 h-2 rounded-full"
          style={{ background: "var(--gold)" }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-0 mt-2 w-72 rounded-lg border shadow-2xl z-50 overflow-hidden"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              <div
                className="px-4 py-3 border-b text-[10px] font-semibold uppercase tracking-wider"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
              >
                Theme Atlas — 6 Palettes
              </div>
              <div className="max-h-96 overflow-y-auto">
                {THEME_LIST.map((theme) => (
                  <ThemeOption
                    key={theme.id}
                    theme={theme}
                    active={theme.id === activeThemeId}
                    onClick={() => {
                      onThemeChange(theme.id);
                      setOpen(false);
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function ThemeOption({
  theme,
  active,
  onClick,
}: {
  theme: ThemeSpec;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-raised)]"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex gap-1 flex-shrink-0">
        <div
          className="w-4 h-8 rounded-sm border"
          style={{ background: theme.palette.ground, borderColor: theme.palette.border }}
        />
        <div
          className="w-4 h-8 rounded-sm border"
          style={{ background: theme.palette.surface, borderColor: theme.palette.border }}
        />
        <div
          className="w-1.5 h-8 rounded-sm"
          style={{ background: theme.palette.gold }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="text-xs font-semibold flex items-center gap-2"
          style={{ color: "var(--text-heading)" }}
        >
          {theme.name}
          {theme.isFlagship && (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider"
              style={{ background: "var(--gold)", color: "var(--ground)" }}
            >
              Flagship
            </span>
          )}
        </div>
        <div
          className="text-[10px] mt-0.5 truncate"
          style={{ color: "var(--text-muted)" }}
        >
          {theme.tagline}
        </div>
      </div>
      {active && <Check size={14} style={{ color: "var(--gold)" }} />}
    </button>
  );
}
