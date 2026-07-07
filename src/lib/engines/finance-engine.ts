/**
 * Proper IRR/NPV Financial Engine
 *
 * Enterprise-grade project finance calculations:
 * - NPV with WACC-based discount rates
 * - IRR via Newton-Raphson iteration
 * - Construction loan amortization
 * - Equity waterfall (GP/LP split, preferred returns, carry)
 * - Developer profit metrics (ROI, ROE, profit margin)
 */

export interface FinancialInputs {
  // Revenue
  totalSaleableArea: number; // sqft
  avgPricePsqft: number;
  totalUnits: number;

  // Land + Construction costs
  landCost: number;
  constructionCostPsqft: number; // AED/sqft of GFA
  gfaRatio: number; // GFA / Saleable area (typically 1.2-1.4)
  softCostPct: number; // % of construction (design, permits, consultant fees)
  marketingCostPct: number; // % of revenue
  financeCostPct: number; // % of construction cost (interest during construction)

  // Financing
  equityPct: number; // % of total cost funded by developer equity
  loanPct: number; // % funded by construction loan
  loanInterestRate: number; // annual %
  loanTenorMonths: number;

  // Timeline
  constructionMonths: number;
  salesPeriodMonths: number; // months to sell 100%

  // Discount rate
  wacc: number; // Weighted average cost of capital (%)
}

export interface FinancialOutput {
  // Revenue
  grossRevenue: number;
  netRevenue: number; // after marketing + transfer fees
  transferFees: number;

  // Costs
  totalConstructionCost: number;
  softCosts: number;
  marketingCosts: number;
  financeCosts: number;
  totalDevelopmentCost: number;
  totalCost: number; // land + construction + soft + marketing + finance

  // Profitability
  grossProfit: number;
  netProfit: number;
  profitMargin: number; // %
  roi: number; // Return on investment (%)
  roe: number; // Return on equity (%)

  // Financing
  equityInvestment: number;
  loanAmount: number;
  loanMonthlyPayment: number;
  totalInterestPaid: number;

  // NPV + IRR
  npv: number;
  irr: number; // %
  paybackMonths: number;

  // Monthly cashflow
  monthlyCashflow: CashflowRow[];

  // Equity waterfall
  waterfall: WaterfallRow[];
}

export interface CashflowRow {
  month: number;
  revenue: number;
  constructionCost: number;
  softCost: number;
  marketingCost: number;
  financeCost: number;
  landCost: number;
  netCashflow: number;
  cumulativeCashflow: number;
  discountedCashflow: number;
}

export interface WaterfallRow {
  tier: string;
  description: string;
  amount: number;
  cumulative: number;
}

