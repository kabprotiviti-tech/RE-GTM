"use client";

import { motion } from "framer-motion";

type ConfidenceLevel = "High" | "Medium" | "Low" | "None";

interface ConfidenceIndicatorProps {
  level: ConfidenceLevel;
  compCount: number;
}

const CONFIDENCE_CONFIG: Record<
  ConfidenceLevel,
  { color: string; label: string; pct: number; description: string }
> = {
  High: {
    color: "var(--positive)",
    label: "High",
    pct: 100,
    description: "Boardroom-grade — 5+ comparables",
  },
  Medium: {
    color: "var(--gold)",
    label: "Medium",
    pct: 60,
    description: "Directional signal — 3-4 comparables",
  },
  Low: {
    color: "var(--negative)",
    label: "Low",
    pct: 30,
    description: "Statistical noise — fewer than 3 comparables",
  },
  None: {
    color: "var(--text-muted)",
    label: "None",
    pct: 0,
    description: "No comparables matched the filter",
  },
};

export function ConfidenceIndicator({ level, compCount }: ConfidenceIndicatorProps) {
  const config = CONFIDENCE_CONFIG[level] || CONFIDENCE_CONFIG.None;

  return (
    <div className="space-y-2">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="text-[9px] font-semibold uppercase tracking-[0.15em]"
            style={{ color: "var(--text-muted)" }}
          >
            Data Confidence
          </span>
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{
              color: config.color,
              border: `1px solid ${config.color}`,
              background: "transparent",
            }}
          >
            {config.label}
          </span>
        </div>
        <span className="text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>
          {compCount} {compCount === 1 ? "comp" : "comps"}
        </span>
      </div>

      {/* Bar track */}
      <div
        className="relative h-1.5 rounded-full overflow-hidden"
        style={{ background: "var(--surface-raised)" }}
      >
        <motion.div
          className="absolute left-0 top-0 bottom-0 rounded-full"
          style={{ background: config.color }}
          initial={{ width: 0 }}
          animate={{ width: `${config.pct}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      {/* Description */}
      <div className="text-[9px] italic" style={{ color: "var(--text-muted)" }}>
        {config.description}
      </div>
    </div>
  );
}
