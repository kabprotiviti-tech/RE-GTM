/**
 * API Route: /api/pricing
 * Wraps the deterministic pricing engine (Phase 2 + Phase 3).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  calculateBasePricing,
  applyMicroAdjustments,
  microToMacroView,
} from "@/lib/engines/pricing-engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { unit_type, view, floor_number, sqft, developer, developer_tier } = body;

    if (!unit_type || !view || floor_number == null) {
      return NextResponse.json(
        { error: "Required: unit_type, view, floor_number. Optional: sqft, developer, developer_tier." },
        { status: 400 }
      );
    }

    const macroView = microToMacroView(view);
    const base = calculateBasePricing({
      unit_type,
      view: macroView,
      developer,
      developer_tier,
    });

    const micro = applyMicroAdjustments(base, {
      unit_type,
      view,
      floor_number: Number(floor_number),
      sqft: sqft ? Number(sqft) : undefined,
    });

    return NextResponse.json({ base, micro, macro_view: macroView });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
