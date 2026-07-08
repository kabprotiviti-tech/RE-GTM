"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Sliders, TrendingUp, TrendingDown, RotateCcw } from "lucide-react";
import { calculateProjectFinance, CONSTRUCTION_COST_TIERS } from "@/lib/engines/finance-engine";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine } from "recharts";

interface SensitivitySlidersProps {
  basePricePsqft: number;
  totalSaleableArea: number;
  totalUnits: number;
  avgUnitSize: number;
  landCost: number;
  constructionMonths: number;
}

interface SliderConfig {
  key: string;
  label: string;
  icon: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit: string;
  format: (v: number) => string;
  impact: "high" | "medium" | "low";
}

const SLIDERS: SliderConfig[] = [
  {
    key: "constructionCost",
    label: "Construction Cost",
    icon: "🏗️",
    min: 800,
    max: 3000,
    step: 50,
    defaultValue: 1650,
    unit: "AED/sqft",
    format: (v) => `AED ${v.toLocaleString()}`,
    impact: "high",
  },
  {
    key: "salesVelocity",
    label: "Sales Velocity",
    icon: "📈",
    min: 3,
    max: 30,
    step: 1,
    defaultValue: 15,
    unit: "units/mo",
    format: (v) => `${v} units/mo`,
    impact: "high",
  },
  {
    key: "pricePsqft",
    label: "Selling Price",
    icon: "💰",
    min: 1500,
    max: 5000,
    step: 50,
    defaultValue: 2500,
    unit: "AED/sqft",
    format: (v) => `AED ${v.toLocaleString()}`,
    impact: "high",
  },
  {
    key: "landCost",
    label: "Land Cost",
    icon: "🌍",
    min: 10000000,
    max: 200000000,
    step: 5000000,
    defaultValue: 50000000,
    unit: "AED",
    format: (v) => `AED ${(v / 1e6).toFixed(0)}M`,
    impact: "medium",
  },
  {
    key: "loanRate",
    label: "Loan Interest Rate",
    icon: "🏦",
    min: 5,
    max: 15,
    step: 0.5,
    defaultValue: 8.5,
    unit: "%",
    format: (v) => `${v}%`,
    impact: "low",
  },
  {
    key: "marketingPct",
    label: "Marketing Budget",
    icon: "📢",
    min: 1,
    max: 10,
    step: 0.5,
    defaultValue: 4,
    unit: "%",
    format: (v) => `${v}% of revenue`,
    impact: "low",
  },
];

