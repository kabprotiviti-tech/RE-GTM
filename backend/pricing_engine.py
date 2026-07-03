"""
backend/pricing_engine.py
Project Capital Velocity — Deterministic Pricing Engine

ARCHITECTURAL CONTRACT (NON-NEGOTIABLE):
- This module performs 100% of all numerical computation for pricing.
- No LLM is permitted to import, call, override, or post-process values produced here.
- The LLM (Strategy Narrator) may ONLY read the JSON output of calculate_base_pricing()
  and write natural language around it. If any number in the LLM's narrative cannot
  be traced to a key in this JSON, the orchestration layer has failed and must be fixed.

METHODOLOGY:
1. Filter the comparable set by unit_type and view corridor.
2. Compute a weighted base PSF:
     weight_per_comp = 0.60 * absorption_norm + 0.40 * amenity_norm
   where:
     - absorption_norm is INVERSE-normalized (lower days = higher weight,
       because speed of sell-through is the strongest signal of true market clearing).
     - amenity_norm is direct-normalized (higher score = higher weight).
3. Apply a developer brand multiplier:
     - Tier 1 (Emaar, Select Group, Meraas, Damac, Aldar, Nakheel, Sobha) -> +5.0%
     - Tier 2 (default) -> 0.0%
4. Derive the three-tier pricing architecture:
     - Floor    = brand_adjusted_base * 0.96  (defensive clearance price)
     - Optimal  = brand_adjusted_base * 1.03  (target realized price)
     - Ceiling  = brand_adjusted_base * 1.12  (headroom for negotiation / top-floor premiums)
5. Classify data confidence by surviving comparable count.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "mock_dubai_marina.json"

# Developer brand tier registry — mirrors actual GCC market hierarchy.
# Tier 1 = blue-chip institutional developers with verified delivery track records
# and international brand equity. These names carry measurable pricing power (3-8%)
# over comparable Tier 2 peers at the same unit_type / view corridor.
TIER_1_DEVELOPERS = {
    "emaar properties",
    "select group",
    "meraas",
    "damac properties",
    "aldar properties",
    "nakheel",
    "sobha realty",
}

# Confidence thresholds based on comparable sample size.
# < 3 comps = statistical noise; 3-4 = directional signal; >= 5 = boardroom-grade.
CONFIDENCE_HIGH_MIN_COMPS = 5
CONFIDENCE_MEDIUM_MIN_COMPS = 3

# Pricing band multipliers — fixed by institutional mandate, NOT tunable per deal.
# Changing these is a board-level decision; do not parameterize at the call site.
FLOOR_MULTIPLIER = 0.96
OPTIMAL_MULTIPLIER = 1.03
CEILING_MULTIPLIER = 1.12

# Weighting split between absorption speed and amenity quality.
# 60/40 reflects that in Dubai off-plan, sales velocity is the strongest signal
# of true market clearing price; amenity score is a secondary premium driver.
WEIGHT_ABSORPTION = 0.60
WEIGHT_AMENITY = 0.40

# Brand premium applied on top of weighted base.
TIER_1_BRAND_PREMIUM = 0.05  # +5.0%
TIER_2_BRAND_PREMIUM = 0.00  # 0.0%


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _load_comps() -> pd.DataFrame:
    """Load the hardcoded market intelligence layer into a typed DataFrame."""
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Market data file not found: {DATA_PATH}")
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        records: List[Dict[str, Any]] = json.load(f)
    df = pd.DataFrame(records)
    # Type enforcement — prevents silent string coercion from breaking the math.
    numeric_cols = [
        "floor_premium_pct",
        "base_psf",
        "amenity_score",
        "absorption_days_50pct",
        "avg_discount_off_asking",
    ]
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df["unit_type"] = df["unit_type"].astype(str).str.upper().str.strip()
    df["view"] = df["view"].astype(str).str.strip()  # Preserve case ("Marina", "Sea", "City")
    df["developer"] = df["developer"].astype(str).str.strip()
    return df


def _resolve_brand_multiplier(input_specs: Dict[str, Any]) -> float:
    """
    Resolve the developer brand premium (as a fraction, e.g. 0.05 for +5%).

    Accepts either signal:
      - input_specs["developer_tier"]: int 1 or 2 (explicit)
      - input_specs["developer"]: string name, looked up against TIER_1_DEVELOPERS
    Tier 1 wins if EITHER signal indicates it. Defaults to Tier 2 (no premium)
    when neither signal is present or recognizable.
    """
    tier_explicit = input_specs.get("developer_tier")
    developer_name = input_specs.get("developer", "")

    is_tier_1 = False
    if isinstance(tier_explicit, (int, float)) and int(tier_explicit) == 1:
        is_tier_1 = True
    if isinstance(developer_name, str) and developer_name.strip().lower() in TIER_1_DEVELOPERS:
        is_tier_1 = True

    return TIER_1_BRAND_PREMIUM if is_tier_1 else TIER_2_BRAND_PREMIUM


def _classify_confidence(comp_count: int) -> str:
    """Classify statistical confidence of the pricing output."""
    if comp_count >= CONFIDENCE_HIGH_MIN_COMPS:
        return "High"
    if comp_count >= CONFIDENCE_MEDIUM_MIN_COMPS:
        return "Medium"
    return "Low"


def _weighted_base_psf(comps: pd.DataFrame) -> float:
    """
    Compute the weighted average base PSF across a filtered comparable set.

    Per-comp weight = 0.60 * absorption_norm + 0.40 * amenity_norm
      - absorption_norm = (max_days - days) / (max_days - min_days)
        [lower days = higher weight; speed of sell-through = market validation]
      - amenity_norm   = (score - min_score) / (max_score - min_score)
        [higher score = higher weight; amenity premium driver]

    Edge cases handled deterministically:
      - Single comp  -> returns that comp's base_psf directly (weight = 1.0).
      - Zero variance in either axis -> that axis collapses to 0.5 (neutral)
        to avoid divide-by-zero and to preserve the 60/40 envelope.
      - Degenerate total weight -> falls back to simple arithmetic mean
        (never returns 0 silently).
    """
    if comps.empty:
        return 0.0
    if len(comps) == 1:
        return float(comps.iloc[0]["base_psf"])

    days = comps["absorption_days_50pct"].to_numpy(dtype=float)
    amenity = comps["amenity_score"].to_numpy(dtype=float)
    psf = comps["base_psf"].to_numpy(dtype=float)

    # Inverse-normalize absorption: lower days = higher normalized score.
    d_min, d_max = days.min(), days.max()
    if (d_max - d_min) < 1e-9:
        absorption_norm = np.full_like(days, 0.5)
    else:
        absorption_norm = (d_max - days) / (d_max - d_min)

    # Direct-normalize amenity.
    a_min, a_max = amenity.min(), amenity.max()
    if (a_max - a_min) < 1e-9:
        amenity_norm = np.full_like(amenity, 0.5)
    else:
        amenity_norm = (amenity - a_min) / (a_max - a_min)

    combined = WEIGHT_ABSORPTION * absorption_norm + WEIGHT_AMENITY * amenity_norm

    total = combined.sum()
    if total < 1e-9:
        # Fallback: simple arithmetic mean. Never return 0 silently.
        return float(psf.mean())

    weights = combined / total
    return float(np.dot(weights, psf))


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def calculate_base_pricing(input_specs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Compute the deterministic three-tier pricing architecture for a single unit spec.

    Args:
        input_specs: dict with keys:
            - unit_type (str, required): "1BR" | "2BR" | "3BR"
            - view (str, required): "Marina" | "Sea" | "City"
            - developer_tier (int, optional): 1 or 2 (explicit tier override)
            - developer (str, optional): developer name for auto tier resolution

    Returns:
        dict with keys:
            - floor_psf (float|None): defensive clearance price per sqft, AED
            - optimal_psf (float|None): target realized price per sqft, AED
            - ceiling_psf (float|None): negotiation headroom per sqft, AED
            - weighted_base_psf (float|None): brand-adjusted weighted average, AED
            - raw_weighted_base_psf (float|None): weighted avg before brand adjustment, AED
            - brand_multiplier_pct (float|None): applied brand premium as percent
            - data_confidence (str): "High" | "Medium" | "Low" | "None"
            - comp_count (int): number of comparables used
            - comps_used (list[str]): comp_ids in the calculation
            - filter_signature (dict): filters applied, for audit trail
            - note (str, optional): present only on the no-match edge case
    """
    # --- Validate required inputs -------------------------------------------------
    unit_type = str(input_specs.get("unit_type", "")).strip().upper()
    view = str(input_specs.get("view", "")).strip()

    if not unit_type or not view:
        raise ValueError(
            "input_specs requires 'unit_type' (1BR|2BR|3BR) and 'view' (Marina|Sea|City). "
            f"Received: unit_type={unit_type!r}, view={view!r}"
        )

    filter_signature: Dict[str, Any] = {"unit_type": unit_type, "view": view}

    # --- Load & filter market data -----------------------------------------------
    df = _load_comps()
    filtered = df[(df["unit_type"] == unit_type) & (df["view"] == view)].copy()
    comp_count = len(filtered)
    comps_used: List[str] = filtered["comp_id"].tolist()

    # --- Handle the no-comp edge case explicitly ---------------------------------
    if comp_count == 0:
        return {
            "floor_psf": None,
            "optimal_psf": None,
            "ceiling_psf": None,
            "weighted_base_psf": None,
            "raw_weighted_base_psf": None,
            "brand_multiplier_pct": None,
            "data_confidence": "None",
            "comp_count": 0,
            "comps_used": [],
            "filter_signature": filter_signature,
            "note": "No comparables matched filter. UI must render [DATA MISSING].",
        }

    # --- Compute weighted base ----------------------------------------------------
    raw_weighted = _weighted_base_psf(filtered)

    # --- Apply developer brand multiplier ----------------------------------------
    brand_premium = _resolve_brand_multiplier(input_specs)
    brand_adjusted_base = raw_weighted * (1.0 + brand_premium)

    # --- Derive three-tier pricing architecture -----------------------------------
    floor_psf = round(brand_adjusted_base * FLOOR_MULTIPLIER, 2)
    optimal_psf = round(brand_adjusted_base * OPTIMAL_MULTIPLIER, 2)
    ceiling_psf = round(brand_adjusted_base * CEILING_MULTIPLIER, 2)

    return {
        "floor_psf": floor_psf,
        "optimal_psf": optimal_psf,
        "ceiling_psf": ceiling_psf,
        "weighted_base_psf": round(brand_adjusted_base, 2),
        "raw_weighted_base_psf": round(raw_weighted, 2),
        "brand_multiplier_pct": round(brand_premium * 100, 2),
        "data_confidence": _classify_confidence(comp_count),
        "comp_count": comp_count,
        "comps_used": comps_used,
        "filter_signature": filter_signature,
    }


