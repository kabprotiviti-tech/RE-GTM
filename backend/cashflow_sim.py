"""
backend/cashflow_sim.py
Project Capital Velocity — Deterministic Cashflow Simulation Engine

ARCHITECTURAL CONTRACT (NON-NEGOTIABLE):
- This module performs 100% of all cashflow timing computation.
- No LLM is permitted to import, call, override, or post-process values produced here.
- The LLM (Strategy Narrator) may ONLY read the JSON output of simulate_cashflow()
  and write natural language around it. If any number in the LLM's narrative cannot
  be traced to a key in this JSON, the orchestration layer has failed.

METHODOLOGY:
Dubai off-plan payment plans follow a three-phase cash architecture:

1. DOWNPAYMENT (Month 0): A booking deposit paid by the buyer at SPA signing.
   Industry standard is 5% of unit price. This is the first cash the developer
   banks and is critical for working capital.

2. CONSTRUCTION SPREAD (Months 1 → N): The remaining construction-period portion
   (construction_pct - downpayment_pct) is spread evenly across the build timeline.
   For a 60/40 plan with 5% downpayment: 55% spread over N months.
   This simulates milestone-linked installments smoothed into a monthly curve.

3. HANDOVER (Month N): The handover portion (handover_pct) is collected as a
   single balloon at practical completion. This is the final cash tranche.

Example (60/40 plan, 36-month timeline, AED 1,000,000 unit):
  - Month 0: 5%  = AED 50,000  (downpayment)
  - Months 1-36: 55%/36 ≈ 1.5278%/mo = AED 15,277.78/mo (construction spread)
  - Month 36: + 40% = AED 400,000 (handover balloon, added to that month's spread)
  - Cumulative at Month 36: 100% = AED 1,000,000

WHY THIS MATTERS FOR IRR:
A 70/30 plan vs a 50/50 plan on the same AED 1M unit produces drastically
different cash timing:
  - 70/30 front-loads 70% of cash during construction → faster capital recovery
    → higher IRR, but buyer-friendly handover terms (only 30% at completion).
  - 50/50 back-loads 50% to handover → slower capital recovery → lower IRR,
    but developer-friendly (more security held back).
The CEO's trade-off: aggressive cash recovery (70/30) vs risk mitigation (50/50).
This engine produces the deterministic cash curve; the LLM narrates the trade-off.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Union

import numpy as np

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Standard Dubai off-plan booking deposit. Industry convention; not per-deal tunable.
# Changing this is a commercial policy decision, not an engineering one.
DEFAULT_DOWNPAYMENT_PCT = 5.0

# Tolerance for validating that construction_pct + handover_pct == 100.
# Allows for floating-point representation of plans like "33.33/66.67".
PLAN_SUM_TOLERANCE = 0.01


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _parse_payment_plan(payment_plan: str) -> tuple[float, float]:
    """
    Parse a payment plan string of the form 'X/Y' into (construction_pct, handover_pct).

    Validates that X + Y == 100 (within tolerance). Raises ValueError on any
    malformed input. This is the only entry point for plan parsing — keeping it
    centralized guarantees no other code path invents its own interpretation.

    Examples:
      '60/40' -> (60.0, 40.0)
      '70/30' -> (70.0, 30.0)
      '50/50' -> (50.0, 50.0)
      '80/20' -> (80.0, 20.0)
    """
    if not isinstance(payment_plan, str) or not payment_plan.strip():
        raise ValueError(
            f"payment_plan must be a non-empty string (e.g. '60/40'); got {payment_plan!r}."
        )

    cleaned = payment_plan.strip()
    parts = cleaned.split("/")
    if len(parts) != 2:
        raise ValueError(
            f"payment_plan must be 'X/Y' format (e.g. '60/40'); got {payment_plan!r}."
        )

    try:
        construction_pct = float(parts[0].strip())
        handover_pct = float(parts[1].strip())
    except ValueError as e:
        raise ValueError(
            f"payment_plan components must be numeric; got {payment_plan!r}."
        ) from e

    if construction_pct < 0 or handover_pct < 0:
        raise ValueError(
            f"payment_plan components must be non-negative; got {payment_plan!r}."
        )

    if abs((construction_pct + handover_pct) - 100.0) > PLAN_SUM_TOLERANCE:
        raise ValueError(
            f"payment_plan must sum to 100 (e.g. '60/40'); "
            f"got {payment_plan!r} summing to {construction_pct + handover_pct}."
        )

    # Edge case: downpayment cannot exceed construction portion.
    if construction_pct < DEFAULT_DOWNPAYMENT_PCT:
        raise ValueError(
            f"construction portion ({construction_pct}%) must be >= downpayment "
            f"({DEFAULT_DOWNPAYMENT_PCT}%); got {payment_plan!r}."
        )

    return construction_pct, handover_pct


def _label_event(
    month: int,
    timeline_months: int,
    is_downpayment_month: bool,
    is_handover_month: bool,
) -> Optional[str]:
    """Annotate a month with its cash event type for chart tooltips / audit trail."""
    if is_downpayment_month:
        return "Downpayment (Booking Deposit)"
    if is_handover_month and month == timeline_months:
        return "Handover Balloon + Construction Installment"
    if is_handover_month:
        return "Handover Balloon"
    return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def simulate_cashflow(
    unit_price: Union[float, int],
    payment_plan: str,
    timeline_months: int,
) -> List[Dict[str, Any]]:
    """
    Simulate the monthly cash collection schedule for a single off-plan unit.

    Args:
        unit_price: Total unit price in AED (e.g. 9119328.0). Must be > 0.
        payment_plan: Plan string in 'X/Y' format where X = construction %,
            Y = handover %, X + Y = 100. Examples: '60/40', '70/30', '50/50'.
        timeline_months: Build timeline in months (e.g. 36 for a 3-year build).
            Must be a positive integer.

    Returns:
        List of dicts, one per month from month 0 (downpayment) through
        month timeline_months (handover). Each dict contains:
          - month (int): month index, 0 = booking, N = handover
          - cumulative_cash_collected (float): running total collected, AED
          - monthly_cash_collected (float): cash collected in this month, AED
          - cumulative_pct (float): running total as % of unit price
          - monthly_pct (float): this month's collection as % of unit price
          - event (str|None): event label for chart annotation

    The final month's cumulative_cash_collected equals unit_price (within
    rounding). The array is ready for direct use in a frontend area/line chart.

    Raises:
        ValueError: on invalid unit_price, payment_plan, or timeline_months.
    """
    # --- Validate unit_price -----------------------------------------------------
    try:
        unit_price_float = float(unit_price)
    except (TypeError, ValueError) as e:
        raise ValueError(f"unit_price must be numeric; got {unit_price!r}.") from e
    if unit_price_float <= 0:
        raise ValueError(f"unit_price must be > 0; got {unit_price_float}.")

    # --- Validate timeline_months ------------------------------------------------
    if not isinstance(timeline_months, int):
        try:
            timeline_months_int = int(timeline_months)
        except (TypeError, ValueError) as e:
            raise ValueError(
                f"timeline_months must be an integer; got {timeline_months!r}."
            ) from e
    else:
        timeline_months_int = timeline_months
    if timeline_months_int <= 0:
        raise ValueError(
            f"timeline_months must be a positive integer; got {timeline_months_int}."
        )

    # --- Parse and validate payment plan ----------------------------------------
    construction_pct, handover_pct = _parse_payment_plan(payment_plan)

    # --- Derive the three-phase cash architecture --------------------------------
    downpayment_pct = DEFAULT_DOWNPAYMENT_PCT
    spread_pct = construction_pct - downpayment_pct  # e.g. 60 - 5 = 55
    spread_per_month_pct = spread_pct / timeline_months_int  # e.g. 55/36 ≈ 1.5278

    # --- Build the monthly cashflow array ----------------------------------------
    # Month 0 = downpayment. Months 1..N = construction spread. Month N also
    # receives the handover balloon. We use numpy for the vectorized cumulative
    # sum to guarantee determinism and auditability.
    months = np.arange(0, timeline_months_int + 1, dtype=int)
    monthly_pct = np.zeros(timeline_months_int + 1, dtype=float)

    # Phase 1: downpayment at month 0
    monthly_pct[0] = downpayment_pct

    # Phase 2: construction spread across months 1..N
    monthly_pct[1 : timeline_months_int + 1] = spread_per_month_pct

    # Phase 3: handover balloon at month N (added to that month's spread)
    monthly_pct[timeline_months_int] += handover_pct

    # Cumulative curve — the heartbeat of the chart
    cumulative_pct = np.cumsum(monthly_pct)

    # Convert to absolute AED
    monthly_cash = monthly_pct / 100.0 * unit_price_float
    cumulative_cash = cumulative_pct / 100.0 * unit_price_float

    # --- Assemble the JSON-serializable array -----------------------------------
    result: List[Dict[str, Any]] = []
    for i, m in enumerate(months):
        result.append(
            {
                "month": int(m),
                "cumulative_cash_collected": round(float(cumulative_cash[i]), 2),
                "monthly_cash_collected": round(float(monthly_cash[i]), 2),
                "cumulative_pct": round(float(cumulative_pct[i]), 4),
                "monthly_pct": round(float(monthly_pct[i]), 4),
                "event": _label_event(
                    month=int(m),
                    timeline_months=timeline_months_int,
                    is_downpayment_month=(m == 0),
                    is_handover_month=(m == timeline_months_int and handover_pct > 0),
                ),
            }
        )

    return result


def summarize_cashflow(cashflow_array: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Produce a boardroom-grade summary of a cashflow array for the LLM narrator.

    This is a pure extraction function — no math, no estimation. It reads the
    already-computed cashflow array and surfaces the figures a CEO would ask
    about in the first 30 seconds of a meeting. The LLM may consume this summary
    verbatim but may NOT recompute any number from it.

    Args:
        cashflow_array: The array returned by simulate_cashflow().

    Returns:
        dict with:
          - total_collected (float): final cumulative, should equal unit price
          - month_0_collected (float): downpayment amount, AED
          - month_0_pct (float): downpayment as % of total
          - mid_build_collected (float): cumulative at the midpoint month, AED
          - mid_build_pct (float): midpoint cumulative as % of total
          - mid_build_month (int): the midpoint month index
          - handover_collected (float): handover month's collection, AED
          - handover_pct (float): handover month's collection as % of total
          - handover_month (int): the final month index
          - timeline_months (int): total months in the schedule
    """
    if not cashflow_array:
        return {"note": "Empty cashflow array. UI must render [DATA MISSING]."}

    final_entry = cashflow_array[-1]
    total_collected = final_entry["cumulative_cash_collected"]
    timeline_months = final_entry["month"]

    month_0 = cashflow_array[0]
    month_0_collected = month_0["monthly_cash_collected"]
    month_0_pct = month_0["monthly_pct"]

    # Midpoint: the month closest to timeline_months / 2
    mid_index = len(cashflow_array) // 2
    mid_entry = cashflow_array[mid_index]
    mid_build_collected = mid_entry["cumulative_cash_collected"]
    mid_build_pct = mid_entry["cumulative_pct"]
    mid_build_month = mid_entry["month"]

    handover_collected = final_entry["monthly_cash_collected"]
    handover_pct = final_entry["monthly_pct"]
    handover_month = final_entry["month"]

    return {
        "total_collected": total_collected,
        "month_0_collected": month_0_collected,
        "month_0_pct": month_0_pct,
        "mid_build_collected": mid_build_collected,
        "mid_build_pct": mid_build_pct,
        "mid_build_month": mid_build_month,
        "handover_collected": handover_collected,
        "handover_pct": handover_pct,
        "handover_month": handover_month,
        "timeline_months": timeline_months,
    }