export function SensitivitySliders({
  basePricePsqft,
  totalSaleableArea,
  totalUnits,
  avgUnitSize,
  landCost: baseLandCost,
  constructionMonths,
}: SensitivitySlidersProps) {
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(SLIDERS.map((s) => [s.key, s.defaultValue]))
  );

  const reset = useCallback(() => {
    setValues(Object.fromEntries(SLIDERS.map((s) => [s.key, s.defaultValue])));
  }, []);

  const updateValue = useCallback((key: string, value: number) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Calculate finance with current slider values
  const finance = useMemo(() => {
    return calculateProjectFinance({
      totalSaleableArea,
      avgPricePsqft: values.pricePsqft,
      totalUnits,
      landCost: values.landCost,
      constructionCostPsqft: values.constructionCost,
      gfaRatio: 1.35,
      softCostPct: 0.12,
      marketingCostPct: values.marketingPct / 100,
      financeCostPct: 0.07,
      equityPct: 0.40,
      loanPct: 0.60,
      loanInterestRate: values.loanRate,
      loanTenorMonths: constructionMonths,
      constructionMonths,
      salesPeriodMonths: Math.min(constructionMonths, Math.ceil(totalUnits / values.salesVelocity)),
      wacc: 12,
    });
  }, [values, totalSaleableArea, totalUnits, constructionMonths]);

  // Base case (default values) for comparison
  const baseFinance = useMemo(() => {
    return calculateProjectFinance({
      totalSaleableArea,
      avgPricePsqft: SLIDERS[2].defaultValue,
      totalUnits,
      landCost: SLIDERS[3].defaultValue,
      constructionCostPsqft: SLIDERS[0].defaultValue,
      gfaRatio: 1.35,
      softCostPct: 0.12,
      marketingCostPct: SLIDERS[5].defaultValue / 100,
      financeCostPct: 0.07,
      equityPct: 0.40,
      loanPct: 0.60,
      loanInterestRate: SLIDERS[4].defaultValue,
      loanTenorMonths: constructionMonths,
      constructionMonths,
      salesPeriodMonths: Math.min(constructionMonths, Math.ceil(totalUnits / SLIDERS[1].defaultValue)),
      wacc: 12,
    });
  }, [totalSaleableArea, totalUnits, constructionMonths]);

  // Calculate deltas
  const irrDelta = finance.irr - baseFinance.irr;
  const profitDelta = finance.netProfit - baseFinance.netProfit;
  const marginDelta = finance.profitMargin - baseFinance.profitMargin;

  // Tornado chart data — impact of each variable at +/-20%
  const tornadoData = useMemo(() => {
    return SLIDERS.map((slider) => {
      const lowValues = { ...values, [slider.key]: slider.defaultValue * 0.8 };
      const highValues = { ...values, [slider.key]: slider.defaultValue * 1.2 };

      const calcIRR = (v: Record<string, number>) => {
        const f = calculateProjectFinance({
          totalSaleableArea,
          avgPricePsqft: v.pricePsqft,
          totalUnits,
          landCost: v.landCost,
          constructionCostPsqft: v.constructionCost,
          gfaRatio: 1.35,
          softCostPct: 0.12,
          marketingCostPct: v.marketingPct / 100,
          financeCostPct: 0.07,
          equityPct: 0.40,
          loanPct: 0.60,
          loanInterestRate: v.loanRate,
          loanTenorMonths: constructionMonths,
          constructionMonths,
          salesPeriodMonths: Math.min(constructionMonths, Math.ceil(totalUnits / v.salesVelocity)),
          wacc: 12,
        });
        return f.irr;
      };

      return {
        name: slider.label,
        low: calcIRR(lowValues),
        high: calcIRR(highValues),
        base: baseFinance.irr,
      };
    }).sort((a, b) => Math.abs(b.high - b.low) - Math.abs(a.high - a.low));
  }, [values, totalSaleableArea, totalUnits, constructionMonths, baseFinance.irr]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders size={14} style={{ color: "var(--gold)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
            Interactive Impact Analysis — Drag Sliders to See Real-Time Impact
          </span>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded transition-all"
          style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          <RotateCcw size={10} />
          Reset
        </button>
      </div>

      {/* Live KPI cards with deltas */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard
          label="Project IRR"
          value={`${finance.irr}%`}
          delta={irrDelta}
          base={`${baseFinance.irr}%`}
        />
        <KpiCard
          label="Net Profit"
          value={`AED ${(finance.netProfit / 1e6).toFixed(1)}M`}
          delta={profitDelta}
          base={`AED ${(baseFinance.netProfit / 1e6).toFixed(1)}M`}
        />
        <KpiCard
          label="Profit Margin"
          value={`${finance.profitMargin}%`}
          delta={marginDelta}
          base={`${baseFinance.profitMargin}%`}
        />
        <KpiCard
          label="Payback"
          value={`${finance.paybackMonths} mo`}
          delta={finance.paybackMonths - baseFinance.paybackMonths}
          base={`${baseFinance.paybackMonths} mo`}
          inverted
        />
      </div>

      {/* Sliders grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {SLIDERS.map((slider) => {
          const val = values[slider.key];
          const pct = ((val - slider.min) / (slider.max - slider.min)) * 100;
          const isDefault = val === slider.defaultValue;
          const impactColor = slider.impact === "high" ? "var(--gold)" : slider.impact === "medium" ? "var(--accent)" : "var(--text-muted)";

          return (
            <div
              key={slider.key}
              className="p-4 rounded-xl border"
              style={{
                background: "var(--surface)",
                borderColor: isDefault ? "var(--border)" : impactColor,
                borderLeftWidth: 3,
                borderLeftColor: isDefault ? "var(--border)" : impactColor,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">{slider.icon}</span>
                  <div>
                    <div className="text-xs font-semibold" style={{ color: "var(--text-heading)" }}>
                      {slider.label}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className="text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded"
                        style={{
                          background: `color-mix(in srgb, ${impactColor} 12%, transparent)`,
                          color: impactColor,
                        }}
                      >
                        {slider.impact} impact
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold font-mono" style={{ color: isDefault ? "var(--text-body)" : impactColor }}>
                    {slider.format(val)}
                  </div>
                  {!isDefault && (
                    <div className="text-[9px]" style={{ color: val > slider.defaultValue ? "var(--positive)" : "var(--negative)" }}>
                      {val > slider.defaultValue ? "+" : ""}{(((val - slider.defaultValue) / slider.defaultValue) * 100).toFixed(0)}% vs base
                    </div>
                  )}
                </div>
              </div>

              {/* Custom slider */}
              <div className="relative">
                <input
                  type="range"
                  min={slider.min}
                  max={slider.max}
                  step={slider.step}
                  value={val}
                  onChange={(e) => updateValue(slider.key, Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${impactColor} 0%, ${impactColor} ${pct}%, var(--surface-raised) ${pct}%, var(--surface-raised) 100%)`,
                    accentColor: impactColor,
                  }}
                />
                <div className="flex justify-between mt-1.5">
                  <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{slider.format(slider.min)}</span>
                  <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{slider.format(slider.max)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tornado chart */}
      <div className="p-5 rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={14} style={{ color: "var(--gold)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
            Tornado Chart — IRR Impact of ±20% Variable Changes
          </span>
        </div>
        <div style={{ height: "200px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tornadoData} layout="vertical" margin={{ top: 4, right: 16, left: 100, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis type="number" stroke="var(--chart-axis)" tick={{ fontSize: 10, fill: "var(--chart-axis)" }} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" stroke="var(--chart-axis)" tick={{ fontSize: 10, fill: "var(--chart-axis)" }} width={100} />
              <Tooltip
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: "6px", fontSize: "11px", color: "var(--text-heading)" }}
                formatter={(v: number, name: string) => {
                  const label = name === "low" ? "IRR at -20%" : name === "high" ? "IRR at +20%" : "Base IRR";
                  return [`${v}%`, label];
                }}
              />
              <ReferenceLine x={baseFinance.irr} stroke="var(--gold)" strokeWidth={1} dashArray="4 4" />
              <Bar dataKey="low" fill="var(--negative)" opacity={0.6} radius={[0, 3, 3, 0]} />
              <Bar dataKey="high" fill="var(--positive)" opacity={0.6} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* P&L Summary with current values */}
      <div className="rounded-xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="px-4 py-3 border-b text-xs font-semibold uppercase tracking-wider" style={{ borderColor: "var(--border)", color: "var(--gold)" }}>
          Live P&L Summary (Updates as You Drag)
        </div>
        <table className="w-full text-xs">
          <tbody>
            <PLRow label="Gross Revenue" value={finance.grossRevenue} bold />
            <PLRow label="Land Cost" value={-values.landCost} muted />
            <PLRow label="Construction Cost" value={-finance.totalConstructionCost} muted sub={`${values.constructionCost} AED/sqft`} />
            <PLRow label="Soft Costs" value={-finance.softCosts} muted />
            <PLRow label="Marketing" value={-finance.marketingCosts} muted sub={`${values.marketingPct}% of revenue`} />
            <PLRow label="Finance Costs" value={-finance.financeCosts} muted sub={`${values.loanRate}% interest`} />
            <PLRow label="Transfer Fees" value={-finance.transferFees} muted />
            <PLRow label="Total Cost" value={-finance.totalCost} bold divider />
            <PLRow label="Net Profit" value={finance.netProfit} bold positive={finance.netProfit > 0} large divider />
            <PLRow label="Profit Margin" value={finance.profitMargin} suffix="%" />
            <PLRow label="ROI" value={finance.roi} suffix="%" />
            <PLRow label="ROE" value={finance.roe} suffix="%" />
            <PLRow label="IRR" value={finance.irr} suffix="%" />
            <PLRow label="NPV (12% WACC)" value={finance.npv} />
            <PLRow label="Payback Period" value={finance.paybackMonths} suffix=" months" />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KpiCard({ label, value, delta, base, inverted }: {
  label: string; value: string; delta: number; base: string; inverted?: boolean;
}) {
  const isPositive = inverted ? delta < 0 : delta > 0;
  const isNeutral = delta === 0;

  return (
    <div className="p-3 rounded-lg border" style={{
      background: "var(--surface)",
      borderColor: isNeutral ? "var(--border)" : isPositive ? "var(--positive)" : "var(--negative)",
      borderLeftWidth: 2,
    }}>
      <div className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</div>
      <div className="text-lg font-bold mt-1" style={{ color: "var(--text-heading)" }}>{value}</div>
      <div className="flex items-center gap-1 mt-0.5">
        {!isNeutral && (
          isPositive ? <TrendingUp size={10} style={{ color: "var(--positive)" }} /> : <TrendingDown size={10} style={{ color: "var(--negative)" }} />
        )}
        <span className="text-[9px]" style={{ color: isNeutral ? "var(--text-muted)" : isPositive ? "var(--positive)" : "var(--negative)" }}>
          {isNeutral ? `base: ${base}` : `${delta > 0 ? "+" : ""}${inverted ? "" : ""}${delta > 0 ? "+" : ""}${label.includes("IRR") || label.includes("Margin") ? `${delta.toFixed(1)}%` : label.includes("Payback") ? `${delta} mo` : `AED ${(delta / 1e6).toFixed(1)}M`}`}
        </span>
      </div>
    </div>
  );
}

function PLRow({ label, value, suffix, sub, bold, divider, muted, positive, large }: {
  label: string; value: number; suffix?: string; sub?: string; bold?: boolean; divider?: boolean; muted?: boolean; positive?: boolean; large?: boolean;
}) {
  const formatted = suffix === "%" ? `${value > 0 ? "+" : ""}${value}%` : suffix === " months" ? `${value} mo` : `${value < 0 ? "-" : ""}AED ${Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return (
    <tr style={{ borderBottom: divider ? "1px solid var(--border-strong)" : "1px solid var(--border)" }}>
      <td className="px-4 py-2.5" style={{ color: muted ? "var(--text-muted)" : "var(--text-body)", fontWeight: bold ? 600 : 400, fontSize: large ? "13px" : "11px" }}>
        {label}
        {sub && <div className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>{sub}</div>}
      </td>
      <td className="px-4 py-2.5 text-right font-mono" style={{
        color: positive ? "var(--positive)" : value < 0 && !suffix ? "var(--negative)" : bold ? "var(--text-heading)" : "var(--text-body)",
        fontWeight: bold ? 700 : 500,
        fontSize: large ? "14px" : "11px",
      }}>
        {formatted}
      </td>
    </tr>
  );
}
