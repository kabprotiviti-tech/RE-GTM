/**
 * API Route: /api/gtm
 * LLM Strategy Narrator — GTM generation (Phase 6).
 * Uses Anthropic Claude. Falls back to template narrator if API unavailable.
 */

import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/anthropic-client";
import { fallbackGTM } from "@/lib/fallback-narrator";

const SYSTEM_PROMPT =
  "You are a Senior Partner at McKinsey. You are presenting to the CEO of Emaar. " +
  "Using ONLY the provided scenario JSON data, write a 200-word GTM strategy. " +
  "Cover: 1) Target Buyer Persona (Investor vs End-User based on payment plans), " +
  "2) Positioning Statement, 3) Launch Phasing strategy to maximize early cash flow. " +
  "Tone: Authoritative, concise, zero fluff.";

const USER_PROMPT_TEMPLATE = `PROJECT BRIEF:
{project_brief}

DETERMINISTIC SCENARIO JSON (computed by the math engine — DO NOT recompute, estimate, or invent any number; quote only from this payload):
{scenario_json}

Write the 200-word GTM strategy now. Use ONLY the figures present in the JSON above.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scenario_data_json, project_brief } = body;

    if (!scenario_data_json || typeof scenario_data_json !== "object") {
      return NextResponse.json(
        { error: "Required: scenario_data_json (object)" },
        { status: 400 }
      );
    }

    const brief = (project_brief || "").trim() || "[PROJECT BRIEF MISSING]";
    const userPrompt = USER_PROMPT_TEMPLATE
      .replace("{project_brief}", brief)
      .replace("{scenario_json}", JSON.stringify(scenario_data_json, null, 2));

    // Try Anthropic Claude
    const claudeResponse = await callClaude(SYSTEM_PROMPT, userPrompt, 1024);
    if (claudeResponse) {
      return NextResponse.json({ narrative: claudeResponse, source: "anthropic" });
    }

    // Fallback: template-based narrator
    const pricing = scenario_data_json.pricing || {};
    const narrative = fallbackGTM(pricing, scenario_data_json, brief);
    return NextResponse.json({ narrative, source: "fallback" });
  } catch (e: any) {
    return NextResponse.json({
      narrative: `[NARRATOR UNAVAILABLE]\n\n${e.message}`,
      error: e.message,
    });
  }
}
