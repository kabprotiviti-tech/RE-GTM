"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Lock,
  MapPin,
  Layers,
  Train,
  Waves,
  GraduationCap,
  ShoppingBag,
  Trees,
  Hospital,
  Route,
  DollarSign,
  Activity,
  Brain,
  FileDown,
  Sparkles,
  ChevronRight,
  Navigation,
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
import { ErrorBanner, type ErrorLevel } from "@/components/capital-velocity/ErrorBanner";
import { ConfidenceIndicator } from "@/components/capital-velocity/ConfidenceIndicator";
import { MapPickerWrapper } from "@/components/capital-velocity/MapPickerWrapper";
import { ProximityDashboard } from "@/components/capital-velocity/ProximityDashboard";
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
  DUBAI_POIS,
  POI_CATEGORIES,
  calculateProximity,
  calculateTotalLocationPremium,
  type POICategory,
} from "@/lib/engines/dubai-poi";

const POI_ICONS: Record<string, any> = {
  metro: Train,
  sea: Waves,
  school: GraduationCap,
  mall: ShoppingBag,
  park: Trees,
  hospital: Hospital,
  highway: Route,
};

const ALL_CATEGORIES: POICategory[] = ["metro", "sea", "school", "mall", "park", "hospital", "highway"];

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

  // --- Map / parcel selection ---
  const [parcelLat, setParcelLat] = useState<number | null>(25.0772); // Default: Dubai Marina
  const [parcelLng, setParcelLng] = useState<number | null>(55.1390);
  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(
    new Set(ALL_CATEGORIES)
  );

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

  // Active pricing = engine output + location premium from map
  const engineOptimal = pricingMethod === "hedonic" ? hedonicPricing.optimal : (microPricing.final_optimal_psf ?? 0);
  const engineFloor = pricingMethod === "hedonic" ? hedonicPricing.floor : (microPricing.final_floor_psf ?? 0);
  const engineCeiling = pricingMethod === "hedonic" ? hedonicPricing.ceiling : (microPricing.final_ceiling_psf ?? 0);

  // Add location premium to the engine output
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
        pricing: { ...activePricing, location_premium: locationPremium, parcel_lat: parcelLat, parcel_lng: parcelLng },
      };
      const brief = `${unitCount}-unit ${unitType} tower at ${parcelLat?.toFixed(4)}, ${parcelLng?.toFixed(4)} — location premium AED ${locationPremium}/sqft. ${developer}-developed, ${timelineMonths}-month build, ${paymentPlan} plan, Floor ${floor} ${microView}.`;
      const res = await fetch("/api/gtm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenario_data_json: payload, project_brief: brief }) });
      const data = await res.json();
      setGtmNarrative(data.narrative || "[NARRATOR UNAVAILABLE]");
    } catch (e: any) { setGtmNarrative(`[NARRATOR UNAVAILABLE]\n\n${e.message}`); }
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
    } catch (e: any) { setRationale(`[NARRATOR UNAVAILABLE]\n\n${e.message}`); }
    finally { setRationaleLoading(false); }
  }, [activePricing, basePricing, baseAbsorptionDays, compsUsed, locationPremium, proximityResults]);

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
      const res = await fetch("/api/structured-narrative", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pricing_data: pricingData }) });
      const data = await res.json();
      setStructuredOutput(data);
    } catch (e: any) {
      setStructuredOutput({ target_persona: null, rationale: null, risk_flag: null, _parse_success: false, _schema_gate_passed: false, _error: e.message });
    } finally { setStructuredLoading(false); }
  }, [activePricing, basePricing.data_confidence]);

  useEffect(() => {
    if (activePricing.optimal_psf == null) return;
    const t = setTimeout(() => fetchRationale(), 400);
    return () => clearTimeout(t);
  }, [activePricing.optimal_psf, locationPremium, fetchRationale]);

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

  // --- Error handling ---
  const { exportToPDF, exporting: pdfExporting } = usePDFExport();
  const mathFailed = basePricing.data_confidence === "None" || activePricing.optimal_psf == null;
  const llmFailed = !mathFailed && (
    gtmNarrative.includes("[NARRATOR") || gtmNarrative.includes("Error:") ||
    rationale.includes("[NARRATOR") || rationale.includes("Error:")
  );
  const errorBanner = mathFailed
    ? { level: "error" as ErrorLevel, message: "Insufficient comparable data. Select a different view/type or adjust the unit spec." }
    : llmFailed
    ? { level: "warning" as ErrorLevel, message: "Strategy narrative generation delayed. Mathematical pricing is accurate and displayed above." }
    : { level: null as ErrorLevel, message: "" };
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const effectiveBanner = bannerDismissed ? { level: null as ErrorLevel, message: "" } : errorBanner;
  useEffect(() => { setBannerDismissed(false); }, [errorBanner.level]);
  const handleExportPDF = () => exportToPDF("right-column-content", projectName);

  return (
    <div className="cv-theme-root min-h-screen flex flex-col">
      {/* === HEADER === */}
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-xl"
        style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--ground) 85%, transparent)" }}
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
                Off-Plan Capital & Yield Optimisation
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
            <button
              onClick={handleExportPDF}
              disabled={pdfExporting || !hasData}
              className="flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-[0.15em] transition-all disabled:opacity-40"
              style={{ background: "var(--surface)", border: "1px solid var(--gold)", color: "var(--gold)" }}
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

      <ErrorBanner banner={effectiveBanner} onDismiss={() => setBannerDismissed(true)} />

      {/* === HERO === */}
      <div className="px-6 md:px-10 pt-12 pb-8 max-w-[1600px] mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={12} style={{ color: "var(--gold)" }} />
            <span className="text-[11px] uppercase tracking-[0.25em]" style={{ color: "var(--gold)" }}>
              Select Your Parcel · Analyse · Deploy
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.05] mb-3" style={{ color: "var(--text-heading)" }}>
            Pick your land on the map.
            <br />
            <span style={{ color: "var(--gold)" }}>We price the tower</span> on it.
          </h1>
          <p className="text-base max-w-2xl leading-relaxed" style={{ color: "var(--text-body)" }}>
            Click anywhere on the map to drop your parcel. We instantly calculate proximity to
            metro, sea, schools, and malls — then feed that into a deterministic pricing engine
            that outputs Floor / Optimal / Ceiling PSF, cashflow timing, and a boardroom-ready GTM.
          </p>
        </motion.div>
      </div>

      {/* === MAP + PROXIMITY (full-width section) === */}
      <section className="px-6 md:px-10 pb-8 max-w-[1600px] mx-auto w-full">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Map — 2/3 width */}
          <div className="lg:col-span-2">
            <div
              className="rounded-xl border overflow-hidden cv-stagger-1"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              {/* Map header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
                <MapPin size={14} style={{ color: "var(--gold)" }} />
                <div className="flex-1">
                  <h2 className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
                    Land Parcel Selection
                  </h2>
                  <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {parcelLat ? `${parcelLat.toFixed(4)}, ${parcelLng?.toFixed(4)}` : "Click to select"}
                    {parcelLat && ` · Location premium: +AED ${locationPremium}/sqft`}
                  </div>
                </div>
              </div>

              {/* Map container */}
              <div style={{ height: "500px" }}>
                <MapPickerWrapper
                  selectedLat={parcelLat}
                  selectedLng={parcelLng}
                  onSelect={(lat, lng) => { setParcelLat(lat); setParcelLng(lng); }}
                  visibleCategories={visibleCategories}
                  proximityResults={proximityResults}
                />
              </div>

              {/* POI layer toggles */}
              <div className="px-5 py-3 border-t flex items-center gap-2 flex-wrap" style={{ borderColor: "var(--border)" }}>
                <span className="text-[9px] font-semibold uppercase tracking-wider mr-2" style={{ color: "var(--text-muted)" }}>
                  Layers:
                </span>
                {ALL_CATEGORIES.map((cat) => {
                  const config = POI_CATEGORIES[cat];
                  const Icon = POI_ICONS[cat];
                  const active = visibleCategories.has(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium transition-all"
                      style={{
                        background: active ? `color-mix(in srgb, ${config.color} 15%, transparent)` : "var(--surface-raised)",
                        border: `1px solid ${active ? config.color : "var(--border)"}`,
                        color: active ? config.color : "var(--text-muted)",
                        opacity: active ? 1 : 0.5,
                      }}
                    >
                      <Icon size={10} />
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Proximity dashboard — 1/3 width */}
          <div className="lg:col-span-1 cv-stagger-2">
            <div
              className="rounded-xl border p-5 h-full"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Navigation size={14} style={{ color: "var(--gold)" }} />
                <h2 className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
                  Proximity Analysis
                </h2>
              </div>
              <ProximityDashboard results={proximityResults} totalPremium={locationPremium} />
            </div>
          </div>
        </div>
      </section>

      {/* === UNIT SPEC BAR === */}
      <section className="px-6 md:px-10 pb-8 max-w-[1600px] mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-xl border p-5 cv-stagger-2"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Layers size={12} style={{ color: "var(--gold)" }} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>
              Unit Specification
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <SpecField label="Project Name" value={projectName} onChange={setProjectName} type="text" />
            <SpecSelect label="Unit Type" value={unitType} onChange={(v) => setUnitType(v as any)} options={[["1BR","1BR"],["2BR","2BR"],["3BR","3BR"]]} />
            <SpecSelect label="View" value={microView} onChange={setMicroView} options={[["Full Marina","Full Marina +8%"],["Partial Marina","Partial Marina"],["Internal","Internal −5%"],["Sea","Sea"],["City","City"]]} />
            <SpecField label="Floor" value={String(floor)} onChange={(v) => setFloor(Number(v))} type="number" />
            <SpecField label="Sqft" value={String(sqft)} onChange={(v) => setSqft(Number(v))} type="number" />
            <SpecSelect label="Developer" value={developer} onChange={setDeveloper} options={[["Emaar Properties","Emaar (+5%)"],["Select Group","Select Group (+5%)"],["Meraas","Meraas (+5%)"],["Muraba","Muraba (Tier 2)"]]} />
            <SpecSelect label="Plan" value={paymentPlan} onChange={setPaymentPlan} options={[["50/50","50/50"],["60/40","60/40"],["70/30","70/30"],["80/20","80/20"]]} />
          </div>

          {/* Pricing method toggle */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
            <span className="text-[10px] font-semibold uppercase tracking-wider mr-2" style={{ color: "var(--text-muted)" }}>
              Method:
            </span>
            {(["hedonic", "weighted"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setPricingMethod(m)}
                className="px-3 py-1.5 rounded text-xs font-medium transition-all"
                style={{
                  background: pricingMethod === m ? "var(--surface-raised)" : "var(--surface)",
                  border: `1px solid ${pricingMethod === m ? "var(--gold)" : "var(--border)"}`,
                  color: pricingMethod === m ? "var(--gold)" : "var(--text-muted)",
                }}
              >
                {m === "hedonic" ? "Hedonic Regression" : "Weighted Average"}
              </button>
            ))}
            {pricingMethod === "hedonic" && (
              <div className="flex items-center gap-2 ml-4">
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Amenity:</span>
                <input type="range" min={1} max={10} value={amenityScore} onChange={(e) => setAmenityScore(Number(e.target.value))} className="w-20 accent-[var(--gold)]" style={{ accentColor: "var(--gold)" }} />
                <span className="text-xs font-bold font-mono w-6" style={{ color: "var(--gold)" }}>{amenityScore}</span>
              </div>
            )}
          </div>
        </motion.div>
      </section>

      {/* === RIGHT COLUMN CONTENT (Pricing + Chart + Scenarios + GTM) === */}
      <main id="right-column-content" className="px-6 md:px-10 pb-16 max-w-[1600px] mx-auto w-full space-y-6">

        {/* === PRICING MATRIX === */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-xl border overflow-hidden cv-stagger-3"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
            <DollarSign size={14} style={{ color: "var(--gold)" }} />
            <div className="flex-1">
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>Pricing Matrix</h2>
              <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                Engine PSF + Location Premium (AED {locationPremium}/sqft from map)
              </div>
            </div>
          </div>
          <div className="p-5">
            {/* Tier tiles */}
            <div className="grid grid-cols-3 gap-4 mb-5">
              {[
                { name: "Floor", val: activePricing.floor_psf, desc: "Defensive clearance", color: "var(--text-body)" },
                { name: "Optimal", val: activePricing.optimal_psf, desc: "Target realized price", color: "var(--gold)" },
                { name: "Ceiling", val: activePricing.ceiling_psf, desc: "Negotiation headroom", color: "var(--accent)" },
              ].map((t, i) => (
                <motion.div
                  key={t.name}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                  className="p-5 rounded-lg border"
                  style={{ background: "var(--surface-raised)", borderColor: t.name === "Optimal" ? "var(--gold)" : "var(--border)", borderLeftWidth: t.name === "Optimal" ? 3 : 1 }}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: t.color }}>{t.name}</div>
                  <div className="text-3xl font-bold tracking-tight" style={{ color: t.color }}>
                    {t.val != null ? <AnimatedCounter value={t.val} format="psf" duration={1.1} /> : <span style={{ color: "var(--text-muted)" }}>[DATA MISSING]</span>}
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{t.desc}</div>
                </motion.div>
              ))}
            </div>

            {/* Confidence + estimated price */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 rounded-lg border" style={{ background: "var(--surface-raised)", borderColor: "var(--border)" }}>
                <div className="text-[9px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Estimated Unit Price</div>
                <div className="text-2xl font-semibold" style={{ color: "var(--text-heading)" }}>
                  {activePricing.estimated_unit_price != null ? <AnimatedCounter value={activePricing.estimated_unit_price} format="aed" duration={1.2} /> : <span style={{ color: "var(--text-muted)" }}>[MISSING]</span>}
                </div>
                <div className="text-[9px] mt-1" style={{ color: "var(--text-muted)" }}>Optimal PSF × {sqft} sqft</div>
              </div>
              <div className="p-4 rounded-lg border" style={{ background: "var(--surface-raised)", borderColor: "var(--border)" }}>
                <ConfidenceIndicator level={basePricing.data_confidence} compCount={basePricing.comp_count} />
              </div>
            </div>

            {/* Rationale */}
            <div className="p-4 rounded-lg border-l-2" style={{ background: "var(--surface-raised)", borderColor: "var(--border)", borderLeftColor: "var(--gold)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--gold)" }}>Pricing Rationale · PropTech Data Scientist</span>
                <button onClick={fetchRationale} disabled={rationaleLoading} className="text-[9px] px-2 py-0.5 rounded disabled:opacity-50" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                  {rationaleLoading ? "..." : "↻"}
                </button>
              </div>
              {rationaleLoading && !rationale ? (
                <div className="space-y-1.5">
                  <div className="h-2.5 rounded animate-pulse" style={{ background: "var(--surface)", width: "92%" }} />
                  <div className="h-2.5 rounded animate-pulse" style={{ background: "var(--surface)", width: "78%" }} />
                </div>
              ) : rationale ? (
                <div style={{ color: "var(--text-body)" }}>
                  <Typewriter text={rationale} speed={18} className="text-xs italic leading-relaxed" />
                </div>
              ) : (
                <div className="text-xs italic" style={{ color: "var(--text-muted)" }}>Adjust parameters to generate rationale.</div>
              )}
            </div>
          </div>
        </motion.section>

        {/* === CAPITAL VELOCITY === */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-xl border overflow-hidden cv-stagger-4"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
            <Activity size={14} style={{ color: "var(--gold)" }} />
            <div className="flex-1">
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>Capital Velocity Chart</h2>
              <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>Price vs Absorption scenarios + Cashflow timing</div>
            </div>
          </div>
          <div className="p-5">
            <ScenarioChart scenarios={scenarios} activeIndex={activeScenario} onSelect={setActiveScenario} />
            <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
              <MiniStat label="Rev Spread" value={scenarioSummary.revenue_spread_aed} format="aed" />
              <MiniStat label="Carry Spread" value={scenarioSummary.carry_cost_spread_aed} format="aed" />
              <MiniStat label="Net Spread" value={scenarioSummary.net_position_spread_aed} format="aed" accent />
              <MiniStat label="Days Spread" value={scenarioSummary.absorption_spread_days} format="days" />
            </div>
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
            <div className="mt-5 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Scenario War-Gaming Table
                </span>
              </div>
              <ScenarioTable scenarios={scenarios} recommendedScenario={scenarioSummary.best_net_scenario} />
            </div>
          </div>
        </motion.section>

        {/* === GTM PANEL === */}
        <div className="cv-stagger-5">
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
      </main>

      {/* Footer */}
      <footer className="px-6 md:px-10 py-8 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            Project Capital Velocity · Off-Plan Capital & Yield Optimisation · Anti-Hallucination Protocol Enforced
          </div>
          <div className="flex items-center gap-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
            <MapPin size={10} style={{ color: "var(--gold)" }} />
            Map data © OpenStreetMap · Tiles © CARTO
          </div>
        </div>
      </footer>
    </div>
  );
}

/* === Shared components === */

function SpecField({ label, value, onChange, type }: { label: string; value: string; onChange: (v: string) => void; type: string }) {
  return (
    <div>
      <label className="text-[9px] font-semibold uppercase tracking-[0.15em] mb-1.5 block" style={{ color: "var(--text-muted)" }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded text-xs font-medium outline-none focus:border-[var(--gold)]"
        style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--text-heading)" }}
      />
    </div>
  );
}

function SpecSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div>
      <label className="text-[9px] font-semibold uppercase tracking-[0.15em] mb-1.5 block" style={{ color: "var(--text-muted)" }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded text-xs font-medium outline-none focus:border-[var(--gold)] cursor-pointer appearance-none"
        style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--text-heading)" }}
      >
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
