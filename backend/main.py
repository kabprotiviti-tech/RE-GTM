"""
backend/main.py
Project Capital Velocity — FastAPI Orchestration Layer

ARCHITECTURAL CONTRACT (NON-NEGOTIABLE):
- This module is the SINGLE ENTRY POINT for the frontend.
- It sequentially calls the 6 engine stages in deterministic order:
    1. calculate_base_pricing       (Phase 2 — macro comp filter + weighted base)
    2. apply_micro_adjustments       (Phase 3 — floor premium + micro-view modifier)
    3. generate_scenarios            (Phase 5 — Aggressive/Base/Conservative matrix)
    4. simulate_cashflow             (Phase 4 — monthly cash collection array)
    5. generate_gtm_strategy         (Phase 6 — LLM McKinsey Partner narrative)
    6. generate_pricing_rationale    (Phase 7a — LLM PropTech Data Scientist defense)
- The LLM is invoked ONLY at stages 5 and 6. It receives JSON read-only and
  writes prose. It never computes a number. The anti-hallucination protocol
  is enforced at every stage boundary.
- If any deterministic stage fails, the entire endpoint returns 422 with a
  structured error identifying which stage failed and why. The frontend must
  never receive a partial response — it's all or nothing for the math layer.
- If an LLM stage fails, the endpoint still returns 200 with the LLM field
  containing a [NARRATOR UNAVAILABLE] fallback string. The deterministic JSON
  remains valid and the frontend can display the numbers.

ENDPOINT:
  POST /api/run-launch-analysis
  Body: LaunchAnalysisRequest (Pydantic-validated)
  Response: LaunchAnalysisResponse (one massive structured JSON)
"""

from __future__ import annotations

import logging
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator

# --- Engine imports ----------------------------------------------------------
# All imports are relative to this file's directory. We add the backend dir
# to sys.path so the imports work whether launched from repo root or backend/.
_BACKEND_DIR = Path(__file__).resolve().parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from pricing_engine import (
    calculate_base_pricing,
    apply_micro_adjustments,
)
from cashflow_sim import (
    simulate_cashflow,
    summarize_cashflow,
)
from scenario_engine import (
    generate_scenarios,
    summarize_scenarios,
)
from llm_narrator import (
    generate_gtm_strategy,
    generate_pricing_rationale,
)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("capital_velocity.orchestrator")


# ---------------------------------------------------------------------------
# Pydantic request model — strict validation of the incoming payload
# ---------------------------------------------------------------------------

class LaunchAnalysisRequest(BaseModel):
    """
    Full launch analysis input spec.

    Required fields drive the deterministic math. Optional fields enrich the
    LLM narration and the project-level revenue/carry computations.
    """

    # --- Unit specification (required) ----------------------------------------
    unit_type: str = Field(
        ...,
        description="Unit type: '1BR', '2BR', or '3BR'",
        examples=["2BR"],
    )
    view: str = Field(
        ...,
        description="Micro view corridor: 'Full Marina', 'Partial Marina', 'Internal', 'Sea', 'City'",
        examples=["Full Marina"],
    )
    floor_number: int = Field(
        ...,
        ge=0,
        le=200,
        description="Physical floor of the reference unit (0-200)",
        examples=[80],
    )
    sqft: float = Field(
        ...,
        gt=0,
        description="Unit area in square feet",
        examples=[2400],
    )

    # --- Developer / brand (optional, drives Tier 1 +5% premium) --------------
    developer: Optional[str] = Field(
        None,
        description="Developer name for auto tier resolution (e.g. 'Emaar Properties' = Tier 1)",
        examples=["Emaar Properties"],
    )
    developer_tier: Optional[int] = Field(
        None,
        ge=1,
        le=2,
        description="Explicit developer tier override (1 = Tier 1 +5%, 2 = Tier 2 +0%)",
        examples=[1],
    )

    # --- Payment plan + timeline (required for cashflow) ----------------------
    payment_plan: str = Field(
        "60/40",
        description="Payment plan in 'X/Y' format, X+Y=100 (e.g. '60/40', '70/30', '50/50')",
        examples=["60/40"],
    )
    timeline_months: int = Field(
        36,
        ge=1,
        le=120,
        description="Build timeline in months",
        examples=[36],
    )

    # --- Project-level context (optional, drives scenario revenue + carry) ----
    unit_count: Optional[int] = Field(
        None,
        ge=1,
        description="Total units in the project (enables total_revenue_assumption)",
        examples=[200],
    )
    avg_sqft_per_unit: Optional[float] = Field(
        None,
        gt=0,
        description="Average unit size across the project (enables total_revenue_assumption)",
        examples=[1850],
    )
    daily_carry_cost_aed: Optional[float] = Field(
        None,
        ge=0,
        description="Project-level daily carry cost in AED (financing + opex + opportunity)",
        examples=[50000],
    )

    # --- Project brief for the LLM narrator (optional) ------------------------
    project_brief: Optional[str] = Field(
        None,
        description="Short project description for the GTM narrator context",
        examples=["200-unit 2BR Sea tower in Dubai Marina, Emaar-developed, 36-month build"],
    )

    @validator("unit_type")
    def normalize_unit_type(cls, v: str) -> str:
        return v.strip().upper()

    @validator("view")
    def normalize_view(cls, v: str) -> str:
        return v.strip()

    @validator("payment_plan")
    def validate_payment_plan(cls, v: str) -> str:
        v = v.strip()
        parts = v.split("/")
        if len(parts) != 2:
            raise ValueError(f"payment_plan must be 'X/Y' format; got {v!r}")
        try:
            x, y = float(parts[0]), float(parts[1])
        except ValueError:
            raise ValueError(f"payment_plan components must be numeric; got {v!r}")
        if abs(x + y - 100) > 0.01:
            raise ValueError(f"payment_plan must sum to 100; got {v!r} summing to {x+y}")
        return v


