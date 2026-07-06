/**
 * API Route: /api/rationale
 * LLM Pricing Rationale Narrator (Phase 7a).
 * Uses Anthropic Claude. Falls back to template narrator if API unavailable.
 */

import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/anthropic-client";
import { fallbackRationale } from "@/lib/fallback-narrator";

const SYSTEM_PROMPT =
  "You are a PropTech Data Scientist. Explain why the 'Optimal Price' was chosen " +
  "over the 'Floor' and 'Ceiling'. Cite the specific absorption days and view " +
  "premiums from the JSON. Keep it under 3 sentences.";

const USER_PROMPT_TEMPLATE = `PRICING JSON (DO NOT recompute, estimate, or invent any number; quote only from this payload):
{pricing_json}

COMPARABLES USED (the comps that informed the weighted base PSF):
{comps_used_json}

Explain why the Optimal Price was chosen over the Floor and Ceiling. You MUST cite at least one absorption_days figure and at least one view/floor premium figure from the JSON above. Maximum 3 sentences.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pricing_json, comps_used } = body;

    if (!pricing_json || typeof pricing_json !== "object") {
      return NextResponse.json(
        { error: "Required: pricing_json (object)" },
        { status: 400 }
      );
    }

    const userPrompt = USER_PROMPT_TEMPLATE
      .replace("{pricing_json}", JSON.stringify(pricing_json, null, 2))
      .replace("{comps_used_json}", JSON.stringify(comps_used || [], null, 2));

    // Try Anthropic Claude
    const claudeResponse = await callClaude(SYSTEM_PROMPT, userPrompt, 512);
    if (claudeResponse) {
      return NextResponse.json({ rationale: claudeResponse, source: "anthropic" });
    }

    // Fallback
    const absorptionDays = pricing_json.base_absorption_days_avg || 58;
    const rationale = fallbackRationale(pricing_json, absorptionDays);
    return NextResponse.json({ rationale, source: "fallback" });
  } catch (e: any) {
    return NextResponse.json({
      rationale: `[NARRATOR UNAVAILABLE]\n\n${e.message}`,
      error: e.message,
    });
  }
}
