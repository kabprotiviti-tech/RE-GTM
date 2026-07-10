/**
 * Configurable Launch Phasing Engine
 *
 * Phases are user-defined — add/remove/edit each phase.
 * The engine recalculates revenue, absorption, and cumulative metrics
 * whenever the phase configuration changes.
 */

export interface PhaseConfig {
  id: string;
  name: string;
  unitsPct: number; // % of total units (must sum to 100)
  priceIncreasePct: number; // % increase from base
  velocityFactor: number; // 1.0 = normal, 1.3 = 30% faster, 0.7 = 30% slower
  targetBuyer: string;
  marketingStrategy: string;
}

export interface PhaseResult extends PhaseConfig {
  unitsReleased: number;
  pricePsqft: number;
  absorptionMonths: number;
  unitsPerMonth: number;
  revenue: number;
  cumulativeRevenue: number;
  cumulativeUnitsSold: number;
}

export interface PhasingResult {
  phases: PhaseResult[];
  totalRevenue: number;
  totalUnits: number;
  totalSelloutMonths: number;
  avgPricePsqft: number;
  priceRealizationPct: number;
  blendedMargin: number;
  unitsPctTotal: number; // should be 100
  cashflowTiming: {
    frontLoadedPct: number;
    phaseRevenues: number[];
  };
}

// Default 4-phase configuration
export const DEFAULT_PHASES: PhaseConfig[] = [
  {
    id: "phase-1",
    name: "Launch",
    unitsPct: 20,
    priceIncreasePct: 0,
    velocityFactor: 1.3,
    targetBuyer: "Off-Plan Flippers + Early Investors",
    marketingStrategy: "Broker preview events, early-bird pricing, limited inventory FOMO",
  },
  {
    id: "phase-2",
    name: "Activation 1",
    unitsPct: 30,
    priceIncreasePct: 7,
    velocityFactor: 1.0,
    targetBuyer: "Gulf Investors + End-Users",
    marketingStrategy: "Phase 1 sellout announcement, 'last chance at this price' messaging",
  },
  {
    id: "phase-3",
    name: "Activation 2",
    unitsPct: 30,
    priceIncreasePct: 14,
    velocityFactor: 0.75,
    targetBuyer: "End-Users + Wealth Preservation",
    marketingStrategy: "Construction progress updates, virtual tours, showroom visits",
  },
  {
    id: "phase-4",
    name: "Final Release",
    unitsPct: 20,
    priceIncreasePct: 22,
    velocityFactor: 0.5,
    targetBuyer: "Wealth Preservation + Late End-Users",
    marketingStrategy: "Handover countdown, ready-to-move-in positioning, premium units",
  },
];

export function calculateLaunchPhasing(
  phases: PhaseConfig[],
  basePricePsqft: number,
  totalUnits: number,
  avgUnitSize: number,
  corridorAbsorptionRate: number
): PhasingResult {
  const results: PhaseResult[] = [];
  let cumulativeRevenue = 0;
  let cumulativeUnitsSold = 0;
  let totalSelloutMonths = 0;
  let totalRevenue = 0;
  let unitsPctTotal = 0;

  for (const config of phases) {
    const unitsReleased = Math.round(totalUnits * (config.unitsPct / 100));
    const pricePsqft = Math.round(basePricePsqft * (1 + config.priceIncreasePct / 100));
    const unitsPerMonth = Math.max(1, Math.round(corridorAbsorptionRate * config.velocityFactor));
    const absorptionMonths = unitsReleased > 0 ? Math.ceil(unitsReleased / unitsPerMonth) : 0;
    const phaseRevenue = unitsReleased * avgUnitSize * pricePsqft;

    cumulativeRevenue += phaseRevenue;
    cumulativeUnitsSold += unitsReleased;
    totalSelloutMonths += absorptionMonths;
    totalRevenue += phaseRevenue;
    unitsPctTotal += config.unitsPct;

    results.push({
      ...config,
      unitsReleased,
      pricePsqft,
      absorptionMonths,
      unitsPerMonth,
      revenue: Math.round(phaseRevenue),
      cumulativeRevenue: Math.round(cumulativeRevenue),
      cumulativeUnitsSold,
    });
  }

  const totalSaleableArea = totalUnits * avgUnitSize;
  const avgPricePsqft = totalSaleableArea > 0 ? Math.round(totalRevenue / totalSaleableArea) : 0;
  const priceRealizationPct = phases.length >= 2
    ? phases[phases.length - 1].priceIncreasePct - phases[0].priceIncreasePct
    : 0;
  const frontLoadedPct = results.length >= 2
    ? Math.round(((results[0].revenue + results[1].revenue) / Math.max(totalRevenue, 1)) * 100)
    : 100;

  // Blended margin: 55% cost → 45% margin
  const totalCost = totalRevenue * 0.55;
  const blendedMargin = totalRevenue > 0 ? Math.round(((totalRevenue - totalCost) / totalRevenue) * 100) : 0;

  return {
    phases: results,
    totalRevenue: Math.round(totalRevenue),
    totalUnits,
    totalSelloutMonths,
    avgPricePsqft,
    priceRealizationPct,
    blendedMargin,
    unitsPctTotal,
    cashflowTiming: {
      frontLoadedPct,
      phaseRevenues: results.map((r) => r.revenue),
    },
  };
}

