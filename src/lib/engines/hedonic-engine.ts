/**
 * src/lib/engines/hedonic-engine.ts
 * Project Capital Velocity — Hedonic Pricing Engine (TypeScript port)
 *
 * EXACT port of backend/hedonic_engine.py. Implements the Phase 11 spec:
 *   Step 1: Base intercept = AED 1,800
 *   Step 2: View premium from comp set (hedonic decomposition, NOT simple average)
 *   Step 3: Reconstruct price = base + view_premium*indicator + floor_coeff*floor + amenity_coeff*amenity
 *   Step 4: floor = *0.96, ceiling = *1.12
 *
 * The critical function is calculateFeaturePremium() — it isolates the view
 * premium by computing residuals after removing base + amenity contributions,
 * then comparing premium-view vs baseline-view comp averages.
 */

import { MOCK_COMPS, type Comp } from "./mock-data";

// ---------------------------------------------------------------------------
// Configuration — locked per Phase 11 spec
// ---------------------------------------------------------------------------

export const BASE_INTERCEPT = 1800;
export const FLOOR_COEFFICIENT = 3.5;
export const AMENITY_COEFFICIENT = 45;
export const HEDONIC_FLOOR_MULTIPLIER = 0.96;
export const HEDONIC_CEILING_MULTIPLIER = 1.12;

// Micro view → macro corridor mapping (for comp matching)
const MICRO_TO_MACRO: Record<string, string> = {
  "full marina": "Marina",
  "partial marina": "Marina",
  marina: "Marina",
  sea: "Sea",
  city: "City",
  internal: "City",
};

// ---------------------------------------------------------------------------
// THE CRITICAL FUNCTION: calculateFeaturePremium
// ---------------------------------------------------------------------------

export function calculateFeaturePremium(
  comps: Comp[],
  featureName: string,
  premiumValue: string,
  baselineValue: string
): number {
  /**
   * Isolate the marginal premium of a feature value over a baseline value.
   *
   * This is NOT a simple average of PSF. It is a hedonic decomposition:
   * 1. For each comp, compute residual = base_psf - base_intercept - (amenity_coeff * amenity_score)
   * 2. Average residuals for premium-view comps
   * 3. Average residuals for baseline-view comps
   * 4. Premium = avg(premium) - avg(baseline)
   *
   * This controls for amenity score so the resulting premium is the ISOLATED
   * view effect, not a confounded average.
   */
  const premiumMacro = MICRO_TO_MACRO[premiumValue.toLowerCase()] ?? premiumValue;
  const baselineMacro = MICRO_TO_MACRO[baselineValue.toLowerCase()] ?? baselineValue;

  const computeResidual = (comp: Comp): number => {
    return comp.base_psf - BASE_INTERCEPT - AMENITY_COEFFICIENT * comp.amenity_score;
  };

  const premiumResiduals: number[] = [];
  const baselineResiduals: number[] = [];

  for (const comp of comps) {
    const compFeature = String(comp[featureName as keyof Comp] ?? "").trim();
    if (compFeature === premiumMacro) {
      premiumResiduals.push(computeResidual(comp));
    } else if (compFeature === baselineMacro) {
      baselineResiduals.push(computeResidual(comp));
    }
  }

  if (premiumResiduals.length === 0 || baselineResiduals.length === 0) {
    return 0.0;
  }

  const avgPremium = premiumResiduals.reduce((s, v) => s + v, 0) / premiumResiduals.length;
  const avgBaseline = baselineResiduals.reduce((s, v) => s + v, 0) / baselineResiduals.length;

  const premium = avgPremium - avgBaseline;
  return Math.max(0.0, premium);
}

// ---------------------------------------------------------------------------
// Helper: isMarinaView
// ---------------------------------------------------------------------------

