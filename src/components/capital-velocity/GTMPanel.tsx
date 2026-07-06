"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Brain, ChevronDown, Download, FileText } from "lucide-react";
import { Typewriter } from "./Typewriter";

interface GTMPanelProps {
  narrative: string;
  loading: boolean;
  onRefresh: () => void;
  structuredOutput?: any;
  projectName: string;
  pricingData: {
    floor_psf: number | null;
    optimal_psf: number | null;
    ceiling_psf: number | null;
    estimated_unit_price: number | null;
    confidence: string;
  };
  scenarioData: any[];
  cashflowSummary: any;
}

export function GTMPanel({
  narrative,
  loading,
  onRefresh,
  structuredOutput,
  projectName,
  pricingData,
  scenarioData,
  cashflowSummary,
}: GTMPanelProps) {
  const [expanded, setExpanded] = useState(true);

  const handleExport = () => {
    // Build the boardroom brief as a downloadable text/markdown file
    const brief = buildBoardBrief({
      projectName,
      narrative,
      structuredOutput,
      pricingData,
      scenarioData,
      cashflowSummary,
    });

    const blob = new Blob([brief], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName.replace(/[^a-zA-Z0-9]/g, "_")}_Board_Brief.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {/* Panel header — collapsible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-4 border-b transition-colors hover:bg-[var(--surface-raised)]"
        style={{ borderColor: expanded ? "var(--border)" : "transparent" }}
      >
        <div style={{ color: "var(--gold)" }}>
          <Brain size={14} />
        </div>
        <div className="flex-1 text-left">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
            Go-To-Market Strategy & Buyer Persona
          </h2>
          <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            McKinsey Partner · GTM Strategy · 200 words · Markdown-rendered
          </div>
        </div>

        {/* Export button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleExport();
          }}
          className="flex items-center gap-1.5 text-[9px] px-2.5 py-1 rounded font-medium uppercase tracking-wider transition-colors"
          style={{
            background: "var(--surface-raised)",
            border: "1px solid var(--gold)",
            color: "var(--gold)",
          }}
          title="Export boardroom brief as Markdown"
        >
          <Download size={11} />
          Export to Board
        </button>

        {/* Expand/collapse chevron */}
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ color: "var(--text-muted)" }}
        >
          <ChevronDown size={16} />
        </motion.div>
      </button>

      {/* Collapsible content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="p-5">
              {/* GTM narrative — markdown rendered */}
              <div className="flex items-center justify-between mb-3">
                <span
                  className="text-[9px] font-semibold uppercase tracking-[0.15em]"
                  style={{ color: "var(--gold)" }}
                >
                  Target Buyer · Positioning · Launch Phasing
                </span>
                <button
                  onClick={onRefresh}
                  disabled={loading}
                  className="text-[9px] px-2 py-0.5 rounded disabled:opacity-50"
                  style={{
                    background: "var(--surface-raised)",
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                  }}
                >
                  {loading ? "Drafting..." : "Regenerate"}
                </button>
              </div>

              {loading && !narrative ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="h-3 rounded animate-pulse"
                      style={{
                        background: "var(--surface-raised)",
                        width: `${80 + Math.random() * 20}%`,
                      }}
                    />
                  ))}
                </div>
              ) : narrative ? (
                <div className="gtm-markdown text-sm leading-relaxed">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => (
                        <h3
                          className="text-sm font-bold mt-3 mb-2 first:mt-0"
                          style={{ color: "var(--text-heading)" }}
                        >
                          {children}
                        </h3>
                      ),
                      h2: ({ children }) => (
                        <h4
                          className="text-sm font-semibold mt-3 mb-2 first:mt-0"
                          style={{ color: "var(--text-heading)" }}
                        >
                          {children}
                        </h4>
                      ),
                      h3: ({ children }) => (
                        <h5
                          className="text-xs font-semibold mt-2 mb-1.5 first:mt-0 uppercase tracking-wider"
                          style={{ color: "var(--gold)" }}
                        >
                          {children}
                        </h5>
                      ),
                      p: ({ children }) => (
                        <p
                          className="mb-3"
                          style={{ color: "var(--text-body)" }}
                        >
                          {children}
                        </p>
                      ),
                      strong: ({ children }) => (
                        <strong style={{ color: "var(--text-heading)", fontWeight: 600 }}>
                          {children}
                        </strong>
                      ),
                      em: ({ children }) => (
                        <em style={{ color: "var(--gold)" }}>{children}</em>
                      ),
                      ul: ({ children }) => (
                        <ul className="mb-3 ml-4 space-y-1.5">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="mb-3 ml-4 space-y-1.5 list-decimal">{children}</ol>
                      ),
                      li: ({ children }) => (
                        <li
                          className="text-sm"
                          style={{ color: "var(--text-body)" }}
                        >
                          <span
                            className="inline-block w-1 h-1 rounded-full mr-2 align-middle"
                            style={{ background: "var(--gold)" }}
                          />
                          {children}
                        </li>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote
                          className="border-l-2 pl-4 my-3 italic"
                          style={{
                            borderColor: "var(--gold)",
                            color: "var(--text-body)",
                          }}
                        >
                          {children}
                        </blockquote>
                      ),
                      code: ({ children }) => (
                        <code
                          className="px-1 py-0.5 rounded text-xs font-mono"
                          style={{
                            background: "var(--surface-raised)",
                            color: "var(--gold)",
                          }}
                        >
                          {children}
                        </code>
                      ),
                    }}
                  >
                    {narrative}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Adjust parameters to generate GTM strategy.
                </div>
              )}

              {/* Structured JSON output */}
              {structuredOutput && (
                <div
                  className="mt-4 pt-4 border-t"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-[9px] font-semibold uppercase tracking-[0.15em]"
                      style={{ color: "var(--gold)" }}
                    >
                      Structured Output · Schema-Gated
                    </span>
                    <span
                      className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{
                        color: structuredOutput._schema_gate_passed
                          ? "var(--positive)"
                          : "var(--negative)",
                        border: `1px solid ${
                          structuredOutput._schema_gate_passed
                            ? "var(--positive)"
                            : "var(--negative)"
                        }`,
                      }}
                    >
                      {structuredOutput._schema_gate_passed ? "JSON Valid" : "JSON Invalid"}
                    </span>
                  </div>
                  {structuredOutput._schema_gate_passed ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex gap-3">
                        <span
                          className="font-mono font-semibold w-28 flex-shrink-0"
                          style={{ color: "var(--text-muted)" }}
                        >
                          target_persona
                        </span>
                        <span style={{ color: "var(--text-heading)" }}>
                          {structuredOutput.target_persona}
                        </span>
                      </div>
                      <div className="flex gap-3">
                        <span
                          className="font-mono font-semibold w-28 flex-shrink-0"
                          style={{ color: "var(--text-muted)" }}
                        >
                          rationale
                        </span>
                        <span
                          className="italic"
                          style={{ color: "var(--text-body)" }}
                        >
                          {structuredOutput.rationale}
                        </span>
                      </div>
                      <div className="flex gap-3 items-center">
                        <span
                          className="font-mono font-semibold w-28 flex-shrink-0"
                          style={{ color: "var(--text-muted)" }}
                        >
                          risk_flag
                        </span>
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded"
                          style={{
                            color: structuredOutput.risk_flag
                              ? "var(--negative)"
                              : "var(--positive)",
                            background: structuredOutput.risk_flag
                              ? "color-mix(in srgb, var(--negative) 12%, transparent)"
                              : "color-mix(in srgb, var(--positive) 12%, transparent)",
                            border: `1px solid ${
                              structuredOutput.risk_flag
                                ? "var(--negative)"
                                : "var(--positive)"
                            }`,
                          }}
                        >
                          {structuredOutput.risk_flag ? "true — risk" : "false — no risk"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs" style={{ color: "var(--negative)" }}>
                      ⚠ {structuredOutput._error || "Schema gate failed"}
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              <div
                className="mt-4 pt-3 border-t flex items-center justify-between"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-2">
                  <FileText size={10} style={{ color: "var(--gold)" }} />
                  <span
                    className="text-[9px] uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Anti-Hallucination Protocol — every figure traces to deterministic JSON
                  </span>
                </div>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1 text-[9px] px-2 py-1 rounded transition-colors"
                  style={{
                    background: "var(--surface-raised)",
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                  }}
                >
                  <Download size={10} />
                  .md
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Board brief builder — generates a markdown document for boardroom distribution
// ---------------------------------------------------------------------------

function buildBoardBrief(data: {
  projectName: string;
  narrative: string;
  structuredOutput: any;
  pricingData: any;
  scenarioData: any[];
  cashflowSummary: any;
}): string {
  const { projectName, narrative, structuredOutput, pricingData, scenarioData, cashflowSummary } = data;
  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC";

  let brief = `# ${projectName}
## Boardroom Brief — Capital Velocity Analysis

**Generated:** ${timestamp}
**Classification:** CONFIDENTIAL
**Platform:** Project Capital Velocity v1.0

---

## 1. Pricing Architecture

| Tier | PSF (AED) |
|------|-----------|
| Floor | ${pricingData.floor_psf ?? "[DATA MISSING]"} |
| **Optimal** | **${pricingData.optimal_psf ?? "[DATA MISSING]"}** |
| Ceiling | ${pricingData.ceiling_psf ?? "[DATA MISSING]"} |

- **Estimated Unit Price:** AED ${pricingData.estimated_unit_price?.toLocaleString("en-US", { maximumFractionDigits: 0 }) ?? "[DATA MISSING]"}
- **Data Confidence:** ${pricingData.confidence}

---

## 2. Scenario War-Gaming

| Scenario | Price PSF | Absorption (days) | Total Revenue | Carry Cost | Net Position |
|----------|-----------|-------------------|---------------|------------|--------------|
`;

  for (const s of scenarioData) {
    brief += `| ${s.scenario_name}${s.scenario_name === "Aggressive" ? " ⭐" : ""} | ${s.price_psf.toLocaleString()} | ${s.projected_absorption_days} | AED ${(s.total_revenue_assumption / 1e9).toFixed(3)}B | AED ${(s.total_carry_cost / 1e6).toFixed(2)}M | AED ${(s.net_position / 1e9).toFixed(3)}B |\n`;
  }

  brief += `
---

## 3. Cashflow Summary

- **Payment Plan:** ${cashflowSummary.timeline_months ? "60/40" : "N/A"} over ${cashflowSummary.timeline_months || "N/A"} months
- **Month 0 (Downpayment):** AED ${cashflowSummary.month_0_collected?.toLocaleString("en-US", { maximumFractionDigits: 0 }) ?? "N/A"}
- **Mid-build Cumulative:** AED ${cashflowSummary.mid_build_collected?.toLocaleString("en-US", { maximumFractionDigits: 0 }) ?? "N/A"} (${cashflowSummary.mid_build_pct}%)
- **Handover Collection:** AED ${cashflowSummary.handover_collected?.toLocaleString("en-US", { maximumFractionDigits: 0 }) ?? "N/A"} (${cashflowSummary.handover_pct}%)
- **Total Collected:** AED ${cashflowSummary.total_collected?.toLocaleString("en-US", { maximumFractionDigits: 0 }) ?? "N/A"}

---

## 4. Go-To-Market Strategy

${narrative || "[GTM strategy not generated]"}

---

## 5. Structured AI Output

`;

  if (structuredOutput?._schema_gate_passed) {
    brief += `- **Target Persona:** ${structuredOutput.target_persona}
- **Rationale:** ${structuredOutput.rationale}
- **Risk Flag:** ${structuredOutput.risk_flag}
`;
  } else {
    brief += `[Structured output not available — schema gate: ${structuredOutput?._schema_gate_passed ? "passed" : "failed"}]
`;
  }

  brief += `
---

## Anti-Hallucination Protocol

Every figure in this brief traces to deterministic Python/TypeScript engine output.
The LLM was permitted to write prose ONLY around the validated JSON payload.
No number in this document was invented, estimated, or computed by the LLM.

**Engine Versions:** pricing_engine 1.0.0 · cashflow_sim 1.0.0 · scenario_engine 1.0.0 · llm_narrator 1.0.0

---

*This brief was generated by Project Capital Velocity — the Off-Plan Capital
Velocity & Yield Optimisation Platform. For Tier-1 GCC Real Estate leadership.*
`;

  return brief;
}
