/**
 * API Route: /api/gtm
 * LLM Strategy Narrator — GTM generation (Phase 6).
 * The LLM is a NARRATOR only. It receives the deterministic JSON read-only
 * and writes prose around it. It must NOT compute or invent any number.
 */

import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

const SYSTEM_PROMPT =
  "You are a Senior Partner at McKinsey. You are presenting to the CEO of Emaar. " +
  "Using ONLY the provided scenario JSON data, write a 200-word GTM strategy. " +
  "Cover: 1) Target Buyer Persona (Investor vs End-User based on payment plans), " +
  "2) Positioning Statement, 3) Launch Phasing strategy to maximize early cash flow. " +
  "Tone: Authoritative, concise, zero fluff.";

const USER_PROMPT_TEMPLATE = `PROJECT BRIEF:
{project_brief}

DETERMINISTIC SCENARIO JSON (computed by the TypeScript math engine — DO NOT recompute, estimate, or invent any number; quote only from this payload):
{scenario_json}

Write the 200-word GTM strategy now. Use ONLY the figures present in the JSON above. If a figure is missing from the JSON, do not invent one — omit that point instead.`;

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
        narrative: "[NARRATOR UNAVAILABLE]\n\nThe LLM returned an empty response. The deterministic JSON remains valid.",
        raw_json: scenario_data_json,
      });
    }

    return NextResponse.json({ narrative: content.trim() });
  } catch (e: any) {
    return NextResponse.json(
      {
        narrative: `[NARRATOR UNAVAILABLE]\n\nError: ${e.message}\n\nThe deterministic JSON is preserved.`,
        error: e.message,
      },
      { status: 200 }
    );
  }
}
