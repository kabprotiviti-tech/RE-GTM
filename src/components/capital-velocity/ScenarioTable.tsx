"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { ScenarioEntry } from "@/lib/engines/scenario-engine";
import { AnimatedCounter } from "./AnimatedCounter";

interface ScenarioTableProps {
  scenarios: ScenarioEntry[];
  recommendedScenario?: string; // "Aggressive" | "Base" | "Conservative" | null
}

const scenarioColors: Record<string, string> = {
  Aggressive: "var(--gold)",
  Base: "var(--accent)",
  Conservative: "var(--positive)",
};

export function ScenarioTable({ scenarios, recommendedScenario }: ScenarioTableProps) {
  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {/* Table header */}
      <div
        className="grid grid-cols-12 gap-2 px-4 py-3 border-b text-[9px] font-semibold uppercase tracking-[0.15em]"
        style={{
          borderColor: "var(--border)",
          background: "var(--surface-raised)",
          color: "var(--text-muted)",
        }}
      >
        <div className="col-span-3">Scenario</div>
        <div className="col-span-2 text-right">Price PSF</div>
        <div className="col-span-3 text-right">Proj. Absorption</div>
        <div className="col-span-4 text-right">Est. Total Revenue</div>
      </div>

      {/* Table rows */}
      {scenarios.map((s, i) => {
        const isBase = s.scenario_name === "Base";
        const isRecommended = recommendedScenario === s.scenario_name;
        const color = scenarioColors[s.scenario_name] || "var(--text-body)";

        return (
          <motion.div
            key={s.scenario_name}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-12 gap-2 px-4 py-3.5 items-center border-b last:border-b-0 group hover:bg-[var(--surface-raised)] transition-colors"
            style={{
              borderColor: "var(--border)",
              borderLeft: isBase ? `2px solid var(--accent)` : "2px solid transparent",
            }}
          >
            {/* Scenario name + tags */}
            <div className="col-span-3 flex items-center gap-2">
              <div
                className="w-1 h-6 rounded-full flex-shrink-0"
                style={{ background: color }}
              />
              <div className="flex flex-col gap-1">
                <span
                  className="text-xs font-semibold"
                  style={{ color: "var(--text-heading)" }}
                >
                  {s.scenario_name}
                </span>
                {isRecommended && (
                  <span
                    className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.15em] px-1.5 py-0.5 rounded w-fit"
                    style={{
                      background: "color-mix(in srgb, var(--gold) 15%, transparent)",
                      color: "var(--gold)",
                      border: "1px solid var(--gold)",
                    }}
                  >
                    <Sparkles size={8} />
                    AI Recommended
                  </span>
                )}
              </div>
            </div>

            {/* Price PSF */}
            <div
              className="col-span-2 text-right text-sm font-mono font-semibold"
              style={{ color: s.price_delta_pct > 0 ? "var(--gold)" : s.price_delta_pct < 0 ? "var(--positive)" : "var(--text-heading)" }}
            >
              <AnimatedCounter value={s.price_psf} format="number" duration={0.8} />
              <div className="text-[9px] font-sans mt-0.5" style={{ color: "var(--text-muted)" }}>
                {s.price_delta_pct > 0 ? "+" : ""}{s.price_delta_pct}%
              </div>
            </div>

            {/* Projected Absorption Days */}
            <div className="col-span-3 text-right">
              <div className="text-sm font-mono font-semibold" style={{ color: "var(--text-heading)" }}>
                <AnimatedCounter value={s.projected_absorption_days} format="days" duration={0.8} />
              </div>
              <div className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                {s.absorption_delta_pct > 0 ? "+" : ""}{s.absorption_delta_pct}% vs base
              </div>
            </div>

            {/* Est. Total Revenue */}
            <div className="col-span-4 text-right">
              {s.total_revenue_assumption != null ? (
                <>
                  <div className="text-sm font-mono font-semibold" style={{ color: isBase ? "var(--accent)" : "var(--text-heading)" }}>
                    <AnimatedCounter value={s.total_revenue_assumption} format="aed" duration={1} />
                  </div>
                  {s.total_carry_cost != null && s.net_position != null && (
                    <div className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                      Carry: AED {(s.total_carry_cost / 1_000_000).toFixed(2)}M · Net: AED {(s.net_position / 1_000_000).toFixed(1)}M
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                  [DATA MISSING]
                </div>
              )}
            </div>
          </motion.div>
        );
      })}

      {/* Footer summary */}
      {scenarios.length === 3 && (
        <div
          className="px-4 py-3 flex items-center justify-between text-[10px]"
          style={{
            background: "var(--surface-raised)",
            borderTop: "1px solid var(--border)",
            color: "var(--text-muted)",
          }}
        >
          <span className="uppercase tracking-wider">
            {scenarios.length} scenarios · {scenarios[0].base_optimal_psf.toFixed(0)} PSF base
          </span>
          <span className="font-mono">
            Spread: AED {((scenarios[0].price_psf - scenarios[2].price_psf)).toFixed(0)}/sqft · {((scenarios[0].projected_absorption_days - scenarios[2].projected_absorption_days)).toFixed(1)} days
          </span>
        </div>
      )}
    </div>
  );
}
