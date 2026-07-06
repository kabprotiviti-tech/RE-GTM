"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  TrendingUp,
  DollarSign,
  Brain,
  Layers,
  Sparkles,
  Activity,
  Calculator,
  Lock,
  ChevronRight,
} from "lucide-react";
import { THEMES, themeToCssVariables, loadThemeId, saveThemeId, type ThemeId } from "@/lib/themes";
import { ThemeSwitcher } from "@/components/capital-velocity/ThemeSwitcher";
import { AnimatedCounter } from "@/components/capital-velocity/AnimatedCounter";
import { Typewriter } from "@/components/capital-velocity/Typewriter";
import { FloorPicker } from "@/components/capital-velocity/FloorPicker";
import { ScenarioChart } from "@/components/capital-velocity/ScenarioChart";
import { CashflowChart } from "@/components/capital-velocity/CashflowChart";
import { ScenarioTable } from "@/components/capital-velocity/ScenarioTable";
import { GTMPanel } from "@/components/capital-velocity/GTMPanel";
import { ErrorBanner, type ErrorLevel } from "@/components/capital-velocity/ErrorBanner";
import { usePDFExport } from "@/hooks/use-pdf-export";
import { FileDown } from "lucide-react";
import { ConfidenceIndicator } from "@/components/capital-velocity/ConfidenceIndicator";
import {
  calculateBasePricing,
  applyMicroAdjustments,
  microToMacroView,
} from "@/lib/engines/pricing-engine";
import { calculateHedonicPricing } from "@/lib/engines/hedonic-engine";
import { simulateCashflow, summarizeCashflow } from "@/lib/engines/cashflow-sim";
import { generateScenarios, summarizeScenarios } from "@/lib/engines/scenario-engine";
import { MOCK_COMPS } from "@/lib/engines/mock-data";