export function calculateProjectFinance(inputs: FinancialInputs): FinancialOutput {
  const {
    totalSaleableArea, avgPricePsqft, totalUnits,
    landCost, constructionCostPsqft, gfaRatio, softCostPct, marketingCostPct, financeCostPct,
    equityPct, loanPct, loanInterestRate, loanTenorMonths,
    constructionMonths, salesPeriodMonths, wacc,
  } = inputs;

  // === Revenue ===
  const grossRevenue = totalSaleableArea * avgPricePsqft;
  const transferFees = grossRevenue * 0.04; // 4% DLD/DMT transfer fee
  const marketingCosts = grossRevenue * marketingCostPct;
  const netRevenue = grossRevenue - transferFees - marketingCosts;

  // === Construction costs ===
  const gfa = totalSaleableArea * gfaRatio;
  const totalConstructionCost = gfa * constructionCostPsqft;
  const softCosts = totalConstructionCost * softCostPct;
  const financeCosts = totalConstructionCost * financeCostPct;

  // === Total cost ===
  const totalDevelopmentCost = totalConstructionCost + softCosts + financeCosts;
  const totalCost = landCost + totalDevelopmentCost + marketingCosts + transferFees;

  // === Financing ===
  const equityInvestment = totalCost * equityPct;
  const loanAmount = totalCost * loanPct;

  // Loan amortization (monthly)
  const monthlyRate = loanInterestRate / 100 / 12;
  const loanMonthlyPayment = loanAmount > 0 && loanTenorMonths > 0
    ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, loanTenorMonths)) /
      (Math.pow(1 + monthlyRate, loanTenorMonths) - 1)
    : 0;
  const totalInterestPaid = loanMonthlyPayment * loanTenorMonths - loanAmount;

  // === Profitability ===
  const grossProfit = grossRevenue - landCost - totalConstructionCost;
  const netProfit = netRevenue - totalCost + transferFees; // netRevenue already deducts transfer
  const actualNetProfit = grossRevenue - totalCost;
  const profitMargin = (actualNetProfit / grossRevenue) * 100;
  const roi = (actualNetProfit / totalCost) * 100;
  const roe = (actualNetProfit / equityInvestment) * 100;

  // === Monthly cashflow ===
  const monthlyCashflow: CashflowRow[] = [];
  const constructionCostPerMonth = totalConstructionCost / constructionMonths;
  const softCostPerMonth = softCosts / constructionMonths;
  const financeCostPerMonth = financeCosts / constructionMonths;
  const revenuePerMonth = grossRevenue / salesPeriodMonths;
  const marketingPerMonth = marketingCosts / salesPeriodMonths;

  let cumulativeCashflow = -landCost; // land paid upfront
  let cumCF = -landCost;

  // Month 0: Land cost
  monthlyCashflow.push({
    month: 0,
    revenue: 0,
    constructionCost: 0,
    softCost: 0,
    marketingCost: 0,
    financeCost: 0,
    landCost: landCost,
    netCashflow: -landCost,
    cumulativeCashflow: -landCost,
    discountedCashflow: -landCost,
  });
  cumCF = -landCost;

  // Construction period: costs only (no revenue until sales start)
  for (let m = 1; m <= constructionMonths; m++) {
    const isSelling = m > constructionMonths - salesPeriodMonths; // sales start during last part of construction
    const revenue = isSelling ? revenuePerMonth : 0;
    const marketing = isSelling ? marketingPerMonth : 0;

    const net = revenue - constructionCostPerMonth - softCostPerMonth - financeCostPerMonth - marketing;
    cumCF += net;

    const discountFactor = Math.pow(1 + wacc / 100, m / 12);
    monthlyCashflow.push({
      month: m,
      revenue,
      constructionCost: constructionCostPerMonth,
      softCost: softCostPerMonth,
      marketingCost: marketing,
      financeCost: financeCostPerMonth,
      landCost: 0,
      netCashflow: net,
      cumulativeCashflow: cumCF,
      discountedCashflow: net / discountFactor,
    });
  }

  // Post-construction: revenue only (remaining sales)
  const remainingSalesMonths = Math.max(0, salesPeriodMonths - (constructionMonths - Math.min(constructionMonths, salesPeriodMonths)));
  for (let m = constructionMonths + 1; m <= constructionMonths + remainingSalesMonths; m++) {
    const net = revenuePerMonth - marketingPerMonth;
    cumCF += net;

    const discountFactor = Math.pow(1 + wacc / 100, m / 12);
    monthlyCashflow.push({
      month: m,
      revenue: revenuePerMonth,
      constructionCost: 0,
      softCost: 0,
      marketingCost: marketingPerMonth,
      financeCost: 0,
      landCost: 0,
      netCashflow: net,
      cumulativeCashflow: cumCF,
      discountedCashflow: net / discountFactor,
    });
  }

  // === NPV ===
  const npv = monthlyCashflow.reduce((sum, cf) => sum + cf.discountedCashflow, 0);

  // === IRR (Newton-Raphson) ===
  const cashflows = monthlyCashflow.map((cf) => cf.netCashflow);
  const irr = calculateIRR(cashflows);

  // === Payback period ===
  let paybackMonths = 0;
  for (const cf of monthlyCashflow) {
    if (cf.cumulativeCashflow >= 0) {
      paybackMonths = cf.month;
      break;
    }
  }
  if (paybackMonths === 0) paybackMonths = constructionMonths + salesPeriodMonths; // never pays back

  // === Equity waterfall ===
  const waterfall: WaterfallRow[] = [];
  const preferredReturn = equityInvestment * 0.08; // 8% preferred return
  let remaining = actualNetProfit;

  // Tier 1: Return of capital
  waterfall.push({
    tier: "Return of Capital",
    description: "100% of equity investment returned to LP",
    amount: Math.min(remaining, equityInvestment),
    cumulative: Math.min(remaining, equityInvestment),
  });
  remaining -= equityInvestment;

  if (remaining > 0) {
    // Tier 2: Preferred return (8%)
    const pref = Math.min(remaining, preferredReturn);
    waterfall.push({
      tier: "Preferred Return (8%)",
      description: "8% preferred return to LP before GP carry",
      amount: pref,
      cumulative: waterfall[0].cumulative + pref,
    });
    remaining -= pref;
  }

  if (remaining > 0) {
    // Tier 3: 80/20 split (LP/GP)
    const lpShare = remaining * 0.80;
    const gpCarry = remaining * 0.20;
    waterfall.push({
      tier: "LP Profit Share (80%)",
      description: "80% of remaining profits to Limited Partners",
      amount: lpShare,
      cumulative: waterfall[waterfall.length - 1].cumulative + lpShare,
    });
    waterfall.push({
      tier: "GP Carry (20%)",
      description: "20% carry to General Partner (developer)",
      amount: gpCarry,
      cumulative: waterfall[waterfall.length - 1].cumulative + gpCarry,
    });
  }

  return {
    grossRevenue: Math.round(grossRevenue),
    netRevenue: Math.round(netRevenue),
    transferFees: Math.round(transferFees),
    totalConstructionCost: Math.round(totalConstructionCost),
    softCosts: Math.round(softCosts),
    marketingCosts: Math.round(marketingCosts),
    financeCosts: Math.round(financeCosts),
    totalDevelopmentCost: Math.round(totalDevelopmentCost),
    totalCost: Math.round(totalCost),
    grossProfit: Math.round(grossProfit),
    netProfit: Math.round(actualNetProfit),
    profitMargin: Math.round(profitMargin * 10) / 10,
    roi: Math.round(roi * 10) / 10,
    roe: Math.round(roe * 10) / 10,
    equityInvestment: Math.round(equityInvestment),
    loanAmount: Math.round(loanAmount),
    loanMonthlyPayment: Math.round(loanMonthlyPayment),
    totalInterestPaid: Math.round(totalInterestPaid),
    npv: Math.round(npv),
    irr: Math.round(irr * 10) / 10,
    paybackMonths,
    monthlyCashflow,
    waterfall,
  };
}

