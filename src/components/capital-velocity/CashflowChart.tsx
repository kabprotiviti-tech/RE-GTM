"use client";

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
import type { CashflowEntry } from "@/lib/engines/cashflow-sim";

interface CashflowChartProps {
  data: CashflowEntry[];
  paymentPlan: string;
}

/**
 * Capital Velocity Chart (Phase 11)
 *
 * Per spec:
 * - AreaChart with cumulative_cash_collected array from Phase 4
 * - X-axis: Months (0 to 36)
 * - Y-axis: AED Cash Collected
 * - Line color: Muted Gold (#D4AF37)
 * - Fill: Transparent
 * - Grid lines: Dark gray
 * - No default tooltips — styled to match the dark theme
 */
export function CashflowChart({ data, paymentPlan }: CashflowChartProps) {
  const handoverMonth = data.length > 0 ? data[data.length - 1].month : 0;

  return (
    <div style={{ height: "280px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
          {/* Grid lines: dark gray */}
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />

          {/* X-axis: Months 0 to 36 */}
          <XAxis
            dataKey="month"
            stroke="var(--chart-axis)"
            tick={{ fontSize: 10, fill: "var(--chart-axis)" }}
            axisLine={{ stroke: "var(--border)" }}
            tickFormatter={(v) => `M${v}`}
            interval={Math.max(1, Math.floor(data.length / 12))}
          />

          {/* Y-axis: AED Cash Collected */}
          <YAxis
            stroke="var(--chart-axis)"
            tick={{ fontSize: 10, fill: "var(--chart-axis)" }}
            axisLine={{ stroke: "var(--border)" }}
            tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`}
          />

          {/* Custom dark-theme tooltip — no default styling */}
          <Tooltip
            cursor={{ stroke: "var(--gold)", strokeWidth: 1, strokeDasharray: "3 3" }}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border-strong)",
              borderRadius: "6px",
              fontSize: "11px",
              color: "var(--text-heading)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            }}
            labelStyle={{ color: "var(--text-muted)", marginBottom: "4px" }}
            itemStyle={{ color: "var(--gold)", padding: "2px 0" }}
            labelFormatter={(v) => `Month ${v}`}
            formatter={(value: number, name: string) => {
              if (name === "cumulative_cash_collected") {
                return [
                  `AED ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
                  "Cumulative Collected",
                ];
              }
              return [value, name];
            }}
          />

          {/* Downpayment reference line at month 0 */}
          <ReferenceLine
            x={0}
            stroke="var(--accent)"
            strokeDasharray="4 4"
            label={{
              value: "Downpayment",
              fill: "var(--text-muted)",
              fontSize: 9,
              position: "top",
            }}
          />

          {/* Handover reference line at final month */}
          <ReferenceLine
            x={handoverMonth}
            stroke="var(--gold)"
            strokeDasharray="4 4"
            label={{
              value: "Handover",
              fill: "var(--gold)",
              fontSize: 9,
              position: "top",
            }}
          />

          {/* Cumulative cash collected — Muted Gold line, transparent fill */}
          <Area
            type="monotone"
            dataKey="cumulative_cash_collected"
            stroke="var(--gold)"
            strokeWidth={2.5}
            fill="transparent"
            isAnimationActive
            animationDuration={1200}
            animationEasing="ease-out"
            dot={{ fill: "var(--gold)", r: 0 }}
            activeDot={{ r: 5, fill: "var(--gold)", stroke: "var(--ground)", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
