/**
 * API Route: /api/schema-gated-narrative
 * Phase 12 — Schema-Gated Narrator with fallback.
 */

import { NextRequest, NextResponse } from "next/server";
import { ensureZaiConfig } from "@/lib/zai-config";
ensureZaiConfig();
import ZAI from "z-ai-web-dev-sdk";
import { fallbackStructured } from "@/lib/fallback-narrator";

const SYSTEM_PROMPT = "You are a Senior Partner at McKinsey. Output ONLY valid JSON with keys: target_persona (string), rationale (string), risk_flag (boolean).";

function buildUserPrompt(p: any): string {
  return `PRICING OUTPUT (schema-validated):\n${JSON.stringify(p, null, 2)}\n\nWrite a 100-word executive summary. ONLY cite: floor_psf=${p.floor_psf}, optimal_psf=${p.optimal_psf}, ceiling_psf=${p.ceiling_psf}, confidence=${p.confidence}.\n\nBEGIN JSON OUTPUT:`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate schema
    const { floor_psf, optimal_psf, ceiling_psf, confidence } = body;
    const errors: string[] = [];
    if (!Number.isInteger(floor_psf)) errors.push("floor_psf must be strict integer");
    if (!Number.isInteger(optimal_psf)) errors.push("optimal_psf must be strict integer");
    if (!Number.isInteger(ceiling_psf)) errors.push("ceiling_psf must be strict integer");
    if (!["High", "Medium", "Low"].includes(confidence)) errors.push("confidence must be High/Medium/Low");

    if (errors.length > 0) {
      return NextResponse.json({
        narrative: `[SCHEMA GATE FAILED]\n\n${errors.join("; ")}`,
        schema_gate_passed: false, llm_called: false, error: errors.join("; "),
      });
    }

    // Try ZAI SDK
    try {
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(body) },
        ],
        thinking: { type: "disabled" },
      });

      const content = completion.choices?.[0]?.message?.content;
      if (content && content.trim()) {
        return NextResponse.json({
          narrative: content.trim(),
          schema_gate_passed: true, llm_called: true,
          validated_output: { floor_psf, optimal_psf, ceiling_psf, confidence },
          source: "zai",
        });
      }
    } catch (zaiError: any) {
      console.error("[SchemaGated] ZAI failed, using fallback:", zaiError.message);
    }

    // Fallback
    const fallback = fallbackStructured({ floor_psf, optimal_psf, ceiling_psf, confidence });
    return NextResponse.json({
      narrative: fallback.rationale,
      schema_gate_passed: true, llm_called: false,
      validated_output: { floor_psf, optimal_psf, ceiling_psf, confidence },
      source: "fallback",
    });
  } catch (e: any) {
    return NextResponse.json({ narrative: `[ERROR] ${e.message}`, schema_gate_passed: false, llm_called: false, error: e.message });
  }
}
