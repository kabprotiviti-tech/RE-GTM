"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  TrendingUp,
  DollarSign,
  Brain,
  Layers,
  Sparkles,
  ChevronRight,
  Activity,
  Calculator,
} from "lucide-react";
import { THEMES, themeToCssVariables, loadThemeId, saveThemeId, type ThemeId } from "@/lib/themes";
import { ThemeSwitcher } from "@/components/capital-velocity/ThemeSwitcher";
import { AnimatedCounter } from "@/components/capital-velocity/AnimatedCounter";
import { Typewriter } from "@/components/capital-velocity/Typewriter";
import { FloorPicker } from "@/components/capital-velocity/FloorPicker";
import { ScenarioChart } from "@/components/capital-velocity/ScenarioChart";
import { CashflowChart } from "@/components/capital-velocity/CashflowChart";
import {
  calculateBasePricing,
  applyMicroAdjustments,
  microToMacroView,
} from "@/lib/engines/pricing-engine";
import { simulateCashflow, summarizeCashflow } from "@/lib/engines/cashflow-sim";
import { generateScenarios, summarizeScenarios } from "@/lib/engines/scenario-engine";
import { MOCK_COMPS } from "@/lib/engines/mock-data";

interface PricingResponse {
  base: any;
  micro: any;
  macro_view: string;
}

interface CashflowResponse {
  cashflow: any[];
  summary: any;
}

interface ScenariosResponse {
  scenarios: any[];
  summary: any;
}

