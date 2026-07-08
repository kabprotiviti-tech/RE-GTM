"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Rocket, TrendingUp, Users, AlertTriangle, Plus, Trash2, AlertCircle } from "lucide-react";
import { calculateLaunchPhasing, DEFAULT_PHASES, type PhaseConfig } from "@/lib/engines/launch-phasing";
import { getAbsorptionRate, GCC_CONSTRUCTION_COSTS } from "@/lib/engines/launch-phasing";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";

interface LaunchPhasingPanelProps {
  basePricePsqft: number;
  totalUnits: number;
  avgUnitSize: number;
  corridor: string;
}

export function LaunchPhasingPanel({ basePricePsqft, totalUnits, avgUnitSize, corridor }: LaunchPhasingPanelProps) {
  const [phases, setPhases] = useState<PhaseConfig[]>(DEFAULT_PHASES);

  const absorptionRate = getAbsorptionRate(corridor, "average");
  const result = useMemo(
    () => calculateLaunchPhasing(phases, basePricePsqft, totalUnits, avgUnitSize, absorptionRate),
    [phases, basePricePsqft, totalUnits, avgUnitSize, absorptionRate]
  );

  const updatePhase = useCallback((id: string, field: keyof PhaseConfig, value: string | number) => {
    setPhases((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }, []);

  const addPhase = useCallback(() => {
    const newPhaseNum = phases.length + 1;
    const lastPrice = phases.length > 0 ? phases[phases.length - 1].priceIncreasePct : 0;
    setPhases((prev) => [
      ...prev,
      {
        id: `phase-${Date.now()}`,
        name: `Activation ${newPhaseNum - 1}`,
        unitsPct: 10,
        priceIncreasePct: lastPrice + 5,
        velocityFactor: 0.6,
        targetBuyer: "Late-stage buyers",
        marketingStrategy: "Targeted campaigns based on remaining inventory",
      },
    ]);
  }, [phases]);

  const removePhase = useCallback((id: string) => {
    setPhases((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));
  }, []);

  const resetPhases = useCallback(() => {
    setPhases(DEFAULT_PHASES);
  }, []);

  // Auto-normalize unit percentages to 100
  const pctValid = result.unitsPctTotal === 100;

  // Chart data
  const priceEscalationData = result.phases.map((p) => ({
    name: p.name,
    price: p.pricePsqft,
    units: p.unitsReleased,
    revenue: Math.round(p.revenue / 1e6 * 10) / 10,
  }));

  return (
    <div className="space-y-4">
      {/* Header + controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Rocket size={14} style={{ color: "var(--gold)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
            Configurable Launch Phasing
          </span>
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            ({phases.length} phases · {absorptionRate} units/month base)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetPhases}
            className="text-[10px] px-2 py-1 rounded transition-all"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
          >
            Reset to Default
          </button>
          <button
            onClick={addPhase}
            className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded font-medium transition-all"
            style={{ background: "color-mix(in srgb, var(--gold) 12%, transparent)", border: "1px solid var(--gold)", color: "var(--gold)" }}
          >
            <Plus size={11} />
            Add Phase
          </button>
        </div>
      </div>

      {/* Validation warning */}
      {!pctValid && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border"
          style={{ background: "color-mix(in srgb, var(--negative) 8%, transparent)", borderColor: "var(--negative)", borderLeftWidth: 2 }}
        >
          <AlertCircle size={14} style={{ color: "var(--negative)" }} />
          <span className="text-xs" style={{ color: "var(--negative)" }}>
            Unit allocation totals {result.unitsPctTotal}% — must equal 100%. Adjust the percentages below.
          </span>
        </motion.div>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <div className="p-3 rounded-lg border" style={{ background: "var(--surface)", borderColor: "var(--gold)", borderLeftWidth: 2 }}>
          <div className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Total Sellout</div>
          <div className="text-lg font-bold mt-1" style={{ color: "var(--gold)" }}>AED {(result.totalRevenue / 1e6).toFixed(0)}M</div>
          <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>{result.totalSelloutMonths} months</div>
        </div>
        <div className="p-3 rounded-lg border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Blended PSF</div>
          <div className="text-lg font-bold mt-1" style={{ color: "var(--text-heading)" }}>AED {result.avgPricePsqft.toLocaleString()}</div>
          <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>across {phases.length} phases</div>
        </div>
        <div className="p-3 rounded-lg border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Price Realization</div>
          <div className="text-lg font-bold mt-1" style={{ color: "var(--positive)" }}>+{result.priceRealizationPct}%</div>
          <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>last vs first phase</div>
        </div>
        <div className="p-3 rounded-lg border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Blended Margin</div>
          <div className="text-lg font-bold mt-1" style={{ color: "var(--text-heading)" }}>{result.blendedMargin}%</div>
          <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>at 55% cost ratio</div>
        </div>
      </div>

      {/* Price escalation chart */}
      <div className="p-5 rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={14} style={{ color: "var(--gold)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>Price Escalation Across Phases</span>
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
                {priceEscalationData.map((_, i) => {
                  const colors = ["var(--positive)", "var(--accent)", "var(--gold)", "var(--gold-muted)", "var(--negative)"];
                  return <Cell key={i} fill={colors[i % colors.length]} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Interactive phase cards */}
      <div className="space-y-3">
        <AnimatePresence>
          {result.phases.map((phase, i) => (
            <motion.div
              key={phase.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8, height: 0 }}
              transition={{ duration: 0.2 }}
              className="p-4 rounded-xl border"
              style={{
                background: "var(--surface)",
                borderColor: i === 0 ? "var(--positive)" : i === result.phases.length - 1 ? "var(--gold)" : "var(--border)",
                borderLeftWidth: 3,
                borderLeftColor: i === 0 ? "var(--positive)" : i === result.phases.length - 1 ? "var(--gold)" : "var(--accent)",
              }}
            >
              {/* Phase header — editable */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: i === 0 ? "color-mix(in srgb, var(--positive) 15%, transparent)"
                        : i === result.phases.length - 1 ? "color-mix(in srgb, var(--gold) 15%, transparent)"
                        : "var(--surface-raised)",
                    }}
                  >
                    {i === 0 ? <Rocket size={16} style={{ color: "var(--positive)" }} /> : <Users size={16} style={{ color: i === result.phases.length - 1 ? "var(--gold)" : "var(--accent)" }} />}
                  </div>
                  <div className="flex-1">
                    {/* Editable phase name */}
                    <input
                      type="text"
                      value={phase.name}
                      onChange={(e) => updatePhase(phase.id, "name", e.target.value)}
                      className="bg-transparent text-sm font-bold outline-none border-b border-transparent hover:border-[var(--border)] focus:border-[var(--gold)] transition-colors"
                      style={{ color: "var(--text-heading)" }}
                    />
                    {/* Phase result */}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-lg font-bold font-mono" style={{ color: "var(--gold)" }}>AED {phase.pricePsqft.toLocaleString()}</span>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>/sqft</span>
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
                  </div>
                </div>

                {/* Remove button */}
                {phases.length > 1 && (
                  <button
                    onClick={() => removePhase(phase.id)}
                    className="p-1.5 rounded transition-all hover:bg-[var(--surface-raised)]"
                    style={{ color: "var(--text-muted)" }}
                    title="Remove this phase"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {/* Editable configuration row */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                {/* Units % */}
                <div>
                  <label className="text-[9px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>
                    Units Allocation
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={phase.unitsPct}
                      onChange={(e) => updatePhase(phase.id, "unitsPct", Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded text-xs font-mono outline-none focus:border-[var(--gold)]"
                      style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--text-heading)" }}
                    />
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>%</span>
                  </div>
                  <div className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                    = {phase.unitsReleased} units
                  </div>
                </div>

                {/* Price increase % */}
                <div>
                  <label className="text-[9px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>
                    Price Increase
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={phase.priceIncreasePct}
                      onChange={(e) => updatePhase(phase.id, "priceIncreasePct", Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded text-xs font-mono outline-none focus:border-[var(--gold)]"
                      style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--text-heading)" }}
                    />
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>%</span>
                  </div>
                  <div className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                    → AED {phase.pricePsqft.toLocaleString()}/sqft
                  </div>
                </div>

                {/* Velocity factor */}
                <div>
                  <label className="text-[9px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>
                    Velocity Factor
                  </label>
                  <select
                    value={phase.velocityFactor}
                    onChange={(e) => updatePhase(phase.id, "velocityFactor", Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded text-xs outline-none focus:border-[var(--gold)] cursor-pointer"
                    style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--text-heading)" }}
                  >
                    <option value={1.5}>1.5x — Very Fast (FOMO)</option>
                    <option value={1.3}>1.3x — Fast (Launch momentum)</option>
                    <option value={1.0}>1.0x — Normal</option>
                    <option value={0.75}>0.75x — Slow (Premium)</option>
                    <option value={0.5}>0.5x — Very Slow (Final release)</option>
                    <option value={0.3}>0.3x — Stalled (Risk scenario)</option>
                  </select>
                  <div className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {phase.unitsPerMonth} units/mo · {phase.absorptionMonths} months
                  </div>
                </div>
              </div>

              {/* Computed metrics */}
              <div className="grid grid-cols-4 gap-2 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                <div className="p-2 rounded" style={{ background: "var(--surface-raised)" }}>
                  <div className="text-[8px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Revenue</div>
                  <div className="text-xs font-bold" style={{ color: "var(--text-heading)" }}>AED {(phase.revenue / 1e6).toFixed(1)}M</div>
                </div>
                <div className="p-2 rounded" style={{ background: "var(--surface-raised)" }}>
                  <div className="text-[8px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Cumulative</div>
                  <div className="text-xs font-bold" style={{ color: "var(--gold)" }}>AED {(phase.cumulativeRevenue / 1e6).toFixed(0)}M</div>
                </div>
                <div className="p-2 rounded" style={{ background: "var(--surface-raised)" }}>
                  <div className="text-[8px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Units Sold</div>
                  <div className="text-xs font-bold" style={{ color: "var(--text-heading)" }}>{phase.cumulativeUnitsSold}/{totalUnits}</div>
                </div>
                <div className="p-2 rounded" style={{ background: "var(--surface-raised)" }}>
                  <div className="text-[8px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Duration</div>
                  <div className="text-xs font-bold" style={{ color: "var(--text-heading)" }}>{phase.absorptionMonths} mo</div>
                </div>
              </div>

              {/* Target buyer + strategy (editable) */}
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="text-[9px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>Target Buyer</label>
                  <input
                    type="text"
                    value={phase.targetBuyer}
                    onChange={(e) => updatePhase(phase.id, "targetBuyer", e.target.value)}
                    className="w-full px-2 py-1.5 rounded text-[11px] outline-none focus:border-[var(--gold)]"
                    style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--text-body)" }}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>Marketing Strategy</label>
                  <input
                    type="text"
                    value={phase.marketingStrategy}
                    onChange={(e) => updatePhase(phase.id, "marketingStrategy", e.target.value)}
                    className="w-full px-2 py-1.5 rounded text-[11px] outline-none focus:border-[var(--gold)]"
                    style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--text-body)" }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Cumulative revenue chart */}
      <div className="p-5 rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="text-sm font-semibold mb-3" style={{ color: "var(--text-heading)" }}>
          Revenue Build by Phase (AED Millions)
        </div>
        <div style={{ height: "160px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={result.phases.map((p) => ({
                name: p.name,
                revenue: Math.round(p.revenue / 1e6 * 10) / 10,
                cumulative: Math.round(p.cumulativeRevenue / 1e6 * 10) / 10,
              }))}
              margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="name" stroke="var(--chart-axis)" tick={{ fontSize: 10, fill: "var(--chart-axis)" }} />
              <YAxis stroke="var(--chart-axis)" tick={{ fontSize: 10, fill: "var(--chart-axis)" }} tickFormatter={(v) => `${v}M`} />
              <Tooltip
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: "6px", fontSize: "11px", color: "var(--text-heading)" }}
                formatter={(v: number, name: string) => name === "cumulative" ? [`AED ${v}M`, "Cumulative"] : [`AED ${v}M`, "Phase"]}
              />
              <Bar dataKey="revenue" fill="var(--accent)" opacity={0.5} name="Phase Revenue" radius={[3, 3, 0, 0]} />
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
