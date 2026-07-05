/**
 * src/lib/engines/pricing-engine.ts
 * Project Capital Velocity — Deterministic Pricing Engine (TypeScript port)
 *
 * Faithful port of backend/pricing_engine.py. Every constant, formula, and
 * edge-case branch is preserved 1:1. The LLM is forbidden from touching any
 * value computed here — same anti-hallucination contract as the Python layer.
 */

import { MOCK_COMPS, type Comp } from "./mock-data";

// ---------------------------------------------------------------------------
// Configuration (mirrors pricing_engine.py constants exactly)
// ---------------------------------------------------------------------------

const TIER_1_DEVELOPERS = new Set([
  "emaar properties",
  "select group",
  "meraas",
  "damac properties",
  "aldar properties",
  "nakheel",
  "sobha realty",
]);

const CONFIDENCE_HIGH_MIN_COMPS = 5;
const CONFIDENCE_MEDIUM_MIN_COMPS = 3;

const FLOOR_MULTIPLIER = 0.96;
const OPTIMAL_MULTIPLIER = 1.03;
const CEILING_MULTIPLIER = 1.12;

const WEIGHT_ABSORPTION = 0.6;
const WEIGHT_AMENITY = 0.4;

const TIER_1_BRAND_PREMIUM = 0.05;
const TIER_2_BRAND_PREMIUM = 0.0;

const FLOOR_PREMIUM_DIVISOR = 1000.0;

const MICRO_VIEW_MODIFIERS: Record<string, number> = {
  "full marina": 0.08,
  internal: -0.05,
};
const MICRO_VIEW_DEFAULT_MODIFIER = 0.0;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PricingInput {
  unit_type: string;
  view: string;
  developer?: string;
  developer_tier?: number;
}

export interface BasePricingResult {
  floor_psf: number | null;
  optimal_psf: number | null;
  ceiling_psf: number | null;
  weighted_base_psf: number | null;
  raw_weighted_base_psf: number | null;
  brand_multiplier_pct: number | null;
  data_confidence: "High" | "Medium" | "Low" | "None";
  comp_count: number;
  comps_used: string[];
  filter_signature: { unit_type: string; view: string };
  note?: string;
}

export interface MicroAdjustInput {
  unit_type: string;
  view: string; // micro view: "Full Marina" | "Internal" | other
  floor_number: number;
  sqft?: number;
  developer?: string;
  developer_tier?: number;
}

