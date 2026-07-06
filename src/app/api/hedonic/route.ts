/**
 * API Route: /api/hedonic
 * Hedonic Pricing Engine (Phase 11) — regression-based, not weighted average.
 * Implements the EXACT logic: base_intercept + view_premium + floor_coeff + amenity_coeff.
 */

import { NextRequest, NextResponse } from "next/server";
import { calculateHedonicPricing } from "@/lib/engines/hedonic-engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { floor, amenity_score, view } = body;

    if (floor == null || amenity_score == null || !view) {
      return NextResponse.json(
        { error: "Required: floor, amenity_score, view" },
        { status: 400 }
      );
    }

    const result = calculateHedonicPricing({
      floor: Number(floor),
      amenity_score: Number(amenity_score),
      view,
    });

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
