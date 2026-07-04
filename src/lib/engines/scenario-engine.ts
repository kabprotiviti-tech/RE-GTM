/**
 * src/lib/engines/scenario-engine.ts
 * TypeScript port of backend/scenario_engine.py
 */

const AGGRESSIVE_PRICE_MULT = 1.05;
const AGGRESSIVE_ABSORPTION_MULT = 1.25;
const BASE_PRICE_MULT = 1.0;
const BASE_ABSORPTION_MULT = 1.0;
const CONSERVATIVE_PRICE_MULT = 0.97;
const CONSERVATIVE_ABSORPTION_MULT = 0.8;

export interface ScenarioEntry {
  scenario_name: "Aggressive" | "Base" | "Conservative";
  price_psf: number;
  price_delta_pct: number;
  projected_absorption_days: number;
  absorption_delta_pct: number;
  total_revenue_assumption: number | null;
  total_carry_cost: number | null;
  net_position: number | null;
  base_optimal_psf: number;
  base_absorption_days: number;
}

export interface ScenarioSummary {
  revenue_spread_aed: number | null;
  revenue_spread_pct: number | null;
  carry_cost_spread_aed: number | null;
  absorption_spread_days: number | null;
  net_position_spread_aed: number | null;
  best_revenue_scenario: string | null;
  best_net_scenario: string | null;
  fastest_sell_scenario: string | null;
  note?: string;
}

export function generateScenarios(
  optimalPsf: number,
  baseAbsorptionDays: number,
  opts: {
    unit_count?: number;
    avg_sqft_per_unit?: number;
    daily_carry_cost_aed?: number;
  } = {}
): ScenarioEntry[] {
  if (typeof optimalPsf !== "number" || optimalPsf <= 0) {
    throw new Error(`optimal_psf must be > 0; got ${optimalPsf}`);
  }
  if (typeof baseAbsorptionDays !== "number" || baseAbsorptionDays <= 0) {
    throw new Error(`base_absorption_days must be > 0; got ${baseAbsorptionDays}`);
  }

  const specs: Array<[ScenarioEntry["scenario_name"], number, number]> = [
    ["Aggressive", AGGRESSIVE_PRICE_MULT, AGGRESSIVE_ABSORPTION_MULT],
    ["Base", BASE_PRICE_MULT, BASE_ABSORPTION_MULT],
    ["Conservative", CONSERVATIVE_PRICE_MULT, CONSERVATIVE_ABSORPTION_MULT],
  ];

  return specs.map(([name, pMult, aMult]) => {
    const pricePsf = Math.round(optimalPsf * pMult * 100) / 100;
    const projectedAbsorption = Math.round(baseAbsorptionDays * aMult * 100) / 100;

    let totalRevenue: number | null = null;
    if (opts.unit_count && opts.avg_sqft_per_unit && opts.unit_count > 0 && opts.avg_sqft_per_unit > 0) {
      totalRevenue = Math.round(pricePsf * opts.unit_count * opts.avg_sqft_per_unit * 100) / 100;
    }

    let totalCarry: number | null = null;
    if (opts.daily_carry_cost_aed != null && opts.daily_carry_cost_aed >= 0) {
      totalCarry = Math.round(projectedAbsorption * opts.daily_carry_cost_aed * 100) / 100;
    }

    let netPosition: number | null = null;
    if (totalRevenue != null && totalCarry != null) {
      netPosition = Math.round((totalRevenue - totalCarry) * 100) / 100;
    }

    return {
      scenario_name: name,
      price_psf: pricePsf,
      price_delta_pct: Math.round((pMult - 1) * 10000) / 100,
      projected_absorption_days: projectedAbsorption,
      absorption_delta_pct: Math.round((aMult - 1) * 10000) / 100,
      total_revenue_assumption: totalRevenue,
      total_carry_cost: totalCarry,
      net_position: netPosition,
      base_optimal_psf: Math.round(optimalPsf * 100) / 100,
      base_absorption_days: Math.round(baseAbsorptionDays * 100) / 100,
    };
  });
}

export function summarizeScenarios(scenarios: ScenarioEntry[]): ScenarioSummary {
  if (!scenarios || scenarios.length !== 3) {
    return { note: "Expected 3 scenarios", revenue_spread_aed: null, revenue_spread_pct: null, carry_cost_spread_aed: null, absorption_spread_days: null, net_position_spread_aed: null, best_revenue_scenario: null, best_net_scenario: null, fastest_sell_scenario: null };
  }

  const revenues = scenarios.map((s) => s.total_revenue_assumption);
  const carries = scenarios.map((s) => s.total_carry_cost);
  const nets = scenarios.map((s) => s.net_position);
  const absorptions = scenarios.map((s) => s.projected_absorption_days);
  const names = scenarios.map((s) => s.scenario_name);

  const allRev = revenues.every((r) => r != null);
  const allCarry = carries.every((c) => c != null);
  const allNet = nets.every((n) => n != null);

  let bestRevenueIdx = -1;
  let bestNetIdx = -1;
  let fastestIdx = -1;

  if (allRev) {
    bestRevenueIdx = revenues.reduce((max, r, i) => (r! > revenues[max]! ? i : max), 0);
  }
  if (allNet) {
    bestNetIdx = nets.reduce((max, n, i) => (n! > nets[max]! ? i : max), 0);
  }
  fastestIdx = absorptions.reduce((min, a, i) => (a < absorptions[min] ? i : min), 0);

  const baseRev = revenues[1];

  return {
    revenue_spread_aed: allRev ? Math.round((Math.max(...revenues as number[]) - Math.min(...revenues as number[])) * 100) / 100 : null,
    revenue_spread_pct: allRev && baseRev ? Math.round(((Math.max(...revenues as number[]) - Math.min(...revenues as number[])) / baseRev) * 10000) / 100 : null,
    carry_cost_spread_aed: allCarry ? Math.round((Math.max(...carries as number[]) - Math.min(...carries as number[])) * 100) / 100 : null,
    absorption_spread_days: Math.round((Math.max(...absorptions) - Math.min(...absorptions)) * 100) / 100,
    net_position_spread_aed: allNet ? Math.round((Math.max(...nets as number[]) - Math.min(...nets as number[])) * 100) / 100 : null,
    best_revenue_scenario: bestRevenueIdx >= 0 ? names[bestRevenueIdx] : null,
    best_net_scenario: bestNetIdx >= 0 ? names[bestNetIdx] : null,
    fastest_sell_scenario: names[fastestIdx],
  };
}