// GCC Construction Cost Benchmarks by quality tier
export const GCC_CONSTRUCTION_COSTS = {
  budget: {
    label: "Budget (Mass Market)",
    costPsqft: 950,
    gfaRatio: 1.25,
    softCostPct: 0.10,
    marketingPct: 0.03,
    financePct: 0.06,
    description: "Standard finishes, basic amenities, no premium materials",
    exampleDevelopers: "Damac, Binghatti, Azizi",
    exampleProjects: "JVC, Dubai South, Arjan",
  },
  standard: {
    label: "Standard (Mid-Market)",
    costPsqft: 1250,
    gfaRatio: 1.30,
    softCostPct: 0.12,
    marketingPct: 0.04,
    financePct: 0.07,
    description: "Good quality finishes, standard amenities (pool, gym), decent specs",
    exampleDevelopers: "Nakheel, Sobha, Ellington",
    exampleProjects: "JLT, Business Bay, Dubai Hills",
  },
  premium: {
    label: "Premium (Luxury)",
    costPsqft: 1650,
    gfaRatio: 1.35,
    softCostPct: 0.14,
    marketingPct: 0.05,
    financePct: 0.08,
    description: "Premium finishes, branded amenities, smart home, designer interiors",
    exampleDevelopers: "Emaar, Meraas, Select Group",
    exampleProjects: "Marina, Downtown, Emaar Beachfront",
  },
  ultraLuxury: {
    label: "Ultra-Luxury (Super Prime)",
    costPsqft: 2300,
    gfaRatio: 1.40,
    softCostPct: 0.16,
    marketingPct: 0.06,
    financePct: 0.09,
    description: "Hotel-brand residences, imported marble, private pools, butler service",
    exampleDevelopers: "Select Group (Six Senses), Kerzner, Bugatti",
    exampleProjects: "Palm Jumeirah, Bluewaters, Saadiyat",
  },
  superLuxury: {
    label: "Super-Luxury (Bespoke)",
    costPsqft: 3200,
    gfaRatio: 1.45,
    softCostPct: 0.18,
    marketingPct: 0.07,
    financePct: 0.10,
    description: "Private elevators, bespoke design, ultra-premium materials, private beach",
    exampleDevelopers: "Omniyat, Prestige One, custom",
    exampleProjects: "Palm Crown, Burj Khalifa penthouses, Saadiyat Grove",
  },
};

// Realistic corridor absorption rates (units per month for a 200-unit tower)
export const CORRIDOR_ABSORPTION_RATES: Record<string, { fast: number; average: number; slow: number }> = {
  "Dubai Marina": { fast: 25, average: 15, slow: 8 },
  "JBR / Bluewaters": { fast: 20, average: 12, slow: 6 },
  "Downtown Dubai": { fast: 22, average: 14, slow: 7 },
  "Business Bay": { fast: 18, average: 12, slow: 6 },
  "JLT": { fast: 15, average: 10, slow: 5 },
  "Palm Jumeirah": { fast: 12, average: 7, slow: 4 },
  "Dubai Hills": { fast: 18, average: 12, slow: 6 },
  "JVC": { fast: 20, average: 14, slow: 8 },
  "Dubai Creek Harbour": { fast: 22, average: 14, slow: 7 },
  "Emaar Beachfront": { fast: 30, average: 20, slow: 10 },
  "Dubai South": { fast: 25, average: 18, slow: 10 },
  "Jebel Ali": { fast: 15, average: 10, slow: 5 },
  "Saadiyat Island": { fast: 18, average: 12, slow: 6 },
  "Al Reem Island": { fast: 20, average: 14, slow: 8 },
  "Yas Island": { fast: 18, average: 12, slow: 6 },
  "Al Maryah Island": { fast: 15, average: 10, slow: 5 },
  "Al Raha Beach": { fast: 15, average: 10, slow: 5 },
};

export function getAbsorptionRate(corridor: string, scenario: "fast" | "average" | "slow" = "average"): number {
  return CORRIDOR_ABSORPTION_RATES[corridor]?.[scenario] ?? 10;
}
