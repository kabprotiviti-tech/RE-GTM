"use client";

import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import type { ScenarioEntry } from "@/lib/engines/scenario-engine";
import { AnimatedCounter } from "./AnimatedCounter";

interface ScenarioChartProps {
  scenarios: ScenarioEntry[];
  activeIndex: number;
  onSelect: (i: number) => void;
}

const scenarioColors = {
  Aggressive: "var(--gold)",
  Base: "var(--accent)",
  Conservative: "var(--positive)",
};

export function ScenarioChart({ scenarios, activeIndex, onSelect }: ScenarioChartProps) {
  // Build a chart dataset: PSF vs Absorption Days across the 3 scenarios
  const data = scenarios.map((s) => ({
    name: s.scenario_name,
    psf: s.price_psf,
    days: s.projected_absorption_days,
    revenue: s.total_revenue_assumption,
    carry: s.total_carry_cost,
    net: s.net_position,
  }));

  const active = scenarios[activeIndex];

  return (
    <div>
      {/* Scenario selector tabs */}
      <div className="flex gap-2 mb-6">
        {scenarios.map((s, i) => (
          <motion.button
            key={s.scenario_name}
            onClick={() => onSelect(i)}
            className="relative px-4 py-2 rounded-md text-xs font-medium transition-colors"
            style={{
              background: i === activeIndex ? "var(--surface-raised)" : "var(--surface)",
              border: `1px solid ${i === activeIndex ? "var(--gold)" : "var(--border)"}`,
              color: i === activeIndex ? "var(--text-heading)" : "var(--text-muted)",
            }}
            whileHover={{ y: -1 }}
          >
            {s.scenario_name}
            {i === activeIndex && (
              <motion.div
                layoutId="scenario-underline"
                className="absolute -bottom-px left-0 right-0 h-0.5"
                style={{ background: "var(--gold)" }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              />
            )}
          </motion.button>
        ))}
      </div>

      {/* Active scenario KPIs */}
      <motion.div
        key={activeIndex}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
      >
        <KpiTile label="Price / sqft" value={active.price_psf} format="psf" delta={`${active.price_delta_pct >= 0 ? "+" : ""}${active.price_delta_pct}% vs base`} accent />
        <KpiTile label="Absorption" value={active.projected_absorption_days} format="days" delta={`${active.absorption_delta_pct >= 0 ? "+" : ""}${active.absorption_delta_pct}%`} />
        <KpiTile
          label="Project Revenue"
          value={active.total_revenue_assumption ?? 0}
          format="aed"
          delta={active.total_revenue_assumption == null ? "[DATA MISSING]" : "Total assumption"}
          positive={active.total_revenue_assumption != null}
        />
        <KpiTile
          label="Net Position"
          value={active.net_position ?? 0}
          format="aed"
          delta={active.net_position == null ? "[DATA MISSING]" : "Rev − Carry"}
          positive={active.net_position != null}
        />
      </motion.div>

      {/* PSF vs Absorption trade-off chart */}
      <div style={{ height: "240px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
            <defs>
              <linearGradient id="psfGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis
              dataKey="name"
              stroke="var(--chart-axis)"
              tick={{ fontSize: 11, fill: "var(--chart-axis)" }}
              axisLine={{ stroke: "var(--border)" }}
            />
            <YAxis
              yAxisId="psf"
              orientation="left"
              stroke="var(--chart-axis)"
              tick={{ fontSize: 11, fill: "var(--chart-axis)" }}
              axisLine={{ stroke: "var(--border)" }}
              tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
            />
            <YAxis
              yAxisId="days"
              orientation="right"
              stroke="var(--chart-axis)"
              tick={{ fontSize: 11, fill: "var(--chart-axis)" }}
              axisLine={{ stroke: "var(--border)" }}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                fontSize: "12px",
                color: "var(--text-heading)",
              }}
              labelStyle={{ color: "var(--text-muted)" }}
            />
            <Area
              yAxisId="psf"
              type="monotone"
              dataKey="psf"
              stroke="var(--gold)"
              strokeWidth={2}
              fill="url(#psfGrad)"
              name="Price PSF"
              dot={{ fill: "var(--gold)", r: 4 }}
              activeDot={{ r: 6, fill: "var(--gold)" }}
              isAnimationActive
              animationDuration={600}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function KpiTile({
  label,
  value,
  format,
  delta,
  accent,
  positive,
}: {
  label: string;
  value: number;
  format: "aed" | "psf" | "days" | "number";
  delta?: string;
  accent?: boolean;
  positive?: boolean;
}) {
  return (
    <div
      className="p-4 rounded-md border"
      style={{
        background: "var(--surface)",
        borderColor: accent ? "var(--gold)" : "var(--border)",
        borderLeftWidth: accent ? 2 : 1,
      }}
    >
      <div
        className="text-[10px] font-semibold uppercase tracking-wider mb-2"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </div>
      <div
        className="text-lg font-semibold"
        style={{
          color: accent ? "var(--gold)" : positive ? "var(--positive)" : "var(--text-heading)",
        }}
      >
        <AnimatedCounter value={value} format={format} duration={0.8} />
      </div>
      {delta && (
        <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
          {delta}
        </div>
      )}
    </div>
  );
}
