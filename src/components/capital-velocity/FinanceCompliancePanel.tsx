"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { DollarSign, Shield, ClipboardList, TrendingUp, AlertTriangle, Check, FileText } from "lucide-react";
import { calculateProjectFinance, CONSTRUCTION_COST_TIERS } from "@/lib/engines/finance-engine";
import { runComplianceChecks } from "@/lib/engines/compliance-engine";
import { BUYER_SURVEY_FINDINGS, getFindingsByCategory, getSurveySummary } from "@/lib/engines/survey-data";
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, Area, AreaChart } from "recharts";

interface FinanceCompliancePanelProps {
  emirate: "Dubai" | "Abu Dhabi";
  totalSaleableArea: number;
  avgPricePsqft: number;
  totalUnits: number;
  landCost: number;
  constructionMonths: number;
  corridor: string;
}

export function FinanceCompliancePanel({
  emirate, totalSaleableArea, avgPricePsqft, totalUnits, landCost, constructionMonths, corridor,
}: FinanceCompliancePanelProps) {
  const [activeTab, setActiveTab] = useState<"pnl" | "irr" | "compliance" | "survey">("pnl");
  const [costTier, setCostTier] = useState<keyof typeof CONSTRUCTION_COST_TIERS>("premium");

  const tierConfig = CONSTRUCTION_COST_TIERS[costTier];

  const finance = calculateProjectFinance({
    totalSaleableArea,
    avgPricePsqft,
    totalUnits,
    landCost,
    constructionCostPsqft: tierConfig.costPsqft,
    gfaRatio: tierConfig.gfaRatio,
    softCostPct: tierConfig.softCostPct,
    marketingCostPct: tierConfig.marketingPct,
    financeCostPct: tierConfig.financePct,
    equityPct: 0.40,
    loanPct: 0.60,
    loanInterestRate: 8.5,
    loanTenorMonths: constructionMonths,
    constructionMonths,
    salesPeriodMonths: Math.min(constructionMonths, 24),
    wacc: 12,
  });

  const compliance = runComplianceChecks(
    emirate,
    "Off-Plan",
    totalUnits,
    finance.grossRevenue,
    "Developer",
    1,
    0
  );

  const surveyCategories = getFindingsByCategory();
  const surveySummary = getSurveySummary();

  // Cashflow chart data
  const cashflowData = finance.monthlyCashflow.filter((_, i) => i % 3 === 0).map((cf) => ({
    month: `M${cf.month}`,
    cumulative: Math.round(cf.cumulativeCashflow / 1e6 * 10) / 10,
    monthly: Math.round(cf.netCashflow / 1e6 * 10) / 10,
  }));

  // Waterfall data for chart
  const waterfallData = finance.waterfall.map((w) => ({
    name: w.tier,
    amount: Math.round(w.amount / 1e6 * 10) / 10,
  }));

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-2 border-b overflow-x-auto" style={{ borderColor: "var(--border)" }}>
        {[
          { id: "pnl", label: "P&L Statement", icon: DollarSign },
          { id: "irr", label: "IRR & Cashflow", icon: TrendingUp },
          { id: "compliance", label: "Compliance", icon: Shield },
          { id: "survey", label: "Buyer Survey", icon: ClipboardList },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all border-b-2 -mb-px whitespace-nowrap"
              style={{ borderColor: activeTab === tab.id ? "var(--gold)" : "transparent", color: activeTab === tab.id ? "var(--gold)" : "var(--text-muted)" }}>
              <Icon size={12} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* === P&L STATEMENT === */}
      {activeTab === "pnl" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Construction cost tier selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Construction Quality:</span>
            {Object.entries(CONSTRUCTION_COST_TIERS).map(([key, tier]) => (
              <button key={key} onClick={() => setCostTier(key as any)}
                className="px-2.5 py-1 rounded text-[10px] font-medium transition-all"
                style={{
                  background: costTier === key ? "var(--surface-raised)" : "var(--surface)",
                  border: `1px solid ${costTier === key ? "var(--gold)" : "var(--border)"}`,
                  color: costTier === key ? "var(--gold)" : "var(--text-muted)",
                }}>
                {tier.label.split(" (")[0]}
              </button>
            ))}
          </div>

          {/* P&L Statement */}
          <div className="rounded-xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="px-4 py-3 border-b text-xs font-semibold uppercase tracking-wider" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
              Project Profit & Loss Statement
            </div>
            <table className="w-full text-xs">
              <tbody>
                <PLRow label="Gross Development Revenue" value={finance.grossRevenue} bold />
                <PLRow label="Less: DLD/DMT Transfer Fees (4%)" value={-finance.transferFees} muted />
                <PLRow label="Less: Marketing Costs" value={-finance.marketingCosts} muted />
                <PLRow label="Net Revenue" value={finance.netRevenue} bold divider />
                <PLRow label="Land Cost" value={-landCost} muted />
                <PLRow label="Construction Cost" value={-finance.totalConstructionCost} muted sub={`${tierConfig.costPsqft} AED/sqft × ${Math.round(totalSaleableArea * tierConfig.gfaRatio).toLocaleString()} sqft GFA`} />
                <PLRow label="Soft Costs (Design, Permits, Consultant)" value={-finance.softCosts} muted />
                <PLRow label="Finance Costs (Interest During Construction)" value={-finance.financeCosts} muted />
                <PLRow label="Total Development Cost" value={-finance.totalCost} bold divider />
                <PLRow label="Net Profit" value={finance.netProfit} bold positive={finance.netProfit > 0} large divider />
                <PLRow label="Profit Margin" value={finance.profitMargin} suffix="%" />
                <PLRow label="ROI (Return on Total Cost)" value={finance.roi} suffix="%" />
                <PLRow label="ROE (Return on Equity)" value={finance.roe} suffix="%" />
              </tbody>
            </table>
          </div>

          {/* Financing structure */}
          <div className="grid grid-cols-3 gap-3">
            <FinCard label="Equity Investment" value={`AED ${(finance.equityInvestment / 1e6).toFixed(1)}M`} sub="40% of total cost" />
            <FinCard label="Construction Loan" value={`AED ${(finance.loanAmount / 1e6).toFixed(1)}M`} sub="60% @ 8.5% p.a." />
            <FinCard label="Monthly Loan Payment" value={`AED ${(finance.loanMonthlyPayment / 1e6).toFixed(2)}M`} sub={`${constructionMonths} months`} />
          </div>
        </motion.div>
      )}

      {/* === IRR & CASHFLOW === */}
      {activeTab === "irr" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Key metrics */}
          <div className="grid grid-cols-4 gap-3">
            <FinCard label="Project IRR" value={`${finance.irr}%`} sub="Internal Rate of Return" accent />
            <FinCard label="NPV (12% WACC)" value={`AED ${(finance.npv / 1e6).toFixed(1)}M`} sub="Net Present Value" positive={finance.npv > 0} />
            <FinCard label="Payback Period" value={`${finance.paybackMonths} mo`} sub="Cumulative cashflow positive" />
            <FinCard label="Net Profit" value={`AED ${(finance.netProfit / 1e6).toFixed(1)}M`} sub={`${finance.profitMargin}% margin`} positive={finance.netProfit > 0} />
          </div>

          {/* Cashflow chart */}
          <div className="p-5 rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="text-sm font-semibold mb-3" style={{ color: "var(--text-heading)" }}>Cumulative Cashflow (AED Millions)</div>
            <div style={{ height: "220px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashflowData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="month" stroke="var(--chart-axis)" tick={{ fontSize: 9, fill: "var(--chart-axis)" }} />
                  <YAxis stroke="var(--chart-axis)" tick={{ fontSize: 9, fill: "var(--chart-axis)" }} tickFormatter={(v) => `${v}M`} />
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: "6px", fontSize: "11px", color: "var(--text-heading)" }} />
                  <defs>
                    <linearGradient id="cfGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--gold)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="cumulative" stroke="var(--gold)" strokeWidth={2} fill="url(#cfGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Equity waterfall */}
          <div className="rounded-xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="px-4 py-3 border-b text-xs font-semibold uppercase tracking-wider" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
              Equity Waterfall (GP/LP Distribution)
            </div>
            <div style={{ height: "180px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waterfallData} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="name" stroke="var(--chart-axis)" tick={{ fontSize: 9, fill: "var(--chart-axis)" }} />
                  <YAxis stroke="var(--chart-axis)" tick={{ fontSize: 9, fill: "var(--chart-axis)" }} tickFormatter={(v) => `${v}M`} />
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: "6px", fontSize: "11px", color: "var(--text-heading)" }} formatter={(v: number) => [`AED ${v}M`, ""]} />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {waterfallData.map((_, i) => (
                      <Cell key={i} fill={i === waterfallData.length - 1 ? "var(--gold)" : i % 2 === 0 ? "var(--accent)" : "var(--positive)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      )}

      {/* === COMPLIANCE === */}
      {activeTab === "compliance" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Compliance summary */}
          <div className="p-5 rounded-xl border flex items-center justify-between" style={{
            background: compliance.summary.overallStatus === "Fully Compliant" ? "color-mix(in srgb, var(--positive) 8%, var(--surface))"
              : compliance.summary.overallStatus === "Action Required" ? "color-mix(in srgb, var(--gold) 8%, var(--surface))"
              : "color-mix(in srgb, var(--negative) 8%, var(--surface))",
            borderColor: compliance.summary.overallStatus === "Fully Compliant" ? "var(--positive)" : compliance.summary.overallStatus === "Action Required" ? "var(--gold)" : "var(--negative)",
            borderLeftWidth: 3,
          }}>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{emirate} Regulatory Compliance Status</div>
              <div className="text-xl font-bold mt-1" style={{
                color: compliance.summary.overallStatus === "Fully Compliant" ? "var(--positive)" : compliance.summary.overallStatus === "Action Required" ? "var(--gold)" : "var(--negative)",
              }}>{compliance.summary.overallStatus}</div>
            </div>
            <div className="flex gap-4 text-center">
              <div><div className="text-lg font-bold" style={{ color: "var(--positive)" }}>{compliance.summary.compliant}</div><div className="text-[9px]" style={{ color: "var(--text-muted)" }}>Compliant</div></div>
              <div><div className="text-lg font-bold" style={{ color: "var(--gold)" }}>{compliance.summary.warnings}</div><div className="text-[9px]" style={{ color: "var(--text-muted)" }}>Warnings</div></div>
              <div><div className="text-lg font-bold" style={{ color: "var(--negative)" }}>{compliance.summary.actionsRequired}</div><div className="text-[9px]" style={{ color: "var(--text-muted)" }}>Actions</div></div>
            </div>
          </div>

          {/* Compliance checks list */}
          <div className="space-y-2">
            {compliance.checks.map((check, i) => (
              <motion.div key={check.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                className="p-3 rounded-lg border flex items-start gap-3"
                style={{
                  background: "var(--surface)",
                  borderColor: check.status === "compliant" ? "var(--positive)" : check.status === "warning" ? "var(--gold)" : check.status === "action_required" ? "var(--negative)" : "var(--border)",
                  borderLeftWidth: 2,
                  opacity: check.status === "not_applicable" ? 0.5 : 1,
                }}>
                <div className="flex-shrink-0 mt-0.5">
                  {check.status === "compliant" ? <Check size={14} style={{ color: "var(--positive)" }} />
                   : check.status === "warning" ? <AlertTriangle size={14} style={{ color: "var(--gold)" }} />
                   : check.status === "action_required" ? <AlertTriangle size={14} style={{ color: "var(--negative)" }} />
                   : <FileText size={14} style={{ color: "var(--text-muted)" }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{
                      background: "var(--surface-raised)",
                      color: check.status === "compliant" ? "var(--positive)" : check.status === "warning" ? "var(--gold)" : check.status === "action_required" ? "var(--negative)" : "var(--text-muted)",
                    }}>{check.category}</span>
                    <span className="text-xs font-semibold" style={{ color: "var(--text-heading)" }}>{check.rule}</span>
                  </div>
                  <div className="text-[11px]" style={{ color: "var(--text-body)" }}>{check.requirement}</div>
                  <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{check.detail}</div>
                  {check.deadline && <div className="text-[10px] mt-1 font-medium" style={{ color: "var(--gold)" }}>⏰ Deadline: {check.deadline}</div>}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* === BUYER SURVEY === */}
      {activeTab === "survey" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Survey summary */}
          <div className="p-5 rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Market Research Summary — 2025</div>
            <div className="grid grid-cols-4 gap-3">
              <FinCard label="Survey Findings" value={`${surveySummary.totalFindings}`} sub="data points" />
              <FinCard label="Total Sample" value={`${(surveySummary.totalSampleSize / 1000).toFixed(0)}K`} sub="respondents" />
              <FinCard label="Data Sources" value={`${surveySummary.sources.length}`} sub="research firms" />
              <FinCard label="Coverage" value={`${surveySummary.categories.length}`} sub="categories" />
            </div>
            <div className="flex flex-wrap gap-1 mt-3">
              {surveySummary.sources.map((src, i) => (
                <span key={i} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "var(--surface-raised)", color: "var(--text-muted)" }}>{src}</span>
              ))}
            </div>
          </div>

          {/* Survey findings by category */}
          {Object.entries(surveyCategories).map(([category, findings]) => (
            <div key={category} className="rounded-xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <div className="px-4 py-2.5 border-b text-xs font-semibold uppercase tracking-wider" style={{ borderColor: "var(--border)", color: "var(--gold)" }}>{category}</div>
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {findings.map((f, i) => (
                  <div key={i} className="px-4 py-2.5 flex items-center gap-3" style={{ borderBottom: "1px solid var(--border)" }}>
                    <div className="flex-shrink-0 w-12 text-right">
                      <span className="text-sm font-bold" style={{ color: f.percentage > 0 ? "var(--gold)" : "var(--negative)" }}>{f.percentage > 0 ? "+" : ""}{f.percentage}%</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-[11px]" style={{ color: "var(--text-body)" }}>{f.finding}</div>
                      <div className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>{f.source} · {f.sampleSize.toLocaleString()} respondents · {f.year}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

/* === Helper components === */

function PLRow({ label, value, suffix, sub, bold, divider, muted, positive, large }: {
  label: string; value: number; suffix?: string; sub?: string; bold?: boolean; divider?: boolean; muted?: boolean; positive?: boolean; large?: boolean;
}) {
  const formatted = suffix === "%" ? `${value > 0 ? "+" : ""}${value}%` : `${value < 0 ? "-" : ""}AED ${Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
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

function FinCard({ label, value, sub, accent, positive }: { label: string; value: string; sub?: string; accent?: boolean; positive?: boolean }) {
  return (
    <div className="p-3 rounded-lg border" style={{ background: "var(--surface)", borderColor: accent ? "var(--gold)" : "var(--border)", borderLeftWidth: accent ? 2 : 1 }}>
      <div className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{label}</div>
      <div className="text-base font-bold" style={{ color: accent ? "var(--gold)" : positive ? "var(--positive)" : "var(--text-heading)" }}>{value}</div>
      {sub && <div className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>{sub}</div>}
    </div>
  );
}
