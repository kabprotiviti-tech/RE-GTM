/**
 * API Route: /api/structured-narrative
 * Phase 13 — Structured JSON Narrator with fallback.
 */

import { NextRequest, NextResponse } from "next/server";
import { ensureZaiConfig } from "@/lib/zai-config";
ensureZaiConfig();
import ZAI from "z-ai-web-dev-sdk";
import { fallbackStructured } from "@/lib/fallback-narrator";

const SYSTEM_PROMPT = "You are a Senior PropTech Partner. Output ONLY valid JSON. No prose.";

function buildUserPrompt(pricingData: object): string {
  return `<strict_context>\n${JSON.stringify(pricingData, null, 2)}\n</strict_context>\n\n<output_schema>\n{"target_persona":"string","rationale":"string (max 50 words)","risk_flag":"boolean"}\n</output_schema>\n\nBEGIN JSON OUTPUT:`;
}

function parseAndValidate(rawOutput: string) {
  let jsonStr = rawOutput.trim();
  if (jsonStr.startsWith("```")) {
    const lines = jsonStr.split("\n");
    if (lines[0].startsWith("```")) lines.shift();
    if (lines.length > 0 && lines[lines.length - 1].startsWith("```")) lines.pop();
    jsonStr = lines.join("\n").trim();
  }
  const firstBrace = jsonStr.indexOf("{");
  const lastBrace = jsonStr.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
  }
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.target_persona && parsed.rationale !== undefined && parsed.risk_flag !== undefined) {
      return { ...parsed, _raw_llm_output: rawOutput, _parse_success: true, _schema_gate_passed: true, _error: null };
    }
  } catch {}
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pricing_data } = body;

    if (!pricing_data || typeof pricing_data !== "object") {
      return NextResponse.json({ target_persona: null, rationale: null, risk_flag: null, _parse_success: false, _schema_gate_passed: false, _error: "pricing_data required" });
    }

    // Try ZAI SDK
    try {
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(pricing_data) },
        ],
        thinking: { type: "disabled" },
      });

      const rawOutput = completion.choices?.[0]?.message?.content;
      if (rawOutput && rawOutput.trim()) {
        const validated = parseAndValidate(rawOutput);
        if (validated) return NextResponse.json({ ...validated, source: "zai" });
      }
    } catch (zaiError: any) {
      console.error("[Structured] ZAI failed, using fallback:", zaiError.message);
    }

    // Fallback
    const result = fallbackStructured(pricing_data);
    return NextResponse.json({ ...result, source: "fallback" });
  } catch (e: any) {
    return NextResponse.json({ target_persona: null, rationale: null, risk_flag: null, _parse_success: false, _schema_gate_passed: false, _error: e.message });
  }
}
