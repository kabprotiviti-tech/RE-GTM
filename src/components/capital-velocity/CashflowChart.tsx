"use client";

import { useMemo } from "react";
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

export function CashflowChart({ data, paymentPlan }: CashflowChartProps) {
  const handoverMonth = data.length > 0 ? data[data.length - 1].month : 0;

  return (
    <div style={{ height: "280px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
          <defs>
            <linearGradient id="cashflowGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.5} />
              <stop offset="100%" stopColor="var(--gold)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
          <XAxis
            dataKey="month"
            stroke="var(--chart-axis)"
            tick={{ fontSize: 10, fill: "var(--chart-axis)" }}
            axisLine={{ stroke: "var(--border)" }}
            tickFormatter={(v) => `M${v}`}
            interval={Math.max(1, Math.floor(data.length / 12))}
          />
          <YAxis
            stroke="var(--chart-axis)"
            tick={{ fontSize: 10, fill: "var(--chart-axis)" }}
            axisLine={{ stroke: "var(--border)" }}
            tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              fontSize: "11px",
              color: "var(--text-heading)",
            }}
            labelStyle={{ color: "var(--text-muted)" }}
            labelFormatter={(v) => `Month ${v}`}
            formatter={(value: number, name: string) => {
              if (name === "cumulative_cash_collected") {
                return [`AED ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`, "Cumulative"];
              }
              if (name === "monthly_cash_collected") {
                return [`AED ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`, "Monthly"];
              }
              return [value, name];
            }}
          />
          <ReferenceLine
            x={0}
            stroke="var(--accent)"
            strokeDasharray="4 4"
            label={{ value: "Downpayment", fill: "var(--text-muted)", fontSize: 9, position: "top" }}
          />
          <ReferenceLine
            x={handoverMonth}
            stroke="var(--gold)"
            strokeDasharray="4 4"
            label={{ value: "Handover", fill: "var(--gold)", fontSize: 9, position: "top" }}
          />
          <Area
            type="monotone"
            dataKey="cumulative_cash_collected"
            stroke="var(--gold)"
            strokeWidth={2.5}
            fill="url(#cashflowGrad)"
            isAnimationActive
            animationDuration={1200}
            animationEasing="ease-out"
          />
          <Area
            type="step"
            dataKey="monthly_cash_collected"
            stroke="var(--accent)"
            strokeWidth={1}
            fill="none"
            isAnimationActive
            animationDuration={1000}
            opacity={0.5}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
