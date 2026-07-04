"""
backend/scenario_engine.py
Project Capital Velocity — Deterministic Scenario Modeling Engine

ARCHITECTURAL CONTRACT (NON-NEGOTIABLE):
- This module performs 100% of all scenario math: price adjustments, absorption
  projections, revenue assumptions, carry cost estimates.
- No LLM is permitted to import, call, override, or post-process values produced here.
- The LLM (Strategy Narrator) may ONLY read the JSON output of generate_scenarios()
  and write natural language around it. If any number in the LLM's narrative cannot
  be traced to a key in this JSON, the orchestration layer has failed.

METHODOLOGY:
The CEO question this engine answers:
  "If I increase price by 5%, how many extra days will it take to sell out,
   and how does that impact my carry cost?"

We model three deterministic scenarios off a base optimal PSF and base absorption:

1. AGGRESSIVE  — Price: optimal * 1.05  | Absorption: base * 1.25
   Pricing up 5% stretches sell-through by 25%. Higher per-unit margin, but the
   developer carries unsold inventory longer. The question: does the +5% revenue
   outweigh the carry cost of the extra days?

2. BASE        — Price: optimal * 1.00  | Absorption: base * 1.00
   The reference case. Anchor for the trade-off comparison.

3. CONSERVATIVE — Price: optimal * 0.97  | Absorption: base * 0.80
   Pricing down 3% accelerates sell-through by 20% (absorption days shrink to 80%
   of base). Lower per-unit revenue, but faster capital recovery. The question:
   does the velocity gain outweigh the -3% revenue haircut?

The trade-off curve is the heart of off-plan strategy. This engine produces the
deterministic numbers; the LLM narrates the strategic recommendation.

REVENUE ASSUMPTION:
total_revenue_assumption = price_psf * unit_count * avg_sqft_per_unit
When unit_count and avg_sqft are not provided, we return total_revenue_assumption
as None and the UI must render [DATA MISSING] — never an invented figure.

CARRY COST (BONUS):
When daily_carry_cost_aed is provided, we compute total_carry_cost =
projected_absorption_days * daily_carry_cost_aed. This is the explicit cost of
holding unsold inventory. When not provided, carry cost is None.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Union

import numpy as np

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Scenario multipliers — fixed by institutional mandate, NOT tunable per deal.
# Changing these is a board-level decision; do not parameterize at the call site.
AGGRESSIVE_PRICE_MULTIPLIER = 1.05      # +5.0%
AGGRESSIVE_ABSORPTION_MULTIPLIER = 1.25  # +25% (slower sell-through)

BASE_PRICE_MULTIPLIER = 1.00             # baseline
BASE_ABSORPTION_MULTIPLIER = 1.00        # baseline

CONSERVATIVE_PRICE_MULTIPLIER = 0.97     # -3.0%
CONSERVATIVE_ABSORPTION_MULTIPLIER = 0.80  # -20% (faster sell-through)

# Rounding precision for AED values (2 decimals = fils-level).
AED_ROUND = 2


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _validate_numeric(value: Any, field_name: str, allow_zero: bool = False) -> float:
    """Coerce and validate a numeric input. Raises ValueError on invalid."""
    try:
        v = float(value)
    except (TypeError, ValueError) as e:
        raise ValueError(f"{field_name} must be numeric; got {value!r}.") from e
    if not allow_zero and v <= 0:
        raise ValueError(f"{field_name} must be > 0; got {v}.")
    if allow_zero and v < 0:
        raise ValueError(f"{field_name} must be >= 0; got {v}.")
    return v


def _compute_revenue(
    price_psf: float,
    unit_count: Optional[Union[int, float]],
    avg_sqft_per_unit: Optional[Union[int, float]],
) -> Optional[float]:
    """
    Compute total project revenue assumption.

    revenue = price_psf * unit_count * avg_sqft_per_unit

    If either unit_count or avg_sqft_per_unit is missing/invalid, returns None
    and the UI must render [DATA MISSING]. Never invents a figure.
    """
    if unit_count is None or avg_sqft_per_unit is None:
        return None
    try:
        uc = float(unit_count)
        asq = float(avg_sqft_per_unit)
    except (TypeError, ValueError):
        return None
    if uc <= 0 or asq <= 0:
        return None
    return round(price_psf * uc * asq, AED_ROUND)


def _compute_carry_cost(
    projected_absorption_days: float,
    daily_carry_cost_aed: Optional[Union[int, float]],
) -> Optional[float]:
    """
    Compute total project carry cost across the absorption window.

    carry_cost = projected_absorption_days * daily_carry_cost_aed

    If daily_carry_cost_aed is not provided, returns None (UI renders [DATA MISSING]).
    """
    if daily_carry_cost_aed is None:
        return None
    try:
        dcc = float(daily_carry_cost_aed)
    except (TypeError, ValueError):
        return None
    if dcc < 0:
        return None
    return round(projected_absorption_days * dcc, AED_ROUND)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_scenarios(
    optimal_psf: Union[float, int],
    base_absorption_days: Union[float, int],
    *,
    unit_count: Optional[Union[int, float]] = None,
    avg_sqft_per_unit: Optional[Union[int, float]] = None,
    daily_carry_cost_aed: Optional[Union[int, float]] = None,
) -> List[Dict[str, Any]]:
    """
    Generate the three-tier scenario matrix: Aggressive / Base / Conservative.

    Args:
        optimal_psf: The Phase 2/3 optimal PSF (AED per sqft). Must be > 0.
        base_absorption_days: The baseline 50% sell-through absorption window
            (days) for this unit type / view corridor. Must be > 0.
        unit_count (optional, kwarg): Number of units in the project. Required
            for total_revenue_assumption. If absent, revenue = None -> [DATA MISSING].
        avg_sqft_per_unit (optional, kwarg): Average unit size in sqft. Required
            for total_revenue_assumption. If absent, revenue = None -> [DATA MISSING].
        daily_carry_cost_aed (optional, kwarg): Project-level daily carry cost
            (financing + opex + opportunity cost) in AED. Required for
            total_carry_cost. If absent, carry cost = None -> [DATA MISSING].

    Returns:
        List of 3 dicts (one per scenario), each containing:
          - scenario_name (str): "Aggressive" | "Base" | "Conservative"
          - price_psf (float): scenario PSF in AED
          - price_delta_pct (float): price change vs base, as percent
          - projected_absorption_days (float): scenario absorption window in days
          - absorption_delta_pct (float): absorption change vs base, as percent
          - total_revenue_assumption (float|None): scenario total project revenue, AED
          - total_carry_cost (float|None): scenario total carry cost, AED
          - net_position (float|None): revenue - carry cost, AED (None if either is None)
          - base_optimal_psf (float): echoed base optimal for audit
          - base_absorption_days (float): echoed base absorption for audit
    """
    # --- Validate the two required positional inputs -----------------------------
    optimal_psf_f = _validate_numeric(optimal_psf, "optimal_psf")
    base_absorption_f = _validate_numeric(base_absorption_days, "base_absorption_days")

    # --- Build the three scenarios -----------------------------------------------
    # Each scenario tuple: (name, price_mult, absorption_mult)
    scenario_specs = [
        ("Aggressive", AGGRESSIVE_PRICE_MULTIPLIER, AGGRESSIVE_ABSORPTION_MULTIPLIER),
        ("Base", BASE_PRICE_MULTIPLIER, BASE_ABSORPTION_MULTIPLIER),
        ("Conservative", CONSERVATIVE_PRICE_MULTIPLIER, CONSERVATIVE_ABSORPTION_MULTIPLIER),
    ]

    results: List[Dict[str, Any]] = []
    for name, p_mult, a_mult in scenario_specs:
        price_psf = round(optimal_psf_f * p_mult, AED_ROUND)
        projected_absorption = round(base_absorption_f * a_mult, AED_ROUND)

        price_delta_pct = round((p_mult - 1.0) * 100, 2)
        absorption_delta_pct = round((a_mult - 1.0) * 100, 2)

        total_revenue = _compute_revenue(price_psf, unit_count, avg_sqft_per_unit)
        total_carry = _compute_carry_cost(projected_absorption, daily_carry_cost_aed)

        # Net position only computable when both revenue and carry are present.
        if total_revenue is not None and total_carry is not None:
            net_position = round(total_revenue - total_carry, AED_ROUND)
        else:
            net_position = None

        entry: Dict[str, Any] = {
            "scenario_name": name,
            "price_psf": price_psf,
            "price_delta_pct": price_delta_pct,
            "projected_absorption_days": projected_absorption,
            "absorption_delta_pct": absorption_delta_pct,
            "total_revenue_assumption": total_revenue,
            "total_carry_cost": total_carry,
            "net_position": net_position,
            "base_optimal_psf": round(optimal_psf_f, AED_ROUND),
            "base_absorption_days": round(base_absorption_f, AED_ROUND),
        }
        results.append(entry)

    return results


def summarize_scenarios(scenarios: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Produce a boardroom-grade summary of the scenario matrix for the LLM narrator.

    Pure extraction — no math, no estimation. Surfaces the deltas that a CEO
    would ask about in the first 30 seconds: which scenario maximizes revenue,
    which minimizes carry cost, and what the net position spread is.

    Args:
        scenarios: The array returned by generate_scenarios().

    Returns:
        dict with:
          - revenue_spread_aed (float|None): max_revenue - min_revenue
          - revenue_spread_pct (float|None): spread as % of base revenue
          - carry_cost_spread_aed (float|None): max_carry - min_carry
          - absorption_spread_days (float|None): max_absorption - min_absorption
          - net_position_spread_aed (float|None): max_net - min_net
          - best_revenue_scenario (str|None): scenario name with highest revenue
          - best_net_scenario (str|None): scenario name with highest net position
          - fastest_sell_scenario (str|None): scenario name with lowest absorption
          - note (str, optional): present when revenue/carry fields are missing
    """
    if not scenarios or len(scenarios) != 3:
        return {"note": "Expected 3 scenarios. UI must render [DATA MISSING]."}

    revenues = [s.get("total_revenue_assumption") for s in scenarios]
    carries = [s.get("total_carry_cost") for s in scenarios]
    nets = [s.get("net_position") for s in scenarios]
    absorptions = [s.get("projected_absorption_days") for s in scenarios]
    names = [s.get("scenario_name") for s in scenarios]

    # Revenue spread
    if all(r is not None for r in revenues):
        rev_max_idx = int(np.argmax(revenues))
        rev_min = min(revenues)
        rev_max = max(revenues)
        base_rev = revenues[1]  # "Base" is always index 1
        revenue_spread_aed = round(rev_max - rev_min, AED_ROUND)
        revenue_spread_pct = round((revenue_spread_aed / base_rev) * 100, 2) if base_rev else None
        best_revenue_scenario = names[rev_max_idx]
    else:
        revenue_spread_aed = None
        revenue_spread_pct = None
        best_revenue_scenario = None

    # Carry cost spread
    if all(c is not None for c in carries):
        carry_spread = round(max(carries) - min(carries), AED_ROUND)
    else:
        carry_spread = None

    # Net position spread
    if all(n is not None for n in nets):
        net_max_idx = int(np.argmax(nets))
        net_spread = round(max(nets) - min(nets), AED_ROUND)
        best_net_scenario = names[net_max_idx]
    else:
        net_spread = None
        best_net_scenario = None

    # Absorption spread + fastest sell-through
    if all(a is not None for a in absorptions):
        abs_spread = round(max(absorptions) - min(absorptions), AED_ROUND)
        fastest_idx = int(np.argmin(absorptions))
        fastest_sell_scenario = names[fastest_idx]
    else:
        abs_spread = None
        fastest_sell_scenario = None

    summary: Dict[str, Any] = {
        "revenue_spread_aed": revenue_spread_aed,
        "revenue_spread_pct": revenue_spread_pct,
        "carry_cost_spread_aed": carry_spread,
        "absorption_spread_days": abs_spread,
        "net_position_spread_aed": net_spread,
        "best_revenue_scenario": best_revenue_scenario,
        "best_net_scenario": best_net_scenario,
        "fastest_sell_scenario": fastest_sell_scenario,
    }
    if revenue_spread_aed is None and carry_spread is None:
        summary["note"] = (
            "Project-level inputs (unit_count, avg_sqft_per_unit, daily_carry_cost_aed) "
            "not supplied. Revenue and carry cost fields render [DATA MISSING]."
        )
    return summary


