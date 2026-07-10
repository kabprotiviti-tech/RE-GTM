"use client";

import jsPDF from "jspdf";

interface ReportData {
  projectName: string;
  corridor: string;
  emirate: string;
  parcelLat: number | null;
  parcelLng: number | null;
  locationPremium: number;
  unitType: string;
  microView: string;
  floor: number;
  sqft: number;
  unitCount: number;
  developer: string;
  paymentPlan: string;
  timelineMonths: number;
  pricingMethod: string;
  amenityScore: number;
  pricing: {
    floor_psf: number | null;
    optimal_psf: number | null;
    ceiling_psf: number | null;
    estimated_unit_price: number | null;
  };
  baseConfidence: string;
  baseCompCount: number;
  scenarios: any[];
  scenarioSummary: any;
  cashflowSummary: any;
  proximityResults: any[];
  gtmNarrative: string;
  rationale: string;
  finance: {
    grossRevenue: number;
    totalCost: number;
    netProfit: number;
    profitMargin: number;
    roi: number;
    roe: number;
    irr: number;
    npv: number;
    paybackMonths: number;
    equityInvestment: number;
    loanAmount: number;
  };
}

const C = {
  gold: [201, 169, 97] as [number, number, number],
  navy: [30, 58, 95] as [number, number, number],
  dark: [26, 26, 26] as [number, number, number],
  gray: [107, 114, 128] as [number, number, number],
  light: [240, 242, 245] as [number, number, number],
  border: [200, 200, 200] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  green: [5, 150, 105] as [number, number, number],
  red: [220, 38, 38] as [number, number, number],
};

