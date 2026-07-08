"use client";

import { motion } from "framer-motion";
import { Rocket, TrendingUp, Users, AlertTriangle } from "lucide-react";
import { calculateLaunchPhasing, getAbsorptionRate, GCC_CONSTRUCTION_COSTS } from "@/lib/engines/launch-phasing";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LineChart, Line } from "recharts";

interface LaunchPhasingPanelProps {
  basePricePsqft: number;
  totalUnits: number;
  avgUnitSize: number;
  corridor: string;
}

export function LaunchPhasingPanel({ basePricePsqft, totalUnits, avgUnitSize, corridor }: LaunchPhasingPanelProps) {
  const absorptionRate = getAbsorptionRate(corridor, "average");
  const result = calculateLaunchPhasing(basePricePsqft, totalUnits, avgUnitSize, absorptionRate);

  // Chart data for price escalation
  const priceEscalationData = result.phases.map((p) => ({
    name: `Phase ${p.phase}`,
    label: p.name,
    price: p.pricePsqft,
    units: p.unitsReleased,
    revenue: Math.round(p.revenue / 1e6 * 10) / 10,
  }));

  // Cumulative revenue chart
  const cumulativeData = result.phases.map((p) => ({
    name: `Phase ${p.phase}`,
    cumulative: Math.round(p.cumulativeRevenue / 1e6 * 10) / 10,
    phase: Math.round(p.revenue / 1e6 * 10) / 10,
  }));

  return (
    <div className="space-y-4">
      {/* Header summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="p-3 rounded-lg border" style={{ background: "var(--surface)", borderColor: "var(--gold)", borderLeftWidth: 2 }}>
          <div className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Total Sellout Revenue</div>
          <div className="text-lg font-bold mt-1" style={{ color: "var(--gold)" }}>AED {(result.totalRevenue / 1e6).toFixed(0)}M</div>
          <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>{totalUnits} units · {result.totalSelloutMonths} months</div>
        </div>
        <div className="p-3 rounded-lg border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Blended Avg PSF</div>
          <div className="text-lg font-bold mt-1" style={{ color: "var(--text-heading)" }}>AED {result.avgPricePsqft.toLocaleString()}</div>
          <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>across all 4 phases</div>
        </div>
        <div className="p-3 rounded-lg border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Price Realization</div>
          <div className="text-lg font-bold mt-1" style={{ color: "var(--positive)" }}>+{result.priceRealizationPct}%</div>
          <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>Phase 4 vs Phase 1</div>
        </div>
        <div className="p-3 rounded-lg border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Front-Loaded Revenue</div>
          <div className="text-lg font-bold mt-1" style={{ color: "var(--text-heading)" }}>{result.cashflowTiming.frontLoadedPct}%</div>
          <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>from Phases 1+2</div>
        </div>
      </div>

      {/* Price escalation chart */}
      <div className="p-5 rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} style={{ color: "var(--gold)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>Price Escalation Across Phases</span>
          </div>
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Corridor absorption: {absorptionRate} units/month</span>
        </div>
        <div style={{ height: "180px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={priceEscalationData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="name" stroke="var(--chart-axis)" tick={{ fontSize: 10, fill: "var(--chart-axis)" }} />
              <YAxis stroke="var(--chart-axis)" tick={{ fontSize: 10, fill: "var(--chart-axis)" }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
              <Tooltip
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: "6px", fontSize: "11px", color: "var(--text-heading)" }}
                formatter={(v: number) => [`AED ${v.toLocaleString()}/sqft`, "Price"]}
              />
              <Bar dataKey="price" radius={[4, 4, 0, 0]}>
                {priceEscalationData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? "var(--positive)" : i === 1 ? "var(--accent)" : i === 2 ? "var(--gold)" : "var(--gold-muted)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Phase detail cards */}
      <div className="space-y-3">
        {result.phases.map((phase, i) => (
          <motion.div
            key={phase.phase}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="p-4 rounded-xl border"
            style={{
              background: "var(--surface)",
              borderColor: phase.phase === 1 ? "var(--positive)" : phase.phase === 4 ? "var(--gold)" : "var(--border)",
              borderLeftWidth: 3,
              borderLeftColor: phase.phase === 1 ? "var(--positive)" : phase.phase === 4 ? "var(--gold)" : "var(--accent)",
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: phase.phase === 1 ? "color-mix(in srgb, var(--positive) 15%, transparent)"
                      : phase.phase === 4 ? "color-mix(in srgb, var(--gold) 15%, transparent)"
                      : "var(--surface-raised)",
                  }}
                >
                  {phase.phase === 1 ? <Rocket size={16} style={{ color: "var(--positive)" }} /> : <Users size={16} style={{ color: phase.phase === 4 ? "var(--gold)" : "var(--accent)" }} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: "var(--text-heading)" }}>{phase.name}</span>
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        background: phase.priceIncreasePct > 0 ? "color-mix(in srgb, var(--positive) 12%, transparent)" : "var(--surface-raised)",
                        color: phase.priceIncreasePct > 0 ? "var(--positive)" : "var(--text-muted)",
                      }}
                    >
                      {phase.priceIncreasePct > 0 ? `+${phase.priceIncreasePct}%` : "Base"}
                    </span>
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{phase.description}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold font-mono" style={{ color: "var(--gold)" }}>AED {phase.pricePsqft.toLocaleString()}</div>
                <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>per sqft</div>
              </div>
            </div>

            {/* Phase metrics row */}
            <div className="grid grid-cols-5 gap-2 mb-3">
              <PhaseMetric label="Units" value={`${phase.unitsReleased}`} sub={`${phase.unitsPct}%`} />
              <PhaseMetric label="Velocity" value={`${phase.unitsPerMonth}/mo`} sub="absorption" />
              <PhaseMetric label="Duration" value={`${phase.absorptionMonths} mo`} sub="to sellout" />
              <PhaseMetric label="Revenue" value={`AED ${(phase.revenue / 1e6).toFixed(1)}M`} sub="phase total" />
              <PhaseMetric label="Cumulative" value={`AED ${(phase.cumulativeRevenue / 1e6).toFixed(0)}M`} sub={`${phase.cumulativeUnitsSold} sold`} />
            </div>

            {/* Target buyer + strategy */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Target Buyer</div>
                <div className="text-[11px]" style={{ color: "var(--text-body)" }}>{phase.targetBuyer}</div>
              </div>
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Marketing Strategy</div>
                <div className="text-[11px]" style={{ color: "var(--text-body)" }}>{phase.marketingStrategy}</div>
              </div>
            </div>

            {/* Risk note */}
            <div className="mt-2 flex items-start gap-1.5">
              <AlertTriangle size={10} style={{ color: "var(--gold)", marginTop: 2 }} className="flex-shrink-0" />
              <div className="text-[10px] italic" style={{ color: "var(--text-muted)" }}>{phase.riskNote}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Cumulative revenue chart */}
      <div className="p-5 rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="text-sm font-semibold mb-3" style={{ color: "var(--text-heading)" }}>Cumulative Revenue Build (AED Millions)</div>
        <div style={{ height: "160px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cumulativeData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="name" stroke="var(--chart-axis)" tick={{ fontSize: 10, fill: "var(--chart-axis)" }} />
              <YAxis stroke="var(--chart-axis)" tick={{ fontSize: 10, fill: "var(--chart-axis)" }} tickFormatter={(v) => `${v}M`} />
              <Tooltip
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: "6px", fontSize: "11px", color: "var(--text-heading)" }}
                formatter={(v: number, name: string) => name === "cumulative" ? [`AED ${v}M`, "Cumulative"] : [`AED ${v}M`, "Phase Revenue"]}
              />
              <Bar dataKey="phase" fill="var(--accent)" opacity={0.4} name="Phase Revenue" />
              <Bar dataKey="cumulative" fill="var(--gold)" radius={[4, 4, 0, 0]} name="Cumulative" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* GCC Construction Cost Benchmarks */}
      <div className="rounded-xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="px-4 py-3 border-b text-xs font-semibold uppercase tracking-wider" style={{ borderColor: "var(--border)", color: "var(--gold)" }}>
          GCC Construction Cost Benchmarks — By Quality Tier
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "var(--surface-raised)" }}>
                <th className="text-left px-4 py-2 font-medium" style={{ color: "var(--text-muted)" }}>Tier</th>
                <th className="text-right px-4 py-2 font-medium" style={{ color: "var(--text-muted)" }}>AED/sqft</th>
                <th className="text-left px-4 py-2 font-medium" style={{ color: "var(--text-muted)" }}>Example Developers</th>
                <th className="text-left px-4 py-2 font-medium" style={{ color: "var(--text-muted)" }}>Typical Corridors</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(GCC_CONSTRUCTION_COSTS).map(([key, tier]) => (
                <tr key={key} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="px-4 py-2.5">
                    <div style={{ color: "var(--text-heading)", fontWeight: 600 }}>{tier.label}</div>
                    <div className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>{tier.description}</div>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold" style={{ color: "var(--gold)" }}>{tier.costPsqft.toLocaleString()}</td>
                  <td className="px-4 py-2.5" style={{ color: "var(--text-body)" }}>{tier.exampleDevelopers}</td>
                  <td className="px-4 py-2.5" style={{ color: "var(--text-body)" }}>{tier.exampleProjects}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PhaseMetric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="p-2 rounded-lg" style={{ background: "var(--surface-raised)" }}>
      <div className="text-[8px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</div>
      <div className="text-xs font-bold mt-0.5" style={{ color: "var(--text-heading)" }}>{value}</div>
      <div className="text-[8px]" style={{ color: "var(--text-muted)" }}>{sub}</div>
    </div>
  );
}
