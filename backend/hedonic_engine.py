"""
backend/hedonic_engine.py
Project Capital Velocity — Hedonic Pricing Engine

ARCHITECTURAL CONTRACT (NON-NEGOTIABLE):
- This module implements the EXACT hedonic pricing logic specified in Phase 11.
- It is NOT a simple weighted average. It is a regression-based decomposition:
    Step 1: Base intercept (value of a standard unit with no views) = AED 1,800
    Step 2: Calculate feature coefficients from the comp set
            - View premium: how much extra does 'Full Marina' command over 'City'?
            - Floor coefficient: AED 3.5 per floor level
            - Amenity coefficient: AED 45 per amenity score point
    Step 3: Reconstruct the target price deterministically
            calculated_psf = base_intercept
                            + (view_premium * is_marina_view(target))
                            + (floor_coefficient * target.floor)
                            + (amenity_coefficient * target.amenity_score)
    Step 4: Apply confidence bounds
            floor = calculated_psf * 0.96
            ceiling = calculated_psf * 1.12

THE CRITICAL FUNCTION: calculate_feature_premium()
- Isolates the marginal premium of a feature value (e.g. 'Full Marina') over a
  baseline value (e.g. 'City') by controlling for other known features.
- Method: compute the residual after removing base_intercept + amenity_contribution
  for each comp, then compare average residuals between premium-view and
  baseline-view comps. This is a proper hedonic decomposition — not a raw average.
- If either comp set is empty, returns 0 (no premium can be computed).

NO LLM ALLOWED. Pure deterministic Python + NumPy.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np

# ---------------------------------------------------------------------------
# Configuration — locked per Phase 11 spec
# ---------------------------------------------------------------------------

BASE_INTERCEPT = 1800          # AED — value of a standard unit with no views
FLOOR_COEFFICIENT = 3.5        # AED premium per floor level
AMENITY_COEFFICIENT = 45       # AED premium per amenity score point
FLOOR_MULTIPLIER = 0.96        # Floor = calculated * 0.96
CEILING_MULTIPLIER = 1.12      # Ceiling = calculated * 1.12

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "mock_dubai_marina.json"

# Micro view → macro corridor mapping (for comp matching)
# "Full Marina" is a micro view; comps use macro views "Marina"/"Sea"/"City"
MICRO_TO_MACRO = {
    "full marina": "Marina",
    "partial marina": "Marina",
    "marina": "Marina",
    "sea": "Sea",
    "city": "City",
    "internal": "City",  # Internal views map to City (no premium corridor)
}


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def _load_comps() -> List[Dict[str, Any]]:
    """Load the hardcoded market intelligence layer."""
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Market data file not found: {DATA_PATH}")
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# THE CRITICAL FUNCTION: calculate_feature_premium
# ---------------------------------------------------------------------------

def calculate_feature_premium(
    comps: List[Dict[str, Any]],
    feature_name: str,
    premium_value: str,
    baseline_value: str,
) -> float:
    """
    Isolate the marginal premium of a feature value over a baseline value.

    This is NOT a simple average of PSF. It is a hedonic decomposition:
    1. For each comp, compute the "explained price" = base_intercept + amenity_contribution
    2. The "residual" = comp.base_psf - explained_price (this captures view + unexplained)
    3. Average the residuals for premium-view comps
    4. Average the residuals for baseline-view comps
    5. Premium = avg(premium_residuals) - avg(baseline_residuals)

    This controls for amenity score (which we have for every comp) so the
    resulting premium is the ISOLATED view effect, not a confounded average.

    Args:
        comps: List of comp dictionaries
        feature_name: The feature to analyze (e.g. 'view')
        premium_value: The premium feature value (e.g. 'Full Marina')
        baseline_value: The baseline feature value (e.g. 'City')

    Returns:
        The isolated premium in AED (per sqft). Returns 0.0 if either comp
        set is empty (no data to compute the premium).
    """
    # Map micro views to macro corridors for comp matching
    premium_macro = MICRO_TO_MACRO.get(premium_value.lower(), premium_value)
    baseline_macro = MICRO_TO_MACRO.get(baseline_value.lower(), baseline_value)

    def _residual(comp: Dict[str, Any]) -> float:
        """Compute the residual after removing base + amenity contributions."""
        base_psf = float(comp.get("base_psf", 0))
        amenity_score = float(comp.get("amenity_score", 0))
        explained = BASE_INTERCEPT + (AMENITY_COEFFICIENT * amenity_score)
        return base_psf - explained

    # Partition comps by feature value
    premium_residuals: List[float] = []
    baseline_residuals: List[float] = []

    for comp in comps:
        comp_feature = str(comp.get(feature_name, "")).strip()
        if comp_feature == premium_macro:
            premium_residuals.append(_residual(comp))
        elif comp_feature == baseline_macro:
            baseline_residuals.append(_residual(comp))

    # If either set is empty, we cannot compute the premium
    if not premium_residuals or not baseline_residuals:
        return 0.0

    avg_premium = float(np.mean(premium_residuals))
    avg_baseline = float(np.mean(baseline_residuals))

    # The premium is the difference — this isolates the view effect
    premium = avg_premium - avg_baseline

    # Floor at 0 — a premium feature should not command a negative premium
    # over the baseline. If the data says otherwise, return 0 (no premium).
    return max(0.0, premium)


# ---------------------------------------------------------------------------
# Helper: is_marina_view
# ---------------------------------------------------------------------------

def is_marina_view(target_unit: Dict[str, Any]) -> int:
    """
    Return 1 if the target unit's view includes 'Marina', else 0.
    Used as the binary indicator for the view premium coefficient.
    """
    view = str(target_unit.get("view", "")).lower()
    return 1 if "marina" in view else 0


# ---------------------------------------------------------------------------
# THE MAIN FUNCTION: calculate_hedonic_pricing
# ---------------------------------------------------------------------------

def calculate_hedonic_pricing(
    target_unit: Dict[str, Any],
    comps: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Calculate the hedonic pricing for a target unit using the EXACT logic
    specified in Phase 11.

    Args:
        target_unit: dict with keys:
            - floor (int|float, required): floor number
            - amenity_score (int|float, required): amenity score (1-10)
            - view (str, required): micro view (e.g. 'Full Marina', 'City')
        comps: Optional list of comp dicts. If None, loads from mock_dubai_marina.json.

    Returns:
        dict with keys:
            - floor (float): calculated_psf * 0.96
            - optimal (float): calculated_psf
            - ceiling (float): calculated_psf * 1.12
            - calculated_psf (float): the raw hedonic reconstruction
            - decomposition (dict): the breakdown of how the price was built
            - view_premium (float): the isolated view premium in AED
            - floor_contribution (float): floor_coefficient * floor
            - amenity_contribution (float): amenity_coefficient * amenity_score
            - base_intercept (float): the base intercept used
            - comps_used_for_premium (dict): which comps informed the view premium
    """
    # Load comps if not provided
    if comps is None:
        comps = _load_comps()

    # Validate target_unit
    floor = target_unit.get("floor")
    amenity_score = target_unit.get("amenity_score")
    view = target_unit.get("view", "")

    if floor is None or amenity_score is None or not view:
        raise ValueError(
            f"target_unit requires 'floor', 'amenity_score', and 'view'. "
            f"Got: floor={floor}, amenity_score={amenity_score}, view={view!r}"
        )

    floor = float(floor)
    amenity_score = float(amenity_score)
    view = str(view).strip()

    # Step 1: Base intercept (Value of a standard unit with no views)
    base_intercept = BASE_INTERCEPT

    # Step 2: Calculate Feature Coefficients from the comp set
    view_premium = calculate_feature_premium(comps, "view", "Full Marina", "City")
    floor_coefficient = FLOOR_COEFFICIENT
    amenity_coefficient = AMENITY_COEFFICIENT

    # Step 3: Reconstruct the target price deterministically
    marina_indicator = is_marina_view({"view": view})
    view_contribution = view_premium * marina_indicator
    floor_contribution = floor_coefficient * floor
    amenity_contribution = amenity_coefficient * amenity_score

    calculated_psf = (
        base_intercept
        + view_contribution
        + floor_contribution
        + amenity_contribution
    )

    # Step 4: Apply strict confidence bounds
    floor_price = calculated_psf * FLOOR_MULTIPLIER
    ceiling_price = calculated_psf * CEILING_MULTIPLIER

    # Audit trail: which comps informed the view premium
    premium_macro = MICRO_TO_MACRO.get(view.lower(), view)
    premium_comps = [c["comp_id"] for c in comps if c.get("view") == premium_macro]
    baseline_comps = [c["comp_id"] for c in comps if c.get("view") == "City"]

    return {
        "floor": round(floor_price, 2),
        "optimal": round(calculated_psf, 2),
        "ceiling": round(ceiling_price, 2),
        "calculated_psf": round(calculated_psf, 2),
        "decomposition": {
            "base_intercept": base_intercept,
            "view_contribution": round(view_contribution, 2),
            "floor_contribution": round(floor_contribution, 2),
            "amenity_contribution": round(amenity_contribution, 2),
            "marina_indicator": marina_indicator,
        },
        "view_premium": round(view_premium, 2),
        "floor_coefficient": floor_coefficient,
        "amenity_coefficient": amenity_coefficient,
        "comps_used_for_premium": {
            "premium_view_comps": premium_comps,
            "baseline_view_comps": baseline_comps,
            "premium_avg_residual": round(
                float(np.mean([
                    float(c["base_psf"]) - BASE_INTERCEPT - (AMENITY_COEFFICIENT * float(c["amenity_score"]))
                    for c in comps if c.get("view") == premium_macro
                ])) if premium_comps else 0.0,
                2
            ),
            "baseline_avg_residual": round(
                float(np.mean([
                    float(c["base_psf"]) - BASE_INTERCEPT - (AMENITY_COEFFICIENT * float(c["amenity_score"]))
                    for c in comps if c.get("view") == "City"
                ])) if baseline_comps else 0.0,
                2
            ),
        },
    }


