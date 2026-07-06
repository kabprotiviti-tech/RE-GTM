/**
 * API Route: /api/schema-gated-narrative
 * Phase 12 — Schema-Gated Narrator using Anthropic Claude.
 * Validates PricingOutput schema before calling the LLM.
 */

import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/anthropic-client";
import { fallbackStructured } from "@/lib/fallback-narrator";

const SYSTEM_PROMPT =
  "You are a Senior Partner at McKinsey presenting to the CEO of Emaar. " +
  "You are given a PricingOutput JSON object with EXACTLY four fields: " +
  "floor_psf (int), optimal_psf (int), ceiling_psf (int), confidence (string). " +
  "Using ONLY these four values, write a 100-word executive summary. " +
  "Do NOT invent, estimate, or compute any number.";

function buildUserPrompt(p: any): string {
  return `PRICING OUTPUT (schema-validated — these are the ONLY values you may reference):
${JSON.stringify(p, null, 2)}

Write the 100-word executive summary now. You may ONLY cite:
  - floor_psf: ${p.floor_psf}
  - optimal_psf: ${p.optimal_psf}
  - ceiling_psf: ${p.ceiling_psf}
  - confidence: ${p.confidence}

Any number in your response that is not one of these four values is a hallucination.`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Schema gate: validate before calling the LLM
    const { floor_psf, optimal_psf, ceiling_psf, confidence } = body;
    const errors: string[] = [];

    if (!Number.isInteger(floor_psf)) errors.push("floor_psf must be strict integer");
    if (!Number.isInteger(optimal_psf)) errors.push("optimal_psf must be strict integer");
    if (!Number.isInteger(ceiling_psf)) errors.push("ceiling_psf must be strict integer");
    if (!["High", "Medium", "Low"].includes(confidence)) {
      errors.push(`Invalid confidence: ${confidence}. Must be High/Medium/Low`);
    }

    if (errors.length > 0) {
      return NextResponse.json({
        narrative: `[SCHEMA GATE FAILED]\n\nThe math engine produced invalid data. The LLM was NOT called.\nError: ${errors.join("; ")}`,
        schema_gate_passed: false,
        llm_called: false,
        error: errors.join("; "),
      });
    }

    // Try Anthropic Claude
    const claudeResponse = await callClaude(
      SYSTEM_PROMPT,
      buildUserPrompt({ floor_psf, optimal_psf, ceiling_psf, confidence }),
      512
    );

    if (claudeResponse) {
      return NextResponse.json({
        narrative: claudeResponse,
        schema_gate_passed: true,
        llm_called: true,
        validated_output: { floor_psf, optimal_psf, ceiling_psf, confidence },
        source: "anthropic",
      });
    }

    // Fallback
    const fallback = fallbackStructured({ floor_psf, optimal_psf, ceiling_psf, confidence });
    return NextResponse.json({
      narrative: fallback.rationale,
      schema_gate_passed: true,
      llm_called: false,
      validated_output: { floor_psf, optimal_psf, ceiling_psf, confidence },
      source: "fallback",
    });
  } catch (e: any) {
    return NextResponse.json({
      narrative: `[ERROR] ${e.message}`,
      schema_gate_passed: false,
      llm_called: false,
      error: e.message,
    });
  }
}
