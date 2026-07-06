"""
backend/llm_narrator.py
Project Capital Velocity — LLM Strategy Narrator (GTM Generation)

ARCHITECTURAL CONTRACT (NON-NEGOTIABLE — THE BIFURCATION POINT):
- This module is the ONLY place an LLM is permitted in the entire pipeline.
- The LLM is a NARRATOR, never a CALCULATOR.
- The LLM receives the final JSON payload from the deterministic engines as
  READ-ONLY context. It may quote figures from that JSON verbatim. It may NOT:
    * Invent new numbers
    * Recompute any figure
    * Estimate any price, absorption, revenue, IRR, or carry cost
    * Round, average, or extrapolate any value
- If the LLM's output contains a number that cannot be traced to a key in the
  scenario_data_json payload, the orchestration has FAILED and the call must
  be retried with a stricter prompt or surfaced to the UI as a narrataive-
  integrity warning.

SYSTEM PROMPT (locked, per Phase 6 spec):
"You are a Senior Partner at McKinsey. You are presenting to the CEO of Emaar.
Using ONLY the provided scenario JSON data, write a 200-word GTM strategy.
Cover: 1) Target Buyer Persona (Investor vs End-User based on payment plans),
2) Positioning Statement, 3) Launch Phasing strategy to maximize early cash flow.
Tone: Authoritative, concise, zero fluff."

LLM ENDPOINT:
Uses the z-ai-web-dev-sdk CLI (OpenAI-compatible) for portability. The CLI is
invoked via subprocess with a captured JSON response. No raw API keys are
handled in Python — the SDK manages auth internally.

FALLBACK:
If the LLM call fails (network, auth, timeout, empty response), the module
returns a structured fallback string that explicitly states the LLM was
unavailable and the UI must render [NARRATOR UNAVAILABLE]. The deterministic
JSON payload is never altered to compensate.

PHASE 7 — PRICING RATIONALE GENERATOR (generate_pricing_rationale):
A second narrator function with a distinct persona (PropTech Data Scientist)
and a distinct output contract (<=3 sentences, must cite absorption days and
view premiums from the JSON). This satisfies the boardroom explainability
requirement: every Optimal price must have a 2-3 sentence defense that a
regulator or non-technical board member can read and trust.

The same anti-hallucination contract applies: the LLM may quote figures from
the pricing JSON and comps list verbatim. It may NOT recompute, estimate, or
invent any number. If a cited figure cannot be traced to the JSON, the
orchestration has failed.
"""

from __future__ import annotations

import json
import subprocess
import sys
from typing import Any, Dict, Optional

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Locked system prompt — per Phase 6 spec. Do not modify at the call site.
SYSTEM_PROMPT = (
    "You are a Senior Partner at McKinsey. You are presenting to the CEO of Emaar. "
    "Using ONLY the provided scenario JSON data, write a 200-word GTM strategy. "
    "Cover: 1) Target Buyer Persona (Investor vs End-User based on payment plans), "
    "2) Positioning Statement, 3) Launch Phasing strategy to maximize early cash flow. "
    "Tone: Authoritative, concise, zero fluff."
)

# User-prompt template — wraps the JSON payload and project brief into a single
# context block. The LLM is explicitly forbidden from doing math.
USER_PROMPT_TEMPLATE = """PROJECT BRIEF:
{project_brief}

DETERMINISTIC SCENARIO JSON (computed by the Python math engine — DO NOT recompute, estimate, or invent any number; quote only from this payload):
{scenario_json}

Write the 200-word GTM strategy now. Use ONLY the figures present in the JSON above. If a figure is missing from the JSON, do not invent one — omit that point instead."""

# ---------------------------------------------------------------------------
# Phase 7 — Pricing Rationale configuration
# ---------------------------------------------------------------------------

# Locked system prompt for the rationale narrator — per Phase 7 spec.
# Distinct persona from the GTM narrator: PropTech Data Scientist, not McKinsey Partner.
# Distinct output contract: <=3 sentences, must cite absorption days + view premiums.
RATIONALE_SYSTEM_PROMPT = (
    "You are a PropTech Data Scientist. Explain why the 'Optimal Price' was chosen "
    "over the 'Floor' and 'Ceiling'. Cite the specific absorption days and view "
    "premiums from the JSON. Keep it under 3 sentences."
)

