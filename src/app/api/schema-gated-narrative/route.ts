/**
 * API Route: /api/schema-gated-narrative
 *
 * Phase 12 — Schema-Gated Narrator (Zero Hallucination Propagation)
 *
 * This endpoint enforces the EXACT PricingOutput schema before the LLM is called.
 * The math engine produces a dict → we validate against PricingOutput (StrictInt
 * for PSF, StrictStr for confidence, validator enforces "High"/"Medium"/"Low")
 * → if validation fails, the LLM is NEVER called → returns [SCHEMA GATE FAILED].
 *
 * TypeScript port of the Pydantic schema gate. The validation logic mirrors
 * backend/schemas.py exactly:
 *   - floor_psf, optimal_psf, ceiling_psf must be integers (not float, not null)
 *   - confidence must be exactly "High", "Medium", or "Low"
 *   - no extra fields allowed
 *   - no missing fields allowed
 */

import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

import { ensureZaiConfig } from "@/lib/zai-config";
ensureZaiConfig();

// ---------------------------------------------------------------------------
// Schema gate — TypeScript mirror of Pydantic PricingOutput
// ---------------------------------------------------------------------------

interface PricingOutput {
  floor_psf: number;     // must be integer
  optimal_psf: number;   // must be integer
  ceiling_psf: number;   // must be integer
  confidence: "High" | "Medium" | "Low";  // must be exactly one of these
}

function isStrictInt(v: any): boolean {
  return typeof v === "number" && Number.isInteger(v);
}

function validatePricingOutput(raw: any): { ok: true; data: PricingOutput } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Input must be an object" };
  }

  const { floor_psf, optimal_psf, ceiling_psf, confidence } = raw;
  const errors: string[] = [];

  // Check for extra fields
  const allowedFields = ["floor_psf", "optimal_psf", "ceiling_psf", "confidence"];
  const extraFields = Object.keys(raw).filter((k) => !allowedFields.includes(k));
  if (extraFields.length > 0) {
    errors.push(`Extra fields not allowed: ${extraFields.join(", ")}`);
  }

  // StrictInt validation — rejects float, null, string
  if (!isStrictInt(floor_psf)) {
    errors.push(`floor_psf must be a strict integer; got ${JSON.stringify(floor_psf)}`);
  }
  if (!isStrictInt(optimal_psf)) {
    errors.push(`optimal_psf must be a strict integer; got ${JSON.stringify(optimal_psf)}`);
  }
  if (!isStrictInt(ceiling_psf)) {
    errors.push(`ceiling_psf must be a strict integer; got ${JSON.stringify(ceiling_psf)}`);
  }

  // Confidence validator — must be exactly "High", "Medium", or "Low"
  if (typeof confidence !== "string") {
    errors.push(`confidence must be a string; got ${JSON.stringify(confidence)}`);
  } else if (!["High", "Medium", "Low"].includes(confidence)) {
    errors.push(
      `Invalid confidence state: ${JSON.stringify(confidence)}. Must be exactly 'High', 'Medium', or 'Low'.`
    );
  }

  if (errors.length > 0) {
    return { ok: false, error: errors.join("; ") };
  }

  return {
    ok: true,
    data: {
      floor_psf: floor_psf as number,
      optimal_psf: optimal_psf as number,
      ceiling_psf: ceiling_psf as number,
      confidence: confidence as "High" | "Medium" | "Low",
    },
  };
}

// ---------------------------------------------------------------------------
// Locked prompts — enforce the schema as the ONLY source of truth
// ---------------------------------------------------------------------------

const SCHEMA_GATED_SYSTEM_PROMPT =
  "You are a Senior Partner at McKinsey presenting to the CEO of Emaar. " +
  "You are given a PricingOutput JSON object with EXACTLY four fields: " +
  "floor_psf (int), optimal_psf (int), ceiling_psf (int), confidence (string). " +
  "Using ONLY these four values, write a 100-word executive summary of the " +
  "pricing recommendation. Cite the exact PSF values and the confidence level. " +
  "Do NOT invent, estimate, or compute any number. Do NOT reference any field " +
  "not present in the PricingOutput. If a value is missing, omit that point.";

function buildUserPrompt(p: PricingOutput): string {
  return `PRICING OUTPUT (schema-validated — these are the ONLY values you may reference):
${JSON.stringify(p, null, 2)}

Write the 100-word executive summary now. You may ONLY cite:
  - floor_psf: ${p.floor_psf}
  - optimal_psf: ${p.optimal_psf}
  - ceiling_psf: ${p.ceiling_psf}
  - confidence: ${p.confidence}

Any number in your response that is not one of these four values is a hallucination.`;
}

// ---------------------------------------------------------------------------
// Endpoint
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // --- SCHEMA GATE: validate BEFORE the LLM is called --------------------
    const validation = validatePricingOutput(body);

    if (!validation.ok) {
      // GATE HELD — LLM is NOT called. Return structured error.
      return NextResponse.json({
        narrative: `[SCHEMA GATE FAILED]\n\nThe math engine produced invalid data. The LLM was NOT called.\nError: ${validation.error}\n\nRaw data: ${JSON.stringify(body, null, 2)}`,
        schema_gate_passed: false,
        error: validation.error,
        llm_called: false,
      });
    }

    const validated = validation.data;

    // --- LLM call — only reached if schema gate passed --------------------
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: SCHEMA_GATED_SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(validated) },
      ],
      thinking: { type: "disabled" },
    });

    const content = completion.choices?.[0]?.message?.content;

    if (!content || !content.trim()) {
      return NextResponse.json({
        narrative: `[NARRATOR UNAVAILABLE]\n\nThe LLM returned an empty response, but the schema gate passed. Validated PricingOutput:\n${JSON.stringify(validated, null, 2)}`,
        schema_gate_passed: true,
        llm_called: true,
        validated_output: validated,
      });
    }

    return NextResponse.json({
      narrative: content.trim(),
      schema_gate_passed: true,
      llm_called: true,
      validated_output: validated,
    });
  } catch (e: any) {
    return NextResponse.json({
      narrative: `[NARRATOR UNAVAILABLE]\n\nError: ${e.message}`,
      schema_gate_passed: false,
      llm_called: false,
      error: e.message,
    });
  }
}