export function generatePremiumReport(data: ReportData) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = 0;

  // ==================== COVER PAGE ====================
  // Navy background top section
  pdf.setFillColor(...C.navy);
  pdf.rect(0, 0, pageW, 80, "F");

  // Gold accent bar
  pdf.setFillColor(...C.gold);
  pdf.rect(0, 80, pageW, 2, "F");

  // Logo placeholder
  pdf.setFillColor(...C.gold);
  pdf.roundedRect(margin, 20, 8, 8, 1, 1, "F");
  pdf.setFontSize(8);
  pdf.setTextColor(...C.gold);
  pdf.setFont("helvetica", "bold");
  pdf.text("CAPITAL VELOCITY", margin + 12, 26);

  // Title
  pdf.setFontSize(28);
  pdf.setTextColor(...C.white);
  pdf.setFont("helvetica", "bold");
  pdf.text(data.projectName, margin, 45);

  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(180, 190, 200);
  pdf.text("Launch Strategy & Pricing Analysis Report", margin, 54);

  // Meta info
  pdf.setFontSize(9);
  pdf.text(`${data.emirate} · ${data.corridor}`, margin, 62);
  const dateStr = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  pdf.text(`Generated: ${dateStr}`, margin, 68);

  // Confidential
  pdf.setFillColor(220, 38, 38);
  pdf.roundedRect(pageW - margin - 40, 20, 40, 8, 1, 1, "F");
  pdf.setFontSize(7);
  pdf.setTextColor(...C.white);
  pdf.setFont("helvetica", "bold");
  pdf.text("CONFIDENTIAL", pageW - margin - 30, 25);

  // Key metrics on cover
  y = 100;
  pdf.setFontSize(10);
  pdf.setTextColor(...C.gray);
  pdf.setFont("helvetica", "normal");
  pdf.text("EXECUTIVE SUMMARY", margin, y);
  pdf.setFillColor(...C.gold);
  pdf.rect(margin, y + 2, 30, 0.5, "F");

  y += 10;
  const metrics = [
    { label: "Optimal Price", value: `AED ${data.pricing.optimal_psf?.toLocaleString() ?? "N/A"}/sqft` },
    { label: "Est. Unit Price", value: `AED ${data.pricing.estimated_unit_price?.toLocaleString() ?? "N/A"}` },
    { label: "Location Premium", value: `+AED ${data.locationPremium}/sqft` },
    { label: "Project IRR", value: `${data.finance.irr}%` },
    { label: "Net Profit", value: `AED ${(data.finance.netProfit / 1e6).toFixed(1)}M` },
    { label: "Profit Margin", value: `${data.finance.profitMargin}%` },
  ];

  metrics.forEach((m, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = margin + col * (contentW / 2);
    const ry = y + row * 18;

    pdf.setFillColor(...C.light);
    pdf.roundedRect(x, ry, contentW / 2 - 4, 14, 2, 2, "F");

    pdf.setFontSize(8);
    pdf.setTextColor(...C.gray);
    pdf.setFont("helvetica", "normal");
    pdf.text(m.label, x + 4, ry + 5);

    pdf.setFontSize(13);
    pdf.setTextColor(...C.dark);
    pdf.setFont("helvetica", "bold");
    pdf.text(m.value, x + 4, ry + 11);
  });

  y += 56;

  // Scenario table on cover
  pdf.setFontSize(10);
  pdf.setTextColor(...C.gray);
  pdf.setFont("helvetica", "normal");
  pdf.text("SCENARIO SUMMARY", margin, y);
  pdf.setFillColor(...C.gold);
  pdf.rect(margin, y + 2, 30, 0.5, "F");
  y += 8;

  // Table header
  pdf.setFillColor(...C.navy);
  pdf.rect(margin, y, contentW, 7, "F");
  pdf.setFontSize(7);
  pdf.setTextColor(...C.white);
  pdf.setFont("helvetica", "bold");
  pdf.text("SCENARIO", margin + 3, y + 5);
  pdf.text("PRICE PSF", margin + 45, y + 5);
  pdf.text("ABSORPTION", margin + 80, y + 5);
  pdf.text("REVENUE", margin + 115, y + 5);
  pdf.text("NET POSITION", margin + 155, y + 5);
  y += 7;

  data.scenarios.forEach((s) => {
    pdf.setFillColor(250, 250, 250);
    pdf.rect(margin, y, contentW, 7, "F");
    pdf.setFontSize(7);
    pdf.setTextColor(...C.dark);
    pdf.setFont("helvetica", "normal");
    pdf.text(s.scenario_name, margin + 3, y + 5);
    pdf.text(`AED ${s.price_psf.toLocaleString()}`, margin + 45, y + 5);
    pdf.text(`${s.projected_absorption_days} days`, margin + 80, y + 5);
    pdf.text(`AED ${(s.total_revenue_assumption / 1e9).toFixed(2)}B`, margin + 115, y + 5);
    pdf.text(`AED ${(s.net_position / 1e9).toFixed(2)}B`, margin + 155, y + 5);
    y += 7;
  });

  // ==================== PAGE 2: PRICING & LOCATION ====================
  pdf.addPage();
  y = margin;

  pdf.setFontSize(16);
  pdf.setTextColor(...C.navy);
  pdf.setFont("helvetica", "bold");
  pdf.text("1. Pricing Architecture", margin, y);
  y += 2;
  pdf.setFillColor(...C.gold);
  pdf.rect(margin, y, 40, 1, "F");
  y += 10;

  // Three-tier pricing
  const tiers = [
    { name: "FLOOR", val: data.pricing.floor_psf, desc: "Defensive clearance price" },
    { name: "OPTIMAL", val: data.pricing.optimal_psf, desc: "Target realized price" },
    { name: "CEILING", val: data.pricing.ceiling_psf, desc: "Negotiation headroom" },
  ];

  tiers.forEach((t) => {
    const isOptimal = t.name === "OPTIMAL";
    pdf.setFillColor(...(isOptimal ? C.gold : C.light));
    pdf.roundedRect(margin, y, contentW / 3 - 4, 30, 3, 3, "F");

    pdf.setFontSize(8);
    pdf.setTextColor(...(isOptimal ? C.white : C.gray));
    pdf.setFont("helvetica", "normal");
    pdf.text(t.name, margin + 4, y + 6);

    pdf.setFontSize(20);
    pdf.setTextColor(...(isOptimal ? C.white : C.dark));
    pdf.setFont("helvetica", "bold");
    pdf.text(`AED ${t.val?.toLocaleString() ?? "N/A"}`, margin + 4, y + 16);

    pdf.setFontSize(7);
    pdf.setTextColor(...(isOptimal ? [255, 255, 200] : C.gray));
    pdf.setFont("helvetica", "normal");
    pdf.text(`/ sqft`, margin + 4, y + 21);
    pdf.text(t.desc, margin + 4, y + 27);

    y = y; // same y, next column
    // Move to next column
    if (t.name === "FLOOR") y = y; // stay
  });

  // Reset y for next section
  y = margin + 42;

  // Unit spec table
  pdf.setFontSize(11);
  pdf.setTextColor(...C.navy);
  pdf.setFont("helvetica", "bold");
  pdf.text("Unit Specification", margin, y);
  y += 6;

  const specs = [
    ["Project Name", data.projectName],
    ["Corridor", `${data.emirate} · ${data.corridor}`],
    ["Unit Type", data.unitType],
    ["View", data.microView],
    ["Floor", String(data.floor)],
    ["Unit Size", `${data.sqft} sqft`],
    ["Developer", data.developer],
    ["Payment Plan", data.paymentPlan],
    ["Timeline", `${data.timelineMonths} months`],
    ["Total Units", String(data.unitCount)],
    ["Pricing Method", data.pricingMethod === "hedonic" ? "Hedonic Regression" : "Weighted Average"],
    ["Data Confidence", `${data.baseConfidence} (${data.baseCompCount} comps)`],
  ];

  pdf.setFontSize(8);
  specs.forEach(([label, val]) => {
    pdf.setTextColor(...C.gray);
    pdf.setFont("helvetica", "normal");
    pdf.text(label, margin, y);
    pdf.setTextColor(...C.dark);
    pdf.setFont("helvetica", "bold");
    pdf.text(val, margin + 50, y);
    y += 5;
  });

  y += 6;

  // Location premium
  pdf.setFontSize(11);
  pdf.setTextColor(...C.navy);
  pdf.setFont("helvetica", "bold");
  pdf.text("Location Premium Breakdown", margin, y);
  y += 6;

  pdf.setFontSize(8);
  data.proximityResults.filter(r => r.premiumAed > 0).forEach((r) => {
    pdf.setTextColor(...C.gray);
    pdf.setFont("helvetica", "normal");
    pdf.text(r.nearest?.name || r.category, margin, y);
    pdf.setTextColor(...C.gold);
    pdf.setFont("helvetica", "bold");
    pdf.text(`+AED ${r.premiumAed}/sqft (${r.distanceKm < 1 ? `${Math.round(r.distanceKm * 1000)}m` : `${r.distanceKm}km`})`, margin + 80, y);
    y += 5;
  });

  // Rationale
  y += 6;
  pdf.setFontSize(11);
  pdf.setTextColor(...C.navy);
  pdf.setFont("helvetica", "bold");
  pdf.text("Pricing Rationale", margin, y);
  y += 6;

  pdf.setFontSize(8);
  pdf.setTextColor(...C.gray);
  pdf.setFont("helvetica", "italic");
  const rationaleLines = pdf.splitTextToSize(data.rationale || "Not generated.", contentW);
  pdf.text(rationaleLines, margin, y);
  y += rationaleLines.length * 4 + 6;

  // ==================== PAGE 3: FINANCIAL ANALYSIS ====================
  pdf.addPage();
  y = margin;

  pdf.setFontSize(16);
  pdf.setTextColor(...C.navy);
  pdf.setFont("helvetica", "bold");
  pdf.text("2. Financial Analysis", margin, y);
  y += 2;
  pdf.setFillColor(...C.gold);
  pdf.rect(margin, y, 40, 1, "F");
  y += 10;

  // Key financial metrics
  const finMetrics = [
    { label: "Gross Revenue", value: `AED ${(data.finance.grossRevenue / 1e6).toFixed(1)}M` },
    { label: "Total Development Cost", value: `AED ${(data.finance.totalCost / 1e6).toFixed(1)}M` },
    { label: "Net Profit", value: `AED ${(data.finance.netProfit / 1e6).toFixed(1)}M` },
    { label: "Profit Margin", value: `${data.finance.profitMargin}%` },
    { label: "ROI", value: `${data.finance.roi}%` },
    { label: "ROE", value: `${data.finance.roe}%` },
    { label: "Project IRR", value: `${data.finance.irr}%` },
    { label: "NPV (12% WACC)", value: `AED ${(data.finance.npv / 1e6).toFixed(1)}M` },
    { label: "Payback Period", value: `${data.finance.paybackMonths} months` },
    { label: "Equity Investment", value: `AED ${(data.finance.equityInvestment / 1e6).toFixed(1)}M` },
    { label: "Construction Loan", value: `AED ${(data.finance.loanAmount / 1e6).toFixed(1)}M` },
  ];

  finMetrics.forEach((m, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = margin + col * (contentW / 2);
    const ry = y + row * 14;

    pdf.setFillColor(...C.light);
    pdf.roundedRect(x, ry, contentW / 2 - 4, 11, 2, 2, "F");

    pdf.setFontSize(7);
    pdf.setTextColor(...C.gray);
    pdf.setFont("helvetica", "normal");
    pdf.text(m.label, x + 4, ry + 4);

    pdf.setFontSize(11);
    pdf.setTextColor(...C.dark);
    pdf.setFont("helvetica", "bold");
    pdf.text(m.value, x + 4, ry + 9);
  });

  y += Math.ceil(finMetrics.length / 2) * 14 + 10;

  // Cashflow summary
  pdf.setFontSize(11);
  pdf.setTextColor(...C.navy);
  pdf.setFont("helvetica", "bold");
  pdf.text("Cashflow Summary", margin, y);
  y += 6;

  const cf = data.cashflowSummary;
  const cfRows = [
    ["Month 0 (Downpayment)", `AED ${cf?.month_0_collected?.toLocaleString() ?? "N/A"} (${cf?.month_0_pct ?? 0}%)`],
    [`Month ${cf?.mid_build_month ?? 18} (Mid-build)`, `AED ${cf?.mid_build_collected?.toLocaleString() ?? "N/A"} (${cf?.mid_build_pct ?? 0}%)`],
    [`Month ${cf?.handover_month ?? 36} (Handover)`, `AED ${cf?.handover_collected?.toLocaleString() ?? "N/A"} (${cf?.handover_pct ?? 0}%)`],
    ["Total Collected", `AED ${cf?.total_collected?.toLocaleString() ?? "N/A"}`],
  ];

  pdf.setFontSize(8);
  cfRows.forEach(([label, val]) => {
    pdf.setTextColor(...C.gray);
    pdf.setFont("helvetica", "normal");
    pdf.text(label, margin, y);
    pdf.setTextColor(...C.dark);
    pdf.setFont("helvetica", "bold");
    pdf.text(val, margin + 70, y);
    y += 5;
  });

  // ==================== PAGE 4: SCENARIOS & LAUNCH PHASING ====================
  pdf.addPage();
  y = margin;

  pdf.setFontSize(16);
  pdf.setTextColor(...C.navy);
  pdf.setFont("helvetica", "bold");
  pdf.text("3. Scenario War-Gaming", margin, y);
  y += 2;
  pdf.setFillColor(...C.gold);
  pdf.rect(margin, y, 40, 1, "F");
  y += 10;

  // Scenario summary
  const sc = data.scenarioSummary;
  const scStats = [
    { label: "Revenue Spread", value: `AED ${sc?.revenue_spread_aed ? (sc.revenue_spread_aed / 1e6).toFixed(1) : "N/A"}M` },
    { label: "Carry Cost Spread", value: `AED ${sc?.carry_cost_spread_aed ? (sc.carry_cost_spread_aed / 1e6).toFixed(1) : "N/A"}M` },
    { label: "Net Position Spread", value: `AED ${sc?.net_position_spread_aed ? (sc.net_position_spread_aed / 1e6).toFixed(1) : "N/A"}M` },
    { label: "Absorption Spread", value: `${sc?.absorption_spread_days ?? "N/A"} days` },
    { label: "Best Revenue", value: sc?.best_revenue_scenario ?? "N/A" },
    { label: "Best Net", value: sc?.best_net_scenario ?? "N/A" },
    { label: "Fastest Sell", value: sc?.fastest_sell_scenario ?? "N/A" },
  ];

  scStats.forEach((s, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = margin + col * (contentW / 2);
    const ry = y + row * 14;

    pdf.setFillColor(...C.light);
    pdf.roundedRect(x, ry, contentW / 2 - 4, 11, 2, 2, "F");

    pdf.setFontSize(7);
    pdf.setTextColor(...C.gray);
    pdf.text(s.label, x + 4, ry + 4);
    pdf.setFontSize(10);
    pdf.setTextColor(...C.dark);
    pdf.setFont("helvetica", "bold");
    pdf.text(s.value, x + 4, ry + 9);
  });

  y += Math.ceil(scStats.length / 2) * 14 + 10;

  // Detailed scenario table
  pdf.setFontSize(11);
  pdf.setTextColor(...C.navy);
  pdf.setFont("helvetica", "bold");
  pdf.text("Scenario Detail", margin, y);
  y += 6;

  pdf.setFillColor(...C.navy);
  pdf.rect(margin, y, contentW, 7, "F");
  pdf.setFontSize(7);
  pdf.setTextColor(...C.white);
  pdf.setFont("helvetica", "bold");
  pdf.text("SCENARIO", margin + 3, y + 5);
  pdf.text("PRICE PSF", margin + 40, y + 5);
  pdf.text("DAYS", margin + 70, y + 5);
  pdf.text("REVENUE", margin + 90, y + 5);
  pdf.text("CARRY", margin + 125, y + 5);
  pdf.text("NET POSITION", margin + 155, y + 5);
  y += 7;

  data.scenarios.forEach((s) => {
    pdf.setFillColor(250, 250, 250);
    pdf.rect(margin, y, contentW, 7, "F");
    pdf.setFontSize(7);
    pdf.setTextColor(...C.dark);
    pdf.setFont("helvetica", "normal");
    pdf.text(s.scenario_name, margin + 3, y + 5);
    pdf.text(`AED ${s.price_psf.toLocaleString()}`, margin + 40, y + 5);
    pdf.text(`${s.projected_absorption_days}`, margin + 70, y + 5);
    pdf.text(`AED ${(s.total_revenue_assumption / 1e6).toFixed(0)}M`, margin + 90, y + 5);
    pdf.text(`AED ${(s.total_carry_cost / 1e6).toFixed(1)}M`, margin + 125, y + 5);
    pdf.text(`AED ${(s.net_position / 1e6).toFixed(0)}M`, margin + 155, y + 5);
    y += 7;
  });

  y += 10;

  // ==================== PAGE 5: GTM STRATEGY ====================
  pdf.addPage();
  y = margin;

  pdf.setFontSize(16);
  pdf.setTextColor(...C.navy);
  pdf.setFont("helvetica", "bold");
  pdf.text("4. Go-To-Market Strategy", margin, y);
  y += 2;
  pdf.setFillColor(...C.gold);
  pdf.rect(margin, y, 40, 1, "F");
  y += 10;

  // GTM narrative
  pdf.setFillColor(...C.light);
  pdf.roundedRect(margin, y, contentW, 4 + (data.gtmNarrative.split("\n").length * 4) + 40, 3, 3, "F");

  pdf.setFontSize(8);
  pdf.setTextColor(...C.gold);
  pdf.setFont("helvetica", "bold");
  pdf.text("MCKINSEY PARTNER — CEO BRIEFING", margin + 6, y + 6);

  pdf.setFontSize(9);
  pdf.setTextColor(...C.dark);
  pdf.setFont("helvetica", "normal");
  const gtmLines = pdf.splitTextToSize(data.gtmNarrative || "GTM strategy not generated.", contentW - 12);
  pdf.text(gtmLines, margin + 6, y + 12);
  y += gtmLines.length * 4 + 20;

  // ==================== FOOTER ON ALL PAGES ====================
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFillColor(...C.navy);
    pdf.rect(0, pageH - 12, pageW, 12, "F");
    pdf.setFontSize(7);
    pdf.setTextColor(180, 190, 200);
    pdf.setFont("helvetica", "normal");
    pdf.text("Project Capital Velocity — Confidential", margin, pageH - 5);
    pdf.text(`Page ${i} of ${pageCount}`, pageW - margin - 20, pageH - 5);
  }

  // Download
  const safeName = data.projectName.replace(/[^a-zA-Z0-9]/g, "_");
  pdf.save(`${safeName}_Launch_Strategy.pdf`);
}
