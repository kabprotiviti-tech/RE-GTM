"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Lock,
  MapPin,
  Settings,
  DollarSign,
  Activity,
  Brain,
  FileDown,
  Sparkles,
  Navigation,
  ChevronRight,
  ChevronLeft,
  Check,
  Train,
  Waves,
  GraduationCap,
  ShoppingBag,
  Trees,
  Hospital,
  Route,
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import { THEMES, themeToCssVariables, loadThemeId, saveThemeId, type ThemeId } from "@/lib/themes";
import { ThemeSwitcher } from "@/components/capital-velocity/ThemeSwitcher";
import { AnimatedCounter } from "@/components/capital-velocity/AnimatedCounter";
import { Typewriter } from "@/components/capital-velocity/Typewriter";
import { FloorPicker } from "@/components/capital-velocity/FloorPicker";
import { ScenarioChart } from "@/components/capital-velocity/ScenarioChart";
import { CashflowChart } from "@/components/capital-velocity/CashflowChart";
import { ScenarioTable } from "@/components/capital-velocity/ScenarioTable";
import { GTMPanel } from "@/components/capital-velocity/GTMPanel";
import { ConfidenceIndicator } from "@/components/capital-velocity/ConfidenceIndicator";
import { MapPickerWrapper } from "@/components/capital-velocity/MapPickerWrapper";
import { ProximityDashboard } from "@/components/capital-velocity/ProximityDashboard";
import { StepProgress } from "@/components/capital-velocity/StepProgress";
import { MarketIntelligence } from "@/components/capital-velocity/MarketIntelligence";
import { usePDFExport } from "@/hooks/use-pdf-export";
import {
  calculateBasePricing,
  applyMicroAdjustments,
  microToMacroView,
} from "@/lib/engines/pricing-engine";
import { calculateHedonicPricing } from "@/lib/engines/hedonic-engine";
import { simulateCashflow, summarizeCashflow } from "@/lib/engines/cashflow-sim";
import { generateScenarios, summarizeScenarios } from "@/lib/engines/scenario-engine";
import { MOCK_COMPS } from "@/lib/engines/mock-data";
import {
  POI_CATEGORIES,
  calculateProximity,
  calculateTotalLocationPremium,
  type POICategory,
} from "@/lib/engines/dubai-poi";
import { getAllCorridors } from "@/lib/engines/project-database";

const ALL_CATEGORIES: POICategory[] = ["metro", "sea", "school", "mall", "park", "hospital", "highway"];

const POI_ICONS: Record<string, any> = {
  metro: Train, sea: Waves, school: GraduationCap, mall: ShoppingBag,
  park: Trees, hospital: Hospital, highway: Route,
};

const VIEW_OPTIONS: [string, string][] = [
  ["Full Marina", "Full Marina +8%"],
  ["Partial Marina", "Partial Marina +4%"],
  ["Full Sea", "Full Sea +10%"],
  ["Partial Sea", "Partial Sea +5%"],
  ["Palm View", "Palm View +12%"],
  ["Burj View", "Burj Khalifa View +9%"],
  ["Canal View", "Canal View +6%"],
  ["Golf View", "Golf View +7%"],
  ["Lake View", "Lake View +4%"],
  ["SZR View", "Highway View +2%"],
  ["Internal", "Internal/Courtyard −5%"],
  ["City", "City View"],
];