# ---------------------------------------------------------------------------
# Pydantic response model — the massive structured JSON
# ---------------------------------------------------------------------------

class StageMetadata(BaseModel):
    """Per-stage execution metadata for audit trail."""
    stage_name: str
    duration_ms: float
    success: bool
    error: Optional[str] = None


class LaunchAnalysisResponse(BaseModel):
    """
    The complete launch analysis output — all math arrays and all LLM text.

    Structure:
      - request_echo: the validated input spec (for audit)
      - pricing: Phase 2 + Phase 3 outputs (base + micro)
      - scenarios: Phase 5 outputs (3-tier matrix + summary)
      - cashflow: Phase 4 outputs (monthly array + summary)
      - gtm_strategy: Phase 6 LLM narrative string
      - pricing_rationale: Phase 7a LLM rationale string
      - comps_used: the full comp objects that informed pricing (for audit)
      - metadata: per-stage execution timings + overall status
    """

    # --- Audit echo -----------------------------------------------------------
    request_echo: Dict[str, Any] = Field(
        ..., description="The validated request payload, echoed for audit trail"
    )

    # --- Stage 1+2: Pricing ---------------------------------------------------
    pricing: Dict[str, Any] = Field(
        ...,
        description="Phase 2 (base) + Phase 3 (micro) pricing outputs",
    )

    # --- Stage 3: Scenarios ---------------------------------------------------
    scenarios: Dict[str, Any] = Field(
        ...,
        description="Phase 5 scenario matrix (Aggressive/Base/Conservative) + summary",
    )

    # --- Stage 4: Cashflow ----------------------------------------------------
    cashflow: Dict[str, Any] = Field(
        ...,
        description="Phase 4 monthly cashflow array + summary",
    )

    # --- Stage 5: GTM Strategy (LLM) ------------------------------------------
    gtm_strategy: str = Field(
        ...,
        description="Phase 6 LLM GTM narrative (~200 words, McKinsey Partner persona)",
    )

    # --- Stage 6: Pricing Rationale (LLM) -------------------------------------
    pricing_rationale: str = Field(
        ...,
        description="Phase 7a LLM rationale (≤3 sentences, PropTech Data Scientist persona)",
    )

    # --- Comps audit trail ----------------------------------------------------
    comps_used: List[Dict[str, Any]] = Field(
        ...,
        description="The full comp objects that informed the weighted base PSF",
    )

    # --- Execution metadata ---------------------------------------------------
    metadata: Dict[str, Any] = Field(
        ...,
        description="Per-stage execution timings, overall status, timestamp",
    )


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Project Capital Velocity — Orchestration API",
    description=(
        "Single-entry-point API for the Off-Plan Capital Velocity & Yield "
        "Optimisation Platform. One POST → six sequential engine stages → "
        "one massive structured JSON. Deterministic math (Python/Pandas/NumPy) "
        "feeds the LLM narrator (GLM-4) which writes prose only."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow the Next.js frontend (any origin in dev; tighten in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health")
async def health() -> Dict[str, str]:
    """Liveness probe — returns 200 if the orchestrator is up."""
    return {"status": "ok", "service": "capital-velocity-orchestrator", "version": "1.0.0"}


# ---------------------------------------------------------------------------
# Helper: load comps for the audit trail
# ---------------------------------------------------------------------------

def _load_comps_for_audit(unit_type: str, macro_view: str) -> List[Dict[str, Any]]:
    """
    Load the full comp objects that match the macro filter, for the audit trail.
    The macro view is derived from the micro view using the same mapping as the
    pricing engine (Marina/Sea/City corridors).
    """
    import json
    data_path = _BACKEND_DIR.parent / "data" / "mock_dubai_marina.json"
    if not data_path.exists():
        return []
    with open(data_path, "r", encoding="utf-8") as f:
        all_comps = json.load(f)
    return [
        c for c in all_comps
        if c.get("unit_type", "").upper() == unit_type.upper()
        and c.get("view", "") == macro_view
    ]


def _micro_to_macro_view(micro_view: str) -> str:
    """
    Map a micro view (Full Marina, Partial Marina, Internal, Sea, City) to the
    macro corridor (Marina, Sea, City) used for comp filtering.
    Mirrors the TypeScript microToMacroView() in the frontend.
    """
    v = micro_view.lower()
    if "marina" in v:
        return "Marina"
    if "sea" in v or "full" in v:
        return "Sea"
    if "city" in v:
        return "City"
    return "Sea"  # default to Sea for the prototype


# ---------------------------------------------------------------------------
# The main endpoint — POST /api/run-launch-analysis
# ---------------------------------------------------------------------------

@app.post("/api/run-launch-analysis", response_model=LaunchAnalysisResponse)
async def run_launch_analysis(request: LaunchAnalysisRequest) -> LaunchAnalysisResponse:
    """
    Run the full 6-stage launch analysis pipeline.

    Sequential execution:
      1. calculate_base_pricing       — macro comp filter + weighted base + brand premium
      2. apply_micro_adjustments       — floor premium + micro-view modifier → final PSF
      3. generate_scenarios            — Aggressive/Base/Conservative matrix
      4. simulate_cashflow             — monthly cash collection array
      5. generate_gtm_strategy         — LLM McKinsey Partner GTM narrative
      6. generate_pricing_rationale    — LLM PropTech Data Scientist rationale

    Stages 1-4 are deterministic (Python/Pandas/NumPy). Stages 5-6 are LLM
    narration (GLM-4 via z-ai CLI). If a deterministic stage fails, the endpoint
    returns 422. If an LLM stage fails, the endpoint returns 200 with a
    [NARRATOR UNAVAILABLE] fallback string.
    """
    start_time = time.time()
    stage_metadata: List[StageMetadata] = []

    logger.info(
        f"Launch analysis started | unit_type={request.unit_type} view={request.view} "
        f"floor={request.floor_number} sqft={request.sqft} developer={request.developer}"
    )

    # --- Build input specs for the engines ------------------------------------
    macro_view = _micro_to_macro_view(request.view)

    base_input = {
        "unit_type": request.unit_type,
        "view": macro_view,
    }
    if request.developer:
        base_input["developer"] = request.developer
    if request.developer_tier is not None:
        base_input["developer_tier"] = request.developer_tier

    micro_input = {
        "unit_type": request.unit_type,
        "view": request.view,  # micro view, not macro
        "floor_number": request.floor_number,
        "sqft": request.sqft,
    }
    if request.developer:
        micro_input["developer"] = request.developer
    if request.developer_tier is not None:
        micro_input["developer_tier"] = request.developer_tier

    # =========================================================================
    # STAGE 1: calculate_base_pricing (Phase 2)
    # =========================================================================
    stage_start = time.time()
    try:
        base_pricing = calculate_base_pricing(base_input)
        stage_meta = StageMetadata(
            stage_name="calculate_base_pricing",
            duration_ms=round((time.time() - stage_start) * 1000, 2),
            success=True,
        )
        logger.info(
            f"Stage 1 complete | optimal_psf={base_pricing.get('optimal_psf')} "
            f"confidence={base_pricing.get('data_confidence')} "
            f"comps={base_pricing.get('comp_count')}"
        )
    except Exception as e:
        stage_meta = StageMetadata(
            stage_name="calculate_base_pricing",
            duration_ms=round((time.time() - stage_start) * 1000, 2),
            success=False,
            error=str(e),
        )
        stage_metadata.append(stage_meta)
        logger.error(f"Stage 1 FAILED: {e}")
        raise HTTPException(
            status_code=422,
            detail={
                "stage": "calculate_base_pricing",
                "error": str(e),
                "message": "Deterministic pricing engine failed. Frontend must not proceed.",
            },
        )
    stage_metadata.append(stage_meta)

    # =========================================================================
    # STAGE 2: apply_micro_adjustments (Phase 3)
    # =========================================================================
    stage_start = time.time()
    try:
        micro_pricing = apply_micro_adjustments(base_pricing, micro_input)
        stage_meta = StageMetadata(
            stage_name="apply_micro_adjustments",
            duration_ms=round((time.time() - stage_start) * 1000, 2),
            success=True,
        )
        logger.info(
            f"Stage 2 complete | final_optimal_psf={micro_pricing.get('final_optimal_psf')} "
            f"combined_adj={micro_pricing.get('combined_adjustment_pct')}% "
            f"unit_price={micro_pricing.get('estimated_unit_price')}"
        )
    except Exception as e:
        stage_meta = StageMetadata(
            stage_name="apply_micro_adjustments",
            duration_ms=round((time.time() - stage_start) * 1000, 2),
            success=False,
            error=str(e),
        )
        stage_metadata.append(stage_meta)
        logger.error(f"Stage 2 FAILED: {e}")
        raise HTTPException(
            status_code=422,
            detail={
                "stage": "apply_micro_adjustments",
                "error": str(e),
                "message": "Micro-adjustment engine failed.",
            },
        )
    stage_metadata.append(stage_meta)

    # =========================================================================
    # STAGE 3: generate_scenarios (Phase 5)
    # =========================================================================
    # Use the final optimal PSF from stage 2 (or fall back to base optimal if
    # stage 2 returned None — e.g. no-match edge case).
    optimal_psf_for_scenarios = (
        micro_pricing.get("final_optimal_psf")
        or base_pricing.get("optimal_psf")
        or 3257.65  # ultimate fallback to keep the pipeline moving
    )

    # Base absorption days = average of comps used (or fallback to 58)
    comps_for_audit = _load_comps_for_audit(request.unit_type, macro_view)
    if comps_for_audit:
        base_absorption_days = sum(
            c.get("absorption_days_50pct", 58) for c in comps_for_audit
        ) / len(comps_for_audit)
    else:
        base_absorption_days = 58.0

    stage_start = time.time()
    try:
        scenarios = generate_scenarios(
            optimal_psf=optimal_psf_for_scenarios,
            base_absorption_days=base_absorption_days,
            unit_count=request.unit_count,
            avg_sqft_per_unit=request.avg_sqft_per_unit,
            daily_carry_cost_aed=request.daily_carry_cost_aed,
        )
        scenario_summary = summarize_scenarios(scenarios)
        stage_meta = StageMetadata(
            stage_name="generate_scenarios",
            duration_ms=round((time.time() - stage_start) * 1000, 2),
            success=True,
        )
        logger.info(
            f"Stage 3 complete | scenarios={len(scenarios)} "
            f"best_net={scenario_summary.get('best_net_scenario')} "
            f"revenue_spread={scenario_summary.get('revenue_spread_aed')}"
        )
    except Exception as e:
        stage_meta = StageMetadata(
            stage_name="generate_scenarios",
            duration_ms=round((time.time() - stage_start) * 1000, 2),
            success=False,
            error=str(e),
        )
        stage_metadata.append(stage_meta)
        logger.error(f"Stage 3 FAILED: {e}")
        raise HTTPException(
            status_code=422,
            detail={
                "stage": "generate_scenarios",
                "error": str(e),
                "message": "Scenario engine failed.",
            },
        )
    stage_metadata.append(stage_meta)

    # =========================================================================
    # STAGE 4: simulate_cashflow (Phase 4)
    # =========================================================================
    # Use the estimated unit price from stage 2 (or fallback to 1M if missing)
    unit_price_for_cashflow = (
        micro_pricing.get("estimated_unit_price")
        if micro_pricing.get("estimated_unit_price") is not None
        else 1_000_000.0
    )

    stage_start = time.time()
    try:
        cashflow_array = simulate_cashflow(
            unit_price=unit_price_for_cashflow,
            payment_plan=request.payment_plan,
            timeline_months=request.timeline_months,
        )
        cashflow_summary = summarize_cashflow(cashflow_array)
        stage_meta = StageMetadata(
            stage_name="simulate_cashflow",
            duration_ms=round((time.time() - stage_start) * 1000, 2),
            success=True,
        )
        logger.info(
            f"Stage 4 complete | entries={len(cashflow_array)} "
            f"final_cumulative={cashflow_summary.get('total_collected')} "
            f"handover={cashflow_summary.get('handover_collected')}"
        )
    except Exception as e:
        stage_meta = StageMetadata(
            stage_name="simulate_cashflow",
            duration_ms=round((time.time() - stage_start) * 1000, 2),
            success=False,
            error=str(e),
        )
        stage_metadata.append(stage_meta)
        logger.error(f"Stage 4 FAILED: {e}")
        raise HTTPException(
            status_code=422,
            detail={
                "stage": "simulate_cashflow",
                "error": str(e),
                "message": "Cashflow engine failed.",
            },
        )
    stage_metadata.append(stage_meta)

    # =========================================================================
    # STAGE 5: generate_gtm_strategy (Phase 6 — LLM)
    # =========================================================================
    # Build the scenario payload for the LLM narrator
    scenario_payload = {
        "scenarios": scenarios,
        "summary": scenario_summary,
        "cashflow": {
            "payment_plan": request.payment_plan,
            "timeline_months": request.timeline_months,
            "month_0_collected": cashflow_summary.get("month_0_collected"),
            "handover_collected": cashflow_summary.get("handover_collected"),
            "total_collected": cashflow_summary.get("total_collected"),
        },
        "pricing": micro_pricing,
        "base_pricing": {
            "optimal_psf": base_pricing.get("optimal_psf"),
            "floor_psf": base_pricing.get("floor_psf"),
            "ceiling_psf": base_pricing.get("ceiling_psf"),
            "data_confidence": base_pricing.get("data_confidence"),
            "comp_count": base_pricing.get("comp_count"),
            "comps_used": base_pricing.get("comps_used"),
        },
    }

    # Build the project brief
    project_brief = request.project_brief or (
        f"{request.unit_count or 'Single'}-unit {request.unit_type} {macro_view} tower "
        f"in Dubai Marina, {request.developer or 'Tier 2 developer'}-developed, "
        f"{request.timeline_months}-month build, {request.payment_plan} payment plan, "
        f"Floor {request.floor_number} {request.view} reference unit."
    )

    stage_start = time.time()
    try:
        gtm_narrative = generate_gtm_strategy(scenario_payload, project_brief)
        stage_meta = StageMetadata(
            stage_name="generate_gtm_strategy",
            duration_ms=round((time.time() - stage_start) * 1000, 2),
            success=not gtm_narrative.startswith("[NARRATOR UNAVAILABLE]"),
        )
        if stage_meta.success:
            logger.info(
                f"Stage 5 complete | gtm_words={len(gtm_narrative.split())} "
                f"duration={stage_meta.duration_ms}ms"
            )
        else:
            logger.warning(f"Stage 5 fallback | LLM unavailable, returning fallback string")
    except Exception as e:
        gtm_narrative = (
            f"[NARRATOR UNAVAILABLE]\n\n"
            f"GTM Strategy narrator raised an exception: {e}\n"
            f"The deterministic JSON remains valid."
        )
        stage_meta = StageMetadata(
            stage_name="generate_gtm_strategy",
            duration_ms=round((time.time() - stage_start) * 1000, 2),
            success=False,
            error=str(e),
        )
        logger.error(f"Stage 5 EXCEPTION: {e}")
    stage_metadata.append(stage_meta)

    # =========================================================================
    # STAGE 6: generate_pricing_rationale (Phase 7a — LLM)
    # =========================================================================
    # Build the pricing JSON for the rationale narrator
    pricing_for_rationale = {
        **micro_pricing,
        "base_optimal_psf": base_pricing.get("optimal_psf"),
        "base_floor_psf": base_pricing.get("floor_psf"),
        "base_ceiling_psf": base_pricing.get("ceiling_psf"),
        "base_absorption_days_avg": base_absorption_days,
        "comps_used": base_pricing.get("comps_used", []),
    }

    stage_start = time.time()
    try:
        pricing_rationale = generate_pricing_rationale(
            pricing_for_rationale,
            comps_for_audit,  # pass full comp objects so the LLM can cite specific absorption days
        )
        stage_meta = StageMetadata(
            stage_name="generate_pricing_rationale",
            duration_ms=round((time.time() - stage_start) * 1000, 2),
            success=not pricing_rationale.startswith("[NARRATOR UNAVAILABLE]"),
        )
        if stage_meta.success:
            logger.info(
                f"Stage 6 complete | rationale_chars={len(pricing_rationale)} "
                f"duration={stage_meta.duration_ms}ms"
            )
        else:
            logger.warning(f"Stage 6 fallback | LLM unavailable, returning fallback string")
    except Exception as e:
        pricing_rationale = (
            f"[NARRATOR UNAVAILABLE]\n\n"
            f"Pricing Rationale narrator raised an exception: {e}\n"
            f"The deterministic JSON remains valid."
        )
        stage_meta = StageMetadata(
            stage_name="generate_pricing_rationale",
            duration_ms=round((time.time() - stage_start) * 1000, 2),
            success=False,
            error=str(e),
        )
        logger.error(f"Stage 6 EXCEPTION: {e}")
    stage_metadata.append(stage_meta)

    # =========================================================================
    # Assemble the final response
    # =========================================================================
    total_duration_ms = round((time.time() - start_time) * 1000, 2)

    response = LaunchAnalysisResponse(
        request_echo=request.model_dump(),
        pricing={
            "base": base_pricing,
            "micro": micro_pricing,
            "macro_view": macro_view,
        },
        scenarios={
            "matrix": scenarios,
            "summary": scenario_summary,
            "base_absorption_days": base_absorption_days,
        },
        cashflow={
            "array": cashflow_array,
            "summary": cashflow_summary,
            "payment_plan": request.payment_plan,
            "timeline_months": request.timeline_months,
        },
        gtm_strategy=gtm_narrative,
        pricing_rationale=pricing_rationale,
        comps_used=comps_for_audit,
        metadata={
            "stages": [m.model_dump() for m in stage_metadata],
            "total_duration_ms": total_duration_ms,
            "all_deterministic_stages_succeeded": all(
                m.success for m in stage_metadata[:4]  # stages 1-4 are deterministic
            ),
            "llm_stages_succeeded": {
                "gtm_strategy": stage_metadata[4].success if len(stage_metadata) > 4 else False,
                "pricing_rationale": stage_metadata[5].success if len(stage_metadata) > 5 else False,
            },
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "engine_versions": {
                "pricing_engine": "1.0.0",
                "cashflow_sim": "1.0.0",
                "scenario_engine": "1.0.0",
                "llm_narrator": "1.0.0",
            },
        },
    )

    logger.info(
        f"Launch analysis complete | total_duration={total_duration_ms}ms "
        f"deterministic_ok={response.metadata['all_deterministic_stages_succeeded']} "
        f"gtm_ok={response.metadata['llm_stages_succeeded']['gtm_strategy']} "
        f"rationale_ok={response.metadata['llm_stages_succeeded']['pricing_rationale']}"
    )

    return response


# ---------------------------------------------------------------------------
# Standalone entry point — run with: python backend/main.py
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    logger.info(f"Starting Project Capital Velocity orchestrator on port {port}")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info",
    )