# User-prompt template for the rationale. Same anti-hallucination clause.
RATIONALE_USER_PROMPT_TEMPLATE = """PRICING JSON (computed by the Python pricing engine — DO NOT recompute, estimate, or invent any number; quote only from this payload):
{pricing_json}

COMPARABLES USED (the comps that informed the weighted base PSF — DO NOT invent comps or stats not present here):
{comps_used_json}

Explain why the Optimal Price was chosen over the Floor and Ceiling. You MUST cite at least one absorption_days figure and at least one view/floor premium figure from the JSON above. Maximum 3 sentences. If a required figure is missing from the JSON, omit that citation rather than inventing one."""

# CLI invocation — capture JSON output to a temp file for parse safety.
CLI_BINARY = "z-ai"
CLI_TIMEOUT_SECONDS = 60


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _build_user_prompt(scenario_data_json: Dict[str, Any], project_brief: str) -> str:
    """Assemble the user prompt with the JSON payload and project brief."""
    # Pretty-printed JSON for the LLM's reading; keys are stable.
    pretty_json = json.dumps(scenario_data_json, indent=2, ensure_ascii=False)
    return USER_PROMPT_TEMPLATE.format(
        project_brief=project_brief.strip(),
        scenario_json=pretty_json,
    )


def _call_llm_cli(system_prompt: str, user_prompt: str) -> Optional[str]:
    """
    Invoke the z-ai CLI in subprocess mode. Returns the response text on success,
    None on any failure (network, auth, timeout, empty, malformed JSON).

    The CLI writes a JSON envelope to its output file; we parse out only the
    message content. All errors are caught and surfaced as None — the caller
    decides whether to retry or fall back.
    """
    import tempfile
    from pathlib import Path

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", delete=False, prefix="zai_narrator_"
    ) as tmp:
        output_path = tmp.name

    try:
        cmd = [
            CLI_BINARY,
            "chat",
            "--system", system_prompt,
            "--prompt", user_prompt,
            "--output", output_path,
        ]
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=CLI_TIMEOUT_SECONDS,
        )

        if proc.returncode != 0:
            sys.stderr.write(
                f"[llm_narrator] CLI returned non-zero exit {proc.returncode}. "
                f"stderr: {proc.stderr[:500]}\n"
            )
            return None

        # Parse the JSON envelope from the output file.
        out_path = Path(output_path)
        if not out_path.exists() or out_path.stat().st_size == 0:
            sys.stderr.write("[llm_narrator] CLI output file missing or empty.\n")
            return None

        try:
            envelope = json.loads(out_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            sys.stderr.write(f"[llm_narrator] CLI output not valid JSON: {e}\n")
            return None

        # The z-ai CLI envelope shape: { choices: [ { message: { content } } ] }
        # Be defensive — try several common shapes.
        content = None
        if isinstance(envelope, dict):
            choices = envelope.get("choices") or envelope.get("data", {}).get("choices")
            if isinstance(choices, list) and choices:
                first = choices[0]
                if isinstance(first, dict):
                    msg = first.get("message") or first
                    if isinstance(msg, dict):
                        content = msg.get("content")
                    elif isinstance(msg, str):
                        content = msg
            # Direct top-level content field (some envelopes)
            if content is None:
                content = envelope.get("content") or envelope.get("response")

        if not content or not isinstance(content, str) or not content.strip():
            sys.stderr.write(
                f"[llm_narrator] Empty or non-string content in envelope: "
                f"{json.dumps(envelope)[:300]}\n"
            )
            return None

        return content.strip()

    except subprocess.TimeoutExpired:
        sys.stderr.write(
            f"[llm_narrator] CLI timed out after {CLI_TIMEOUT_SECONDS}s.\n"
        )
        return None
    except FileNotFoundError:
        sys.stderr.write(
            f"[llm_narrator] CLI binary '{CLI_BINARY}' not found on PATH.\n"
        )
        return None
    except Exception as e:
        sys.stderr.write(f"[llm_narrator] Unexpected error: {type(e).__name__}: {e}\n")
        return None
    finally:
        # Always clean up the temp file.
        try:
            Path(output_path).unlink(missing_ok=True)
        except Exception:
            pass


def _fallback_narrative(scenario_data_json: Dict[str, Any], project_brief: str) -> str:
    """
    Structured fallback returned when the LLM is unavailable.

    NEVER invents a narrative. Explicitly tells the UI to render the placeholder.
    The deterministic JSON payload is preserved verbatim for the UI to display
    in raw form — the CEO can still see the numbers even without the prose.
    """
    return (
        "[NARRATOR UNAVAILABLE]\n\n"
        "The LLM Strategy Narrator could not be reached. The deterministic "
        "scenario JSON below remains valid and has not been altered.\n\n"
        f"Project Brief: {project_brief.strip()}\n\n"
        f"Scenario JSON (raw):\n{json.dumps(scenario_data_json, indent=2, ensure_ascii=False)}"
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_gtm_strategy(
    scenario_data_json: Dict[str, Any],
    project_brief: str,
) -> str:
    """
    Generate a 200-word boardroom GTM strategy narrative from the deterministic
    scenario JSON payload.

    Args:
        scenario_data_json: The final JSON payload from the deterministic engines
            (pricing + cashflow + scenarios). Treated as READ-ONLY context.
            The LLM may quote from it but may NOT recompute or invent figures.
        project_brief: A short string describing the project (e.g. "200-unit
            2BR Sea tower in Dubai Marina, Emaar-developed, 36-month build").
            Injected into the user prompt for context.

    Returns:
        str: The LLM-generated GTM narrative (~200 words). On any LLM failure,
        returns a structured fallback string starting with [NARRATOR UNAVAILABLE]
        that preserves the raw JSON for the UI to display.

    The function NEVER raises — it always returns a string. LLM failures are
    surfaced as fallback strings, not exceptions, so the FastAPI layer can
    return a 200 with the fallback rather than a 500.
    """
    # --- Validate inputs (defensive; the orchestrator should also validate) ------
    if not isinstance(scenario_data_json, dict) or not scenario_data_json:
        return (
            "[NARRATOR UNAVAILABLE]\n\n"
            "scenario_data_json is empty or not a dict. Cannot narrate."
        )
    if not isinstance(project_brief, str) or not project_brief.strip():
        project_brief = "[PROJECT BRIEF MISSING]"

    # --- Build the user prompt --------------------------------------------------
    user_prompt = _build_user_prompt(scenario_data_json, project_brief)

    # --- Invoke the LLM ---------------------------------------------------------
    narrative = _call_llm_cli(SYSTEM_PROMPT, user_prompt)

    if narrative is None:
        return _fallback_narrative(scenario_data_json, project_brief)

    return narrative


def _fallback_rationale(pricing_json: Dict[str, Any], comps_used: list) -> str:
    """
    Structured fallback for the rationale narrator. Same discipline as the GTM
    fallback: never invents prose, preserves the raw JSON for UI display.
    """
    return (
        "[NARRATOR UNAVAILABLE]\n\n"
        "The Pricing Rationale Narrator could not be reached. The deterministic "
        "pricing JSON and comps list below remain valid and have not been altered.\n\n"
        f"Pricing JSON (raw):\n{json.dumps(pricing_json, indent=2, ensure_ascii=False)}\n\n"
        f"Comps used: {comps_used}"
    )


def generate_pricing_rationale(
    pricing_json: Dict[str, Any],
    comps_used: list,
) -> str:
    """
    Generate a <=3-sentence pricing rationale defending the Optimal price choice
    over the Floor and Ceiling alternatives.

    Satisfies the boardroom/regulatory explainability requirement: every Optimal
    price must have a 2-3 sentence defense citing specific absorption days and
    view/floor premiums from the JSON. A non-technical board member should be
    able to read it and trust the number.

    Args:
        pricing_json: The Phase 2/3 pricing payload (must contain floor_psf,
            optimal_psf, ceiling_psf, and ideally the audit-trail fields like
            comps_used, base_absorption_days, micro_view_modifier_pct, etc.).
            Treated as READ-ONLY context.
        comps_used: The list of comp_ids (and optionally full comp objects) that
            informed the weighted base PSF. Passed to the LLM so it can cite
            specific comps' absorption days and view premiums. If only comp_ids
            are passed, the LLM is instructed to cite from the pricing_json's
            audit fields instead.

    Returns:
        str: The LLM-generated rationale (<=3 sentences). On any LLM failure,
        returns a structured fallback string starting with [NARRATOR UNAVAILABLE]
        that preserves the raw pricing JSON and comps list for the UI to display.

    The function NEVER raises — always returns a string. Same resilience contract
    as generate_gtm_strategy().
    """
    # --- Validate inputs (defensive) --------------------------------------------
    if not isinstance(pricing_json, dict) or not pricing_json:
        return (
            "[NARRATOR UNAVAILABLE]\n\n"
            "pricing_json is empty or not a dict. Cannot generate rationale."
        )
    if not isinstance(comps_used, list):
        # Coerce non-list inputs to a single-element list rather than failing.
        comps_used = [comps_used] if comps_used else []

    # --- Build the user prompt --------------------------------------------------
    pretty_pricing = json.dumps(pricing_json, indent=2, ensure_ascii=False)
    pretty_comps = json.dumps(comps_used, indent=2, ensure_ascii=False, default=str)
    user_prompt = RATIONALE_USER_PROMPT_TEMPLATE.format(
        pricing_json=pretty_pricing,
        comps_used_json=pretty_comps,
    )

    # --- Invoke the LLM ---------------------------------------------------------
    rationale = _call_llm_cli(RATIONALE_SYSTEM_PROMPT, user_prompt)

    if rationale is None:
        return _fallback_rationale(pricing_json, comps_used)

    return rationale


# ---------------------------------------------------------------------------
# PHASE 12: SCHEMA-GATED NARRATOR — Zero Hallucination Propagation
# ---------------------------------------------------------------------------

# The schema gate is imported lazily so the module doesn't hard-fail if
# pydantic isn't installed in the runtime environment.
try:
    from schemas import PricingOutput, safe_validate_pricing_for_llm
    _SCHEMA_GATE_AVAILABLE = True
except ImportError:
    _SCHEMA_GATE_AVAILABLE = False


# Locked system prompt for the schema-gated narrator — enforces the exact
# PricingOutput schema as the ONLY source of truth.
SCHEMA_GATED_SYSTEM_PROMPT = (
    "You are a Senior Partner at McKinsey presenting to the CEO of Emaar. "
    "You are given a PricingOutput JSON object with EXACTLY four fields: "
    "floor_psf (int), optimal_psf (int), ceiling_psf (int), confidence (string). "
    "Using ONLY these four values, write a 100-word executive summary of the "
    "pricing recommendation. Cite the exact PSF values and the confidence level. "
    "Do NOT invent, estimate, or compute any number. Do NOT reference any field "
    "not present in the PricingOutput. If a value is missing, omit that point."
)

SCHEMA_GATED_USER_PROMPT_TEMPLATE = """PRICING OUTPUT (Pydantic-validated — these are the ONLY values you may reference):
{pricing_json}

Write the 100-word executive summary now. You may ONLY cite:
  - floor_psf: {floor_psf}
  - optimal_psf: {optimal_psf}
  - ceiling_psf: {ceiling_psf}
  - confidence: {confidence}

Any number in your response that is not one of these four values is a hallucination."""


def generate_narrative(pricing_data) -> str:
    """
    Schema-gated narrator function. Accepts a PricingOutput Pydantic object
    (NOT a raw dict) and generates a 100-word executive summary.

    ZERO HALLUCINATION PROPAGATION CONTRACT:
    - The caller MUST pass a validated PricingOutput object. If they pass a
      raw dict, we attempt validation here as a safety net.
    - If validation fails, the LLM is NEVER called. Returns a fallback string.
    - The LLM receives ONLY the four validated fields. No extra context.
    - The prompt explicitly forbids referencing any number not in the schema.

    Args:
        pricing_data: A PricingOutput Pydantic object (preferred) or a dict
            that can be validated against PricingOutput.

    Returns:
        str: The LLM-generated 100-word executive summary. On schema validation
        failure, returns [SCHEMA GATE FAILED] with the error. On LLM failure,
        returns [NARRATOR UNAVAILABLE] with the validated JSON preserved.
    """
    # --- Schema gate: validate before anything else -----------------------------
    if not _SCHEMA_GATE_AVAILABLE:
        return (
            "[SCHEMA GATE UNAVAILABLE]\n\n"
            "pydantic schemas module not importable. Cannot guarantee "
            "hallucination-free narration. Refusing to call the LLM."
        )

    # If the caller passed a raw dict, validate it as a safety net
    if isinstance(pricing_data, dict):
        validated, error = safe_validate_pricing_for_llm(pricing_data)
        if validated is None:
            return (
                f"[SCHEMA GATE FAILED]\n\n"
                f"The math engine produced invalid data. The LLM was NOT called.\n"
                f"Error: {error}\n\n"
                f"Raw data: {json.dumps(pricing_data, indent=2, default=str)}"
            )
        pricing_data = validated

    # If it's already a PricingOutput, we trust it (it was validated at construction)
    if not hasattr(pricing_data, "floor_psf"):
        return (
            "[SCHEMA GATE FAILED]\n\n"
            f"Expected PricingOutput object or dict, got {type(pricing_data).__name__}. "
            "The LLM was NOT called."
        )

    # --- Build the prompt with ONLY the four validated fields -------------------
    pricing_dict = {
        "floor_psf": pricing_data.floor_psf,
        "optimal_psf": pricing_data.optimal_psf,
        "ceiling_psf": pricing_data.ceiling_psf,
        "confidence": pricing_data.confidence,
    }

    user_prompt = SCHEMA_GATED_USER_PROMPT_TEMPLATE.format(
        pricing_json=json.dumps(pricing_dict, indent=2),
        floor_psf=pricing_data.floor_psf,
        optimal_psf=pricing_data.optimal_psf,
        ceiling_psf=pricing_data.ceiling_psf,
        confidence=pricing_data.confidence,
    )

    # --- Call the LLM -----------------------------------------------------------
    narrative = _call_llm_cli(SCHEMA_GATED_SYSTEM_PROMPT, user_prompt)

    if narrative is None:
        return (
            "[NARRATOR UNAVAILABLE]\n\n"
            "The LLM could not be reached, but the schema gate passed. "
            "The validated PricingOutput is preserved:\n\n"
            f"{json.dumps(pricing_dict, indent=2)}"
        )

    return narrative


# ---------------------------------------------------------------------------
# PHASE 13: STRUCTURED JSON NARRATOR — Strict XML-tagged context + JSON schema
# ---------------------------------------------------------------------------

STRUCTURED_SYSTEM_PROMPT = (
    "You are a Senior PropTech Partner. "
    "You must output ONLY valid JSON matching the provided schema. "
    "No prose. No markdown. No commentary. ONLY the JSON object."
)

STRUCTURED_USER_PROMPT_TEMPLATE = """<strict_context>
{pricing_data_json}
</strict_context>

<rules>
1. NEVER invent data. Use ONLY the numbers inside <strict_context>.
2. NEVER mention macro-economic factors (interest rates, oil prices) as they are not in the context.
3. If a field in the context is empty, output null for that field.
</rules>

<output_schema>
{{
  "target_persona": "string",
  "rationale": "string (max 50 words, cite exact PSF from context)",
  "risk_flag": "boolean"
}}
</output_schema>

BEGIN JSON OUTPUT:"""


def generate_structured_narrative(pricing_data_json: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate a STRUCTURED JSON narrative from pricing data using strict XML-tagged
    context and a forced JSON output schema.

    The LLM receives:
    - <strict_context> tags wrapping the pricing JSON
    - <rules> tags with 3 explicit anti-hallucination rules
    - <output_schema> tags defining the exact JSON shape
    - "BEGIN JSON OUTPUT:" forcing token

    The LLM must output ONLY valid JSON: {target_persona, rationale, risk_flag}.

    Args:
        pricing_data_json: The validated pricing dict (floor_psf, optimal_psf,
            ceiling_psf, confidence). Should pass the PricingOutput schema gate
            before reaching this function.

    Returns:
        dict with keys:
            - target_persona (str): "Investor" or "End-User"
            - rationale (str): max 50 words, cites exact PSF from context
            - risk_flag (bool): true if confidence is Low or PSF spread is wide
            - _raw_llm_output (str): the raw LLM response for audit
            - _parse_success (bool): whether JSON parsing succeeded
            - _schema_gate_passed (bool): whether the output matches the schema
    """
    if not isinstance(pricing_data_json, dict) or not pricing_data_json:
        return {
            "target_persona": None,
            "rationale": None,
            "risk_flag": None,
            "_raw_llm_output": None,
            "_parse_success": False,
            "_schema_gate_passed": False,
            "_error": "pricing_data_json is empty or not a dict",
        }

    user_prompt = STRUCTURED_USER_PROMPT_TEMPLATE.format(
        pricing_data_json=json.dumps(pricing_data_json, indent=2)
    )

    raw_output = _call_llm_cli(STRUCTURED_SYSTEM_PROMPT, user_prompt)

    if raw_output is None:
        return {
            "target_persona": None,
            "rationale": None,
            "risk_flag": None,
            "_raw_llm_output": None,
            "_parse_success": False,
            "_schema_gate_passed": False,
            "_error": "[NARRATOR UNAVAILABLE] — LLM call failed",
        }

    # --- Parse the LLM output as JSON ----------------------------------------
    # The LLM may wrap JSON in markdown code fences or add preamble. Extract
    # the JSON object robustly.
    json_str = raw_output.strip()

    # Strip markdown code fences if present
    if json_str.startswith("```"):
        # Remove ```json or ``` prefix and trailing ```
        lines = json_str.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        json_str = "\n".join(lines).strip()

    # Extract the first { ... } block if there's preamble
    first_brace = json_str.find("{")
    last_brace = json_str.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        json_str = json_str[first_brace : last_brace + 1]

    try:
        parsed = json.loads(json_str)
    except json.JSONDecodeError as e:
        return {
            "target_persona": None,
            "rationale": None,
            "risk_flag": None,
            "_raw_llm_output": raw_output,
            "_parse_success": False,
            "_schema_gate_passed": False,
            "_error": f"LLM output is not valid JSON: {e}",
        }

    # --- Validate the parsed JSON against the output schema -------------------
    required_keys = {"target_persona", "rationale", "risk_flag"}
    actual_keys = set(parsed.keys())

    if not required_keys.issubset(actual_keys):
        missing = required_keys - actual_keys
        return {
            "target_persona": parsed.get("target_persona"),
            "rationale": parsed.get("rationale"),
            "risk_flag": parsed.get("risk_flag"),
            "_raw_llm_output": raw_output,
            "_parse_success": True,
            "_schema_gate_passed": False,
            "_error": f"Missing required keys: {missing}",
        }

    # Type-check the fields
    type_errors = []
    if not isinstance(parsed["target_persona"], str):
        type_errors.append("target_persona must be string")
    if not isinstance(parsed["rationale"], str):
        type_errors.append("rationale must be string")
    if not isinstance(parsed["risk_flag"], bool):
        type_errors.append("risk_flag must be boolean")

    if type_errors:
        return {
            "target_persona": parsed.get("target_persona"),
            "rationale": parsed.get("rationale"),
            "risk_flag": parsed.get("risk_flag"),
            "_raw_llm_output": raw_output,
            "_parse_success": True,
            "_schema_gate_passed": False,
            "_error": f"Type errors: {'; '.join(type_errors)}",
        }

    # All checks passed
    return {
        "target_persona": parsed["target_persona"],
        "rationale": parsed["rationale"],
        "risk_flag": parsed["risk_flag"],
        "_raw_llm_output": raw_output,
        "_parse_success": True,
        "_schema_gate_passed": True,
        "_error": None,
    }


# ---------------------------------------------------------------------------
# Standalone self-validation
#   Run:  python backend/llm_narrator.py
   # Confirms the prompt assembly, CLI plumbing, and fallback path.
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 78)
    print("PROJECT CAPITAL VELOCITY — LLM NARRATOR SELF-VALIDATION")
    print("=" * 78)

    # --- Mock scenario payload (mirrors the Phase 5 CEO "Aha!" demo) ------------
    mock_scenario_payload = {
        "scenarios": [
            {
                "scenario_name": "Aggressive",
                "price_psf": 3420.53,
                "price_delta_pct": 5.0,
                "projected_absorption_days": 72.5,
                "absorption_delta_pct": 25.0,
                "total_revenue_assumption": 1265596100.0,
                "total_carry_cost": 3625000.0,
                "net_position": 1261971100.0,
            },
            {
                "scenario_name": "Base",
                "price_psf": 3257.65,
                "price_delta_pct": 0.0,
                "projected_absorption_days": 58.0,
                "absorption_delta_pct": 0.0,
                "total_revenue_assumption": 1205330500.0,
                "total_carry_cost": 2900000.0,
                "net_position": 1202430500.0,
            },
            {
                "scenario_name": "Conservative",
                "price_psf": 3159.92,
                "price_delta_pct": -3.0,
                "projected_absorption_days": 46.4,
                "absorption_delta_pct": -20.0,
                "total_revenue_assumption": 1169170400.0,
                "total_carry_cost": 2320000.0,
                "net_position": 1166850400.0,
            },
        ],
        "summary": {
            "revenue_spread_aed": 96425700.0,
            "revenue_spread_pct": 8.0,
            "carry_cost_spread_aed": 1305000.0,
            "net_position_spread_aed": 95120700.0,
            "absorption_spread_days": 26.1,
            "best_revenue_scenario": "Aggressive",
            "best_net_scenario": "Aggressive",
            "fastest_sell_scenario": "Conservative",
        },
        "cashflow": {
            "payment_plan": "60/40",
            "timeline_months": 36,
            "month_0_collected": 50000.0,
            "handover_collected": 415277.78,
        },
        "pricing": {
            "unit_type": "2BR",
            "view": "Full Marina",
            "floor": 80,
            "final_optimal_psf": 3257.65,
            "estimated_unit_price": 9119328.0,
            "base_data_confidence": "Medium",
        },
    }
    project_brief = (
        "200-unit 2BR Sea tower in Dubai Marina, Emaar-developed, 36-month build, "
        "60/40 payment plan, Floor 80 Full Marina penthouse reference unit."
    )

    print("\n--- Test 1: Full payload, real LLM call ---")
    print(f"System prompt (locked):\n  {SYSTEM_PROMPT}\n")
    print(f"Project brief:\n  {project_brief}\n")
    print(f"Payload keys: {list(mock_scenario_payload.keys())}\n")
    print("Invoking LLM...")
    narrative = generate_gtm_strategy(mock_scenario_payload, project_brief)
    print("\n--- LLM NARRATIVE OUTPUT ---\n")
    print(narrative)
    print("\n--- END NARRATIVE ---\n")

    # --- Word count check (advisory, not enforced) -----------------------------
    word_count = len(narrative.split())
    print(f"Word count: {word_count} (target ~200)")

    # --- Test 2: Empty payload (should hit defensive guard) --------------------
    print("\n--- Test 2: Empty payload (defensive guard) ---")
    empty_narrative = generate_gtm_strategy({}, project_brief)
    print(empty_narrative[:200] + ("..." if len(empty_narrative) > 200 else ""))

    # --- Test 3: Empty project brief (should substitute placeholder) -----------
    print("\n--- Test 3: Empty project brief (placeholder substitution) ---")
    briefless = generate_gtm_strategy(mock_scenario_payload, "")
    # Should not raise; should either call LLM with placeholder brief or fall back.
    print(f"Result starts with: {briefless[:120]}...")

    # =========================================================================
    # PHASE 7 — Pricing Rationale validation
    # =========================================================================
    print("\n" + "=" * 78)
    print("--- PHASE 7: generate_pricing_rationale ---")
    print("=" * 78)

    # Mock pricing JSON — mirrors a Phase 3 micro-adjusted payload (Floor 80
    # Full Marina penthouse, 2BR Sea Emaar base).
    mock_pricing_json = {
        "unit_type": "2BR",
        "view": "Full Marina",
        "floor": 80,
        "final_floor_psf": 3541.49,
        "final_optimal_psf": 3799.72,
        "final_ceiling_psf": 4131.74,
        "estimated_unit_price": 9119328.0,
        "floor_premium_pct": 8.0,
        "micro_view_modifier_pct": 8.0,
        "combined_adjustment_pct": 16.64,
        "base_data_confidence": "Medium",
        "base_optimal_psf": 3257.65,
        "base_floor_psf": 3036.26,
        "base_ceiling_psf": 3542.30,
        "base_absorption_days_avg": 58.0,
        "comps_used": ["CV-003", "CV-004", "CV-006"],
    }

    # Mock comps list — full comp objects so the LLM can cite specific
    # absorption days and view/floor premiums per comp.
    mock_comps_used = [
        {
            "comp_id": "CV-003",
            "project": "Emaar Beachfront - Beach Hill",
            "developer": "Emaar Properties",
            "unit_type": "2BR",
            "view": "Sea",
            "floor_premium_pct": 2.0,
            "base_psf": 3050,
            "amenity_score": 9,
            "payment_plan": "70/30",
            "absorption_days_50pct": 48,
            "avg_discount_off_asking": 3.0,
        },
        {
            "comp_id": "CV-004",
            "project": "Bluewaters Residences",
            "developer": "Meraas",
            "unit_type": "2BR",
            "view": "Sea",
            "floor_premium_pct": 1.8,
            "base_psf": 2850,
            "amenity_score": 8,
            "payment_plan": "60/40",
            "absorption_days_50pct": 58,
            "avg_discount_off_asking": 4.5,
        },
        {
            "comp_id": "CV-006",
            "project": "Muraba Residences",
            "developer": "Muraba",
            "unit_type": "2BR",
            "view": "Sea",
            "floor_premium_pct": 2.5,
            "base_psf": 3100,
            "amenity_score": 9,
            "payment_plan": "50/50",
            "absorption_days_50pct": 88,
            "avg_discount_off_asking": 5.0,
        },
    ]

    print("\n--- Test 4: Full pricing payload + comps, real LLM call ---")
    print(f"System prompt (locked):\n  {RATIONALE_SYSTEM_PROMPT}\n")
    print(f"Pricing JSON keys: {list(mock_pricing_json.keys())}")
    print(f"Comps passed: {[c['comp_id'] for c in mock_comps_used]}\n")
    print("Invoking LLM...")
    rationale = generate_pricing_rationale(mock_pricing_json, mock_comps_used)
    print("\n--- LLM RATIONALE OUTPUT ---\n")
    print(rationale)
    print("\n--- END RATIONALE ---\n")

    # --- Sentence count check (advisory; spec says <=3) ------------------------
    # Naive sentence split on . ! ?
    import re as _re
    sentences = [s for s in _re.split(r'(?<=[.!?])\s+', rationale.strip()) if s]
    print(f"Sentence count: {len(sentences)} (target <=3)")

    # --- Test 5: Empty pricing JSON (defensive guard) --------------------------
    print("\n--- Test 5: Empty pricing JSON (defensive guard) ---")
    empty_rationale = generate_pricing_rationale({}, mock_comps_used)
    print(empty_rationale[:200] + ("..." if len(empty_rationale) > 200 else ""))

    # --- Test 6: Comps as bare comp_ids (not full objects) ---------------------
    print("\n--- Test 6: Comps as bare comp_ids (lighter-weight path) ---")
    bare_ids = ["CV-003", "CV-004", "CV-006"]
    rationale_bare = generate_pricing_rationale(mock_pricing_json, bare_ids)
    print(f"Result starts with: {rationale_bare[:200]}...")

    print("\n" + "=" * 78)
    print("VALIDATION COMPLETE — LLM treated as narrator only.")
    print("All numbers in any narrative output must trace to the JSON payload.")
    print("=" * 78)
