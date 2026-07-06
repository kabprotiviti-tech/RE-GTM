/**
 * API Route: /api/structured-narrative
 * Phase 13 — Structured JSON Narrator using Anthropic Claude.
 * Forces JSON output: {target_persona, rationale, risk_flag}.
 */

import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/anthropic-client";
import { fallbackStructured } from "@/lib/fallback-narrator";

const SYSTEM_PROMPT =
  "You are a Senior PropTech Partner. " +
  "You must output ONLY valid JSON matching the provided schema. " +
  "No prose. No markdown. No commentary. ONLY the JSON object.";

function buildUserPrompt(pricingData: object): string {
  return `<strict_context>
${JSON.stringify(pricingData, null, 2)}
</strict_context>

<rules>
1. NEVER invent data. Use ONLY the numbers inside <strict_context>.
2. NEVER mention macro-economic factors (interest rates, oil prices) as they are not in the context.
3. If a field in the context is empty, output null for that field.
</rules>

<output_schema>
{
  "target_persona": "string",
  "rationale": "string (max 50 words, cite exact PSF from context)",
  "risk_flag": "boolean"
}
</output_schema>

BEGIN JSON OUTPUT:`;
}

function parseAndValidate(rawOutput: string) {
  let jsonStr = rawOutput.trim();

  // Strip markdown code fences if present
  if (jsonStr.startsWith("```")) {
    const lines = jsonStr.split("\n");
    if (lines[0].startsWith("```")) lines.shift();
    if (lines.length > 0 && lines[lines.length - 1].startsWith("```")) lines.pop();
    jsonStr = lines.join("\n").trim();
  }

  // Extract the first { ... } block if there's preamble
  const firstBrace = jsonStr.indexOf("{");
  const lastBrace = jsonStr.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
  }

  try {
    const parsed = JSON.parse(jsonStr);
    if (
      typeof parsed.target_persona === "string" &&
      typeof parsed.rationale === "string" &&
      typeof parsed.risk_flag === "boolean"
    ) {
      return {
        target_persona: parsed.target_persona,
        rationale: parsed.rationale,
        risk_flag: parsed.risk_flag,
        _raw_llm_output: rawOutput,
        _parse_success: true,
        _schema_gate_passed: true,
        _error: null,
      };
    }
  } catch {}

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pricing_data } = body;

    if (!pricing_data || typeof pricing_data !== "object") {
      return NextResponse.json({
        target_persona: null,
        rationale: null,
        risk_flag: null,
        _parse_success: false,
        _schema_gate_passed: false,
        _error: "pricing_data is required",
      });
    }

    // Try Anthropic Claude
    const claudeResponse = await callClaude(SYSTEM_PROMPT, buildUserPrompt(pricing_data), 512);
    if (claudeResponse) {
      const validated = parseAndValidate(claudeResponse);
      if (validated) {
        return NextResponse.json({ ...validated, source: "anthropic" });
      }
    }

    // Fallback
    const result = fallbackStructured(pricing_data);
    return NextResponse.json({ ...result, source: "fallback" });
  } catch (e: any) {
    return NextResponse.json({
      target_persona: null,
      rationale: null,
      risk_flag: null,
      _parse_success: false,
      _schema_gate_passed: false,
      _error: e.message,
    });
  }
}
