/**
 * API Route: /api/structured-narrative
 *
 * Phase 13 — Structured JSON Narrator
 *
 * Forces the LLM to output ONLY valid JSON matching:
 *   { target_persona: string, rationale: string, risk_flag: boolean }
 *
 * Uses XML-tagged strict context + explicit anti-hallucination rules +
 * "BEGIN JSON OUTPUT:" forcing token. Parses and validates the LLM output
 * against the schema before returning.
 */

import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

import { ensureZaiConfig } from "@/lib/zai-config";
ensureZaiConfig();

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

interface StructuredResult {
  target_persona: string | null;
  rationale: string | null;
  risk_flag: boolean | null;
  _raw_llm_output: string | null;
  _parse_success: boolean;
  _schema_gate_passed: boolean;
  _error: string | null;
}

function parseAndValidate(rawOutput: string): StructuredResult {
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

  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e: any) {
    return {
      target_persona: null,
      rationale: null,
      risk_flag: null,
      _raw_llm_output: rawOutput,
      _parse_success: false,
      _schema_gate_passed: false,
      _error: `LLM output is not valid JSON: ${e.message}`,
    };
  }

  // Check required keys
  const requiredKeys = ["target_persona", "rationale", "risk_flag"];
  const missing = requiredKeys.filter((k) => !(k in parsed));
  if (missing.length > 0) {
    return {
      target_persona: parsed.target_persona ?? null,
      rationale: parsed.rationale ?? null,
      risk_flag: parsed.risk_flag ?? null,
      _raw_llm_output: rawOutput,
      _parse_success: true,
      _schema_gate_passed: false,
      _error: `Missing required keys: ${missing.join(", ")}`,
    };
  }

  // Type-check
  const typeErrors: string[] = [];
  if (typeof parsed.target_persona !== "string") typeErrors.push("target_persona must be string");
  if (typeof parsed.rationale !== "string") typeErrors.push("rationale must be string");
  if (typeof parsed.risk_flag !== "boolean") typeErrors.push("risk_flag must be boolean");

  if (typeErrors.length > 0) {
    return {
      target_persona: parsed.target_persona ?? null,
      rationale: parsed.rationale ?? null,
      risk_flag: parsed.risk_flag ?? null,
      _raw_llm_output: rawOutput,
      _parse_success: true,
      _schema_gate_passed: false,
      _error: `Type errors: ${typeErrors.join("; ")}`,
    };
  }

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

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(pricing_data) },
      ],
      thinking: { type: "disabled" },
    });

    const rawOutput = completion.choices?.[0]?.message?.content;

    if (!rawOutput || !rawOutput.trim()) {
      return NextResponse.json({
        target_persona: null,
        rationale: null,
        risk_flag: null,
        _raw_llm_output: null,
        _parse_success: false,
        _schema_gate_passed: false,
        _error: "LLM returned empty response",
      });
    }

    const result = parseAndValidate(rawOutput);
    return NextResponse.json(result);
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