export default function Home() {
  // --- Theme -----------------------------------------------------------------
  const [themeId, setThemeId] = useState<ThemeId>("obsidian");
  const applyTheme = useCallback((id: ThemeId) => {
    const t = THEMES[id];
    const vars = themeToCssVariables(t);
    const root = document.documentElement;
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v as string));
    root.style.background = t.palette.ground;
    root.style.color = t.palette.textBody;
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

  // --- Input spec ------------------------------------------------------------
  const [projectName, setProjectName] = useState("Marina Gate IV — Reference Tower");
  const [unitType, setUnitType] = useState<"1BR" | "2BR" | "3BR">("2BR");
  const [microView, setMicroView] = useState("Full Marina");
  const [floor, setFloor] = useState(80);
  const [sqft, setSqft] = useState(2400);
  const [developer, setDeveloper] = useState("Emaar Properties");
  const [paymentPlan, setPaymentPlan] = useState("60/40");
  const [timelineMonths, setTimelineMonths] = useState(36);
  const [unitCount, setUnitCount] = useState(200);
  const [pricingMethod, setPricingMethod] = useState<"weighted" | "hedonic">("hedonic");
  const [amenityScore, setAmenityScore] = useState(9);

  // --- Deterministic engine outputs ------------------------------------------
  const macroView = microToMacroView(microView);
  const basePricing = useMemo(
    () => calculateBasePricing({ unit_type: unitType, view: macroView, developer }),
    [unitType, macroView, developer]
  );
  const microPricing = useMemo(
    () => applyMicroAdjustments(basePricing, { unit_type: unitType, view: microView, floor_number: floor, sqft }),
    [basePricing, unitType, microView, floor, sqft]
  );

  // Hedonic pricing (Phase 11) — regression-based, not weighted average
  const hedonicPricing = useMemo(
    () => calculateHedonicPricing({ floor, amenity_score: amenityScore, view: microView }),
    [floor, amenityScore, microView]
  );

  // Active pricing output based on the selected method
  // PSF values are rounded to integers — the PricingOutput schema uses StrictInt
  // (per Phase 12 spec). Floats would fail the schema gate.
  const activePricing = pricingMethod === "hedonic" ? {
    floor_psf: Math.round(hedonicPricing.floor),
    optimal_psf: Math.round(hedonicPricing.optimal),
    ceiling_psf: Math.round(hedonicPricing.ceiling),
    estimated_unit_price: Math.round(hedonicPricing.optimal * sqft),
    method: "hedonic" as const,
  } : {
    floor_psf: microPricing.final_floor_psf != null ? Math.round(microPricing.final_floor_psf) : null,
    optimal_psf: microPricing.final_optimal_psf != null ? Math.round(microPricing.final_optimal_psf) : null,
    ceiling_psf: microPricing.final_ceiling_psf != null ? Math.round(microPricing.final_ceiling_psf) : null,
    estimated_unit_price: microPricing.estimated_unit_price != null ? Math.round(microPricing.estimated_unit_price) : null,
    method: "weighted" as const,
  };

  // --- Schema gate validation (Phase 12) -------------------------------------
  // Mirrors the Pydantic PricingOutput schema: StrictInt for PSF, StrictStr
  // for confidence with exact enum validation. If this fails, the LLM must
  // NOT be called — zero hallucination propagation.
  const schemaGateValid = useMemo(() => {
    const psfValues = [activePricing.floor_psf, activePricing.optimal_psf, activePricing.ceiling_psf];
    // All PSF must be non-null integers
    const allInts = psfValues.every((v) => v != null && Number.isInteger(v));
    if (!allInts) return { passed: false, error: "PSF values must be strict integers (not null, not float)" };
    // Confidence must be exactly "High", "Medium", or "Low"
    const conf = basePricing.data_confidence;
    if (!["High", "Medium", "Low"].includes(conf)) {
      return { passed: false, error: `Invalid confidence: ${conf}. Must be High/Medium/Low` };
    }
    return { passed: true, error: null };
  }, [activePricing, basePricing.data_confidence]);
  const compsUsed = useMemo(
    () => MOCK_COMPS.filter((c) => c.unit_type === unitType && c.view === macroView),
    [unitType, macroView]
  );
  const baseAbsorptionDays = useMemo(
    () => compsUsed.length ? compsUsed.reduce((s, c) => s + c.absorption_days_50pct, 0) / compsUsed.length : 58,
    [compsUsed]
  );
  const cashflowData = useMemo(() => {
    if (activePricing.estimated_unit_price == null) return [];
    return simulateCashflow(activePricing.estimated_unit_price, paymentPlan, timelineMonths);
  }, [activePricing.estimated_unit_price, paymentPlan, timelineMonths]);
  const cashflowSummary = useMemo(() => summarizeCashflow(cashflowData), [cashflowData]);
  const scenarios = useMemo(() => {
    if (activePricing.optimal_psf == null || activePricing.optimal_psf <= 0) return [];
    return generateScenarios(activePricing.optimal_psf, baseAbsorptionDays, {
      unit_count: unitCount, avg_sqft_per_unit: sqft, daily_carry_cost_aed: 50000,
    });
  }, [activePricing.optimal_psf, baseAbsorptionDays, unitCount, sqft]);
  const scenarioSummary = useMemo(() => summarizeScenarios(scenarios), [scenarios]);
  const [activeScenario, setActiveScenario] = useState(0);

  // --- LLM narration ---------------------------------------------------------
  const [gtmNarrative, setGtmNarrative] = useState("");
  const [gtmLoading, setGtmLoading] = useState(false);
  const [rationale, setRationale] = useState("");
  const [rationaleLoading, setRationaleLoading] = useState(false);
  const [structuredOutput, setStructuredOutput] = useState<any>(null);
  const [structuredLoading, setStructuredLoading] = useState(false);

  const fetchGTM = useCallback(async () => {
    setGtmLoading(true);
    setGtmNarrative("");
    try {
      const payload = {
        scenarios, summary: scenarioSummary,
        cashflow: { payment_plan: paymentPlan, timeline_months: timelineMonths, month_0_collected: cashflowSummary.month_0_collected, handover_collected: cashflowSummary.handover_collected },
        pricing: microPricing,
      };
      const brief = `${unitCount}-unit ${unitType} ${macroView} tower in Dubai Marina, ${developer}-developed, ${timelineMonths}-month build, ${paymentPlan} payment plan, Floor ${floor} ${microView} reference unit.`;
      const res = await fetch("/api/gtm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenario_data_json: payload, project_brief: brief }) });
      const data = await res.json();
      setGtmNarrative(data.narrative || "[NARRATOR UNAVAILABLE]");
    } catch (e: any) { setGtmNarrative(`[NARRATOR UNAVAILABLE]\n\n${e.message}`); }
    finally { setGtmLoading(false); }
  }, [scenarios, scenarioSummary, paymentPlan, timelineMonths, cashflowSummary, microPricing, unitType, macroView, developer, floor, microView, unitCount]);

  const fetchRationale = useCallback(async () => {
    setRationaleLoading(true);
    setRationale("");
    try {
      const pricingPayload = {
        ...microPricing,
        base_optimal_psf: basePricing.optimal_psf, base_floor_psf: basePricing.floor_psf, base_ceiling_psf: basePricing.ceiling_psf,
        base_absorption_days_avg: baseAbsorptionDays, comps_used: compsUsed.map((c) => c.comp_id),
      };
      const res = await fetch("/api/rationale", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pricing_json: pricingPayload, comps_used: compsUsed }) });
      const data = await res.json();
      setRationale(data.rationale || "[NARRATOR UNAVAILABLE]");
    } catch (e: any) { setRationale(`[NARRATOR UNAVAILABLE]\n\n${e.message}`); }
    finally { setRationaleLoading(false); }
  }, [microPricing, basePricing, baseAbsorptionDays, compsUsed]);

  const fetchStructured = useCallback(async () => {
    setStructuredLoading(true);
    setStructuredOutput(null);
    try {
      const pricingData = {
        floor_psf: activePricing.floor_psf,
        optimal_psf: activePricing.optimal_psf,
        ceiling_psf: activePricing.ceiling_psf,
        confidence: basePricing.data_confidence,
      };
      const res = await fetch("/api/structured-narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pricing_data: pricingData }),
      });
      const data = await res.json();
      setStructuredOutput(data);
    } catch (e: any) {
      setStructuredOutput({
        target_persona: null, rationale: null, risk_flag: null,
        _parse_success: false, _schema_gate_passed: false,
        _error: e.message,
      });
    } finally {
      setStructuredLoading(false);
    }
  }, [activePricing, basePricing.data_confidence]);

  useEffect(() => {
    if (microPricing.final_optimal_psf == null) return;
    const t = setTimeout(() => fetchRationale(), 400);
    return () => clearTimeout(t);
  }, [microPricing.final_optimal_psf, floor, microView, fetchRationale]);

  useEffect(() => {
    if (!scenarios.length) return;
    const t = setTimeout(() => fetchGTM(), 600);
    return () => clearTimeout(t);
  }, [scenarios, fetchGTM]);

  useEffect(() => {
    if (activePricing.optimal_psf == null) return;
    const t = setTimeout(() => fetchStructured(), 500);
    return () => clearTimeout(t);
  }, [activePricing.optimal_psf, fetchStructured]);

  const hasData = activePricing.optimal_psf != null;

  // --- Error handling (Phase 15) ---------------------------------------------
  const { exportToPDF, exporting: pdfExporting } = usePDFExport();

  // Derived error state — no useEffect+setState, pure derivation from engine outputs
  const mathFailed = basePricing.data_confidence === "None" || activePricing.optimal_psf == null;
  const llmFailed = !mathFailed && (
    gtmNarrative.includes("[NARRATOR") || gtmNarrative.includes("Error:") ||
    rationale.includes("[NARRATOR") || rationale.includes("Error:")
  );
  const errorBanner: { level: ErrorLevel; message: string } = mathFailed
    ? { level: "error", message: "Insufficient comparable data for this specific view/type combination. Adjust the unit spec to match available comps." }
    : llmFailed
    ? { level: "warning", message: "Strategy narrative generation delayed. Mathematical pricing is accurate and displayed above." }
    : { level: null, message: "" };

  // Track dismissed state so user can close a banner
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const effectiveBanner = bannerDismissed
    ? { level: null as ErrorLevel, message: "" }
    : errorBanner;

  // Reset dismissed when the error type changes
  useEffect(() => {
    setBannerDismissed(false);
  }, [errorBanner.level]);

  const handleExportPDF = () => {
    exportToPDF("right-column-content", projectName);
  };

  return (
    <div className="cv-theme-root min-h-screen flex flex-col">
      {/* === HEADER === */}
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-xl"
        style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--ground) 85%, transparent)" }}
      >
        <div className="px-6 md:px-10 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: "var(--surface)", border: "1px solid var(--border-strong)" }}>
              <Building2 size={16} style={{ color: "var(--gold)" }} />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight" style={{ color: "var(--text-heading)" }}>
                Project Capital Velocity
              </div>
              <div className="text-[9px] uppercase tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>
                Off-Plan Capital & Yield Optimisation
              </div>
            </div>
          </div>

          {/* CONFIDENTIAL watermark */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded" style={{ border: "1px solid var(--negative)" }}>
            <Lock size={10} style={{ color: "var(--negative)" }} />
            <span className="text-[9px] font-semibold uppercase tracking-[0.25em]" style={{ color: "var(--negative)" }}>
              Confidential
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* EXPORT BOARD PACK — Phase 15 PDF export */}
            <button
              onClick={handleExportPDF}
              disabled={pdfExporting || !hasData}
              className="flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-[0.15em] transition-all disabled:opacity-40"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--gold)",
                color: "var(--gold)",
              }}
              title="Export the full right column as a dark-mode PDF"
            >
              <FileDown size={12} />
              {pdfExporting ? "Generating..." : "Export Board Pack"}
            </button>
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded text-[9px] uppercase tracking-wider" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--positive)" }} />
              Engine Live
            </div>
            <ThemeSwitcher activeThemeId={themeId} onThemeChange={handleThemeChange} />
          </div>
        </div>
      </header>

      {/* === ERROR BANNER (Phase 15) === */}
      <ErrorBanner
        banner={effectiveBanner}
        onDismiss={() => setBannerDismissed(true)}
      />

      {/* === COMMAND CENTER GRID === */}
      <main className="flex-1 grid lg:grid-cols-5 gap-0">
        {/* === LEFT COLUMN — 40% (lg:col-span-2) === */}
        <aside
          className="lg:col-span-2 border-r p-6 md:p-8 lg:sticky lg:top-[57px] lg:h-[calc(100vh-57px)] lg:overflow-y-auto"
          style={{ borderColor: "var(--border)", background: "var(--ground)" }}
        >
          {/* Section label */}
          <div className="flex items-center gap-2 mb-6">
            <Layers size={12} style={{ color: "var(--gold)" }} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>
              Launch Parameters
            </span>
          </div>

          {/* Project Name */}
          <Field label="Project Name">
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full px-3 py-2.5 rounded text-sm font-medium outline-none focus:border-[var(--gold)] transition-colors"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-heading)" }}
            />
          </Field>

          {/* Unit Type + View */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Unit Type">
              <Select value={unitType} onChange={setUnitType} options={[["1BR","1BR"],["2BR","2BR"],["3BR","3BR"]]} />
            </Field>
            <Field label="Micro View">
              <Select value={microView} onChange={setMicroView} options={[
                ["Full Marina","Full Marina +8%"],
                ["Partial Marina","Partial Marina"],
                ["Internal","Internal −5%"],
                ["Sea","Sea"],
                ["City","City"],
              ]} />
            </Field>
          </div>

          {/* Floor + Sqft */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Floor Number">
              <input type="number" min={1} max={120} value={floor}
                onChange={(e) => setFloor(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded text-sm font-medium outline-none focus:border-[var(--gold)]"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-heading)" }} />
            </Field>
            <Field label="Unit Sqft">
              <input type="number" min={500} max={10000} step={50} value={sqft}
                onChange={(e) => setSqft(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded text-sm font-medium outline-none focus:border-[var(--gold)]"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-heading)" }} />
            </Field>
          </div>

          {/* Developer */}
          <Field label="Developer (Brand Tier)">
            <Select value={developer} onChange={setDeveloper} options={[
              ["Emaar Properties","Emaar — Tier 1 (+5%)"],
              ["Select Group","Select Group — Tier 1 (+5%)"],
              ["Meraas","Meraas — Tier 1 (+5%)"],
              ["Muraba","Muraba — Tier 2"],
            ]} />
          </Field>

          {/* Payment Plan + Timeline */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Payment Plan">
              <Select value={paymentPlan} onChange={setPaymentPlan} options={[["50/50","50/50"],["60/40","60/40"],["70/30","70/30"],["80/20","80/20"]]} />
            </Field>
            <Field label="Timeline (mo)">
              <Select value={String(timelineMonths)} onChange={(v) => setTimelineMonths(Number(v))} options={[["24","24"],["36","36"],["48","48"]]} />
            </Field>
          </div>

          {/* Unit Count */}
          <Field label="Project Unit Count">
            <input type="number" min={1} value={unitCount}
              onChange={(e) => setUnitCount(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded text-sm font-medium outline-none focus:border-[var(--gold)]"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-heading)" }} />
          </Field>

          {/* Pricing Method Toggle — Phase 11 */}
          <Field label="Pricing Method">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPricingMethod("hedonic")}
                className="px-3 py-2.5 rounded text-xs font-medium transition-all"
                style={{
                  background: pricingMethod === "hedonic" ? "var(--surface-raised)" : "var(--surface)",
                  border: `1px solid ${pricingMethod === "hedonic" ? "var(--gold)" : "var(--border)"}`,
                  color: pricingMethod === "hedonic" ? "var(--gold)" : "var(--text-muted)",
                  borderLeftWidth: pricingMethod === "hedonic" ? 2 : 1,
                }}
              >
                Hedonic Regression
              </button>
              <button
                onClick={() => setPricingMethod("weighted")}
                className="px-3 py-2.5 rounded text-xs font-medium transition-all"
                style={{
                  background: pricingMethod === "weighted" ? "var(--surface-raised)" : "var(--surface)",
                  border: `1px solid ${pricingMethod === "weighted" ? "var(--gold)" : "var(--border)"}`,
                  color: pricingMethod === "weighted" ? "var(--gold)" : "var(--text-muted)",
                  borderLeftWidth: pricingMethod === "weighted" ? 2 : 1,
                }}
              >
                Weighted Average
              </button>
            </div>
            <div className="text-[9px] mt-1.5 italic" style={{ color: "var(--text-muted)" }}>
              {pricingMethod === "hedonic"
                ? "Regression-based: base intercept + feature coefficients from comp set"
                : "Phase 2 method: 60% absorption + 40% amenity weighted average"}
            </div>
          </Field>

          {/* Amenity Score — only shown for hedonic method */}
          {pricingMethod === "hedonic" && (
            <Field label="Amenity Score (1-10)">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={amenityScore}
                  onChange={(e) => setAmenityScore(Number(e.target.value))}
                  className="flex-1 accent-[var(--gold)]"
                  style={{ accentColor: "var(--gold)" }}
                />
                <span
                  className="text-sm font-bold font-mono w-8 text-center"
                  style={{ color: "var(--gold)" }}
                >
                  {amenityScore}
                </span>
              </div>
              <div className="text-[9px] mt-1" style={{ color: "var(--text-muted)" }}>
                AED {45 * amenityScore} contribution ({45} × {amenityScore})
              </div>
            </Field>
          )}

          {/* Floor Picker */}
          <div className="mt-6 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>
                Floor Premium Scrubber
              </span>
              <span className="text-[10px] font-mono" style={{ color: "var(--gold)" }}>
                +{(floor / 10).toFixed(1)}%
              </span>
            </div>
            <FloorPicker minFloor={1} maxFloor={100} floor={floor} onChange={setFloor} />
          </div>

          {/* Comp audit */}
          <div className="mt-6 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: "var(--text-muted)" }}>
              Comparables Used
            </div>
            <div className="space-y-2">
              {compsUsed.length === 0 ? (
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>[NO COMPS MATCHED]</div>
              ) : (
                compsUsed.map((c) => (
                  <div key={c.comp_id} className="flex items-center justify-between text-[11px]">
                    <span style={{ color: "var(--text-body)" }}>{c.comp_id} · {c.project}</span>
                    <span className="font-mono" style={{ color: "var(--text-muted)" }}>{c.absorption_days_50pct}d</span>
                  </div>
                ))
              )}
            </div>
            <div className="mt-3 text-[10px]" style={{ color: "var(--text-muted)" }}>
              Confidence: <span style={{ color: basePricing.data_confidence === "High" ? "var(--positive)" : basePricing.data_confidence === "Medium" ? "var(--gold)" : "var(--negative)" }}>{basePricing.data_confidence}</span> · {basePricing.comp_count} comps
            </div>
          </div>
        </aside>

        {/* === RIGHT COLUMN — 60% (lg:col-span-3) === */}
        <section
          id="right-column-content"
          className="lg:col-span-3 p-6 md:p-8 space-y-6"
          style={{ background: "var(--ground)" }}
        >
          {/* === PANEL 1: PRICING MATRIX === */}
          <Panel
            icon={<DollarSign size={14} />}
            title="Pricing Matrix"
            staggerIndex={1}
            subtitle={
              pricingMethod === "hedonic"
                ? "Hedonic Regression · base intercept + feature coefficients"
                : "Weighted Average · 60% absorption + 40% amenity"
            }
            hasData={hasData}
          >
            {/* Method badge + Schema gate badge */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span
                className="text-[9px] font-bold uppercase tracking-[0.15em] px-2 py-1 rounded"
                style={{
                  background: "var(--surface-raised)",
                  color: "var(--gold)",
                  border: "1px solid var(--gold)",
                }}
              >
                {pricingMethod === "hedonic" ? "Hedonic" : "Weighted Avg"}
              </span>
              <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                {pricingMethod === "hedonic"
                  ? "Regression-based — not a simple average"
                  : "Phase 2 method — absorption-weighted"}
              </span>

              {/* Schema gate badge — Phase 12 zero hallucination propagation */}
              <span
                className="text-[9px] font-bold uppercase tracking-[0.15em] px-2 py-1 rounded ml-auto flex items-center gap-1.5"
                style={{
                  background: schemaGateValid.passed ? "color-mix(in srgb, var(--positive) 12%, transparent)" : "color-mix(in srgb, var(--negative) 12%, transparent)",
                  color: schemaGateValid.passed ? "var(--positive)" : "var(--negative)",
                  border: `1px solid ${schemaGateValid.passed ? "var(--positive)" : "var(--negative)"}`,
                }}
                title={schemaGateValid.error || "PricingOutput schema validated — LLM may be called"}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: schemaGateValid.passed ? "var(--positive)" : "var(--negative)" }}
                />
                {schemaGateValid.passed ? "Schema Gate: Passed" : "Schema Gate: FAILED"}
              </span>
            </div>

            {/* Tier tiles — large bold PSF numbers */}
            <div className="grid grid-cols-3 gap-4 mb-5">
              {[
                { name: "Floor", val: activePricing.floor_psf, mult: "× 0.96", desc: "Defensive clearance", color: "var(--text-body)" },
                { name: "Optimal", val: activePricing.optimal_psf, mult: pricingMethod === "hedonic" ? "calculated" : "× 1.03", desc: "Target realized price", color: "var(--gold)" },
                { name: "Ceiling", val: activePricing.ceiling_psf, mult: "× 1.12", desc: "Negotiation headroom", color: "var(--accent)" },
              ].map((t, i) => (
                <motion.div
                  key={t.name}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="p-5 rounded-lg border"
                  style={{
                    background: "var(--surface)",
                    borderColor: t.name === "Optimal" ? "var(--gold)" : "var(--border)",
                    borderLeftWidth: t.name === "Optimal" ? 3 : 1,
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="text-[10px] font-semibold uppercase tracking-[0.15em]"
                      style={{ color: t.color }}
                    >
                      {t.name}
                    </span>
                    <span className="text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>
                      {t.mult}
                    </span>
                  </div>
                  {/* Large bold PSF number — Inter, text-3xl, font-bold */}
                  <div
                    className="text-3xl font-bold tracking-tight leading-none mb-2"
                    style={{ color: t.color, fontFamily: "var(--font-inter), sans-serif" }}
                  >
                    {t.val != null ? (
                      <AnimatedCounter value={t.val} format="psf" duration={1.1} />
                    ) : (
                      <span className="text-lg" style={{ color: "var(--text-muted)" }}>
                        [DATA MISSING]
                      </span>
                    )}
                  </div>
                  <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {t.desc}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Confidence Indicator — horizontal bar, green/yellow/red */}
            <div
              className="p-4 rounded-lg border mb-4"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <ConfidenceIndicator
                level={basePricing.data_confidence}
                compCount={basePricing.comp_count}
              />
            </div>

            {/* Estimated unit price + adjustments (or hedonic decomposition) */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 rounded-lg border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <div className="text-[9px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                  Estimated Unit Price
                </div>
                <div className="text-2xl font-semibold" style={{ color: "var(--text-heading)" }}>
                  {activePricing.estimated_unit_price != null ? <AnimatedCounter value={activePricing.estimated_unit_price} format="aed" duration={1.2} /> : <span style={{ color: "var(--text-muted)" }}>[MISSING]</span>}
                </div>
                <div className="text-[9px] mt-1" style={{ color: "var(--text-muted)" }}>Optimal PSF × {sqft} sqft</div>
              </div>

              {/* Adjustments — different content per method */}
              {pricingMethod === "hedonic" ? (
                <div className="p-4 rounded-lg border space-y-2" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  <div className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--gold)" }}>
                    Hedonic Decomposition
                  </div>
                  <HedonicRow label="Base intercept" value={hedonicPricing.decomposition.base_intercept} />
                  <HedonicRow label={`View premium × ${hedonicPricing.decomposition.marina_indicator}`} value={hedonicPricing.decomposition.view_contribution} />
                  <HedonicRow label={`Floor ${floor} × ${hedonicPricing.floor_coefficient}`} value={hedonicPricing.decomposition.floor_contribution} />
                  <HedonicRow label={`Amenity ${amenityScore} × ${hedonicPricing.amenity_coefficient}`} value={hedonicPricing.decomposition.amenity_contribution} />
                  <div className="pt-1.5 mt-1.5 border-t flex justify-between items-center text-[11px]" style={{ borderColor: "var(--border)" }}>
                    <span className="font-semibold" style={{ color: "var(--text-heading)" }}>Calculated PSF</span>
                    <span className="font-mono font-bold" style={{ color: "var(--gold)" }}>AED {hedonicPricing.calculated_psf.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg border space-y-2" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  <AdjRow label="Floor premium" value={microPricing.floor_premium_pct} />
                  <AdjRow label="View modifier" value={microPricing.micro_view_modifier_pct} />
                  <AdjRow label="Combined uplift" value={microPricing.combined_adjustment_pct} bold />
                </div>
              )}
            </div>

            {/* View premium audit trail — only for hedonic */}
            {pricingMethod === "hedonic" && (
              <div className="p-4 rounded-lg border mb-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <div className="text-[9px] font-semibold uppercase tracking-[0.15em] mb-3" style={{ color: "var(--text-muted)" }}>
                  View Premium Isolation Audit
                </div>
                <div className="grid grid-cols-2 gap-4 text-[11px]">
                  <div>
                    <div style={{ color: "var(--text-muted)" }}>Premium-view comps (Marina)</div>
                    <div className="font-mono mt-0.5" style={{ color: "var(--text-body)" }}>
                      {hedonicPricing.comps_used_for_premium.premium_view_comps.join(", ") || "[none]"}
                    </div>
                    <div className="mt-1" style={{ color: "var(--text-muted)" }}>
                      Avg residual: <span className="font-mono" style={{ color: "var(--text-body)" }}>AED {hedonicPricing.comps_used_for_premium.premium_avg_residual.toLocaleString()}</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "var(--text-muted)" }}>Baseline-view comps (City)</div>
                    <div className="font-mono mt-0.5" style={{ color: "var(--text-body)" }}>
                      {hedonicPricing.comps_used_for_premium.baseline_view_comps.join(", ") || "[none]"}
                    </div>
                    <div className="mt-1" style={{ color: "var(--text-muted)" }}>
                      Avg residual: <span className="font-mono" style={{ color: "var(--text-body)" }}>AED {hedonicPricing.comps_used_for_premium.baseline_avg_residual.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t flex justify-between items-center" style={{ borderColor: "var(--border)" }}>
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    Isolated View Premium
                  </span>
                  <span className="text-lg font-bold font-mono" style={{ color: "var(--gold)" }}>
                    AED {hedonicPricing.view_premium.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            {/* Pricing rationale — italicized gray text per Phase 10 spec */}
            <div
              className="p-4 rounded-lg border-l-2"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
                borderLeftColor: "var(--gold)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-[9px] font-semibold uppercase tracking-[0.15em]"
                  style={{ color: "var(--gold)" }}
                >
                  Pricing Rationale · PropTech Data Scientist
                </span>
                <button
                  onClick={fetchRationale}
                  disabled={rationaleLoading}
                  className="text-[9px] px-2 py-0.5 rounded disabled:opacity-50 transition-colors"
                  style={{
                    background: "var(--surface-raised)",
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                  }}
                >
                  {rationaleLoading ? "Generating..." : "Regenerate"}
                </button>
              </div>
              {rationaleLoading && !rationale ? (
                <div className="space-y-1.5">
                  <div className="h-2.5 rounded animate-pulse" style={{ background: "var(--surface-raised)", width: "92%" }} />
                  <div className="h-2.5 rounded animate-pulse" style={{ background: "var(--surface-raised)", width: "78%" }} />
                  <div className="h-2.5 rounded animate-pulse" style={{ background: "var(--surface-raised)", width: "85%" }} />
                </div>
              ) : rationale ? (
                <div style={{ color: "var(--text-body)" }}>
                  <Typewriter
                    text={rationale}
                    speed={18}
                    className="text-xs italic leading-relaxed"
                  />
                </div>
              ) : (
                <div
                  className="text-xs italic"
                  style={{ color: "var(--text-muted)" }}
                >
                  Adjust parameters to generate rationale.
                </div>
              )}
            </div>
          </Panel>

          {/* === PANEL 2: CAPITAL VELOCITY CHART === */}
          <Panel
            icon={<Activity size={14} />}
            title="Capital Velocity Chart"
            staggerIndex={2}
            subtitle="Price vs Absorption scenarios + Cashflow timing"
            hasData={hasData}
          >
            {/* Scenario tabs + KPIs */}
            <ScenarioChart scenarios={scenarios} activeIndex={activeScenario} onSelect={setActiveScenario} />

            {/* Scenario summary */}
            <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
              <MiniStat label="Rev Spread" value={scenarioSummary.revenue_spread_aed} format="aed" />
              <MiniStat label="Carry Spread" value={scenarioSummary.carry_cost_spread_aed} format="aed" />
              <MiniStat label="Net Spread" value={scenarioSummary.net_position_spread_aed} format="aed" accent />
              <MiniStat label="Days Spread" value={scenarioSummary.absorption_spread_days} format="days" />
            </div>

            {/* Cashflow chart */}
            <div className="mt-5 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Cashflow Timing · {paymentPlan} · {timelineMonths}mo
                </span>
                <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                  Month 0: <span style={{ color: "var(--gold)" }}>AED {cashflowSummary.month_0_collected?.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
                  {" · "}Handover: <span style={{ color: "var(--gold)" }}>AED {cashflowSummary.handover_collected?.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
                </span>
              </div>
              <CashflowChart data={cashflowData} paymentPlan={paymentPlan} />
            </div>

            {/* === SCENARIO WAR-GAMING TABLE (Phase 12) === */}
            <div className="mt-5 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Scenario War-Gaming Table
                </span>
                <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                  Base row highlighted · platinum left border
                </span>
              </div>
              <ScenarioTable
                scenarios={scenarios}
                recommendedScenario={scenarioSummary.best_net_scenario}
              />
            </div>
          </Panel>

          {/* === PANEL 3: GO-TO-MARKET STRATEGY & BUYER PERSONA (Phase 13+14) === */}
          <div className="cv-stagger-3">
          <GTMPanel
            narrative={gtmNarrative}
            loading={gtmLoading}
            onRefresh={fetchGTM}
            structuredOutput={structuredOutput}
            projectName={projectName}
            pricingData={{
              floor_psf: activePricing.floor_psf,
              optimal_psf: activePricing.optimal_psf,
              ceiling_psf: activePricing.ceiling_psf,
              estimated_unit_price: activePricing.estimated_unit_price,
              confidence: basePricing.data_confidence,
            }}
            scenarioData={scenarios}
            cashflowSummary={cashflowSummary}
          />
          </div>
        </section>
      </main>
    </div>
  );
}

/* === Shared components === */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-1.5 block" style={{ color: "var(--text-muted)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2.5 rounded text-sm font-medium outline-none focus:border-[var(--gold)] cursor-pointer appearance-none"
      style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-heading)" }}
    >
      {options.map(([val, label]) => (
        <option key={val} value={val}>{label}</option>
      ))}
    </select>
  );
}

function AdjRow({ label, value, bold }: { label: string; value: number | null; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center text-[11px]">
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="font-mono" style={{
        color: value == null ? "var(--text-muted)" : value >= 0 ? "var(--positive)" : "var(--negative)",
        fontWeight: bold ? 600 : 400,
      }}>
        {value == null ? "—" : `${value >= 0 ? "+" : ""}${value}%`}
      </span>
    </div>
  );
}

function HedonicRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-center text-[11px]">
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="font-mono" style={{ color: "var(--text-body)" }}>
        AED {value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  );
}

function MiniStat({ label, value, format, accent }: { label: string; value: number | null; format: "aed" | "days"; accent?: boolean }) {
  return (
    <div>
      <div className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{label}</div>
      <div className="text-base font-semibold" style={{ color: accent ? "var(--gold)" : "var(--text-heading)" }}>
        {value != null ? <AnimatedCounter value={value} format={format} duration={0.7} /> : <span style={{ color: "var(--text-muted)" }}>—</span>}
      </div>
    </div>
  );
}

function Panel({ icon, title, subtitle, hasData, children, staggerIndex }: { icon: React.ReactNode; title: string; subtitle: string; hasData: boolean; children: React.ReactNode; staggerIndex?: number }) {
  const staggerClass = staggerIndex ? `cv-stagger-${staggerIndex}` : "";
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`rounded-xl border overflow-hidden ${staggerClass}`}
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {/* Panel header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <div style={{ color: "var(--gold)" }}>{icon}</div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>{title}</h2>
          <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{subtitle}</div>
        </div>
        {!hasData && (
          <span className="text-[9px] px-2 py-0.5 rounded uppercase tracking-wider" style={{ background: "var(--surface-raised)", color: "var(--text-muted)" }}>
            Waiting
          </span>
        )}
      </div>
      {/* Panel body */}
      <div className="p-5">
        {children}
      </div>
    </motion.section>
  );
}