export default function Home() {
  // --- Theme state -----------------------------------------------------------
  const [themeId, setThemeId] = useState<ThemeId>("obsidian");

  const applyTheme = useCallback((id: ThemeId) => {
    const t = THEMES[id];
    const vars = themeToCssVariables(t);
    const root = document.documentElement;
    Object.entries(vars).forEach(([k, v]) => {
      root.style.setProperty(k, v as string);
    });
    root.style.background = t.palette.ground;
    root.style.color = t.palette.textBody;
    // Override body background too — shadcn sets bg-background on <body>
    document.body.style.background = t.palette.ground;
    document.body.style.color = t.palette.textBody;
  }, []);

  useEffect(() => {
    const saved = loadThemeId();
    setThemeId(saved);
    applyTheme(saved);
  }, [applyTheme]);

  const handleThemeChange = (id: ThemeId) => {
    setThemeId(id);
    saveThemeId(id);
    applyTheme(id);
  };
  const theme = THEMES[themeId];

  // --- Input spec state ------------------------------------------------------
  const [unitType, setUnitType] = useState<"1BR" | "2BR" | "3BR">("2BR");
  const [microView, setMicroView] = useState<string>("Full Marina");
  const [floor, setFloor] = useState<number>(80);
  const [sqft, setSqft] = useState<number>(2400);
  const [developer, setDeveloper] = useState<string>("Emaar Properties");
  const [paymentPlan, setPaymentPlan] = useState<string>("60/40");
  const [timelineMonths, setTimelineMonths] = useState<number>(36);

  // --- Computed engine outputs (client-side, deterministic) -------------------
  const macroView = microToMacroView(microView);
  const basePricing = useMemo(
    () =>
      calculateBasePricing({
        unit_type: unitType,
        view: macroView,
        developer,
      }),
    [unitType, macroView, developer]
  );
  const microPricing = useMemo(
    () =>
      applyMicroAdjustments(basePricing, {
        unit_type: unitType,
        view: microView,
        floor_number: floor,
        sqft,
      }),
    [basePricing, unitType, microView, floor, sqft]
  );

  // Comps used for the rationale narrator
  const compsUsed = useMemo(
    () =>
      MOCK_COMPS.filter(
        (c) => c.unit_type === unitType && c.view === macroView
      ),
    [unitType, macroView]
  );

  // Cashflow (depends on estimated_unit_price)
  const cashflowData = useMemo(() => {
    if (microPricing.estimated_unit_price == null) return [];
    return simulateCashflow(microPricing.estimated_unit_price, paymentPlan, timelineMonths);
  }, [microPricing.estimated_unit_price, paymentPlan, timelineMonths]);
  const cashflowSummary = useMemo(() => summarizeCashflow(cashflowData), [cashflowData]);

  // Scenarios (depends on optimal PSF + base absorption from comps)
  const baseAbsorptionDays = useMemo(() => {
    if (!compsUsed.length) return 58; // fallback
    const avg = compsUsed.reduce((s, c) => s + c.absorption_days_50pct, 0) / compsUsed.length;
    return avg;
  }, [compsUsed]);

  const scenarios = useMemo(
    () =>
      generateScenarios(microPricing.final_optimal_psf ?? 3257.65, baseAbsorptionDays, {
        unit_count: 200,
        avg_sqft_per_unit: sqft,
        daily_carry_cost_aed: 50000,
      }),
    [microPricing.final_optimal_psf, baseAbsorptionDays, sqft]
  );
  const scenarioSummary = useMemo(() => summarizeScenarios(scenarios), [scenarios]);

  const [activeScenario, setActiveScenario] = useState(0);

  // --- LLM narration state ---------------------------------------------------
  const [gtmNarrative, setGtmNarrative] = useState<string>("");
  const [gtmLoading, setGtmLoading] = useState(false);
  const [rationale, setRationale] = useState<string>("");
  const [rationaleLoading, setRationaleLoading] = useState(false);

  const fetchGTM = useCallback(async () => {
    setGtmLoading(true);
    setGtmNarrative("");
    try {
      const scenarioPayload = {
        scenarios,
        summary: scenarioSummary,
        cashflow: {
          payment_plan: paymentPlan,
          timeline_months: timelineMonths,
          month_0_collected: cashflowSummary.month_0_collected,
          handover_collected: cashflowSummary.handover_collected,
        },
        pricing: microPricing,
      };
      const brief = `${200}-unit ${unitType} ${macroView} tower in Dubai Marina, ${developer}-developed, ${timelineMonths}-month build, ${paymentPlan} payment plan, Floor ${floor} ${microView} reference unit.`;
      const res = await fetch("/api/gtm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario_data_json: scenarioPayload, project_brief: brief }),
      });
      const data = await res.json();
      setGtmNarrative(data.narrative || "[NARRATOR UNAVAILABLE]");
    } catch (e: any) {
      setGtmNarrative(`[NARRATOR UNAVAILABLE]\n\n${e.message}`);
    } finally {
      setGtmLoading(false);
    }
  }, [scenarios, scenarioSummary, paymentPlan, timelineMonths, cashflowSummary, microPricing, unitType, macroView, developer, floor, microView]);

  const fetchRationale = useCallback(async () => {
    setRationaleLoading(true);
    setRationale("");
    try {
      const pricingPayload = {
        ...microPricing,
        base_optimal_psf: basePricing.optimal_psf,
        base_floor_psf: basePricing.floor_psf,
        base_ceiling_psf: basePricing.ceiling_psf,
        base_absorption_days_avg: baseAbsorptionDays,
        comps_used: compsUsed.map((c) => c.comp_id),
      };
      const res = await fetch("/api/rationale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pricing_json: pricingPayload, comps_used: compsUsed }),
      });
      const data = await res.json();
      setRationale(data.rationale || "[NARRATOR UNAVAILABLE]");
    } catch (e: any) {
      setRationale(`[NARRATOR UNAVAILABLE]\n\n${e.message}`);
    } finally {
      setRationaleLoading(false);
    }
  }, [microPricing, basePricing, baseAbsorptionDays, compsUsed]);

  // Auto-fetch rationale when pricing changes (debounced)
  useEffect(() => {
    if (microPricing.final_optimal_psf == null) return;
    const t = setTimeout(() => fetchRationale(), 400);
    return () => clearTimeout(t);
  }, [microPricing.final_optimal_psf, floor, microView, fetchRationale]);

  // Auto-fetch GTM when scenarios change (debounced)
  useEffect(() => {
    if (!scenarios.length) return;
    const t = setTimeout(() => fetchGTM(), 600);
    return () => clearTimeout(t);
  }, [scenarios, fetchGTM]);

  return (
    <div
      className="cv-theme-root min-h-screen"
    >
      {/* Header */}
      <Header themeId={themeId} onThemeChange={handleThemeChange} />

      <main className="max-w-[1400px] mx-auto px-6 md:px-10 pb-24">
        {/* Hero / Title */}
        <HeroSection />

        {/* Input controls */}
        <InputControls
          unitType={unitType}
          setUnitType={setUnitType}
          microView={microView}
          setMicroView={setMicroView}
          floor={floor}
          setFloor={setFloor}
          sqft={sqft}
          setSqft={setSqft}
          developer={developer}
          setDeveloper={setDeveloper}
          paymentPlan={paymentPlan}
          setPaymentPlan={setPaymentPlan}
          timelineMonths={timelineMonths}
          setTimelineMonths={setTimelineMonths}
        />

        {/* Pricing tiers section */}
        <PricingSection
          microPricing={microPricing}
          basePricing={basePricing}
          floor={floor}
          setFloor={setFloor}
          macroView={macroView}
        />

        {/* Pricing rationale (LLM) */}
        <RationaleSection
          rationale={rationale}
          loading={rationaleLoading}
          onRefresh={fetchRationale}
          compsUsed={compsUsed}
        />

        {/* Scenario simulator */}
        <ScenarioSection
          scenarios={scenarios}
          summary={scenarioSummary}
          activeScenario={activeScenario}
          setActiveScenario={setActiveScenario}
        />

        {/* Cashflow chart */}
        <CashflowSection
          data={cashflowData}
          summary={cashflowSummary}
          paymentPlan={paymentPlan}
          timelineMonths={timelineMonths}
        />

        {/* GTM Strategy (LLM) */}
        <GTMSection
          narrative={gtmNarrative}
          loading={gtmLoading}
          onRefresh={fetchGTM}
        />

        {/* Footer */}
        <Footer />
      </main>
    </div>
  );
}