export interface MicroAdjustResult {
  unit_type: string;
  view: string;
  floor: number;
  final_floor_psf: number | null;
  final_optimal_psf: number | null;
  final_ceiling_psf: number | null;
  estimated_unit_price: number | null;
  floor_premium_pct: number | null;
  micro_view_modifier_pct: number | null;
  combined_adjustment_pct: number | null;
  base_data_confidence: string;
  base_comps_used: string[];
  note?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveBrandMultiplier(input: {
  developer?: string;
  developer_tier?: number;
}): number {
  let isTier1 = false;
  if (input.developer_tier === 1) isTier1 = true;
  if (input.developer && TIER_1_DEVELOPERS.has(input.developer.toLowerCase())) {
    isTier1 = true;
  }
  return isTier1 ? TIER_1_BRAND_PREMIUM : TIER_2_BRAND_PREMIUM;
}

function classifyConfidence(compCount: number): BasePricingResult["data_confidence"] {
  if (compCount >= CONFIDENCE_HIGH_MIN_COMPS) return "High";
  if (compCount >= CONFIDENCE_MEDIUM_MIN_COMPS) return "Medium";
  return "Low";
}

function weightedBasePsf(comps: Comp[]): number {
  if (comps.length === 0) return 0;
  if (comps.length === 1) return comps[0].base_psf;

  const days = comps.map((c) => c.absorption_days_50pct);
  const amenity = comps.map((c) => c.amenity_score);
  const psf = comps.map((c) => c.base_psf);

  const dMin = Math.min(...days);
  const dMax = Math.max(...days);
  const absorptionNorm =
    dMax - dMin < 1e-9
      ? days.map(() => 0.5)
      : days.map((d) => (dMax - d) / (dMax - dMin));

  const aMin = Math.min(...amenity);
  const aMax = Math.max(...amenity);
  const amenityNorm =
    aMax - aMin < 1e-9
      ? amenity.map(() => 0.5)
      : amenity.map((a) => (a - aMin) / (aMax - aMin));

  const combined = absorptionNorm.map(
    (a, i) => WEIGHT_ABSORPTION * a + WEIGHT_AMENITY * amenityNorm[i]
  );

  const total = combined.reduce((s, v) => s + v, 0);
  if (total < 1e-9) {
    return psf.reduce((s, v) => s + v, 0) / psf.length;
  }

  const weights = combined.map((c) => c / total);
  return weights.reduce((s, w, i) => s + w * psf[i], 0);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function calculateBasePricing(input: PricingInput): BasePricingResult {
  const unitType = input.unit_type.trim().toUpperCase();
  const view = input.view.trim();

  if (!unitType || !view) {
    throw new Error(
      `input requires unit_type and view. Got: ${unitType}, ${view}`
    );
  }

  const filterSignature = { unit_type: unitType, view };

  const filtered = MOCK_COMPS.filter(
    (c) => c.unit_type === unitType && c.view === view
  );
  const compCount = filtered.length;
  const compsUsed = filtered.map((c) => c.comp_id);

  if (compCount === 0) {
    return {
      floor_psf: null,
      optimal_psf: null,
      ceiling_psf: null,
      weighted_base_psf: null,
      raw_weighted_base_psf: null,
      brand_multiplier_pct: null,
      data_confidence: "None",
      comp_count: 0,
      comps_used: [],
      filter_signature: filterSignature,
      note: "No comparables matched filter. UI must render [DATA MISSING].",
    };
  }

  const rawWeighted = weightedBasePsf(filtered);
  const brandPremium = resolveBrandMultiplier(input);
  const brandAdjustedBase = rawWeighted * (1 + brandPremium);

  return {
    floor_psf: Math.round(brandAdjustedBase * FLOOR_MULTIPLIER * 100) / 100,
    optimal_psf: Math.round(brandAdjustedBase * OPTIMAL_MULTIPLIER * 100) / 100,
    ceiling_psf: Math.round(brandAdjustedBase * CEILING_MULTIPLIER * 100) / 100,
    weighted_base_psf: Math.round(brandAdjustedBase * 100) / 100,
    raw_weighted_base_psf: Math.round(rawWeighted * 100) / 100,
    brand_multiplier_pct: Math.round(brandPremium * 10000) / 100,
    data_confidence: classifyConfidence(compCount),
    comp_count: compCount,
    comps_used: compsUsed,
    filter_signature: filterSignature,
  };
}

export function applyMicroAdjustments(
  basePricing: BasePricingResult,
  input: MicroAdjustInput
): MicroAdjustResult {
  const unitType = input.unit_type.trim().toUpperCase();
  const microView = input.view.trim();
  const floorNumber = input.floor_number;

  if (!unitType || !microView) {
    throw new Error("input requires unit_type and view");
  }
  if (floorNumber == null || floorNumber < 0) {
    throw new Error("floor_number must be >= 0");
  }

  // Propagate no-match
  if (basePricing.optimal_psf == null) {
    return {
      unit_type: unitType,
      view: microView,
      floor: floorNumber,
      final_floor_psf: null,
      final_optimal_psf: null,
      final_ceiling_psf: null,
      estimated_unit_price: null,
      floor_premium_pct: null,
      micro_view_modifier_pct: null,
      combined_adjustment_pct: null,
      base_data_confidence: basePricing.data_confidence,
      base_comps_used: basePricing.comps_used,
      note: "Phase 2 returned no comps. UI must render [DATA MISSING].",
    };
  }

  const floorPremiumFrac = floorNumber / FLOOR_PREMIUM_DIVISOR;
  const floorMultiplier = 1 + floorPremiumFrac;

  const microViewFrac =
    MICRO_VIEW_MODIFIERS[microView.toLowerCase()] ?? MICRO_VIEW_DEFAULT_MODIFIER;
  const viewMultiplier = 1 + microViewFrac;

  const combinedMultiplier = floorMultiplier * viewMultiplier;
  const finalFloorPsf = Math.round(basePricing.floor_psf! * combinedMultiplier * 100) / 100;
  const finalOptimalPsf = Math.round(basePricing.optimal_psf! * combinedMultiplier * 100) / 100;
  const finalCeilingPsf = Math.round(basePricing.ceiling_psf! * combinedMultiplier * 100) / 100;

  let estimatedUnitPrice: number | null = null;
  let sqftNote: string | undefined;
  if (input.sqft == null || input.sqft === 0) {
    sqftNote = "input.sqft missing. UI must render [DATA MISSING] for estimated_unit_price.";
  } else {
    estimatedUnitPrice = Math.round(finalOptimalPsf * input.sqft * 100) / 100;
  }

  const result: MicroAdjustResult = {
    unit_type: unitType,
    view: microView,
    floor: floorNumber,
    final_floor_psf: finalFloorPsf,
    final_optimal_psf: finalOptimalPsf,
    final_ceiling_psf: finalCeilingPsf,
    estimated_unit_price: estimatedUnitPrice,
    floor_premium_pct: Math.round(floorPremiumFrac * 10000) / 100,
    micro_view_modifier_pct: Math.round(microViewFrac * 10000) / 100,
    combined_adjustment_pct: Math.round((combinedMultiplier - 1) * 10000) / 100,
    base_data_confidence: basePricing.data_confidence,
    base_comps_used: basePricing.comps_used,
  };
  if (sqftNote) result.note = sqftNote;
  return result;
}

// Helper: full pipeline in one call
export function computeFullPricing(input: MicroAdjustInput): {
  base: BasePricingResult;
  micro: MicroAdjustResult;
} {
  const base = calculateBasePricing({
    unit_type: input.unit_type,
    view: input.view, // Note: for the macro filter, we pass the same view string;
    // in production, macro view (Marina/Sea/City) and micro view (Full Marina/Internal)
  // are distinct. For the prototype, we map common micro views to macro corridors.
    developer: input.developer,
    developer_tier: input.developer_tier,
  });
  const micro = applyMicroAdjustments(base, input);
  return { base, micro };
}

// Map micro view to macro corridor for the comp filter
export function microToMacroView(microView: string): "Marina" | "Sea" | "City" {
  const v = microView.toLowerCase();
  if (v.includes("marina")) return "Marina";
  if (v.includes("sea") || v.includes("full")) return "Sea";
  if (v.includes("city")) return "City";
  return "Sea"; // default to Sea for the prototype
}