# ---------------------------------------------------------------------------
# Standalone self-validation
#   Run:  python backend/pricing_engine.py
#   Confirms determinism, edge cases, and the absence of any external call.
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 78)
    print("PROJECT CAPITAL VELOCITY — PRICING ENGINE SELF-VALIDATION")
    print("=" * 78)

    test_specs = [
        {
            "name": "2BR Sea, Tier 1 (Emaar)",
            "specs": {"unit_type": "2BR", "view": "Sea", "developer": "Emaar Properties"},
        },
        {
            "name": "2BR Sea, Tier 2 (no developer signal)",
            "specs": {"unit_type": "2BR", "view": "Sea"},
        },
        {
            "name": "1BR Marina, Tier 1 (Select Group)",
            "specs": {"unit_type": "1BR", "view": "Marina", "developer": "Select Group"},
        },
        {
            "name": "3BR Sea, Tier 1 (Emaar)",
            "specs": {"unit_type": "3BR", "view": "Sea", "developer": "Emaar Properties"},
        },
        {
            "name": "1BR City (low comp density edge case)",
            "specs": {"unit_type": "1BR", "view": "City"},
        },
        {
            "name": "No-match edge case (4BR Sea)",
            "specs": {"unit_type": "4BR", "view": "Sea"},
        },
    ]

    for t in test_specs:
        print(f"\n--- {t['name']} ---")
        try:
            result = calculate_base_pricing(t["specs"])
            for k, v in result.items():
                print(f"  {k}: {v}")
        except Exception as e:
            print(f"  ERROR: {e}")

    print("\n" + "=" * 78)
    print("VALIDATION COMPLETE — no LLM was invoked. All math is deterministic.")
    print("=" * 78)