/* ===========================================================================
   Header
   =========================================================================== */
function Header({
  themeId,
  onThemeChange,
}: {
  themeId: ThemeId;
  onThemeChange: (id: ThemeId) => void;
}) {
  return (
    <header
      className="sticky top-0 z-30 border-b backdrop-blur-xl"
      style={{
        borderColor: "var(--border)",
        background: "color-mix(in srgb, var(--ground) 80%, transparent)",
      }}
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-md flex items-center justify-center"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-strong)",
            }}
          >
            <Building2 size={18} style={{ color: "var(--gold)" }} />
          </div>
          <div>
            <div
              className="text-sm font-semibold tracking-tight"
              style={{ color: "var(--text-heading)" }}
            >
              Project Capital Velocity
            </div>
            <div
              className="text-[10px] uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Off-Plan Capital & Yield Optimisation
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] uppercase tracking-wider"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--positive)" }} />
            Deterministic Engine Live
          </div>
          <ThemeSwitcher activeThemeId={themeId} onThemeChange={onThemeChange} />
        </div>
      </div>
    </header>
  );
}

/* ===========================================================================
   Hero
   =========================================================================== */
function HeroSection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="pt-16 pb-12"
    >
      <div
        className="text-[11px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2"
        style={{ color: "var(--gold)" }}
      >
        <Sparkles size={12} />
        High-Fidelity Prototype · Dubai Marina Micro-Market
      </div>
      <h1
        className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.05] mb-4"
        style={{ color: "var(--text-heading)" }}
      >
        The pricing engine for
        <br />
        <span style={{ color: "var(--gold)" }}>AED 2 Billion</span> tower launches.
      </h1>
      <p
        className="text-base max-w-2xl leading-relaxed"
        style={{ color: "var(--text-body)" }}
      >
        Deterministic three-tier pricing architecture. Cashflow-timing simulation.
        AI-narrated GTM strategy. Built for Tier-1 GCC developers where a 2% pricing
        error equals AED 20 million destroyed on a single tower.
      </p>
    </motion.section>
  );
}

/* ===========================================================================
   Input Controls
   =========================================================================== */