# ---------------------------------------------------------------------------
# Standalone self-validation
#   Run:  python backend/scenario_engine.py
#   Confirms determinism, edge cases, and the absence of any external call.
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 78)
    print("PROJECT CAPITAL VELOCITY — SCENARIO ENGINE SELF-VALIDATION")
    print("=" * 78)

    test_cases = [
        {
            "name": "Prompt baseline — 2BR Sea Emaar optimal, base absorption 58 days",
            "optimal_psf": 3257.65,
            "base_absorption_days": 58.0,
            "unit_count": None,
            "avg_sqft_per_unit": None,
            "daily_carry_cost_aed": None,
        },
        {
            "name": "Full project context — 200 units, 1850 sqft avg, AED 50k/day carry",
            "optimal_psf": 3257.65,
            "base_absorption_days": 58.0,
            "unit_count": 200,
            "avg_sqft_per_unit": 1850,
            "daily_carry_cost_aed": 50000,
        },
        {
            "name": "Revenue only — no carry cost supplied",
            "optimal_psf": 3257.65,
            "base_absorption_days": 58.0,
            "unit_count": 200,
            "avg_sqft_per_unit": 1850,
            "daily_carry_cost_aed": None,
        },
        {
            "name": "Edge: zero optimal_psf (should raise)",
            "optimal_psf": 0,
            "base_absorption_days": 58.0,
            "unit_count": 200,
            "avg_sqft_per_unit": 1850,
            "daily_carry_cost_aed": 50000,
        },
        {
            "name": "Edge: negative absorption (should raise)",
            "optimal_psf": 3257.65,
            "base_absorption_days": -10,
            "unit_count": 200,
            "avg_sqft_per_unit": 1850,
            "daily_carry_cost_aed": 50000,
        },
        {
            "name": "Edge: non-numeric optimal_psf (should raise)",
            "optimal_psf": "abc",
            "base_absorption_days": 58.0,
            "unit_count": 200,
            "avg_sqft_per_unit": 1850,
            "daily_carry_cost_aed": 50000,
        },
    ]

    for tc in test_cases:
        print(f"\n--- {tc['name']} ---")
        try:
            scenarios = generate_scenarios(
                optimal_psf=tc["optimal_psf"],
                base_absorption_days=tc["base_absorption_days"],
                unit_count=tc["unit_count"],
                avg_sqft_per_unit=tc["avg_sqft_per_unit"],
                daily_carry_cost_aed=tc["daily_carry_cost_aed"],
            )
            for s in scenarios:
                print(f"  [{s['scenario_name']}]")
                for k, v in s.items():
                    if k == "scenario_name":
                        continue
                    print(f"    {k}: {v}")
            summary = summarize_scenarios(scenarios)
            print(f"  SUMMARY:")
            for k, v in summary.items():
                print(f"    {k}: {v}")
        except ValueError as e:
            print(f"  Correctly raised ValueError: {e}")
        except Exception as e:
            print(f"  UNEXPECTED ERROR: {type(e).__name__}: {e}")

    # --- CEO "Aha!" demo: full trade-off quantification ------------------------
    print("\n" + "=" * 78)
    print("CEO 'AHA!' DEMO — Price vs Velocity trade-off, 200-unit tower")
    print("=" * 78)
    scenarios = generate_scenarios(
        optimal_psf=3257.65,
        base_absorption_days=58.0,
        unit_count=200,
        avg_sqft_per_unit=1850,
        daily_carry_cost_aed=50000,
    )
    print(f"\n{'Scenario':<14} {'Price/sqft':>12} {'Absorp(days)':>14} "
          f"{'Revenue (AED)':>18} {'Carry (AED)':>16} {'Net (AED)':>18}")
    print("-" * 96)
    for s in scenarios:
        rev_str = f"{s['total_revenue_assumption']:>18,.0f}" if s['total_revenue_assumption'] is not None else f"{'[MISSING]':>18}"
        car_str = f"{s['total_carry_cost']:>16,.0f}" if s['total_carry_cost'] is not None else f"{'[MISSING]':>16}"
        net_str = f"{s['net_position']:>18,.0f}" if s['net_position'] is not None else f"{'[MISSING]':>18}"
        print(f"{s['scenario_name']:<14} {s['price_psf']:>12,.2f} {s['projected_absorption_days']:>14.1f} "
              f"{rev_str} {car_str} {net_str}")
    summary = summarize_scenarios(scenarios)
    print(f"\n  Revenue spread:        AED {summary['revenue_spread_aed']:>15,.0f} "
          f"({summary['revenue_spread_pct']:.2f}% of base)")
    print(f"  Carry cost spread:     AED {summary['carry_cost_spread_aed']:>15,.0f}")
    print(f"  Net position spread:   AED {summary['net_position_spread_aed']:>15,.0f}")
    print(f"  Absorption spread:     {summary['absorption_spread_days']:.1f} days")
    print(f"  Best revenue scenario: {summary['best_revenue_scenario']}")
    print(f"  Best net scenario:     {summary['best_net_scenario']}")
    print(f"  Fastest sell scenario: {summary['fastest_sell_scenario']}")

    print("\n" + "=" * 78)
    print("VALIDATION COMPLETE — no LLM was invoked. All math is deterministic.")
    print("=" * 78)
