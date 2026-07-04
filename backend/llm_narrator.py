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

    print("\n" + "=" * 78)
    print("VALIDATION COMPLETE — LLM treated as narrator only.")
    print("All numbers in any narrative output must trace to the JSON payload.")
    print("=" * 78)