function InputControls(props: any) {
  const {
    unitType, setUnitType,
    microView, setMicroView,
    floor, setFloor,
    sqft, setSqft,
    developer, setDeveloper,
    paymentPlan, setPaymentPlan,
    timelineMonths, setTimelineMonths,
  } = props;

  const selectClass =
    "w-full px-3 py-2 rounded-md text-xs font-medium outline-none appearance-none cursor-pointer";
  const selectStyle = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    color: "var(--text-heading)",
  };
  const labelClass = "text-[10px] font-semibold uppercase tracking-wider mb-1.5 block";
  const labelStyle = { color: "var(--text-muted)" };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="mb-8 p-6 rounded-lg border"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-2 mb-5">
        <Layers size={14} style={{ color: "var(--gold)" }} />
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
          Unit Specification
        </h2>
        <span className="text-[10px] uppercase tracking-wider ml-auto" style={{ color: "var(--text-muted)" }}>
          Adjust to recompute pricing → scenarios → GTM
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div>
          <label className={labelClass} style={labelStyle}>Unit Type</label>
          <select
            className={selectClass}
            style={selectStyle}
            value={unitType}
            onChange={(e) => setUnitType(e.target.value)}
          >
            <option value="1BR">1BR</option>
            <option value="2BR">2BR</option>
            <option value="3BR">3BR</option>
          </select>
        </div>

        <div>
          <label className={labelClass} style={labelStyle}>Micro View</label>
          <select
            className={selectClass}
            style={selectStyle}
            value={microView}
            onChange={(e) => setMicroView(e.target.value)}
          >
            <option value="Full Marina">Full Marina (+8%)</option>
            <option value="Partial Marina">Partial Marina</option>
            <option value="Internal">Internal (−5%)</option>
            <option value="Sea">Sea</option>
            <option value="City">City</option>
          </select>
        </div>

        <div>
          <label className={labelClass} style={labelStyle}>Floor</label>
          <input
            type="number"
            min={1}
            max={120}
            className={selectClass}
            style={selectStyle}
            value={floor}
            onChange={(e) => setFloor(Number(e.target.value))}
          />
        </div>

        <div>
          <label className={labelClass} style={labelStyle}>Sqft</label>
          <input
            type="number"
            min={500}
            max={10000}
            step={50}
            className={selectClass}
            style={selectStyle}
            value={sqft}
            onChange={(e) => setSqft(Number(e.target.value))}
          />
        </div>

        <div>
          <label className={labelClass} style={labelStyle}>Developer</label>
          <select
            className={selectClass}
            style={selectStyle}
            value={developer}
            onChange={(e) => setDeveloper(e.target.value)}
          >
            <option value="Emaar Properties">Emaar (Tier 1 +5%)</option>
            <option value="Select Group">Select Group (Tier 1 +5%)</option>
            <option value="Meraas">Meraas (Tier 1 +5%)</option>
            <option value="Muraba">Muraba (Tier 2)</option>
          </select>
        </div>

        <div>
          <label className={labelClass} style={labelStyle}>Payment Plan</label>
          <select
            className={selectClass}
            style={selectStyle}
            value={paymentPlan}
            onChange={(e) => setPaymentPlan(e.target.value)}
          >
            <option value="50/50">50/50</option>
            <option value="60/40">60/40</option>
            <option value="70/30">70/30</option>
            <option value="80/20">80/20</option>
          </select>
        </div>

        <div>
          <label className={labelClass} style={labelStyle}>Timeline (mo)</label>
          <select
            className={selectClass}
            style={selectStyle}
            value={timelineMonths}
            onChange={(e) => setTimelineMonths(Number(e.target.value))}
          >
            <option value={24}>24</option>
            <option value={36}>36</option>
            <option value={48}>48</option>
          </select>
        </div>
      </div>
    </motion.section>
  );
}

/* ===========================================================================
   Pricing Section — three-tier band + floor picker
   =========================================================================== */
function PricingSection({ microPricing, basePricing, floor, setFloor, macroView }: any) {
  const tiers = [
    { name: "Floor", value: microPricing.final_floor_psf, mult: "× 0.96", desc: "Defensive clearance price", color: "var(--text-muted)" },
    { name: "Optimal", value: microPricing.final_optimal_psf, mult: "× 1.03", desc: "Target realized price", color: "var(--gold)" },
    { name: "Ceiling", value: microPricing.final_ceiling_psf, mult: "× 1.12", desc: "Negotiation headroom", color: "var(--accent)" },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="mb-8"
    >
      <SectionHeader
        icon={<DollarSign size={14} />}
        title="Three-Tier Pricing Architecture"
        subtitle={`Macro corridor: ${macroView} · Confidence: ${basePricing.data_confidence} · ${basePricing.comp_count} comps`}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Tier tiles */}
        <div className="lg:col-span-2 grid grid-cols-3 gap-4">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="p-5 rounded-lg border"
              style={{
                background: "var(--surface)",
                borderColor: tier.name === "Optimal" ? "var(--gold)" : "var(--border)",
                borderLeftWidth: tier.name === "Optimal" ? 3 : 1,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: tier.color }}
                >
                  {tier.name}
                </div>
                <div className="text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>
                  {tier.mult}
                </div>
              </div>
              <div className="text-2xl font-semibold mb-1" style={{ color: tier.color }}>
                {tier.value != null ? (
                  <AnimatedCounter value={tier.value} format="psf" duration={1} />
                ) : (
                  <span style={{ color: "var(--text-muted)" }}>[DATA MISSING]</span>
                )}
              </div>
              <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {tier.desc}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Estimated unit price + adjustments */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="p-5 rounded-lg border"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
            Estimated Unit Price
          </div>
          <div className="text-3xl font-semibold mb-1" style={{ color: "var(--text-heading)" }}>
            {microPricing.estimated_unit_price != null ? (
              <AnimatedCounter value={microPricing.estimated_unit_price} format="aed" duration={1.4} />
            ) : (
              <span style={{ color: "var(--text-muted)" }}>[DATA MISSING]</span>
            )}
          </div>
          <div className="text-[10px] mb-4" style={{ color: "var(--text-muted)" }}>
            Optimal PSF × {sqftLabel(microPricing)}
          </div>

          <div className="space-y-2 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
            <AdjustmentRow label="Floor premium" value={microPricing.floor_premium_pct} />
            <AdjustmentRow label="View modifier" value={microPricing.micro_view_modifier_pct} />
            <AdjustmentRow label="Combined uplift" value={microPricing.combined_adjustment_pct} bold />
          </div>
        </motion.div>
      </div>

      {/* Floor picker */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="mt-6 p-5 rounded-lg border"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Floor Premium Scrubber
          </div>
          <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            Drag to see PSF shift in real-time
          </div>
        </div>
        <FloorPicker minFloor={1} maxFloor={100} floor={floor} onChange={setFloor} />
      </motion.div>
    </motion.section>
  );
}

