/**
 * Sensitivity Analysis Module — IRR sensitivity to PSF and absorption changes
 *
 * Generates a tornado chart dataset showing how the project's IRR changes
 * when key variables move +/- 10%, 20%, 30%.
 *
 * This is the "one-table-that-tells-the-whole-story" a consulting partner
 * would put on the final slide.
 */

export interface SensitivityVariable {
  name: string;
  baseValue: number;
  unit: string;
  scenarios: {
    pct: number; // -30, -20, -10, 0, +10, +20, +30
    value: number;
    irr: number; // resulting IRR %
    npv: number; // resulting NPV in AED millions
  }[];
}

export function calculateSensitivity(
  basePsqft: number,
  baseAbsorptionDays: number,
  unitCount: number,
  avgSqft: number,
  dailyCarryCost: number,
  timelineMonths: number
): {
  variables: SensitivityVariable[];
  baseIRR: number;
  baseNPV: number;
  tornadoData: { variable: string; lowIRR: number; highIRR: number; baseIRR: number }[];
} {
  // Base case calculation
  const totalRevenue = basePsqft * unitCount * avgSqft;
  const totalCarry = dailyCarryCost * baseAbsorptionDays;
  const baseNPV = totalRevenue - totalCarry;

  // Simple IRR proxy: (NPV / (totalCarry + 1)) ^ (12/timelineMonths) - 1
  // This is a simplified approximation for sensitivity purposes
  const baseIRR = (Math.pow(baseNPV / Math.max(totalCarry, 1), 12 / timelineMonths) - 1) * 100;

  const variations = [-30, -20, -10, 0, 10, 20, 30];

  // Calculate IRR for each variable at each variation
  const calcIRR = (psqft: number, absorption: number, units: number, sqft: number, carry: number) => {
    const rev = psqft * units * sqft;
    const totalCarry = carry * absorption;
    const npv = rev - totalCarry;
    const irr = (Math.pow(npv / Math.max(totalCarry, 1), 12 / timelineMonths) - 1) * 100;
    return { irr, npv };
  };

  const psqftScenarios = variations.map((pct) => {
    const value = basePsqft * (1 + pct / 100);
    const { irr, npv } = calcIRR(value, baseAbsorptionDays, unitCount, avgSqft, dailyCarryCost);
    return { pct, value: Math.round(value), irr: Math.round(irr * 10) / 10, npv: Math.round(npv / 1e6 * 10) / 10 };
  });

  const absorptionScenarios = variations.map((pct) => {
    const value = baseAbsorptionDays * (1 + pct / 100);
    const { irr, npv } = calcIRR(basePsqft, value, unitCount, avgSqft, dailyCarryCost);
    return { pct, value: Math.round(value), irr: Math.round(irr * 10) / 10, npv: Math.round(npv / 1e6 * 10) / 10 };
  });

  const unitCountScenarios = variations.map((pct) => {
    const value = Math.round(unitCount * (1 + pct / 100));
    const { irr, npv } = calcIRR(basePsqft, baseAbsorptionDays, value, avgSqft, dailyCarryCost);
    return { pct, value, irr: Math.round(irr * 10) / 10, npv: Math.round(npv / 1e6 * 10) / 10 };
  });

  const carryScenarios = variations.map((pct) => {
    const value = dailyCarryCost * (1 + pct / 100);
    const { irr, npv } = calcIRR(basePsqft, baseAbsorptionDays, unitCount, avgSqft, value);
    return { pct, value: Math.round(value), irr: Math.round(irr * 10) / 10, npv: Math.round(npv / 1e6 * 10) / 10 };
  });

  const sqftScenarios = variations.map((pct) => {
    const value = Math.round(avgSqft * (1 + pct / 100));
    const { irr, npv } = calcIRR(basePsqft, baseAbsorptionDays, unitCount, value, dailyCarryCost);
    return { pct, value, irr: Math.round(irr * 10) / 10, npv: Math.round(npv / 1e6 * 10) / 10 };
  });

  const variables: SensitivityVariable[] = [
    { name: "Price PSF", baseValue: basePsqft, unit: "AED/sqft", scenarios: psqftScenarios },
    { name: "Absorption Days", baseValue: baseAbsorptionDays, unit: "days", scenarios: absorptionScenarios },
    { name: "Unit Count", baseValue: unitCount, unit: "units", scenarios: unitCountScenarios },
    { name: "Daily Carry Cost", baseValue: dailyCarryCost, unit: "AED/day", scenarios: carryScenarios },
    { name: "Avg Unit Size", baseValue: avgSqft, unit: "sqft", scenarios: sqftScenarios },
  ];

  // Tornado data: for each variable, the IRR at -30% and +30%
  const tornadoData = variables.map((v) => {
    const low = v.scenarios[0]; // -30%
    const high = v.scenarios[6]; // +30%
    return {
      variable: v.name,
      lowIRR: low.irr,
      highIRR: high.irr,
      baseIRR,
    };
  });

  return {
    variables,
    baseIRR: Math.round(baseIRR * 10) / 10,
    baseNPV: Math.round(baseNPV / 1e6 * 10) / 10,
    tornadoData,
  };
}
