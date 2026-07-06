"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, AlertCircle, X } from "lucide-react";

export type ErrorLevel = "error" | "warning" | null;

interface ErrorBannerProps {
  banner: { level: ErrorLevel; message: string };
  onDismiss?: () => void;
}

const BANNER_CONFIG = {
  error: {
    icon: AlertCircle,
    color: "var(--negative)",
    bg: "color-mix(in srgb, var(--negative) 10%, transparent)",
    border: "var(--negative)",
    label: "Calculation Error",
  },
  warning: {
    icon: AlertTriangle,
    color: "var(--gold)",
    bg: "color-mix(in srgb, var(--gold) 10%, transparent)",
    border: "var(--gold)",
    label: "Narration Delayed",
  },
};

export function ErrorBanner({ banner, onDismiss }: ErrorBannerProps) {
  const config = banner.level ? BANNER_CONFIG[banner.level] : null;
  const Icon = config?.icon;

  return (
    <AnimatePresence>
      {banner.level && config && Icon && (
        <motion.div
          initial={{ opacity: 0, y: -20, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -20, height: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <div
            className="flex items-center gap-3 px-6 py-3 border-b"
            style={{
              background: config.bg,
              borderColor: config.border,
            }}
          >
            <Icon size={16} style={{ color: config.color }} className="flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.15em] mr-2"
                style={{ color: config.color }}
              >
                {config.label}:
              </span>
              <span className="text-xs" style={{ color: "var(--text-body)" }}>
                {banner.message}
              </span>
            </div>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="flex-shrink-0 p-1 rounded transition-colors hover:bg-[var(--surface)]"
                style={{ color: "var(--text-muted)" }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
