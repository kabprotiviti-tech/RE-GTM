/**
 * Launch Phasing Module — the CEO's pricing strategy
 *
 * Real developers don't sell all units at one price. They phase the launch:
 * - Phase 1 (Launch): 20% of units at entry price — build momentum
 * - Phase 2 (Activation 1): 30% at +5-8% — leverage FOMO
 * - Phase 3 (Activation 2): 30% at +10-15% — premium tier
 * - Phase 4 (Final Release): 20% at +18-25% — price realization
 *
 * Each phase has:
 * - Different pricing (escalating)
 * - Different buyer targeting
 * - Different cashflow timing
 * - Different absorption rate (velocity decreases as price increases)
 */

export interface LaunchPhase {
  phase: number;
  name: string;
  description: string;
  unitsReleased: number; // number of units
  unitsPct: number; // % of total
  pricePsqft: number; // AED/sqft at this phase
  priceIncreasePct: number; // % increase from base
  absorptionMonths: number; // months to sell this phase
  unitsPerMonth: number; // absorption velocity
  revenue: number; // total revenue from this phase
  cumulativeRevenue: number; // running total
  cumulativeUnitsSold: number;
  targetBuyer: string;
  marketingStrategy: string;
  riskNote: string;
}

export interface PhasingResult {
  phases: LaunchPhase[];
  totalRevenue: number;
  totalUnits: number;
  totalSelloutMonths: number;
  avgPricePsqft: number;
  priceRealizationPct: number; // how much more the last phase costs vs first
  blendedMargin: number;
  cashflowTiming: {
    phase1Revenue: number;
    phase2Revenue: number;
    phase3Revenue: number;
    phase4Revenue: number;
    frontLoadedPct: number; // % of revenue collected in first 2 phases
  };
}

export function calculateLaunchPhasing(
  basePricePsqft: number,
  totalUnits: number,
  avgUnitSize: number,
  corridorAbsorptionRate: number // units per month for the corridor
): PhasingResult {
  // Phase configuration: % of units, price increase, absorption velocity factor
  const phaseConfig = [
    {
      phase: 1,
      name: "Launch Phase",
      description: "Entry pricing to build momentum and broker interest",
      unitsPct: 0.20,
      priceIncreasePct: 0, // base price
      velocityFactor: 1.3, // 30% faster than average (FOMO + broker push)
      targetBuyer: "Off-Plan Flippers + Early Investors",
      marketingStrategy: "Broker preview events, early-bird pricing, limited inventory FOMO",
      riskNote: "If phase 1 doesn't sell out in 3 months, reduce phase 2 price increase",
    },
    {
      phase: 2,
      name: "Activation 1",
      description: "First price increase — leverage phase 1 momentum",
      unitsPct: 0.30,
      priceIncreasePct: 7, // +7% from base
      velocityFactor: 1.0, // normal velocity
      targetBuyer: "Gulf Investors + End-Users",
      marketingStrategy: "Phase 1 sellout announcement, 'last chance at this price' messaging, targeted digital ads",
      riskNote: "Monitor absorption — if slower than 10 units/month, hold pricing",
    },
    {
      phase: 3,
      name: "Activation 2",
      description: "Premium pricing tier — construction visible progress",
      unitsPct: 0.30,
      priceIncreasePct: 14, // +14% from base
      velocityFactor: 0.75, // 25% slower (higher price = fewer buyers)
      targetBuyer: "End-Users + Wealth Preservation",
      marketingStrategy: "Construction progress updates, virtual tours, showroom visits, mortgage partnerships",
      riskNote: "Price sensitivity increases — ensure value proposition is clear",
    },
    {
      phase: 4,
      name: "Final Release",
      description: "Price realization — premium units, near-handover",
      unitsPct: 0.20,
      priceIncreasePct: 22, // +22% from base
      velocityFactor: 0.5, // 50% slower (highest price, near completion)
      targetBuyer: "Wealth Preservation + Late End-Users",
      marketingStrategy: "Handover countdown, ready-to-move-in positioning, premium unit types (penthouse, high-floor)",
      riskNote: "These units may carry into post-handover period — budget for 6-12 months carry cost",
    },
  ];

  const phases: LaunchPhase[] = [];
  let cumulativeRevenue = 0;
  let cumulativeUnitsSold = 0;
  let totalSelloutMonths = 0;
  let totalRevenue = 0;

  for (const config of phaseConfig) {
    const unitsReleased = Math.round(totalUnits * config.unitsPct);
    const pricePsqft = Math.round(basePricePsqft * (1 + config.priceIncreasePct / 100));
    const unitsPerMonth = Math.max(1, Math.round(corridorAbsorptionRate * config.velocityFactor));
    const absorptionMonths = Math.ceil(unitsReleased / unitsPerMonth);
    const phaseRevenue = unitsReleased * avgUnitSize * pricePsqft;

    cumulativeRevenue += phaseRevenue;
    cumulativeUnitsSold += unitsReleased;
    totalSelloutMonths += absorptionMonths;
    totalRevenue += phaseRevenue;

    phases.push({
      phase: config.phase,
      name: config.name,
      description: config.description,
      unitsReleased,
      unitsPct: Math.round(config.unitsPct * 100),
      pricePsqft,
      priceIncreasePct: config.priceIncreasePct,
      absorptionMonths,
      unitsPerMonth,
      revenue: Math.round(phaseRevenue),
      cumulativeRevenue: Math.round(cumulativeRevenue),
      cumulativeUnitsSold,
      targetBuyer: config.targetBuyer,
      marketingStrategy: config.marketingStrategy,
      riskNote: config.riskNote,
    });
  }

  const avgPricePsqft = Math.round(totalRevenue / (totalUnits * avgUnitSize));
  const priceRealizationPct = phases[3].priceIncreasePct - phases[0].priceIncreasePct;
  const frontLoadedPct = Math.round(((phases[0].revenue + phases[1].revenue) / totalRevenue) * 100);

  // Blended margin: assumes 40% cost ratio (land + construction + soft costs)
  const totalCost = totalRevenue * 0.55; // 55% cost → 45% margin
  const blendedMargin = Math.round(((totalRevenue - totalCost) / totalRevenue) * 100);

  return {
    phases,
    totalRevenue: Math.round(totalRevenue),
    totalUnits,
    totalSelloutMonths,
    avgPricePsqft,
    priceRealizationPct,
    blendedMargin,
    cashflowTiming: {
      phase1Revenue: phases[0].revenue,
      phase2Revenue: phases[1].revenue,
      phase3Revenue: phases[2].revenue,
      phase4Revenue: phases[3].revenue,
      frontLoadedPct,
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
