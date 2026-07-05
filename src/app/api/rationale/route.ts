/**
 * API Route: /api/rationale
 * LLM Pricing Rationale Narrator (Phase 7a).
 * PropTech Data Scientist persona, <=3 sentences, must cite absorption days
 * and view premiums from the JSON.
 */

import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

const SYSTEM_PROMPT =
  "You are a PropTech Data Scientist. Explain why the 'Optimal Price' was chosen " +
  "over the 'Floor' and 'Ceiling'. Cite the specific absorption days and view " +
  "premiums from the JSON. Keep it under 3 sentences.";

const USER_PROMPT_TEMPLATE = `PRICING JSON (computed by the TypeScript pricing engine — DO NOT recompute, estimate, or invent any number; quote only from this payload):
{pricing_json}

COMPARABLES USED (the comps that informed the weighted base PSF — DO NOT invent comps or stats not present here):
{comps_used_json}

Explain why the Optimal Price was chosen over the Floor and Ceiling. You MUST cite at least one absorption_days figure and at least one view/floor premium figure from the JSON above. Maximum 3 sentences. If a required figure is missing from the JSON, omit that citation rather than inventing one.`;

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

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      thinking: { type: "disabled" },
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content || !content.trim()) {
      return NextResponse.json({
        rationale: "[NARRATOR UNAVAILABLE]\n\nThe LLM returned an empty response.",
      });
    }

    return NextResponse.json({ rationale: content.trim() });
  } catch (e: any) {
    return NextResponse.json(
      {
        rationale: `[NARRATOR UNAVAILABLE]\n\nError: ${e.message}`,
        error: e.message,
      },
      { status: 200 }
    );
  }
}
