"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, MapPin, Settings, DollarSign, Activity, Brain, FileDown,
  Sparkles, Navigation, ChevronRight, ChevronLeft, Shield, Rocket, Sliders,
  Train, Waves, GraduationCap, ShoppingBag, Trees, Hospital, Route,
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import {
  calculateBasePricing, applyMicroAdjustments, microToMacroView,
} from "@/lib/engines/pricing-engine";
import { calculateHedonicPricing } from "@/lib/engines/hedonic-engine";
import { simulateCashflow, summarizeCashflow } from "@/lib/engines/cashflow-sim";
import { generateScenarios, summarizeScenarios } from "@/lib/engines/scenario-engine";
import { MOCK_COMPS } from "@/lib/engines/mock-data";
import {
  POI_CATEGORIES, calculateProximity, calculateTotalLocationPremium, detectEmirate, type POICategory,
} from "@/lib/engines/dubai-poi";
import { getAllCorridors } from "@/lib/engines/project-database";
import { MapPickerWrapper } from "@/components/capital-velocity/MapPickerWrapper";
import { ProximityDashboard } from "@/components/capital-velocity/ProximityDashboard";
import { StepProgress } from "@/components/capital-velocity/StepProgress";
import { MarketIntelligence } from "@/components/capital-velocity/MarketIntelligence";
import { FinanceCompliancePanel } from "@/components/capital-velocity/FinanceCompliancePanel";
import { LaunchPhasingPanel } from "@/components/capital-velocity/LaunchPhasingPanel";
import { SensitivitySliders } from "@/components/capital-velocity/SensitivitySliders";
import { AnimatedCounter } from "@/components/capital-velocity/AnimatedCounter";
import { Typewriter } from "@/components/capital-velocity/Typewriter";
import { ScenarioChart } from "@/components/capital-velocity/ScenarioChart";
import { CashflowChart } from "@/components/capital-velocity/CashflowChart";
import { ScenarioTable } from "@/components/capital-velocity/ScenarioTable";
import { GTMPanel } from "@/components/capital-velocity/GTMPanel";
import { ConfidenceIndicator } from "@/components/capital-velocity/ConfidenceIndicator";
import { usePDFExport } from "@/hooks/use-pdf-export";
import { searchAreas, type AreaResult } from "@/lib/engines/area-search";
import { generatePremiumReport } from "@/lib/engines/premium-report";
import { calculateProjectFinance, CONSTRUCTION_COST_TIERS } from "@/lib/engines/finance-engine";

const ALL_CATEGORIES: POICategory[] = ["metro", "sea", "school", "mall", "park", "hospital", "highway"];
const POI_ICONS: Record<string, any> = { metro: Train, sea: Waves, school: GraduationCap, mall: ShoppingBag, park: Trees, hospital: Hospital, highway: Route };
const VIEW_OPTIONS: [string, string][] = [
  ["Full Marina", "Full Marina +8%"], ["Partial Marina", "Partial Marina +4%"], ["Full Sea", "Full Sea +10%"],
  ["Partial Sea", "Partial Sea +5%"], ["Palm View", "Palm View +12%"], ["Burj View", "Burj View +9%"],
  ["Canal View", "Canal View +6%"], ["Golf View", "Golf View +7%"], ["Lake View", "Lake View +4%"],
  ["SZR View", "Highway View +2%"], ["Internal", "Internal −5%"], ["City", "City View"],
];

// Premium white theme colors
const COLORS = {
  bg: "#FAFAFA",
  surface: "#FFFFFF",
  surfaceAlt: "#F8F9FB",
  border: "#E8EAED",
  borderStrong: "#D1D5DB",
  text: "#1A1A1A",
  textBody: "#4B5563",
  textMuted: "#9CA3AF",
  gold: "#C9A961",
  goldDark: "#A68A1E",
  accent: "#1E3A5F",
  positive: "#059669",
  negative: "#DC2626",
};