// IRR via Newton-Raphson iteration
function calculateIRR(cashflows: number[]): number {
  if (cashflows.length < 2) return 0;

  let rate = 0.1; // Start at 10%
  const maxIterations = 100;
  const tolerance = 1e-6;

  for (let iter = 0; iter < maxIterations; iter++) {
    let npv = 0;
    let dnpv = 0;

    for (let t = 0; t < cashflows.length; t++) {
      const factor = Math.pow(1 + rate, t);
      npv += cashflows[t] / factor;
      if (t > 0) {
        dnpv -= (t * cashflows[t]) / (factor * (1 + rate));
      }
    }

    if (Math.abs(npv) < tolerance) break;

    if (Math.abs(dnpv) < tolerance) break;
    rate = rate - npv / dnpv;

    // Prevent rate from going to extremes
    if (rate < -0.99) rate = -0.99;
    if (rate > 10) rate = 10;
  }

  return rate * 100;
}

// Construction cost benchmarks by quality tier
export const CONSTRUCTION_COST_TIERS = {
  budget: { label: "Budget (AED 900/sqft)", costPsqft: 900, gfaRatio: 1.25, softCostPct: 0.10, marketingPct: 0.03, financePct: 0.06 },
  standard: { label: "Standard (AED 1,200/sqft)", costPsqft: 1200, gfaRatio: 1.30, softCostPct: 0.12, marketingPct: 0.04, financePct: 0.07 },
  premium: { label: "Premium (AED 1,600/sqft)", costPsqft: 1600, gfaRatio: 1.35, softCostPct: 0.14, marketingPct: 0.05, financePct: 0.08 },
  ultraLuxury: { label: "Ultra-Luxury (AED 2,200/sqft)", costPsqft: 2200, gfaRatio: 1.40, softCostPct: 0.16, marketingPct: 0.06, financePct: 0.09 },
};
