/**
 * src/lib/engines/cashflow-sim.ts
 * TypeScript port of backend/cashflow_sim.py
 */

const DEFAULT_DOWNPAYMENT_PCT = 5.0;
const PLAN_SUM_TOLERANCE = 0.01;

export interface CashflowEntry {
  month: number;
  cumulative_cash_collected: number;
  monthly_cash_collected: number;
  cumulative_pct: number;
  monthly_pct: number;
  event: string | null;
}

function parsePaymentPlan(plan: string): [number, number] {
  if (!plan || !plan.trim()) {
    throw new Error(`payment_plan must be a non-empty string; got ${plan}`);
  }
  const parts = plan.trim().split("/");
  if (parts.length !== 2) {
    throw new Error(`payment_plan must be 'X/Y' format; got ${plan}`);
  }
  const constructionPct = parseFloat(parts[0]);
  const handoverPct = parseFloat(parts[1]);
  if (isNaN(constructionPct) || isNaN(handoverPct)) {
    throw new Error(`payment_plan components must be numeric; got ${plan}`);
  }
  if (constructionPct < 0 || handoverPct < 0) {
    throw new Error(`payment_plan components must be non-negative; got ${plan}`);
  }
  if (Math.abs(constructionPct + handoverPct - 100) > PLAN_SUM_TOLERANCE) {
    throw new Error(`payment_plan must sum to 100; got ${plan} summing to ${constructionPct + handoverPct}`);
  }
  if (constructionPct < DEFAULT_DOWNPAYMENT_PCT) {
    throw new Error(`construction portion (${constructionPct}%) must be >= downpayment (${DEFAULT_DOWNPAYMENT_PCT}%); got ${plan}`);
  }
  return [constructionPct, handoverPct];
}

function labelEvent(
  month: number,
  timelineMonths: number,
  isDownpayment: boolean,
  isHandover: boolean
): string | null {
  if (isDownpayment) return "Downpayment (Booking Deposit)";
  if (isHandover && month === timelineMonths) return "Handover Balloon + Construction Installment";
  if (isHandover) return "Handover Balloon";
  return null;
}

export function simulateCashflow(
  unitPrice: number,
  paymentPlan: string,
  timelineMonths: number
): CashflowEntry[] {
  if (typeof unitPrice !== "number" || unitPrice <= 0) {
    throw new Error(`unit_price must be > 0; got ${unitPrice}`);
  }
  if (!Number.isInteger(timelineMonths) || timelineMonths <= 0) {
    throw new Error(`timeline_months must be a positive integer; got ${timelineMonths}`);
  }

  const [constructionPct, handoverPct] = parsePaymentPlan(paymentPlan);

  const downpaymentPct = DEFAULT_DOWNPAYMENT_PCT;
  const spreadPct = constructionPct - downpaymentPct;
  const spreadPerMonthPct = spreadPct / timelineMonths;

  const result: CashflowEntry[] = [];
  let cumulativePct = 0;

  for (let m = 0; m <= timelineMonths; m++) {
    let monthlyPct = 0;
    if (m === 0) {
      monthlyPct = downpaymentPct;
    } else {
      monthlyPct = spreadPerMonthPct;
      if (m === timelineMonths) {
        monthlyPct += handoverPct;
      }
    }
    cumulativePct += monthlyPct;

    const monthlyCash = (monthlyPct / 100) * unitPrice;
    const cumulativeCash = (cumulativePct / 100) * unitPrice;

    result.push({
      month: m,
      monthly_cash_collected: Math.round(monthlyCash * 100) / 100,
      cumulative_cash_collected: Math.round(cumulativeCash * 100) / 100,
      monthly_pct: Math.round(monthlyPct * 10000) / 10000,
      cumulative_pct: Math.round(cumulativePct * 10000) / 10000,
      event: labelEvent(
        m,
        timelineMonths,
        m === 0,
        m === timelineMonths && handoverPct > 0
      ),
    });
  }

  return result;
}

export function summarizeCashflow(cf: CashflowEntry[]): {
  total_collected: number;
  month_0_collected: number;
  month_0_pct: number;
  mid_build_collected: number;
  mid_build_pct: number;
  mid_build_month: number;
  handover_collected: number;
  handover_pct: number;
  handover_month: number;
  timeline_months: number;
} {
  if (!cf.length) {
    return {
      total_collected: 0, month_0_collected: 0, month_0_pct: 0,
      mid_build_collected: 0, mid_build_pct: 0, mid_build_month: 0,
      handover_collected: 0, handover_pct: 0, handover_month: 0,
      timeline_months: 0,
    };
  }
  const finalEntry = cf[cf.length - 1];
  const midIndex = Math.floor(cf.length / 2);
  const midEntry = cf[midIndex];
  return {
    total_collected: finalEntry.cumulative_cash_collected,
    month_0_collected: cf[0].monthly_cash_collected,
    month_0_pct: cf[0].monthly_pct,
    mid_build_collected: midEntry.cumulative_cash_collected,
    mid_build_pct: midEntry.cumulative_pct,
    mid_build_month: midEntry.month,
    handover_collected: finalEntry.monthly_cash_collected,
    handover_pct: finalEntry.monthly_pct,
    handover_month: finalEntry.month,
    timeline_months: finalEntry.month,
  };
}
