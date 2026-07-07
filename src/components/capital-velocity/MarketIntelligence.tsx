"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { TrendingUp, TrendingDown, AlertTriangle, Check } from "lucide-react";
import { COMPETITOR_PROJECTS, getMarketBenchmarks, compareToMarket } from "@/lib/engines/competitor-benchmark";
import { HISTORICAL_DATA, getTrendAnalysis, getForecast } from "@/lib/engines/market-trends";
import { BUYER_PERSONAS, getWeightedWillingnessToPay } from "@/lib/engines/buyer-personas";
import { getCorridorBenchmarks, compareToCorridor } from "@/lib/engines/project-database";
import { calculateSensitivity } from "@/lib/engines/sensitivity-analysis";
import { ResponsiveContainer, LineChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from "recharts";

interface MarketIntelligenceProps {
  corridor: string;
  projectPsqft: number;
  projectAbsorptionDays: number;
  unitCount: number;
  avgSqft: number;
  dailyCarryCost: number;
  timelineMonths: number;
}

export function MarketIntelligence({
  corridor,
  projectPsqft,
  projectAbsorptionDays,
  unitCount,
  avgSqft,
  dailyCarryCost,
  timelineMonths,
}: MarketIntelligenceProps) {
  const [activeTab, setActiveTab] = useState<"corridor" | "trends" | "personas" | "sensitivity">("corridor");

  const corridorBenchmarks = getCorridorBenchmarks(corridor);
  const corridorComparison = compareToCorridor(corridor, projectPsqft, projectAbsorptionDays);
  const marketBenchmarks = getMarketBenchmarks();
  const marketComparison = compareToMarket(projectPsqft, projectAbsorptionDays);
  const trends = getTrendAnalysis();
  const forecast = getForecast();
  const weightedWTP = getWeightedWillingnessToPay();
  const sensitivity = calculateSensitivity(projectPsqft, projectAbsorptionDays, unitCount, avgSqft, dailyCarryCost, timelineMonths);

  // Combine historical + forecast for the chart
  const trendChartData = [
    ...HISTORICAL_DATA.map((d) => ({ label: d.label, actual: d.avgPsqft, forecast: null as number | null })),
    ...forecast.forecast.map((d) => ({ label: d.label, actual: null as number | null, forecast: d.forecastPsqft })),
  ];

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-2 border-b" style={{ borderColor: "var(--border)" }}>
        {[
          { id: "corridor", label: "Corridor Benchmark" },
          { id: "trends", label: "Market Trends" },
          { id: "personas", label: "Buyer Personas" },
          { id: "sensitivity", label: "Sensitivity" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className="px-4 py-2.5 text-xs font-medium transition-all border-b-2 -mb-px"
            style={{
              borderColor: activeTab === tab.id ? "var(--gold)" : "transparent",
              color: activeTab === tab.id ? "var(--gold)" : "var(--text-muted)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* === CORRIDOR BENCHMARK === */}
      {activeTab === "corridor" && corridorBenchmarks && corridorComparison && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Position vs corridor */}
          <div className="p-5 rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Your Position vs {corridor} Corridor
                </div>
                <div className="text-lg font-semibold mt-1" style={{ color: "var(--text-heading)" }}>
                  {corridorBenchmarks.projectCount} comparable projects in this corridor
                </div>
              </div>
              <div
                className="px-3 py-1.5 rounded-lg text-sm font-bold"
                style={{
                  background: corridorComparison.psqftVsCorridor.deltaPct > 0
                    ? "color-mix(in srgb, var(--positive) 12%, transparent)"
                    : "color-mix(in srgb, var(--negative) 12%, transparent)",
                  color: corridorComparison.psqftVsCorridor.deltaPct > 0 ? "var(--positive)" : "var(--negative)",
                }}
              >
                {corridorComparison.psqftVsCorridor.deltaPct > 0 ? "+" : ""}
                {corridorComparison.psqftVsCorridor.deltaPct}% vs corridor avg
              </div>
            </div>

            {/* PSF range bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px]" style={{ color: "var(--text-muted)" }}>
                <span>AED {corridorBenchmarks.minPsqft}/sqft (min)</span>
                <span>AED {corridorBenchmarks.avgPsqft}/sqft (avg)</span>
                <span>AED {corridorBenchmarks.maxPsqft}/sqft (max)</span>
              </div>
              <div className="relative h-8 rounded-lg overflow-hidden" style={{ background: "var(--surface-raised)" }}>
                <div
                  className="absolute h-full rounded-lg"
                  style={{
                    background: "linear-gradient(90deg, var(--positive), var(--gold), var(--accent))",
                    opacity: 0.3,
                  }}
                />
                {/* Project marker */}
                <div
                  className="absolute top-0 bottom-0 w-1 rounded-full"
                  style={{
                    left: `${Math.min(100, Math.max(0, ((projectPsqft - corridorBenchmarks.minPsqft) / (corridorBenchmarks.maxPsqft - corridorBenchmarks.minPsqft)) * 100))}%`,
                    background: "var(--gold)",
                    boxShadow: "0 0 8px var(--gold)",
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold" style={{ color: "var(--text-heading)" }}>
                    Your Project: AED {projectPsqft}/sqft
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Corridor stats */}
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="Avg PSF" value={`AED ${corridorBenchmarks.avgPsqft}`} sub="per sqft" />
            <StatCard label="Avg Absorption" value={`${corridorBenchmarks.avgAbsorption}`} sub="units/month" />
            <StatCard label="Avg Sell-Through" value={`${corridorBenchmarks.avgSellThrough}%`} sub="of total units" />
            <StatCard label="12mo Appreciation" value={`${corridorBenchmarks.avgAppreciation}%`} sub="avg price growth" />
          </div>

          {/* Competitor table */}
          <div className="rounded-xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="px-4 py-3 border-b text-xs font-semibold uppercase tracking-wider" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
              {corridor} — Competitor Projects
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "var(--surface-raised)" }}>
                    <th className="text-left px-4 py-2 font-medium" style={{ color: "var(--text-muted)" }}>Project</th>
                    <th className="text-left px-4 py-2 font-medium" style={{ color: "var(--text-muted)" }}>Developer</th>
                    <th className="text-right px-4 py-2 font-medium" style={{ color: "var(--text-muted)" }}>PSF</th>
                    <th className="text-right px-4 py-2 font-medium" style={{ color: "var(--text-muted)" }}>Sold</th>
                    <th className="text-right px-4 py-2 font-medium" style={{ color: "var(--text-muted)" }}>Units/mo</th>
                    <th className="text-right px-4 py-2 font-medium" style={{ color: "var(--text-muted)" }}>Apprec.</th>
                  </tr>
                </thead>
                <tbody>
                  {corridorBenchmarks.projects.map((p, i) => (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td className="px-4 py-2.5" style={{ color: "var(--text-heading)" }}>
                        <div className="flex items-center gap-2">
                          {p.riskFlag && <AlertTriangle size={11} style={{ color: "var(--negative)" }} />}
                          {p.project}
                        </div>
                      </td>
                      <td className="px-4 py-2.5" style={{ color: "var(--text-body)" }}>{p.developer}</td>
                      <td className="px-4 py-2.5 text-right font-mono" style={{ color: "var(--gold)" }}>{p.pricing.currentPsqft.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right" style={{ color: "var(--text-body)" }}>{p.absorption.sellThroughPct}%</td>
                      <td className="px-4 py-2.5 text-right" style={{ color: "var(--text-body)" }}>{p.absorption.avgUnitsPerMonth}</td>
                      <td className="px-4 py-2.5 text-right" style={{ color: p.pricing.appreciationPct > 10 ? "var(--positive)" : "var(--text-body)" }}>
                        +{p.pricing.appreciationPct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* === MARKET TRENDS === */}
      {activeTab === "trends" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Trend stats */}
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="24-Month Growth" value={`+${trends.twentyFourMonthGrowth}%`} sub="PSF appreciation" positive />
            <StatCard label="Current Avg PSF" value={`AED ${trends.currentPsqft}`} sub="Dubai Marina corridor" />
            <StatCard label="Absorption Speed" value={`-${trends.absorptionImprovementDays} days`} sub="faster than 2 years ago" positive />
            <StatCard label="Monthly Volume" value={`${trends.avgMonthlyVolume}`} sub="avg transactions/mo" />
          </div>

          {/* Trend chart */}
          <div className="p-5 rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
                24-Month PSF Trend + 6-Month Forecast
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1" style={{ color: "var(--gold)" }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: "var(--gold)" }} /> Actual
                </span>
                <span className="flex items-center gap-1" style={{ color: "var(--accent)" }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} /> Forecast
                </span>
              </div>
            </div>
            <div style={{ height: "260px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="label" stroke="var(--chart-axis)" tick={{ fontSize: 9, fill: "var(--chart-axis)" }} interval={2} />
                  <YAxis stroke="var(--chart-axis)" tick={{ fontSize: 9, fill: "var(--chart-axis)" }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                  <Tooltip
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: "6px", fontSize: "11px", color: "var(--text-heading)" }}
                    labelStyle={{ color: "var(--text-muted)" }}
                  />
                  <Line type="monotone" dataKey="actual" stroke="var(--gold)" strokeWidth={2.5} dot={false} connectNulls={false} />
                  <Line type="monotone" dataKey="forecast" stroke="var(--accent)" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Forecast summary */}
          <div className="p-5 rounded-xl border-l-2" style={{ background: "var(--surface)", borderColor: "var(--border)", borderLeftColor: "var(--gold)" }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--gold)" }}>
              12-Month Forecast
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>Projected PSF Growth</div>
                <div className="text-xl font-bold" style={{ color: "var(--positive)" }}>+AED {forecast.projectedGrowth12Month}</div>
                <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{forecast.slope} AED/sqft per month</div>
              </div>
              <div>
                <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>Projected PSF (12mo)</div>
                <div className="text-xl font-bold" style={{ color: "var(--text-heading)" }}>AED {trends.currentPsqft + forecast.projectedGrowth12Month}</div>
                <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>from AED {trends.currentPsqft}</div>
              </div>
              <div>
                <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>Total New Supply (24mo)</div>
                <div className="text-xl font-bold" style={{ color: "var(--text-heading)" }}>{trends.totalNewLaunches} projects</div>
                <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{trends.totalTransactions.toLocaleString()} transactions</div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* === BUYER PERSONAS === */}
      {activeTab === "personas" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Weighted WTP */}
          <div className="p-5 rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
              Market-Weighted Willingness to Pay (AED/sqft premium)
            </div>
            <div className="grid grid-cols-4 gap-3">
              <WTPCard label="Marina View" value={weightedWTP.marinaView} />
              <WTPCard label="Sea View" value={weightedWTP.seaView} />
              <WTPCard label="High Floor" value={weightedWTP.highFloor} />
              <WTPCard label="Brand Developer" value={weightedWTP.brandDeveloper} />
            </div>
          </div>

          {/* Persona cards */}
          <div className="grid md:grid-cols-2 gap-4">
            {BUYER_PERSONAS.map((persona, i) => (
              <motion.div
                key={persona.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="p-5 rounded-xl border"
                style={{ background: "var(--surface)", borderColor: "var(--border)", borderLeftWidth: 3, borderLeftColor: "var(--gold)" }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>{persona.name}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{persona.archetype}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold" style={{ color: "var(--gold)" }}>{persona.share}%</div>
                    <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>of buyers</div>
                  </div>
                </div>

                <div className="space-y-2 text-[11px]">
                  <PersonaRow label="Segment" value={persona.segment} />
                  <PersonaRow label="Age" value={persona.demographics.ageRange} />
                  <PersonaRow label="Nationalities" value={persona.demographics.nationalities.join(", ")} />
                  <PersonaRow label="Income" value={persona.demographics.incomeBracket} />
                  <PersonaRow label="Budget" value={persona.preferences.maxBudget} />
                  <PersonaRow label="Plan Pref" value={persona.preferences.paymentPlanPreference} />
                  <PersonaRow label="Hold Period" value={persona.behavior.averageHoldPeriod} />
                  <PersonaRow label="Expected ROI" value={persona.behavior.expectedROI} />
                </div>

                <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                  <div className="text-[9px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Decision Factors</div>
                  <div className="flex flex-wrap gap-1">
                    {persona.preferences.decisionFactors.map((f, j) => (
                      <span key={j} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "var(--surface-raised)", color: "var(--text-body)" }}>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* === SENSITIVITY === */}
      {activeTab === "sensitivity" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Base case */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--gold)", borderLeftWidth: 3 }}>
              <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Base Case IRR</div>
              <div className="text-3xl font-bold mt-1" style={{ color: "var(--gold)" }}>{sensitivity.baseIRR}%</div>
              <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>Based on current inputs</div>
            </div>
            <div className="p-5 rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Base Case NPV</div>
              <div className="text-3xl font-bold mt-1" style={{ color: "var(--text-heading)" }}>AED {sensitivity.baseNPV}M</div>
              <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>Net of carry costs</div>
            </div>
          </div>

          {/* Tornado chart */}
          <div className="p-5 rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="text-sm font-semibold mb-4" style={{ color: "var(--text-heading)" }}>
              Sensitivity Tornado — IRR Impact of ±30% Variable Changes
            </div>
            <div style={{ height: "200px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sensitivity.tornadoData}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 80, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis type="number" stroke="var(--chart-axis)" tick={{ fontSize: 10, fill: "var(--chart-axis)" }} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="variable" stroke="var(--chart-axis)" tick={{ fontSize: 11, fill: "var(--chart-axis)" }} width={80} />
                  <Tooltip
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: "6px", fontSize: "11px", color: "var(--text-heading)" }}
                    formatter={(v: number) => [`${v}% IRR`, ""]}
                  />
                  <Bar dataKey="lowIRR" fill="var(--negative)" opacity={0.7} name="IRR at -30%" />
                  <Bar dataKey="highIRR" fill="var(--positive)" opacity={0.7} name="IRR at +30%" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sensitivity table */}
          <div className="rounded-xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="px-4 py-3 border-b text-xs font-semibold uppercase tracking-wider" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
              IRR Sensitivity Matrix (% IRR at each variation)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "var(--surface-raised)" }}>
                    <th className="text-left px-4 py-2 font-medium" style={{ color: "var(--text-muted)" }}>Variable</th>
                    {[-30, -20, -10, 0, 10, 20, 30].map((pct) => (
                      <th key={pct} className="text-right px-3 py-2 font-medium" style={{ color: pct === 0 ? "var(--gold)" : "var(--text-muted)" }}>
                        {pct > 0 ? "+" : ""}{pct}%
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sensitivity.variables.map((v) => (
                    <tr key={v.name} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td className="px-4 py-2.5" style={{ color: "var(--text-heading)" }}>{v.name}</td>
                      {v.scenarios.map((s, i) => (
                        <td key={i} className="px-3 py-2.5 text-right font-mono" style={{
                          color: s.irr > sensitivity.baseIRR ? "var(--positive)" : s.irr < sensitivity.baseIRR ? "var(--negative)" : "var(--gold)",
                          fontWeight: s.pct === 0 ? 600 : 400,
                        }}>
                          {s.irr}%
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* === Helper components === */

function StatCard({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <div className="p-4 rounded-lg border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{label}</div>
      <div className="text-lg font-semibold" style={{ color: positive ? "var(--positive)" : "var(--text-heading)" }}>{value}</div>
      {sub && <div className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>{sub}</div>}
    </div>
  );
}

function WTPCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-3 rounded-lg border text-center" style={{ background: "var(--surface-raised)", borderColor: "var(--border)" }}>
      <div className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{label}</div>
      <div className="text-xl font-bold" style={{ color: "var(--gold)" }}>+{value}</div>
      <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>AED/sqft</div>
    </div>
  );
}

function PersonaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="flex-shrink-0" style={{ color: "var(--text-muted)" }}>{label}:</span>
      <span className="text-right" style={{ color: "var(--text-body)" }}>{value}</span>
    </div>
  );
}
