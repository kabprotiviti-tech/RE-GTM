/**
 * API Route: /api/rationale
 * LLM Pricing Rationale Narrator (Phase 7a).
 * Tries ZAI SDK first, falls back to template narrator if unavailable.
 */

import { NextRequest, NextResponse } from "next/server";
import { ensureZaiConfig } from "@/lib/zai-config";
ensureZaiConfig();
import ZAI from "z-ai-web-dev-sdk";
import { fallbackRationale } from "@/lib/fallback-narrator";

const SYSTEM_PROMPT =
  "You are a PropTech Data Scientist. Explain why the 'Optimal Price' was chosen " +
  "over the 'Floor' and 'Ceiling'. Cite the specific absorption days and view " +
  "premiums from the JSON. Keep it under 3 sentences.";

const USER_PROMPT_TEMPLATE = `PRICING JSON (DO NOT recompute, estimate, or invent any number):
{pricing_json}

COMPARABLES USED:
{comps_used_json}

Explain why the Optimal Price was chosen. Maximum 3 sentences.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pricing_json, comps_used } = body;

    if (!pricing_json || typeof pricing_json !== "object") {
      return NextResponse.json({ error: "Required: pricing_json (object)" }, { status: 400 });
    }

    const userPrompt = USER_PROMPT_TEMPLATE
      .replace("{pricing_json}", JSON.stringify(pricing_json, null, 2))
      .replace("{comps_used_json}", JSON.stringify(comps_used || [], null, 2));

    // Try ZAI SDK
    try {
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        thinking: { type: "disabled" },
      });

      const content = completion.choices?.[0]?.message?.content;
      if (content && content.trim()) {
        return NextResponse.json({ rationale: content.trim(), source: "zai" });
      }
    } catch (zaiError: any) {
      console.error("[Rationale] ZAI failed, using fallback:", zaiError.message);
    }

    // Fallback
    const absorptionDays = pricing_json.base_absorption_days_avg || 58;
    const rationale = fallbackRationale(pricing_json, absorptionDays);
    return NextResponse.json({ rationale, source: "fallback" });
  } catch (e: any) {
    return NextResponse.json({ rationale: `[NARRATOR UNAVAILABLE]\n\n${e.message}`, error: e.message });
  }
}
