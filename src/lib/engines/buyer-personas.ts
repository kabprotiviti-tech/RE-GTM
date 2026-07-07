/**
 * Buyer Persona Module — McKinsey-grade demographic analysis
 *
 * 4 detailed personas with income brackets, nationality mix, investment vs
 * end-user split, payment plan preferences, and view premiums they'll pay for.
 * Based on actual DLD buyer transaction data patterns for Dubai Marina.
 */

export interface BuyerPersona {
  id: string;
  name: string;
  archetype: string;
  segment: "Investor" | "End-User" | "Flipper" | "Wealth Preservation";
  share: number; // % of typical buyer mix for Marina towers
  demographics: {
    ageRange: string;
    nationalities: string[];
    incomeBracket: string;
    netWorth: string;
  };
  preferences: {
    unitType: string;
    viewPriority: string[];
    paymentPlanPreference: string;
    maxBudget: string;
    decisionFactors: string[];
  };
  behavior: {
    averageHoldPeriod: string;
    expectedROI: string;
    financingType: string;
    brokerDependency: "High" | "Medium" | "Low";
  };
  willingnessToPay: {
    marinaView: number; // AED/sqft premium they'll pay
    seaView: number;
    highFloor: number;
    brandDeveloper: number;
  };
}

export const BUYER_PERSONAS: BuyerPersona[] = [
  {
    id: "p1",
    name: "The Gulf Investor",
    archetype: "Diversified wealth, seeking rental yield + capital appreciation",
    segment: "Investor",
    share: 35,
    demographics: {
      ageRange: "38-55",
      nationalities: ["Saudi", "Kuwaiti", "Qatari", "Emirati"],
      incomeBracket: "AED 1.5M - 5M / year",
      netWorth: "AED 15M - 80M",
    },
    preferences: {
      unitType: "2BR / 3BR",
      viewPriority: ["Full Marina", "Sea", "Palm View"],
      paymentPlanPreference: "60/40 or 70/30 (front-loaded for faster handover)",
      maxBudget: "AED 8M - 15M per unit",
      decisionFactors: ["Rental yield (target 6-8%)", "Developer track record", "Exit liquidity", "Payment plan flexibility"],
    },
    behavior: {
      averageHoldPeriod: "5-7 years",
      expectedROI: "7-9% net yield + 5-8% capital growth",
      financingType: "Cash (70%) / Bank finance (30%)",
      brokerDependency: "Medium",
    },
    willingnessToPay: {
      marinaView: 250,
      seaView: 350,
      highFloor: 120,
      brandDeveloper: 200,
    },
  },
  {
    id: "p2",
    name: "The Expat End-User",
    archetype: "Senior professional, primary residence, lifestyle-driven",
    segment: "End-User",
    share: 30,
    demographics: {
      ageRange: "32-48",
      nationalities: ["British", "Indian", "European", "Lebanese"],
      incomeBracket: "AED 600K - 1.8M / year",
      netWorth: "AED 3M - 12M",
    },
    preferences: {
      unitType: "2BR (family) / 1BR (single)",
      viewPriority: ["Marina", "Sea", "Burj View"],
      paymentPlanPreference: "50/50 or 60/40 (balanced for salary-based payments)",
      maxBudget: "AED 3M - 7M per unit",
      decisionFactors: ["Proximity to metro/schools", "View quality", "Community amenities", "Handover timeline"],
    },
    behavior: {
      averageHoldPeriod: "8-12 years (primary residence)",
      expectedROI: "N/A (lifestyle purchase, not investment)",
      financingType: "Mortgage (80%) / Cash (20%)",
      brokerDependency: "High",
    },
    willingnessToPay: {
      marinaView: 180,
      seaView: 280,
      highFloor: 90,
      brandDeveloper: 150,
    },
  },
  {
    id: "p3",
    name: "The Off-Plan Flipper",
    archetype: "Short-term capital gain, pre-handover exit strategy",
    segment: "Flipper",
    share: 20,
    demographics: {
      ageRange: "28-42",
      nationalities: ["Indian", "Pakistani", "Chinese", "Russian"],
      incomeBracket: "AED 400K - 1.2M / year",
      netWorth: "AED 2M - 8M",
    },
    preferences: {
      unitType: "1BR / Studio (lower entry cost)",
      viewPriority: ["Any water view", "High floor"],
      paymentPlanPreference: "70/30 or 80/20 (maximum leverage, minimal upfront)",
      maxBudget: "AED 1.5M - 3.5M per unit",
      decisionFactors: ["Pre-handover premium potential", "Developer brand (resale liquidity)", "Payment plan structure", "Market timing"],
    },
    behavior: {
      averageHoldPeriod: "18-30 months (pre-handover flip)",
      expectedROI: "15-25% on invested capital (pre-handover)",
      financingType: "Cash (90%) — no mortgage for flips",
      brokerDependency: "Low (direct from developer)",
    },
    willingnessToPay: {
      marinaView: 200,
      seaView: 300,
      highFloor: 150,
      brandDeveloper: 250,
    },
  },
  {
    id: "p4",
    name: "The Wealth Preservation Buyer",
    archetype: "HNW, safe-haven capital allocation, long-term hold",
    segment: "Wealth Preservation",
    share: 15,
    demographics: {
      ageRange: "45-65",
      nationalities: ["Russian", "Chinese", "European HNW", "African HNW"],
      incomeBracket: "AED 5M+ / year",
      netWorth: "AED 30M - 200M+",
    },
    preferences: {
      unitType: "3BR / Penthouse / Villa",
      viewPriority: ["Full Sea", "Palm View", "Private"],
      paymentPlanPreference: "50/50 or cash purchase",
      maxBudget: "AED 15M - 50M+ per unit",
      decisionFactors: ["Capital safety", "Golden Visa eligibility", "Privacy & exclusivity", "Currency hedge"],
    },
    behavior: {
      averageHoldPeriod: "10+ years (wealth transfer vehicle)",
      expectedROI: "3-5% yield + inflation hedge",
      financingType: "Cash (95%)",
      brokerDependency: "Low (private banker / family office)",
    },
    willingnessToPay: {
      marinaView: 300,
      seaView: 500,
      highFloor: 200,
      brandDeveloper: 350,
    },
  },
];

// Calculate the weighted average willingness-to-pay across all personas
export function getWeightedWillingnessToPay() {
  const totalShare = BUYER_PERSONAS.reduce((s, p) => s + p.share, 0);
  const result = { marinaView: 0, seaView: 0, highFloor: 0, brandDeveloper: 0 };
  for (const p of BUYER_PERSONAS) {
    result.marinaView += (p.willingnessToPay.marinaView * p.share) / totalShare;
    result.seaView += (p.willingnessToPay.seaView * p.share) / totalShare;
    result.highFloor += (p.willingnessToPay.highFloor * p.share) / totalShare;
    result.brandDeveloper += (p.willingnessToPay.brandDeveloper * p.share) / totalShare;
  }
  return {
    marinaView: Math.round(result.marinaView),
    seaView: Math.round(result.seaView),
    highFloor: Math.round(result.highFloor),
    brandDeveloper: Math.round(result.brandDeveloper),
  };
}