function sqftLabel(microPricing: any) {
  // We don't have sqft in microPricing; the parent passes it. Just return a generic label.
  return "unit sqft";
}

function AdjustmentRow({ label, value, bold }: { label: string; value: number | null; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center text-[11px]">
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span
        className="font-mono"
        style={{
          color: value == null ? "var(--text-muted)" : value >= 0 ? "var(--positive)" : "var(--negative)",
          fontWeight: bold ? 600 : 400,
        }}
      >
        {value == null ? "—" : `${value >= 0 ? "+" : ""}${value}%`}
      </span>
    </div>
  );
}

/* ===========================================================================
   Rationale Section (LLM)
   =========================================================================== */
function RationaleSection({ rationale, loading, onRefresh, compsUsed }: any) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="mb-8"
    >
      <SectionHeader
        icon={<Brain size={14} />}
        title="Pricing Rationale"
        subtitle="PropTech Data Scientist · ≤3 sentences · cites absorption + view premiums"
      />

      <div
        className="p-6 rounded-lg border-l-2"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
          borderLeftColor: "var(--gold)",
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--gold)" }}>
            Why Optimal over Floor / Ceiling
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="text-[10px] px-2 py-1 rounded transition-colors disabled:opacity-50"
            style={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
          >
            {loading ? "Generating..." : "Regenerate"}
          </button>
        </div>

        {loading && !rationale ? (
          <div className="space-y-2">
            <div className="h-3 rounded animate-pulse" style={{ background: "var(--surface-raised)", width: "90%" }} />
            <div className="h-3 rounded animate-pulse" style={{ background: "var(--surface-raised)", width: "75%" }} />
            <div className="h-3 rounded animate-pulse" style={{ background: "var(--surface-raised)", width: "85%" }} />
          </div>
        ) : rationale ? (
          <Typewriter
            text={rationale}
            speed={20}
            className="text-sm leading-relaxed"
          />
        ) : (
          <div className="text-sm" style={{ color: "var(--text-muted)" }}>
            Adjust the unit spec to generate rationale.
          </div>
        )}

        {/* Comps audit trail */}
        <div className="mt-5 pt-4 border-t flex flex-wrap items-center gap-2" style={{ borderColor: "var(--border)" }}>
          <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Comps used:
          </span>
          {compsUsed.map((c: any) => (
            <span
              key={c.comp_id}
              className="text-[10px] px-2 py-0.5 rounded font-mono"
              style={{
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
                color: "var(--text-body)",
              }}
            >
              {c.comp_id} · {c.project}
            </span>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

/* ===========================================================================
   Scenario Section
   =========================================================================== */
function ScenarioSection({ scenarios, summary, activeScenario, setActiveScenario }: any) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="mb-8"
    >
      <SectionHeader
        icon={<TrendingUp size={14} />}
        title="Scenario Simulator — Price vs Velocity"
        subtitle="Aggressive · Base · Conservative · 200-unit tower assumption"
      />

      <div className="p-6 rounded-lg border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <ScenarioChart scenarios={scenarios} activeIndex={activeScenario} onSelect={setActiveScenario} />

        {/* Summary row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
          <SummaryStat label="Revenue spread" value={summary.revenue_spread_aed} format="aed" sub={`${summary.revenue_spread_pct ?? 0}% of base`} />
          <SummaryStat label="Carry cost spread" value={summary.carry_cost_spread_aed} format="aed" />
          <SummaryStat label="Net position spread" value={summary.net_position_spread_aed} format="aed" accent />
          <SummaryStat label="Absorption spread" value={summary.absorption_spread_days} format="days" />
        </div>
      </div>
    </motion.section>
  );
}

function SummaryStat({ label, value, format, sub, accent }: any) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      <div className="text-lg font-semibold" style={{ color: accent ? "var(--gold)" : "var(--text-heading)" }}>
        {value != null ? <AnimatedCounter value={value} format={format} duration={0.8} /> : <span style={{ color: "var(--text-muted)" }}>—</span>}
      </div>
      {sub && <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{sub}</div>}
    </div>
  );
}

/* ===========================================================================
   Cashflow Section
   =========================================================================== */
function CashflowSection({ data, summary, paymentPlan, timelineMonths }: any) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="mb-8"
    >
      <SectionHeader
        icon={<Activity size={14} />}
        title="Cashflow Timing — When Cash Hits The Bank"
        subtitle={`${paymentPlan} plan · ${timelineMonths}-month build · 5% downpayment at month 0`}
      />

      <div className="p-6 rounded-lg border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <CashflowChart data={data} paymentPlan={paymentPlan} />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
          <SummaryStat label="Month 0 (Downpayment)" value={summary.month_0_collected} format="aed" sub={`${summary.month_0_pct}% of unit price`} />
          <SummaryStat label={`Month ${summary.mid_build_month} (Mid-build)`} value={summary.mid_build_collected} format="aed" sub={`${summary.mid_build_pct}% collected`} />
          <SummaryStat label={`Month ${summary.handover_month} (Handover)`} value={summary.handover_collected} format="aed" sub={`${summary.handover_pct}% of unit price`} accent />
          <SummaryStat label="Total collected" value={summary.total_collected} format="aed" sub="Reconciles to unit price" />
        </div>
      </div>
    </motion.section>
  );
}

/* ===========================================================================
   GTM Section (LLM)
   =========================================================================== */
function GTMSection({ narrative, loading, onRefresh }: any) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="mb-12"
    >
      <SectionHeader
        icon={<Brain size={14} />}
        title="GTM Strategy — Boardroom Narrative"
        subtitle="Senior Partner at McKinsey · 200 words · Buyer Persona · Positioning · Launch Phasing"
      />

      <div
        className="p-6 rounded-lg border-l-2"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
          borderLeftColor: "var(--gold)",
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--gold)" }}>
            McKinsey Partner — Emaar CEO Briefing
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="text-[10px] px-2 py-1 rounded transition-colors disabled:opacity-50"
            style={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
          >
            {loading ? "Drafting..." : "Regenerate"}
          </button>
        </div>

        {loading && !narrative ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-3 rounded animate-pulse"
                style={{ background: "var(--surface-raised)", width: `${85 + Math.random() * 15}%` }}
              />
            ))}
          </div>
        ) : narrative ? (
          <Typewriter
            text={narrative}
            speed={28}
            className="text-sm leading-relaxed whitespace-pre-wrap"
          />
        ) : (
          <div className="text-sm" style={{ color: "var(--text-muted)" }}>
            Adjust the unit spec to generate GTM strategy.
          </div>
        )}
      </div>
    </motion.section>
  );
}

/* ===========================================================================
   Shared — SectionHeader, Footer
   =========================================================================== */
function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div style={{ color: "var(--gold)" }}>{icon}</div>
      <div className="flex-1">
        <h2 className="text-base font-semibold" style={{ color: "var(--text-heading)" }}>
          {title}
        </h2>
        <div className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
          {subtitle}
        </div>
      </div>
      <div className="h-px flex-1 max-w-[200px]" style={{ background: "var(--border)" }} />
    </div>
  );
}

function Footer() {
  return (
    <footer
      className="mt-16 pt-8 border-t flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
        <div className="font-semibold mb-1" style={{ color: "var(--text-body)" }}>
          Project Capital Velocity — High-Fidelity Prototype
        </div>
        <div>
          Deterministic math (TypeScript port of Python engines) · LLM narration (GLM-4) · 6-theme atlas
        </div>
        <div className="mt-1">
          Anti-Hallucination Protocol enforced: every number in LLM output traces to the deterministic JSON payload.
        </div>
      </div>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        <Calculator size={11} style={{ color: "var(--gold)" }} />
        No LLM computes a number
      </div>
    </footer>
  );
}