export default function Home() {
  // --- Theme ---
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

  // --- Wizard step state ---
  const [step, setStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1);

  const goToStep = (newStep: number) => {
    setStep(newStep);
    if (newStep > maxStep) setMaxStep(newStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const nextStep = () => goToStep(Math.min(step + 1, 5));
  const prevStep = () => goToStep(Math.max(step - 1, 1));

  // --- Map / parcel selection ---
  const [parcelLat, setParcelLat] = useState<number | null>(25.0772);
  const [parcelLng, setParcelLng] = useState<number | null>(55.1390);
  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(new Set(ALL_CATEGORIES));

  const toggleCategory = (cat: string) => {
    setVisibleCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // --- Proximity + location premium ---
  const proximityResults = useMemo(() => {
    if (parcelLat == null || parcelLng == null) return [];
    return calculateProximity(parcelLat, parcelLng);
  }, [parcelLat, parcelLng]);

  const locationPremium = useMemo(
    () => calculateTotalLocationPremium(proximityResults),
    [proximityResults]
  );

  // --- Input spec ---
  const [projectName, setProjectName] = useState("Marina Gate IV — Reference Tower");
  const [corridor, setCorridor] = useState("Dubai Marina");
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

  // --- Engine outputs ---
  const macroView = microToMacroView(microView);
  const basePricing = useMemo(
    () => calculateBasePricing({ unit_type: unitType, view: macroView, developer }),
    [unitType, macroView, developer]
  );
  const microPricing = useMemo(
    () => applyMicroAdjustments(basePricing, { unit_type: unitType, view: microView, floor_number: floor, sqft }),
    [basePricing, unitType, microView, floor, sqft]
  );
  const hedonicPricing = useMemo(
    () => calculateHedonicPricing({ floor, amenity_score: amenityScore, view: microView }),
    [floor, amenityScore, microView]
  );

  const engineOptimal = pricingMethod === "hedonic" ? hedonicPricing.optimal : (microPricing.final_optimal_psf ?? 0);
  const engineFloor = pricingMethod === "hedonic" ? hedonicPricing.floor : (microPricing.final_floor_psf ?? 0);
  const engineCeiling = pricingMethod === "hedonic" ? hedonicPricing.ceiling : (microPricing.final_ceiling_psf ?? 0);

  const activePricing = {
    floor_psf: engineFloor > 0 ? Math.round(engineFloor + locationPremium) : null,
    optimal_psf: engineOptimal > 0 ? Math.round(engineOptimal + locationPremium) : null,
    ceiling_psf: engineCeiling > 0 ? Math.round(engineCeiling + locationPremium) : null,
    estimated_unit_price: engineOptimal > 0 ? Math.round((engineOptimal + locationPremium) * sqft) : null,
    method: pricingMethod,
  };

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

  // --- LLM narration ---
  // IMPORTANT: AI generates ONCE when the user reaches the relevant step, then stays static.
  // No auto-regeneration on every input change — that caused the flickering.
  // User must click "Regenerate" to get a fresh narrative.
  const [gtmNarrative, setGtmNarrative] = useState("");
  const [gtmLoading, setGtmLoading] = useState(false);
  const [gtmGenerated, setGtmGenerated] = useState(false);
  const [rationale, setRationale] = useState("");
  const [rationaleLoading, setRationaleLoading] = useState(false);
  const [rationaleGenerated, setRationaleGenerated] = useState(false);
  const [structuredOutput, setStructuredOutput] = useState<any>(null);
  const [structuredLoading, setStructuredLoading] = useState(false);
  const [structuredGenerated, setStructuredGenerated] = useState(false);

  const fetchGTM = useCallback(async () => {
    setGtmLoading(true);
    setGtmNarrative("");
    try {
      const payload = {
        scenarios, summary: scenarioSummary,
        cashflow: { payment_plan: paymentPlan, timeline_months: timelineMonths, month_0_collected: cashflowSummary.month_0_collected, handover_collected: cashflowSummary.handover_collected },
        pricing: { ...activePricing, location_premium: locationPremium, parcel_lat: parcelLat, parcel_lng: parcelLng },
      };
      const brief = `${unitCount}-unit ${unitType} tower at ${parcelLat?.toFixed(4)}, ${parcelLng?.toFixed(4)} — location premium AED ${locationPremium}/sqft. ${developer}-developed, ${timelineMonths}-month build, ${paymentPlan} plan, Floor ${floor} ${microView}.`;
      const res = await fetch("/api/gtm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenario_data_json: payload, project_brief: brief }) });
      const data = await res.json();
      setGtmNarrative(data.narrative || "[NARRATOR UNAVAILABLE]");
      setGtmGenerated(true);
    } catch (e: any) { setGtmNarrative(`[NARRATOR UNAVAILABLE]\n\n${e.message}`); setGtmGenerated(true); }
    finally { setGtmLoading(false); }
  }, [scenarios, scenarioSummary, paymentPlan, timelineMonths, cashflowSummary, activePricing, locationPremium, parcelLat, parcelLng, unitCount, unitType, developer, floor, microView]);

  const fetchRationale = useCallback(async () => {
    setRationaleLoading(true);
    setRationale("");
    try {
      const pricingPayload = {
        ...activePricing,
        base_optimal_psf: basePricing.optimal_psf,
        base_absorption_days_avg: baseAbsorptionDays,
        location_premium: locationPremium,
        proximity: proximityResults.map(r => ({ category: r.category, nearest: r.nearest?.name, distance_km: r.distanceKm, premium: r.premiumAed })),
        comps_used: compsUsed.map((c) => c.comp_id),
      };
      const res = await fetch("/api/rationale", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pricing_json: pricingPayload, comps_used: compsUsed }) });
      const data = await res.json();
      setRationale(data.rationale || "[NARRATOR UNAVAILABLE]");
      setRationaleGenerated(true);
    } catch (e: any) { setRationale(`[NARRATOR UNAVAILABLE]\n\n${e.message}`); setRationaleGenerated(true); }
    finally { setRationaleLoading(false); }
  }, [activePricing, basePricing, baseAbsorptionDays, compsUsed, locationPremium, proximityResults]);

  const fetchStructured = useCallback(async () => {
    setStructuredLoading(true);
    setStructuredOutput(null);
    try {
      const res = await fetch("/api/structured-narrative", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pricing_data: { floor_psf: activePricing.floor_psf, optimal_psf: activePricing.optimal_psf, ceiling_psf: activePricing.ceiling_psf, confidence: basePricing.data_confidence } }) });
      const data = await res.json();
      setStructuredOutput(data);
      setStructuredGenerated(true);
    } catch (e: any) {
      setStructuredOutput({ target_persona: null, rationale: null, risk_flag: null, _parse_success: false, _schema_gate_passed: false, _error: e.message });
      setStructuredGenerated(true);
    } finally { setStructuredLoading(false); }
  }, [activePricing, basePricing.data_confidence]);

  // Generate rationale ONCE when entering Step 3 (Pricing)
  useEffect(() => {
    if (step === 3 && !rationaleGenerated && activePricing.optimal_psf != null) {
      fetchRationale();
    }
  }, [step, rationaleGenerated, activePricing.optimal_psf]); // intentionally not depending on fetchRationale

  // Generate structured ONCE when entering Step 3
  useEffect(() => {
    if (step === 3 && !structuredGenerated && activePricing.optimal_psf != null) {
      fetchStructured();
    }
  }, [step, structuredGenerated, activePricing.optimal_psf]); // intentionally not depending on fetchStructured

  // Generate GTM ONCE when entering Step 5
  useEffect(() => {
    if (step === 5 && !gtmGenerated && scenarios.length > 0) {
      fetchGTM();
    }
  }, [step, gtmGenerated, scenarios.length]); // intentionally not depending on fetchGTM

  // Reset generated flags when user goes back to Step 2 and changes spec
  // (so re-entering Step 3/5 regenerates with new data)
  const [lastSpecSnapshot, setLastSpecSnapshot] = useState("");
  const currentSpec = `${unitType}|${microView}|${floor}|${sqft}|${developer}|${paymentPlan}|${timelineMonths}|${unitCount}|${pricingMethod}|${amenityScore}|${parcelLat}|${parcelLng}`;
  useEffect(() => {
    if (lastSpecSnapshot && currentSpec !== lastSpecSnapshot) {
      // Spec changed — reset the generated flags so AI regenerates on next step visit
      setGtmGenerated(false);
      setRationaleGenerated(false);
      setStructuredGenerated(false);
    }
    setLastSpecSnapshot(currentSpec);
  }, [currentSpec, lastSpecSnapshot]);

  const hasData = activePricing.optimal_psf != null;
  const { exportToPDF, exporting: pdfExporting } = usePDFExport();
  const handleExportPDF = () => exportToPDF("analysis-content", projectName);

  return (
    <div className="cv-theme-root min-h-screen flex flex-col">
      {/* === HEADER === */}
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-xl"
        style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--ground) 90%, transparent)" }}
      >
        <div className="px-6 md:px-10 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--surface)", border: "1px solid var(--border-strong)" }}>
              <Building2 size={18} style={{ color: "var(--gold)" }} />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight" style={{ color: "var(--text-heading)" }}>
                Capital Velocity
              </div>
              <div className="text-[9px] uppercase tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>
                Step {step} of 5 · {["Land Parcel", "Unit Spec", "Pricing", "Scenarios", "GTM Strategy"][step - 1]}
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded" style={{ border: "1px solid var(--negative)" }}>
            <Lock size={10} style={{ color: "var(--negative)" }} />
            <span className="text-[9px] font-semibold uppercase tracking-[0.25em]" style={{ color: "var(--negative)" }}>
              Confidential
            </span>
          </div>

          <div className="flex items-center gap-3">
            {step === 5 && (
              <button
                onClick={handleExportPDF}
                disabled={pdfExporting || !hasData}
                className="flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-[0.15em] transition-all disabled:opacity-40"
                style={{ background: "var(--surface)", border: "1px solid var(--gold)", color: "var(--gold)" }}
              >
                <FileDown size={12} />
                {pdfExporting ? "Generating..." : "Export PDF"}
              </button>
            )}
            <ThemeSwitcher activeThemeId={themeId} onThemeChange={handleThemeChange} />
          </div>
        </div>

        {/* Step progress bar */}
        <StepProgress currentStep={step} maxStep={maxStep} onStepClick={goToStep} />
      </header>

      {/* === STEP CONTENT === */}
      <main className="flex-1 px-6 md:px-10 py-8 max-w-[1400px] mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >

            {/* === STEP 1: LAND PARCEL === */}
            {step === 1 && (
              <div>
                <StepHeader
                  icon={<MapPin size={16} />}
                  title="Select Your Land Parcel"
                  subtitle="Click anywhere on the map to drop your parcel. We calculate proximity to metro, sea, schools, and malls instantly."
                />

                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Map */}
                  <div className="lg:col-span-2">
                    <div className="rounded-xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border-strong)" }}>
                      <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
                        <span className="text-xs font-semibold" style={{ color: "var(--text-heading)" }}>
                          Dubai Map — Click to Select
                        </span>
                        <span className="text-[10px] font-mono" style={{ color: "var(--gold)" }}>
                          {parcelLat ? `${parcelLat.toFixed(4)}, ${parcelLng?.toFixed(4)}` : "No selection"}
                        </span>
                      </div>
                      <div style={{ height: "500px" }}>
                        <MapPickerWrapper
                          selectedLat={parcelLat}
                          selectedLng={parcelLng}
                          onSelect={(lat, lng) => { setParcelLat(lat); setParcelLng(lng); }}
                          visibleCategories={visibleCategories}
                          proximityResults={proximityResults}
                        />
                      </div>
                      <div className="px-5 py-3 border-t flex items-center gap-2 flex-wrap" style={{ borderColor: "var(--border)" }}>
                        <span className="text-[9px] font-semibold uppercase tracking-wider mr-2" style={{ color: "var(--text-muted)" }}>Layers:</span>
                        {ALL_CATEGORIES.map((cat) => {
                          const config = POI_CATEGORIES[cat];
                          const Icon = POI_ICONS[cat];
                          const active = visibleCategories.has(cat);
                          return (
                            <button key={cat} onClick={() => toggleCategory(cat)}
                              className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium transition-all"
                              style={{
                                background: active ? `color-mix(in srgb, ${config.color} 15%, transparent)` : "var(--surface-raised)",
                                border: `1px solid ${active ? config.color : "var(--border)"}`,
                                color: active ? config.color : "var(--text-muted)",
                                opacity: active ? 1 : 0.5,
                              }}>
                              <Icon size={10} />
                              {config.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Proximity */}
                  <div className="lg:col-span-1">
                    <div className="rounded-xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                      <div className="flex items-center gap-2 mb-4">
                        <Navigation size={14} style={{ color: "var(--gold)" }} />
                        <h3 className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>Proximity Analysis</h3>
                      </div>
                      <ProximityDashboard results={proximityResults} totalPremium={locationPremium} />
                    </div>
                  </div>
                </div>

                <StepNav onNext={nextStep} nextLabel="Continue to Unit Spec →" />
              </div>
            )}

            {/* === STEP 2: UNIT SPEC === */}
            {step === 2 && (
              <div>
                <StepHeader
                  icon={<Settings size={16} />}
                  title="Unit Specification"
                  subtitle="Configure the reference unit. Every field feeds the deterministic pricing engine."
                />

                <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                  <div className="rounded-xl border p-6 space-y-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                    <SpecField label="Project Name" value={projectName} onChange={setProjectName} type="text" />
                    <SpecSelect
                      label="Corridor (for fair comparison)"
                      value={corridor}
                      onChange={setCorridor}
                      options={getAllCorridors().map((c) => [c.corridor, `${c.emirate} · ${c.corridor} (${c.projectCount} projects)`] as [string, string])}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <SpecSelect label="Unit Type" value={unitType} onChange={(v) => setUnitType(v as any)} options={[["1BR","1BR"],["2BR","2BR"],["3BR","3BR"]]} />
                      <SpecField label="Floor Number" value={String(floor)} onChange={(v) => setFloor(Number(v))} type="number" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <SpecField label="Unit Sqft" value={String(sqft)} onChange={(v) => setSqft(Number(v))} type="number" />
                      <SpecField label="Project Unit Count" value={String(unitCount)} onChange={(v) => setUnitCount(Number(v))} type="number" />
                    </div>
                    <SpecSelect label="Developer" value={developer} onChange={setDeveloper} options={[
                      ["Emaar Properties","Emaar — Tier 1 (+5%)"],
                      ["Select Group","Select Group — Tier 1 (+5%)"],
                      ["Meraas","Meraas — Tier 1 (+5%)"],
                      ["Muraba","Muraba — Tier 2"],
                    ]} />
                  </div>

                  <div className="rounded-xl border p-6 space-y-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                    <SpecSelect label="View (Micro)" value={microView} onChange={setMicroView} options={VIEW_OPTIONS} />
                    <div className="grid grid-cols-2 gap-3">
                      <SpecSelect label="Payment Plan" value={paymentPlan} onChange={setPaymentPlan} options={[["50/50","50/50"],["60/40","60/40"],["70/30","70/30"],["80/20","80/20"]]} />
                      <SpecSelect label="Timeline" value={String(timelineMonths)} onChange={(v) => setTimelineMonths(Number(v))} options={[["24","24 months"],["36","36 months"],["48","48 months"]]} />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-2 block" style={{ color: "var(--text-muted)" }}>Pricing Method</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(["hedonic", "weighted"] as const).map((m) => (
                          <button key={m} onClick={() => setPricingMethod(m)}
                            className="px-3 py-2 rounded text-xs font-medium transition-all"
                            style={{
                              background: pricingMethod === m ? "var(--surface-raised)" : "var(--surface)",
                              border: `1px solid ${pricingMethod === m ? "var(--gold)" : "var(--border)"}`,
                              color: pricingMethod === m ? "var(--gold)" : "var(--text-muted)",
                            }}>
                            {m === "hedonic" ? "Hedonic" : "Weighted Avg"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {pricingMethod === "hedonic" && (
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-2 block" style={{ color: "var(--text-muted)" }}>
                          Amenity Score: <span style={{ color: "var(--gold)" }}>{amenityScore}/10</span>
                        </label>
                        <input type="range" min={1} max={10} value={amenityScore} onChange={(e) => setAmenityScore(Number(e.target.value))} className="w-full" style={{ accentColor: "var(--gold)" }} />
                        <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                          AED {45 * amenityScore} contribution ({45} × {amenityScore})
                        </div>
                      </div>
                    )}

                    <div className="pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                      <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Location Premium (from map)</div>
                      <div className="text-2xl font-bold" style={{ color: "var(--gold)" }}>+AED {locationPremium}/sqft</div>
                      <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                        Parcel: {parcelLat?.toFixed(4)}, {parcelLng?.toFixed(4)}
                      </div>
                    </div>
                  </div>
                </div>

                <StepNav onPrev={prevStep} onNext={nextStep} nextLabel="Calculate Pricing →" prevLabel="← Back to Map" />
              </div>
            )}

            {/* === STEP 3: PRICING === */}
            {step === 3 && (
              <div id="analysis-content">
                <StepHeader
                  icon={<DollarSign size={16} />}
                  title="Pricing Matrix"
                  subtitle="Deterministic three-tier architecture · Engine PSF + Location Premium"
                />

                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { name: "Floor", val: activePricing.floor_psf, desc: "Defensive clearance", color: "var(--text-body)" },
                    { name: "Optimal", val: activePricing.optimal_psf, desc: "Target realized price", color: "var(--gold)" },
                    { name: "Ceiling", val: activePricing.ceiling_psf, desc: "Negotiation headroom", color: "var(--accent)" },
                  ].map((t, i) => (
                    <motion.div key={t.name}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1, duration: 0.4 }}
                      className="p-6 rounded-xl border"
                      style={{ background: "var(--surface)", borderColor: t.name === "Optimal" ? "var(--gold)" : "var(--border)", borderLeftWidth: t.name === "Optimal" ? 3 : 1 }}>
                      <div className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: t.color }}>{t.name}</div>
                      <div className="text-4xl font-bold tracking-tight" style={{ color: t.color }}>
                        {t.val != null ? <AnimatedCounter value={t.val} format="psf" duration={1.2} /> : <span style={{ color: "var(--text-muted)" }}>[MISSING]</span>}
                      </div>
                      <div className="text-[11px] mt-2" style={{ color: "var(--text-muted)" }}>{t.desc}</div>
                    </motion.div>
                  ))}
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div className="p-5 rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                    <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Estimated Unit Price</div>
                    <div className="text-3xl font-semibold" style={{ color: "var(--text-heading)" }}>
                      {activePricing.estimated_unit_price != null ? <AnimatedCounter value={activePricing.estimated_unit_price} format="aed" duration={1.4} /> : <span style={{ color: "var(--text-muted)" }}>[MISSING]</span>}
                    </div>
                    <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>Optimal PSF × {sqft} sqft</div>
                  </div>
                  <div className="p-5 rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                    <ConfidenceIndicator level={basePricing.data_confidence} compCount={basePricing.comp_count} />
                  </div>
                </div>

                <div className="p-5 rounded-xl border-l-2 mb-6" style={{ background: "var(--surface)", borderColor: "var(--border)", borderLeftColor: "var(--gold)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--gold)" }}>Pricing Rationale</span>
                    <button onClick={() => { setRationaleGenerated(false); fetchRationale(); }} disabled={rationaleLoading} className="text-[10px] px-2 py-1 rounded disabled:opacity-50" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                      {rationaleLoading ? "Generating..." : "Regenerate"}
                    </button>
                  </div>
                  {rationaleLoading && !rationale ? (
                    <div className="space-y-2">
                      <div className="h-3 rounded animate-pulse" style={{ background: "var(--surface-raised)", width: "92%" }} />
                      <div className="h-3 rounded animate-pulse" style={{ background: "var(--surface-raised)", width: "78%" }} />
                    </div>
                  ) : rationale ? (
                    <div style={{ color: "var(--text-body)" }}>
                      <Typewriter text={rationale} speed={18} className="text-sm italic leading-relaxed" />
                    </div>
                  ) : (
                    <div className="text-sm italic" style={{ color: "var(--text-muted)" }}>Calculating...</div>
                  )}
                </div>

                {/* Location premium breakdown */}
                <div className="p-5 rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  <div className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Location Premium Breakdown</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {proximityResults.filter(r => r.premiumAed > 0).map((r) => {
                      const config = POI_CATEGORIES[r.category];
                      return (
                        <div key={r.category} className="p-3 rounded-lg border" style={{ borderColor: config.color, background: `color-mix(in srgb, ${config.color} 8%, transparent)` }}>
                          <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: config.color }}>{config.label}</div>
                          <div className="text-lg font-bold mt-1" style={{ color: "var(--text-heading)" }}>+{r.premiumAed}</div>
                          <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{r.nearest?.name}</div>
                          <div className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                            {r.distanceKm < 1 ? `${Math.round(r.distanceKm * 1000)}m` : `${r.distanceKm.toFixed(1)}km`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* === MARKET INTELLIGENCE DASHBOARD === */}
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={14} style={{ color: "var(--gold)" }} />
                    <h3 className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
                      Market Intelligence — {corridor}
                    </h3>
                  </div>
                  <MarketIntelligence
                    corridor={corridor}
                    projectPsqft={activePricing.optimal_psf ?? 0}
                    projectAbsorptionDays={baseAbsorptionDays}
                    unitCount={unitCount}
                    avgSqft={sqft}
                    dailyCarryCost={50000}
                    timelineMonths={timelineMonths}
                  />
                </div>

                <StepNav onPrev={prevStep} onNext={nextStep} nextLabel="View Scenarios →" prevLabel="← Back to Spec" />
              </div>
            )}

            {/* === STEP 4: SCENARIOS === */}
            {step === 4 && (
              <div>
                <StepHeader
                  icon={<Activity size={16} />}
                  title="Scenario War-Gaming & Cashflow"
                  subtitle="Price vs Absorption trade-offs · Payment plan timing · 200-unit tower assumption"
                />

                <div className="rounded-xl border overflow-hidden mb-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
                    <h3 className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>Scenario Simulator</h3>
                  </div>
                  <div className="p-5">
                    <ScenarioChart scenarios={scenarios} activeIndex={activeScenario} onSelect={setActiveScenario} />
                    <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                      <MiniStat label="Rev Spread" value={scenarioSummary.revenue_spread_aed} format="aed" />
                      <MiniStat label="Carry Spread" value={scenarioSummary.carry_cost_spread_aed} format="aed" />
                      <MiniStat label="Net Spread" value={scenarioSummary.net_position_spread_aed} format="aed" accent />
                      <MiniStat label="Days Spread" value={scenarioSummary.absorption_spread_days} format="days" />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border overflow-hidden mb-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
                    <h3 className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>Cashflow Timing · {paymentPlan} · {timelineMonths}mo</h3>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Cumulative Cash Collected</span>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        M0: <span style={{ color: "var(--gold)" }}>AED {cashflowSummary.month_0_collected?.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
                        {" · "}Handover: <span style={{ color: "var(--gold)" }}>AED {cashflowSummary.handover_collected?.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
                      </span>
                    </div>
                    <CashflowChart data={cashflowData} paymentPlan={paymentPlan} />
                  </div>
                </div>

                <div className="rounded-xl border overflow-hidden mb-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
                    <h3 className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>Scenario War-Gaming Table</h3>
                  </div>
                  <div className="p-5">
                    <ScenarioTable scenarios={scenarios} recommendedScenario={scenarioSummary.best_net_scenario} />
                  </div>
                </div>

                <StepNav onPrev={prevStep} onNext={nextStep} nextLabel="Generate GTM Strategy →" prevLabel="← Back to Pricing" />
              </div>
            )}

            {/* === STEP 5: GTM === */}
            {step === 5 && (
              <div>
                <StepHeader
                  icon={<Brain size={16} />}
                  title="Go-To-Market Strategy"
                  subtitle="McKinsey Partner · 200-word boardroom narrative · Buyer persona · Launch phasing"
                />

                <GTMPanel
                  narrative={gtmNarrative}
                  loading={gtmLoading}
                  onRefresh={() => { setGtmGenerated(false); fetchGTM(); }}
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

                <StepNav onPrev={prevStep} nextLabel="← Back to Scenarios" hideNext />
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="px-6 md:px-10 py-6 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1400px] mx-auto flex items-center justify-between text-[10px]" style={{ color: "var(--text-muted)" }}>
          <span>Project Capital Velocity · Anti-Hallucination Protocol Enforced</span>
          <span>Map © OpenStreetMap · Tiles © CARTO</span>
        </div>
      </footer>
    </div>
  );
}

/* === Shared components === */

function StepHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-6"
    >
      <div className="flex items-center gap-2 mb-2">
        <div style={{ color: "var(--gold)" }}>{icon}</div>
        <span className="text-[11px] uppercase tracking-[0.2em]" style={{ color: "var(--gold)" }}>Step</span>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2" style={{ color: "var(--text-heading)" }}>{title}</h1>
      <p className="text-sm max-w-2xl" style={{ color: "var(--text-body)" }}>{subtitle}</p>
    </motion.div>
  );
}

function StepNav({ onPrev, onNext, nextLabel, prevLabel, hideNext }: {
  onPrev?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  prevLabel?: string;
  hideNext?: boolean;
}) {
  return (
    <div className="flex items-center justify-between mt-8 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
      {onPrev && (
        <button onClick={onPrev}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
          <ChevronLeft size={16} />
          {prevLabel || "Back"}
        </button>
      )}
      {!hideNext && onNext && (
        <button onClick={onNext}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ml-auto"
          style={{ background: "var(--gold)", color: "var(--ground)" }}>
          {nextLabel || "Continue"}
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}

function SpecField({ label, value, onChange, type }: { label: string; value: string; onChange: (v: string) => void; type: string }) {
  return (
    <div>
      <label className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-1.5 block" style={{ color: "var(--text-muted)" }}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded text-sm font-medium outline-none focus:border-[var(--gold)]"
        style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--text-heading)" }} />
    </div>
  );
}

function SpecSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div>
      <label className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-1.5 block" style={{ color: "var(--text-muted)" }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded text-sm font-medium outline-none focus:border-[var(--gold)] cursor-pointer appearance-none"
        style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--text-heading)" }}>
        {options.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
      </select>
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
