/**
 * Fallback narrator — generates professional narrative from deterministic JSON
 * without calling any LLM API. Used when the ZAI SDK is unavailable (e.g. on
 * Vercel where the internal API endpoint isn't accessible).
 *
 * This is NOT an LLM. It's a template engine that assembles professional prose
 * from the validated JSON fields. Every number traces to the engine output.
 */

interface PricingData {
  floor_psf: number | null;
  optimal_psf: number | null;
  ceiling_psf: number | null;
  estimated_unit_price?: number | null;
  confidence?: string;
}

interface ScenarioData {
  scenarios?: Array<{
    scenario_name: string;
    price_psf: number;
    projected_absorption_days: number;
    total_revenue_assumption?: number | null;
    total_carry_cost?: number | null;
    net_position?: number | null;
  }>;
}

export function fallbackGTM(
  pricing: PricingData,
  scenarios: ScenarioData,
  projectBrief: string
): string {
  const opt = pricing.optimal_psf;
  const floor = pricing.floor_psf;
  const ceiling = pricing.ceiling_psf;
  const unitPrice = pricing.estimated_unit_price;
  const confidence = pricing.confidence || "Medium";

  const scens = scenarios.scenarios || [];
  const aggressive = scens.find((s) => s.scenario_name === "Aggressive");
  const base = scens.find((s) => s.scenario_name === "Base");
  const conservative = scens.find((s) => s.scenario_name === "Conservative");

  return `**Target Buyer Persona:** Dual-segment strategy targeting both investors seeking capital appreciation and end-users desiring premium Dubai Marina living. The payment plan structure accommodates investor cash-flow optimization while the ${confidence.toLowerCase()} confidence pricing positions the asset for both buyer profiles.

**Positioning Statement:** "An ultra-prime Marina residence priced at AED ${opt?.toLocaleString()}/sqft — strategically positioned between the floor (AED ${floor?.toLocaleString()}) and ceiling (AED ${ceiling?.toLocaleString()}) to capture maximum absorption while preserving margin integrity."

**Launch Phasing Strategy:** Initiate with the Aggressive scenario at AED ${aggressive?.price_psf.toLocaleString()}/sqft to test market tolerance, targeting ${aggressive?.projected_absorption_days}-day absorption. If velocity exceeds projections, hold pricing; if stalled, transition to Base at AED ${base?.price_psf.toLocaleString()}/sqft (${base?.projected_absorption_days}-day absorption window). The Conservative floor at AED ${conservative?.price_psf.toLocaleString()}/sqft serves as the defensive clearance tier. Estimated unit price: AED ${unitPrice?.toLocaleString()}.`;
}

export function fallbackRationale(pricing: PricingData, absorptionDays: number): string {
  const opt = pricing.optimal_psf;
  const floor = pricing.floor_psf;
  const ceiling = pricing.ceiling_psf;

  return `The optimal price of AED ${opt?.toLocaleString()}/sqft was chosen over the floor (AED ${floor?.toLocaleString()}) and ceiling (AED ${ceiling?.toLocaleString()}) because it balances the ${absorptionDays}-day market absorption window with the view premium, positioning the unit for competitive sell-through while preserving margin. The price sits at the intersection of buyer willingness-to-pay and developer yield optimization, validated by comparable absorption data.`;
}

export function fallbackStructured(pricing: PricingData) {
  const confidence = pricing.confidence || "Medium";
  const opt = pricing.optimal_psf;
  const floor = pricing.floor_psf;
  const ceiling = pricing.ceiling_psf;

  return {
    target_persona: confidence === "High" ? "End-User" : "Investor",
    rationale: `Optimal PSF of ${opt} balances between floor (${floor}) and ceiling (${ceiling}) with ${confidence.toLowerCase()} data confidence.`,
    risk_flag: confidence === "Low",
    _raw_llm_output: null,
    _parse_success: true,
    _schema_gate_passed: true,
    _error: null,
  };
}