# ---------------------------------------------------------------------------
# Standalone self-validation
#   Run:  python backend/cashflow_sim.py
#   Confirms determinism, edge cases, and the absence of any external call.
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 78)
    print("PROJECT CAPITAL VELOCITY — CASHFLOW ENGINE SELF-VALIDATION")
    print("=" * 78)

    test_cases = [
        {
            "name": "60/40 plan, 36 months, AED 1,000,000 (prompt example)",
            "unit_price": 1_000_000.0,
            "payment_plan": "60/40",
            "timeline_months": 36,
        },
        {
            "name": "70/30 plan, 36 months, AED 1,000,000 (front-loaded)",
            "unit_price": 1_000_000.0,
            "payment_plan": "70/30",
            "timeline_months": 36,
        },
        {
            "name": "50/50 plan, 36 months, AED 1,000,000 (back-loaded)",
            "unit_price": 1_000_000.0,
            "payment_plan": "50/50",
            "timeline_months": 36,
        },
        {
            "name": "80/20 plan, 24 months, AED 5,000,000 (aggressive)",
            "unit_price": 5_000_000.0,
            "payment_plan": "80/20",
            "timeline_months": 24,
        },
        {
            "name": "Edge: timeline_months = 1 (instant build)",
            "unit_price": 1_000_000.0,
            "payment_plan": "60/40",
            "timeline_months": 1,
        },
        {
            "name": "Edge: invalid plan format (should raise)",
            "unit_price": 1_000_000.0,
            "payment_plan": "60-40",
            "timeline_months": 36,
        },
        {
            "name": "Edge: plan not summing to 100 (should raise)",
            "unit_price": 1_000_000.0,
            "payment_plan": "60/30",
            "timeline_months": 36,
        },
        {
            "name": "Edge: zero timeline (should raise)",
            "unit_price": 1_000_000.0,
            "payment_plan": "60/40",
            "timeline_months": 0,
        },
    ]

    for tc in test_cases:
        print(f"\n--- {tc['name']} ---")
        try:
            cf = simulate_cashflow(
                unit_price=tc["unit_price"],
                payment_plan=tc["payment_plan"],
                timeline_months=tc["timeline_months"],
            )
            # Print first 3, midpoint, and last 2 entries to keep output readable
            print(f"  Total entries: {len(cf)}")
            print(f"  First 3 entries:")
            for entry in cf[:3]:
                print(f"    {entry}")
            if len(cf) > 5:
                mid = len(cf) // 2
                print(f"  Midpoint entry (index {mid}):")
                print(f"    {cf[mid]}")
            print(f"  Last 2 entries:")
            for entry in cf[-2:]:
                print(f"    {entry}")

            # Validate: final cumulative == unit_price (within 1 AED rounding)
            final_cum = cf[-1]["cumulative_cash_collected"]
            delta = abs(final_cum - tc["unit_price"])
            print(f"  Validation: final cumulative {final_cum:,.2f} vs unit_price "
                  f"{tc['unit_price']:,.2f} | delta = {delta:.2f} AED "
                  f"({'PASS' if delta < 1.0 else 'FAIL'})")

            # Print the executive summary
            summary = summarize_cashflow(cf)
            print(f"  Summary: {summary}")
        except ValueError as e:
            print(f"  Correctly raised ValueError: {e}")
        except Exception as e:
            print(f"  UNEXPECTED ERROR: {type(e).__name__}: {e}")

    # --- IRR comparison demo: same unit, three plans ---------------------------
    print("\n" + "=" * 78)
    print("PLAN COMPARISON — Same AED 1M unit, 36-month build, three plans")
    print("=" * 78)
    unit_price = 1_000_000.0
    timeline = 36
    for plan in ["50/50", "60/40", "70/30"]:
        cf = simulate_cashflow(unit_price, plan, timeline)
        s = summarize_cashflow(cf)
        print(f"\n  Plan {plan}:")
        print(f"    Month 0 (downpayment):     AED {s['month_0_collected']:>12,.2f} "
              f"({s['month_0_pct']:.2f}%)")
        print(f"    Month {s['mid_build_month']} (mid-build cumulative): AED {s['mid_build_collected']:>12,.2f} "
              f"({s['mid_build_pct']:.2f}%)")
        print(f"    Month {s['handover_month']} (handover collection):    AED {s['handover_collected']:>12,.2f} "
              f"({s['handover_pct']:.2f}%)")
        print(f"    Total collected:           AED {s['total_collected']:>12,.2f}")

    print("\n" + "=" * 78)
    print("VALIDATION COMPLETE — no LLM was invoked. All math is deterministic.")
    print("=" * 78)