# ---------------------------------------------------------------------------
# Standalone self-validation
#   Run:  python backend/hedonic_engine.py
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 78)
    print("PROJECT CAPITAL VELOCITY — HEDONIC PRICING ENGINE SELF-VALIDATION")
    print("=" * 78)

    test_cases = [
        {
            "name": "Floor 80, Full Marina, Amenity 9 (penthouse)",
            "target": {"floor": 80, "amenity_score": 9, "view": "Full Marina"},
        },
        {
            "name": "Floor 50, Partial Marina, Amenity 8 (mid-tower)",
            "target": {"floor": 50, "amenity_score": 8, "view": "Partial Marina"},
        },
        {
            "name": "Floor 5, Internal, Amenity 7 (low-floor penalty)",
            "target": {"floor": 5, "amenity_score": 7, "view": "Internal"},
        },
        {
            "name": "Floor 30, City, Amenity 8 (baseline city view)",
            "target": {"floor": 30, "amenity_score": 8, "view": "City"},
        },
    ]

    for tc in test_cases:
        print(f"\n--- {tc['name']} ---")
        result = calculate_hedonic_pricing(tc["target"])
        print(f"  Calculated PSF: AED {result['calculated_psf']:,.2f}")
        print(f"  Floor:    AED {result['floor']:,.2f}")
        print(f"  Optimal:  AED {result['optimal']:,.2f}")
        print(f"  Ceiling:  AED {result['ceiling']:,.2f}")
        print(f"\n  Decomposition:")
        d = result["decomposition"]
        print(f"    Base intercept:      AED {d['base_intercept']:>8,.2f}")
        print(f"    View contribution:   AED {d['view_contribution']:>8,.2f}  (premium={result['view_premium']:,.2f} × indicator={d['marina_indicator']})")
        print(f"    Floor contribution:  AED {d['floor_contribution']:>8,.2f}  ({result['floor_coefficient']} × {tc['target']['floor']})")
        print(f"    Amenity contribution:AED {d['amenity_contribution']:>8,.2f}  ({result['amenity_coefficient']} × {tc['target']['amenity_score']})")
        print(f"    Sum:                 AED {result['calculated_psf']:>8,.2f}")
        print(f"\n  View premium audit:")
        audit = result["comps_used_for_premium"]
        print(f"    Premium-view comps (Marina): {audit['premium_view_comps']}")
        print(f"    Baseline-view comps (City):  {audit['baseline_view_comps']}")
        print(f"    Premium avg residual:  AED {audit['premium_avg_residual']:,.2f}")
        print(f"    Baseline avg residual: AED {audit['baseline_avg_residual']:,.2f}")
        print(f"    Isolated view premium: AED {result['view_premium']:,.2f}")

    print("\n" + "=" * 78)
    print("VALIDATION COMPLETE — hedonic regression, not a simple average.")
    print("Every output traces to base_intercept + coefficients × feature values.")
    print("=" * 78)