export function isMarinaView(targetUnit: { view: string }): number {
  const view = String(targetUnit.view || "").toLowerCase();
  return view.includes("marina") ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HedonicTarget {
  floor: number;
  amenity_score: number;
  view: string;
}

export interface HedonicResult {
  floor: number;
  optimal: number;
  ceiling: number;
  calculated_psf: number;
  decomposition: {
    base_intercept: number;
    view_contribution: number;
    floor_contribution: number;
    amenity_contribution: number;
    marina_indicator: number;
  };
  view_premium: number;
  floor_coefficient: number;
  amenity_coefficient: number;
  comps_used_for_premium: {
    premium_view_comps: string[];
    baseline_view_comps: string[];
    premium_avg_residual: number;
    baseline_avg_residual: number;
  };
}

// ---------------------------------------------------------------------------
// THE MAIN FUNCTION: calculateHedonicPricing
// ---------------------------------------------------------------------------

export function calculateHedonicPricing(
  targetUnit: HedonicTarget,
  comps: Comp[] = MOCK_COMPS
): HedonicResult {
  const floor = Number(targetUnit.floor);
  const amenityScore = Number(targetUnit.amenity_score);
  const view = String(targetUnit.view).trim();

  if (isNaN(floor) || isNaN(amenityScore) || !view) {
    throw new Error(
      `targetUnit requires floor, amenity_score, and view. Got: ${JSON.stringify(targetUnit)}`
    );
  }

  // Step 1: Base intercept
  const baseIntercept = BASE_INTERCEPT;

  // Step 2: Calculate Feature Coefficients from the comp set
  const viewPremium = calculateFeaturePremium(comps, "view", "Full Marina", "City");
  const floorCoefficient = FLOOR_COEFFICIENT;
  const amenityCoefficient = AMENITY_COEFFICIENT;

  // Step 3: Reconstruct the target price deterministically
  const marinaIndicator = isMarinaView({ view });
  const viewContribution = viewPremium * marinaIndicator;
  const floorContribution = floorCoefficient * floor;
  const amenityContribution = amenityCoefficient * amenityScore;

  const calculatedPsf =
    baseIntercept +
    viewContribution +
    floorContribution +
    amenityContribution;

  // Step 4: Apply strict confidence bounds
  const floorPrice = calculatedPsf * HEDONIC_FLOOR_MULTIPLIER;
  const ceilingPrice = calculatedPsf * HEDONIC_CEILING_MULTIPLIER;

  // Audit trail
  const premiumMacro = MICRO_TO_MACRO[view.toLowerCase()] ?? view;
  const premiumComps = comps
    .filter((c) => c.view === premiumMacro)
    .map((c) => c.comp_id);
  const baselineComps = comps
    .filter((c) => c.view === "City")
    .map((c) => c.comp_id);

  const premiumResiduals = comps
    .filter((c) => c.view === premiumMacro)
    .map((c) => c.base_psf - BASE_INTERCEPT - AMENITY_COEFFICIENT * c.amenity_score);
  const baselineResiduals = comps
    .filter((c) => c.view === "City")
    .map((c) => c.base_psf - BASE_INTERCEPT - AMENITY_COEFFICIENT * c.amenity_score);

  const premiumAvgResidual =
    premiumResiduals.length > 0
      ? premiumResiduals.reduce((s, v) => s + v, 0) / premiumResiduals.length
      : 0.0;
  const baselineAvgResidual =
    baselineResiduals.length > 0
      ? baselineResiduals.reduce((s, v) => s + v, 0) / baselineResiduals.length
      : 0.0;

  return {
    floor: Math.round(floorPrice * 100) / 100,
    optimal: Math.round(calculatedPsf * 100) / 100,
    ceiling: Math.round(ceilingPrice * 100) / 100,
    calculated_psf: Math.round(calculatedPsf * 100) / 100,
    decomposition: {
      base_intercept: baseIntercept,
      view_contribution: Math.round(viewContribution * 100) / 100,
      floor_contribution: Math.round(floorContribution * 100) / 100,
      amenity_contribution: Math.round(amenityContribution * 100) / 100,
      marina_indicator: marinaIndicator,
    },
    view_premium: Math.round(viewPremium * 100) / 100,
    floor_coefficient: floorCoefficient,
    amenity_coefficient: amenityCoefficient,
    comps_used_for_premium: {
      premium_view_comps: premiumComps,
      baseline_view_comps: baselineComps,
      premium_avg_residual: Math.round(premiumAvgResidual * 100) / 100,
      baseline_avg_residual: Math.round(baselineAvgResidual * 100) / 100,
    },
  };
}
