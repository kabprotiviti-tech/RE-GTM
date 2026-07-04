/**
 * API Route: /api/cashflow
 * Wraps the deterministic cashflow simulation engine (Phase 4).
 */

import { NextRequest, NextResponse } from "next/server";
import { simulateCashflow, summarizeCashflow } from "@/lib/engines/cashflow-sim";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { unit_price, payment_plan, timeline_months } = body;

    if (unit_price == null || !payment_plan || timeline_months == null) {
      return NextResponse.json(
        { error: "Required: unit_price, payment_plan, timeline_months" },
        { status: 400 }
      );
    }

    const cashflow = simulateCashflow(
      Number(unit_price),
      payment_plan,
      Number(timeline_months)
    );
    const summary = summarizeCashflow(cashflow);

    return NextResponse.json({ cashflow, summary });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
