/**
 * API Route: /api/scenarios
 * Wraps the deterministic scenario modeling engine (Phase 5).
 */

import { NextRequest, NextResponse } from "next/server";
import { generateScenarios, summarizeScenarios } from "@/lib/engines/scenario-engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { optimal_psf, base_absorption_days, unit_count, avg_sqft_per_unit, daily_carry_cost_aed } = body;

    if (optimal_psf == null || base_absorption_days == null) {
      return NextResponse.json(
        { error: "Required: optimal_psf, base_absorption_days. Optional: unit_count, avg_sqft_per_unit, daily_carry_cost_aed." },
        { status: 400 }
      );
    }

    const scenarios = generateScenarios(Number(optimal_psf), Number(base_absorption_days), {
      unit_count: unit_count ? Number(unit_count) : undefined,
      avg_sqft_per_unit: avg_sqft_per_unit ? Number(avg_sqft_per_unit) : undefined,
      daily_carry_cost_aed: daily_carry_cost_aed != null ? Number(daily_carry_cost_aed) : undefined,
    });
    const summary = summarizeScenarios(scenarios);

    return NextResponse.json({ scenarios, summary });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