export default function Home() {
  const [step, setStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1);
  const goToStep = (n: number) => { setStep(n); if (n > maxStep) setMaxStep(n); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const nextStep = () => goToStep(Math.min(step + 1, 6));
  const prevStep = () => goToStep(Math.max(step - 1, 1));

  const [parcelLat, setParcelLat] = useState<number | null>(25.0772);
  const [parcelLng, setParcelLng] = useState<number | null>(55.1390);
  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(new Set(ALL_CATEGORIES));
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AreaResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const toggleCategory = (cat: string) => setVisibleCategories(p => { const n = new Set(p); if (n.has(cat)) { n.delete(cat); } else { n.add(cat); } return n; });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim().length >= 2) {
      setSearchResults(searchAreas(query));
      setShowSearch(true);
    } else {
      setSearchResults([]);
      setShowSearch(false);
    }
  };

  const selectArea = (area: AreaResult) => {
    setParcelLat(area.lat);
    setParcelLng(area.lng);
    setSearchQuery(area.name);
    setShowSearch(false);
  };

  const proximityResults = useMemo(() => parcelLat != null && parcelLng != null ? calculateProximity(parcelLat, parcelLng) : [], [parcelLat, parcelLng]);
  const locationPremium = useMemo(() => calculateTotalLocationPremium(proximityResults), [proximityResults]);

  const [projectName, setProjectName] = useState("Marina Gate IV");
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

  const macroView = microToMacroView(microView);
  const basePricing = useMemo(() => calculateBasePricing({ unit_type: unitType, view: macroView, developer }), [unitType, macroView, developer]);
  const microPricing = useMemo(() => applyMicroAdjustments(basePricing, { unit_type: unitType, view: microView, floor_number: floor, sqft }), [basePricing, unitType, microView, floor, sqft]);
  const hedonicPricing = useMemo(() => calculateHedonicPricing({ floor, amenity_score: amenityScore, view: microView }), [floor, amenityScore, microView]);

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

  const compsUsed = useMemo(() => MOCK_COMPS.filter(c => c.unit_type === unitType && c.view === macroView), [unitType, macroView]);
  const baseAbsorptionDays = useMemo(() => compsUsed.length ? compsUsed.reduce((s, c) => s + c.absorption_days_50pct, 0) / compsUsed.length : 58, [compsUsed]);
  const cashflowData = useMemo(() => activePricing.estimated_unit_price != null ? simulateCashflow(activePricing.estimated_unit_price, paymentPlan, timelineMonths) : [], [activePricing.estimated_unit_price, paymentPlan, timelineMonths]);
  const cashflowSummary = useMemo(() => summarizeCashflow(cashflowData), [cashflowData]);
  const scenarios = useMemo(() => {
    if (activePricing.optimal_psf == null || activePricing.optimal_psf <= 0) return [];
    return generateScenarios(activePricing.optimal_psf, baseAbsorptionDays, { unit_count: unitCount, avg_sqft_per_unit: sqft, daily_carry_cost_aed: 50000 });
  }, [activePricing.optimal_psf, baseAbsorptionDays, unitCount, sqft]);
  const scenarioSummary = useMemo(() => summarizeScenarios(scenarios), [scenarios]);
  const [activeScenario, setActiveScenario] = useState(0);

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
    setGtmLoading(true); setGtmNarrative("");
    try {
      const payload = { scenarios, summary: scenarioSummary, cashflow: { payment_plan: paymentPlan, timeline_months: timelineMonths, month_0_collected: cashflowSummary.month_0_collected, handover_collected: cashflowSummary.handover_collected }, pricing: { ...activePricing, location_premium: locationPremium, parcel_lat: parcelLat, parcel_lng: parcelLng } };
      const brief = `${unitCount}-unit ${unitType} tower at ${parcelLat?.toFixed(4)}, ${parcelLng?.toFixed(4)} — location premium AED ${locationPremium}/sqft. ${developer}, ${timelineMonths}mo, ${paymentPlan}, Floor ${floor} ${microView}.`;
      const res = await fetch("/api/gtm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenario_data_json: payload, project_brief: brief }) });
      const data = await res.json(); setGtmNarrative(data.narrative || "[NARRATOR UNAVAILABLE]"); setGtmGenerated(true);
    } catch (e: any) { setGtmNarrative(`[NARRATOR UNAVAILABLE]\n\n${e.message}`); setGtmGenerated(true); } finally { setGtmLoading(false); }
  }, [scenarios, scenarioSummary, paymentPlan, timelineMonths, cashflowSummary, activePricing, locationPremium, parcelLat, parcelLng, unitCount, unitType, developer, floor, microView]);

  const fetchRationale = useCallback(async () => {
    setRationaleLoading(true); setRationale("");
    try {
      const pricingPayload = { ...activePricing, base_optimal_psf: basePricing.optimal_psf, base_absorption_days_avg: baseAbsorptionDays, location_premium: locationPremium, proximity: proximityResults.map(r => ({ category: r.category, nearest: r.nearest?.name, distance_km: r.distanceKm, premium: r.premiumAed })), comps_used: compsUsed.map(c => c.comp_id) };
      const res = await fetch("/api/rationale", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pricing_json: pricingPayload, comps_used: compsUsed }) });
      const data = await res.json(); setRationale(data.rationale || "[NARRATOR UNAVAILABLE]"); setRationaleGenerated(true);
    } catch (e: any) { setRationale(`[NARRATOR UNAVAILABLE]\n\n${e.message}`); setRationaleGenerated(true); } finally { setRationaleLoading(false); }
  }, [activePricing, basePricing, baseAbsorptionDays, compsUsed, locationPremium, proximityResults]);

  const fetchStructured = useCallback(async () => {
    setStructuredLoading(true); setStructuredOutput(null);
    try {
      const res = await fetch("/api/structured-narrative", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pricing_data: { floor_psf: activePricing.floor_psf, optimal_psf: activePricing.optimal_psf, ceiling_psf: activePricing.ceiling_psf, confidence: basePricing.data_confidence } }) });
      const data = await res.json(); setStructuredOutput(data); setStructuredGenerated(true);
    } catch (e: any) { setStructuredOutput({ _schema_gate_passed: false, _error: e.message }); setStructuredGenerated(true); } finally { setStructuredLoading(false); }
  }, [activePricing, basePricing.data_confidence]);

  useEffect(() => { if (step === 3 && !rationaleGenerated && activePricing.optimal_psf != null) fetchRationale(); }, [step, rationaleGenerated, activePricing.optimal_psf]);
  useEffect(() => { if (step === 3 && !structuredGenerated && activePricing.optimal_psf != null) fetchStructured(); }, [step, structuredGenerated, activePricing.optimal_psf]);
  useEffect(() => { if (step === 6 && !gtmGenerated && scenarios.length > 0) fetchGTM(); }, [step, gtmGenerated, scenarios.length]);

  const [lastSpec, setLastSpec] = useState("");
  const currentSpec = `${unitType}|${microView}|${floor}|${sqft}|${developer}|${paymentPlan}|${timelineMonths}|${unitCount}|${pricingMethod}|${amenityScore}|${parcelLat}|${parcelLng}`;
  useEffect(() => { if (lastSpec && currentSpec !== lastSpec) { setGtmGenerated(false); setRationaleGenerated(false); setStructuredGenerated(false); } setLastSpec(currentSpec); }, [currentSpec, lastSpec]);

  const hasData = activePricing.optimal_psf != null;
  const [pdfExporting, setPdfExporting] = useState(false);

  const handleExportPDF = () => {
    setPdfExporting(true);
    try {
      // Calculate finance for the report
      const tierConfig = CONSTRUCTION_COST_TIERS.premium;
      const finance = calculateProjectFinance({
        totalSaleableArea: sqft * unitCount,
        avgPricePsqft: activePricing.optimal_psf ?? 2500,
        totalUnits: unitCount,
        landCost: 50000000,
        constructionCostPsqft: tierConfig.costPsqft,
        gfaRatio: tierConfig.gfaRatio,
        softCostPct: tierConfig.softCostPct,
        marketingCostPct: tierConfig.marketingPct,
        financeCostPct: tierConfig.financePct,
        equityPct: 0.40,
        loanPct: 0.60,
        loanInterestRate: 8.5,
        loanTenorMonths: timelineMonths,
        constructionMonths: timelineMonths,
        salesPeriodMonths: Math.min(timelineMonths, 24),
        wacc: 12,
      });

      generatePremiumReport({
        projectName, corridor,
        emirate: parcelLat && parcelLng ? detectEmirate(parcelLat, parcelLng) : "Dubai",
        parcelLat, parcelLng, locationPremium,
        unitType, microView, floor, sqft, unitCount, developer, paymentPlan, timelineMonths,
        pricingMethod, amenityScore,
        pricing: activePricing,
        baseConfidence: basePricing.data_confidence,
        baseCompCount: basePricing.comp_count,
        scenarios, scenarioSummary, cashflowSummary, proximityResults,
        gtmNarrative, rationale,
        finance: {
          grossRevenue: finance.grossRevenue,
          totalCost: finance.totalCost,
          netProfit: finance.netProfit,
          profitMargin: finance.profitMargin,
          roi: finance.roi,
          roe: finance.roe,
          irr: finance.irr,
          npv: finance.npv,
          paybackMonths: finance.paybackMonths,
          equityInvestment: finance.equityInvestment,
          loanAmount: finance.loanAmount,
        },
      });
    } catch (e: any) {
      console.error("PDF generation failed:", e);
    } finally {
      setPdfExporting(false);
    }
  };

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      {/* HEADER */}
      <header style={{ position: "sticky", top: 0, zIndex: 30, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: COLORS.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Building2 size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, letterSpacing: "-0.02em" }}>Capital Velocity</div>
              <div style={{ fontSize: 10, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.15em" }}>Step {step} of 6</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {step === 6 && (
              <button onClick={handleExportPDF} disabled={pdfExporting || !hasData}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", background: COLORS.gold, color: "#fff", border: "none", cursor: hasData ? "pointer" : "not-allowed", opacity: hasData ? 1 : 0.4 }}>
                <FileDown size={12} /> {pdfExporting ? "Generating..." : "Export PDF"}
              </button>
            )}
          </div>
        </div>
        <StepProgress currentStep={step} maxStep={maxStep} onStepClick={goToStep} />
      </header>

      {/* CONTENT */}
      <main style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 24px" }}>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>

            {/* STEP 1: MAP */}
            {step === 1 && (
              <div>
                <StepHeader icon={<MapPin size={18} />} title="Select Your Land Parcel" subtitle="Search for an area or click on the map to drop your parcel. We calculate proximity to metro, sea, schools, and malls instantly." />
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
                  <div style={{ background: COLORS.surface, borderRadius: 16, border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
                    {/* Search bar */}
                    <div style={{ padding: "12px 20px", borderBottom: `1px solid ${COLORS.border}`, position: "relative" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <div style={{ position: "relative", flex: 1 }}>
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            onFocus={() => searchResults.length > 0 && setShowSearch(true)}
                            onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                            placeholder="Search area (e.g. Marina, Saadiyat, Business Bay...)"
                            style={{ width: "100%", padding: "10px 14px 10px 36px", borderRadius: 10, fontSize: 13, border: `1px solid ${COLORS.border}`, background: COLORS.surfaceAlt, color: COLORS.text, outline: "none" }}
                            onFocusCapture={e => e.currentTarget.style.borderColor = COLORS.gold}
                            onBlurCapture={e => e.currentTarget.style.borderColor = COLORS.border}
                          />
                          <MapPin size={14} style={{ position: "absolute", left: 12, top: 11, color: COLORS.gold }} />
                          {showSearch && searchResults.length > 0 && (
                            <div style={{ position: "absolute", top: 44, left: 0, right: 0, background: "#fff", borderRadius: 10, border: `1px solid ${COLORS.border}`, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 1000, maxHeight: 280, overflowY: "auto" }}>
                              {searchResults.map((area, i) => (
                                <div key={i} onClick={() => selectArea(area)} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: i < searchResults.length - 1 ? `1px solid ${COLORS.border}` : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }} onMouseEnter={e => e.currentTarget.style.background = COLORS.surfaceAlt} onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                                  <div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.text }}>{area.name}</div>
                                    <div style={{ fontSize: 10, color: COLORS.textMuted }}>{area.emirate} · {area.description}</div>
                                  </div>
                                  <MapPin size={12} style={{ color: COLORS.gold }} />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <span style={{ fontSize: 11, fontFamily: "monospace", color: COLORS.gold, whiteSpace: "nowrap" }}>{parcelLat ? `${parcelLat.toFixed(4)}, ${parcelLng?.toFixed(4)}` : "No selection"}</span>
                      </div>
                    </div>
                    <div style={{ height: 450, position: "relative" }}>
                      <MapPickerWrapper selectedLat={parcelLat} selectedLng={parcelLng} onSelect={(lat: number, lng: number) => { setParcelLat(lat); setParcelLng(lng); }} visibleCategories={visibleCategories} proximityResults={proximityResults} />
                    </div>
                    <div style={{ padding: "12px 20px", borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {ALL_CATEGORIES.map(cat => {
                        const config = POI_CATEGORIES[cat]; const Icon = POI_ICONS[cat]; const active = visibleCategories.has(cat);
                        return <button key={cat} onClick={() => toggleCategory(cat)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 6, fontSize: 10, fontWeight: 500, border: `1px solid ${active ? config.color : COLORS.border}`, background: active ? `${config.color}15` : COLORS.surfaceAlt, color: active ? config.color : COLORS.textMuted, cursor: "pointer" }}><Icon size={10} />{config.label}</button>;
                      })}
                    </div>
                  </div>
                  <div style={{ background: COLORS.surface, borderRadius: 16, border: `1px solid ${COLORS.border}`, padding: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}><Navigation size={14} color={COLORS.gold} /><span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>Proximity Analysis</span></div>
                    <ProximityDashboard results={proximityResults} totalPremium={locationPremium} />
                  </div>
                </div>
                <StepNav onPrev={prevStep} onNext={nextStep} nextLabel="Continue →" />
              </div>
            )}

            {/* STEP 2: SPEC */}
            {step === 2 && (
              <div>
                <StepHeader icon={<Settings size={18} />} title="Unit Specification" subtitle="Configure the reference unit. Every field feeds the deterministic pricing engine." />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 900, margin: "0 auto" }}>
                  <div style={{ background: COLORS.surface, borderRadius: 16, border: `1px solid ${COLORS.border}`, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                    <SpecField label="Project Name" value={projectName} onChange={setProjectName} />
                    <SpecSelect label="Corridor" value={corridor} onChange={setCorridor} options={getAllCorridors().map(c => [c.corridor, `${c.emirate} · ${c.corridor} (${c.projectCount})`] as [string, string])} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <SpecSelect label="Unit Type" value={unitType} onChange={(v) => setUnitType(v as any)} options={[["1BR","1BR"],["2BR","2BR"],["3BR","3BR"]]} />
                      <SpecField label="Floor" value={String(floor)} onChange={(v) => setFloor(Number(v))} type="number" />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <SpecField label="Sqft" value={String(sqft)} onChange={(v) => setSqft(Number(v))} type="number" />
                      <SpecField label="Unit Count" value={String(unitCount)} onChange={(v) => setUnitCount(Number(v))} type="number" />
                    </div>
                    <SpecSelect label="Developer" value={developer} onChange={setDeveloper} options={[["Emaar Properties","Emaar (+5%)"],["Select Group","Select Group (+5%)"],["Meraas","Meraas (+5%)"],["Muraba","Muraba (Tier 2)"]]} />
                  </div>
                  <div style={{ background: COLORS.surface, borderRadius: 16, border: `1px solid ${COLORS.border}`, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                    <SpecSelect label="View" value={microView} onChange={setMicroView} options={VIEW_OPTIONS} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <SpecSelect label="Payment Plan" value={paymentPlan} onChange={setPaymentPlan} options={[["50/50","50/50"],["60/40","60/40"],["70/30","70/30"],["80/20","80/20"]]} />
                      <SpecSelect label="Timeline" value={String(timelineMonths)} onChange={(v) => setTimelineMonths(Number(v))} options={[["24","24 months"],["36","36 months"],["48","48 months"]]} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: COLORS.textMuted, marginBottom: 6, display: "block" }}>Pricing Method</label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {(["hedonic", "weighted"] as const).map(m => <button key={m} onClick={() => setPricingMethod(m)} style={{ padding: "8px 12px", borderRadius: 8, fontSize: 11, fontWeight: 500, border: `1px solid ${pricingMethod === m ? COLORS.gold : COLORS.border}`, background: pricingMethod === m ? COLORS.surfaceAlt : COLORS.surface, color: pricingMethod === m ? COLORS.gold : COLORS.textMuted, cursor: "pointer" }}>{m === "hedonic" ? "Hedonic" : "Weighted Avg"}</button>)}
                      </div>
                    </div>
                    {pricingMethod === "hedonic" && (
                      <div><label style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: COLORS.textMuted, marginBottom: 6, display: "block" }}>Amenity Score: <span style={{ color: COLORS.gold }}>{amenityScore}/10</span></label><input type="range" min={1} max={10} value={amenityScore} onChange={e => setAmenityScore(Number(e.target.value))} style={{ width: "100%", accentColor: COLORS.gold }} /></div>
                    )}
                    <div style={{ paddingTop: 12, borderTop: `1px solid ${COLORS.border}` }}>
                      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: COLORS.textMuted, marginBottom: 4 }}>Location Premium</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.gold }}>+AED {locationPremium}/sqft</div>
                    </div>
                  </div>
                </div>
                <StepNav onPrev={prevStep} onNext={nextStep} nextLabel="Calculate Pricing →" prevLabel="← Back to Map" />
              </div>
            )}

            {/* STEP 3: PRICING */}
            {step === 3 && (
              <div id="analysis-content">
                <StepHeader icon={<DollarSign size={18} />} title="Pricing Matrix" subtitle="Deterministic three-tier architecture with location premium adjustment" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
                  {[{ name: "Floor", val: activePricing.floor_psf, desc: "Defensive clearance" }, { name: "Optimal", val: activePricing.optimal_psf, desc: "Target realized price" }, { name: "Ceiling", val: activePricing.ceiling_psf, desc: "Negotiation headroom" }].map((t, i) => (
                    <motion.div key={t.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                      style={{ padding: 24, borderRadius: 16, background: COLORS.surface, border: `1px solid ${t.name === "Optimal" ? COLORS.gold : COLORS.border}`, borderTop: t.name === "Optimal" ? `3px solid ${COLORS.gold}` : `1px solid ${COLORS.border}` }}>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: t.name === "Optimal" ? COLORS.gold : COLORS.textMuted, marginBottom: 8 }}>{t.name}</div>
                      <div style={{ fontSize: 32, fontWeight: 700, color: t.name === "Optimal" ? COLORS.gold : COLORS.text, letterSpacing: "-0.02em" }}>
                        {t.val != null ? <AnimatedCounter value={t.val} format="psf" duration={1.2} /> : <span style={{ color: COLORS.textMuted }}>[MISSING]</span>}
                      </div>
                      <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>{t.desc}</div>
                    </motion.div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                  <div style={{ padding: 20, borderRadius: 16, background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
                    <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: COLORS.textMuted, marginBottom: 8 }}>Estimated Unit Price</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.text }}>{activePricing.estimated_unit_price != null ? <AnimatedCounter value={activePricing.estimated_unit_price} format="aed" duration={1.4} /> : "—"}</div>
                    <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>Optimal PSF × {sqft} sqft</div>
                  </div>
                  <div style={{ padding: 20, borderRadius: 16, background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
                    <ConfidenceIndicator level={basePricing.data_confidence} compCount={basePricing.comp_count} />
                  </div>
                </div>
                <div style={{ padding: 20, borderRadius: 16, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderLeft: `3px solid ${COLORS.gold}`, marginBottom: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: COLORS.gold }}>Pricing Rationale</span>
                    <button onClick={() => { setRationaleGenerated(false); fetchRationale(); }} disabled={rationaleLoading} style={{ fontSize: 10, padding: "4px 8px", borderRadius: 6, border: `1px solid ${COLORS.border}`, background: COLORS.surfaceAlt, color: COLORS.textMuted, cursor: "pointer" }}>{rationaleLoading ? "Generating..." : "Regenerate"}</button>
                  </div>
                  {rationaleLoading && !rationale ? <div style={{ height: 12, borderRadius: 4, background: COLORS.surfaceAlt, animation: "pulse 1.5s infinite", width: "90%", marginBottom: 8 }} /> : rationale ? <div style={{ color: COLORS.textBody }}><Typewriter text={rationale} speed={18} className="text-sm italic" /></div> : <div style={{ fontSize: 13, color: COLORS.textMuted, fontStyle: "italic" }}>Calculating...</div>}
                </div>
                <div style={{ background: COLORS.surface, borderRadius: 16, border: `1px solid ${COLORS.border}`, padding: 20, marginBottom: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}><Sparkles size={14} color={COLORS.gold} /><span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>Market Intelligence — {corridor}</span></div>
                  <MarketIntelligence corridor={corridor} projectPsqft={activePricing.optimal_psf ?? 0} projectAbsorptionDays={baseAbsorptionDays} unitCount={unitCount} avgSqft={sqft} dailyCarryCost={50000} timelineMonths={timelineMonths} />
                </div>
                <StepNav onPrev={prevStep} onNext={nextStep} nextLabel="Financial Analysis →" prevLabel="← Back to Spec" />
              </div>
            )}

            {/* STEP 4: FINANCE */}
            {step === 4 && (
              <div>
                <StepHeader icon={<Shield size={18} />} title="Financial Analysis & Compliance" subtitle="P&L · IRR/NPV · Construction costs · RERA/DLD compliance · Buyer survey data" />
                <FinanceCompliancePanel emirate={parcelLat && parcelLng ? detectEmirate(parcelLat, parcelLng) : "Dubai"} totalSaleableArea={sqft * unitCount} avgPricePsqft={activePricing.optimal_psf ?? 2500} totalUnits={unitCount} landCost={50000000} constructionMonths={timelineMonths} corridor={corridor} />
                <StepNav onPrev={prevStep} onNext={nextStep} nextLabel="View Scenarios →" prevLabel="← Back to Pricing" />
              </div>
            )}

            {/* STEP 5: SCENARIOS */}
            {step === 5 && (
              <div>
                <StepHeader icon={<Activity size={18} />} title="Scenario War-Gaming & Cashflow" subtitle="Price vs absorption · Payment plan timing · Launch phasing · Sensitivity analysis" />
                <div style={{ background: COLORS.surface, borderRadius: 16, border: `1px solid ${COLORS.border}`, marginBottom: 24, overflow: "hidden" }}>
                  <div style={{ padding: "16px 20px", borderBottom: `1px solid ${COLORS.border}` }}><span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>Scenario Simulator</span></div>
                  <div style={{ padding: 20 }}><ScenarioChart scenarios={scenarios} activeIndex={activeScenario} onSelect={setActiveScenario} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${COLORS.border}` }}>
                      <MiniStat label="Rev Spread" value={scenarioSummary.revenue_spread_aed} format="aed" />
                      <MiniStat label="Carry Spread" value={scenarioSummary.carry_cost_spread_aed} format="aed" />
                      <MiniStat label="Net Spread" value={scenarioSummary.net_position_spread_aed} format="aed" accent />
                      <MiniStat label="Days Spread" value={scenarioSummary.absorption_spread_days} format="days" />
                    </div>
                  </div>
                </div>
                <div style={{ background: COLORS.surface, borderRadius: 16, border: `1px solid ${COLORS.border}`, marginBottom: 24, overflow: "hidden" }}>
                  <div style={{ padding: "16px 20px", borderBottom: `1px solid ${COLORS.border}` }}><span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>Cashflow · {paymentPlan} · {timelineMonths}mo</span></div>
                  <div style={{ padding: 20 }}><CashflowChart data={cashflowData} paymentPlan={paymentPlan} /></div>
                </div>
                <div style={{ background: COLORS.surface, borderRadius: 16, border: `1px solid ${COLORS.border}`, marginBottom: 24, overflow: "hidden" }}>
                  <div style={{ padding: "16px 20px", borderBottom: `1px solid ${COLORS.border}` }}><span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>Scenario War-Gaming Table</span></div>
                  <div style={{ padding: 20 }}><ScenarioTable scenarios={scenarios} recommendedScenario={scenarioSummary.best_net_scenario} /></div>
                </div>
                <div style={{ background: COLORS.surface, borderRadius: 16, border: `1px solid ${COLORS.border}`, marginBottom: 24, padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}><Sliders size={14} color={COLORS.gold} /><span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>What-If Impact Analysis</span></div>
                  <SensitivitySliders basePricePsqft={activePricing.optimal_psf ?? 2500} totalSaleableArea={sqft * unitCount} totalUnits={unitCount} avgUnitSize={sqft} landCost={50000000} constructionMonths={timelineMonths} />
                </div>
                <div style={{ background: COLORS.surface, borderRadius: 16, border: `1px solid ${COLORS.border}`, marginBottom: 24, padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}><Rocket size={14} color={COLORS.gold} /><span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>Launch Phasing Strategy</span></div>
                  <LaunchPhasingPanel basePricePsqft={activePricing.optimal_psf ?? 2500} totalUnits={unitCount} avgUnitSize={sqft} corridor={corridor} />
                </div>
                <StepNav onPrev={prevStep} onNext={nextStep} nextLabel="Generate GTM Strategy →" prevLabel="← Back to Finance" />
              </div>
            )}

            {/* STEP 6: GTM */}
            {step === 6 && (
              <div>
                <StepHeader icon={<Brain size={18} />} title="Go-To-Market Strategy" subtitle="McKinsey-grade boardroom narrative · Buyer persona · Launch phasing" />
                <GTMPanel narrative={gtmNarrative} loading={gtmLoading} onRefresh={() => { setGtmGenerated(false); fetchGTM(); }} structuredOutput={structuredOutput} projectName={projectName}
                  pricingData={{ floor_psf: activePricing.floor_psf, optimal_psf: activePricing.optimal_psf, ceiling_psf: activePricing.ceiling_psf, estimated_unit_price: activePricing.estimated_unit_price, confidence: basePricing.data_confidence }}
                  scenarioData={scenarios} cashflowSummary={cashflowSummary} />
                <StepNav onPrev={prevStep} prevLabel="← Back to Scenarios" hideNext />
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function StepHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  const COLORS = { gold: "#C9A961", text: "#1A1A1A", textBody: "#4B5563" };
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ color: COLORS.gold }}>{icon}</div>
        <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.2em", color: COLORS.gold, fontWeight: 600 }}>Step</span>
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: COLORS.text, letterSpacing: "-0.02em", marginBottom: 8, margin: 0 }}>{title}</h1>
      <p style={{ fontSize: 14, color: COLORS.textBody, maxWidth: 600, margin: 0 }}>{subtitle}</p>
    </motion.div>
  );
}

function StepNav({ onPrev, onNext, nextLabel, prevLabel, hideNext }: { onPrev?: () => void; onNext?: () => void; nextLabel?: string; prevLabel?: string; hideNext?: boolean }) {
  const COLORS = { border: "#E8EAED", textMuted: "#9CA3AF", gold: "#C9A961", text: "#1A1A1A" };
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32, paddingTop: 24, borderTop: `1px solid ${COLORS.border}` }}>
      {onPrev && <button onClick={onPrev} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 500, background: "#fff", border: `1px solid ${COLORS.border}`, color: COLORS.textMuted, cursor: "pointer" }}><ChevronLeft size={16} />{prevLabel || "Back"}</button>}
      {!hideNext && onNext && <button onClick={onNext} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 10, fontSize: 13, fontWeight: 600, background: COLORS.gold, color: "#fff", border: "none", cursor: "pointer", marginLeft: "auto" }}>{nextLabel || "Continue"}<ChevronRight size={16} /></button>}
    </div>
  );
}

function SpecField({ label, value, onChange, type }: { label: string; value: string; onChange: (v: string) => void; type: string }) {
  const C = { textMuted: "#9CA3AF", text: "#1A1A1A", border: "#E8EAED", surfaceAlt: "#F8F9FB", gold: "#C9A961" };
  return <div><label style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.textMuted, marginBottom: 6, display: "block" }}>{label}</label><input type={type} value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500, outline: "none", border: `1px solid ${C.border}`, background: C.surfaceAlt, color: C.text }} onFocus={e => e.target.style.borderColor = C.gold} onBlur={e => e.target.style.borderColor = C.border} /></div>;
}

function SpecSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  const C = { textMuted: "#9CA3AF", text: "#1A1A1A", border: "#E8EAED", surfaceAlt: "#F8F9FB", gold: "#C9A961" };
  return <div><label style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.textMuted, marginBottom: 6, display: "block" }}>{label}</label><select value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500, outline: "none", border: `1px solid ${C.border}`, background: C.surfaceAlt, color: C.text, cursor: "pointer" }} onFocus={e => e.target.style.borderColor = C.gold} onBlur={e => e.target.style.borderColor = C.border}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>;
}

function MiniStat({ label, value, format, accent }: { label: string; value: number | null; format: "aed" | "days"; accent?: boolean }) {
  const C = { textMuted: "#9CA3AF", text: "#1A1A1A", gold: "#C9A961" };
  return <div><div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.textMuted, marginBottom: 4 }}>{label}</div><div style={{ fontSize: 16, fontWeight: 600, color: accent ? C.gold : C.text }}>{value != null ? <AnimatedCounter value={value} format={format} duration={0.7} /> : <span style={{ color: C.textMuted }}>—</span>}</div></div>;
}
