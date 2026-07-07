/**
 * UAE Real Estate Compliance Rules Engine
 *
 * DLD (Dubai) + DMT (Abu Dhabi) regulatory rules:
 * - RERA off-plan launch requirements
 * - Escrow account rules (70% must go through escrow)
 * - Oqood (off-plan registration) requirements
 * - Trakheesi permit system
 * - Marketing permit rules (Form A, Form B, Form F)
 * - Dubai/Abu Dhabi specific regulations
 */

export type Emirate = "Dubai" | "Abu Dhabi";

export interface ComplianceCheck {
  id: string;
  category: "Escrow" | "Registration" | "Permit" | "Marketing" | "Construction" | "Financial";
  rule: string;
  requirement: string;
  status: "compliant" | "warning" | "action_required" | "not_applicable";
  detail: string;
  deadline?: string;
  authority: string;
}

export interface ComplianceReport {
  emirate: Emirate;
  checks: ComplianceCheck[];
  summary: {
    compliant: number;
    warnings: number;
    actionsRequired: number;
    notApplicable: number;
    overallStatus: "Fully Compliant" | "Action Required" | "Critical Issues";
  };
  escrowRequirements: {
    escrowPercentage: number;
    minimumDepositPct: number;
    maxDeveloperWithdrawalBeforeHandover: number;
    retentionAtHandover: number;
  };
  registrationRequirements: {
    oqoodRequired: boolean;
    oqoodFee: number;
    titleDeedFee: number;
    transferFee: number;
  };
  marketingRequirements: {
    permitRequired: boolean;
    permitType: string;
    maxPreLaunchMarketing: number;
    brokerLicenseRequired: boolean;
  };
}

export function runComplianceChecks(
  emirate: Emirate,
  projectStatus: "Pre-Launch" | "Off-Plan" | "Under Construction" | "Completed",
  totalUnits: number,
  totalProjectValue: number,
  developer: string,
  developerTier: 1 | 2,
  constructionProgress: number = 0
): ComplianceReport {
  const checks: ComplianceCheck[] = [];

  // === ESCROW ===
  if (emirate === "Dubai") {
    checks.push({
      id: "escrow-1",
      category: "Escrow",
      rule: "DLD Escrow Account (Law 8 of 2007)",
      requirement: "All off-plan sale proceeds must be deposited into a DLD-approved escrow account",
      status: projectStatus !== "Completed" ? "action_required" : "not_applicable",
      detail: `Project value AED ${(totalProjectValue / 1e6).toFixed(1)}M must flow through DLD-regulated escrow. Developer can only withdraw against certified construction progress. Maximum 70% pre-handover withdrawal.`,
      authority: "Dubai Land Department (DLD)",
    });
    checks.push({
      id: "escrow-2",
      category: "Escrow",
      rule: "Escrow Account Opening (Law 8 of 2007, Article 3)",
      requirement: "Escrow account must be opened before any sales activity",
      status: projectStatus === "Pre-Launch" ? "action_required" : "compliant",
      detail: "Account must be with a DLD-approved bank. Developer must submit project cost breakdown, construction schedule, and contractor agreement before account activation.",
      deadline: "Before first unit sale",
      authority: "DLD — RERA",
    });
  } else {
    checks.push({
      id: "escrow-1-ad",
      category: "Escrow",
      rule: "DMT Escrow Account (Law 3 of 2015)",
      requirement: "Abu Dhabi: Escrow account mandatory for all off-plan projects",
      status: projectStatus !== "Completed" ? "action_required" : "not_applicable",
      detail: `Department of Municipalities and Transport (DMT) regulates escrow. Developer must deposit 100% of buyer payments into escrow. Withdrawals linked to construction milestones certified by DMT-approved consultant.`,
      authority: "DMT — Abu Dhabi",
    });
  }

  // === REGISTRATION ===
  checks.push({
    id: "reg-1",
    category: "Registration",
    rule: emirate === "Dubai" ? "Oqood Registration" : "TAMM Registration",
    requirement: "All off-plan units must be registered with the land department",
    status: projectStatus === "Off-Plan" || projectStatus === "Under Construction" ? "action_required" : "not_applicable",
    detail: `${totalUnits} units require ${emirate === "Dubai" ? "Oqood" : "TAMM"} registration. Fee: 4% of property value. Registration must happen within 30 days of signing the SPA.`,
    deadline: "30 days after SPA signing",
    authority: emirate === "Dubai" ? "DLD" : "DMT",
  });

  checks.push({
    id: "reg-2",
    category: "Registration",
    rule: "Title Deed Issuance",
    requirement: "Title deed must be issued at handover",
    status: projectStatus === "Completed" ? "action_required" : "not_applicable",
    detail: "At handover, the Oqood/TAMM registration converts to a full title deed. Transfer fee: 4% of property value. Must be completed within 60 days of handover notice.",
    deadline: "60 days after handover",
    authority: emirate === "Dubai" ? "DLD" : "DMT",
  });

  // === PERMITS ===
  if (emirate === "Dubai") {
    checks.push({
      id: "perm-1",
      category: "Permit",
      rule: "RERA Developer Registration",
      requirement: "Developer must be registered with RERA before any project activity",
      status: developerTier === 1 ? "compliant" : "warning",
      detail: `${developer} — Tier ${developerTier} developer. RERA registration valid for 1 year, renewable. Fee: AED 5,000.`,
      authority: "RERA — Dubai",
    });
    checks.push({
      id: "perm-2",
      category: "Permit",
      rule: "Project Permit (Trakheesi)",
      requirement: "Trakheesi permit required before marketing or selling any unit",
      status: projectStatus === "Pre-Launch" ? "action_required" : "compliant",
      detail: "Permit issued by Trakheesi system after verifying: land ownership, project design approval, contractor agreement, escrow account, and NOC from relevant authorities.",
      deadline: "Before any marketing activity",
      authority: "Trakheesi — Dubai",
    });
    checks.push({
      id: "perm-3",
      category: "Permit",
      rule: "Form A — Project Registration",
      requirement: "Form A registers the project with RERA for off-plan sales",
      status: projectStatus === "Pre-Launch" ? "action_required" : "compliant",
      detail: "Includes: project details, unit types, pricing, payment plan, construction schedule, and developer financial standing. Processing time: 7-14 days.",
      deadline: "Before first unit sale",
      authority: "RERA — Dubai",
    });
    checks.push({
      id: "perm-4",
      category: "Permit",
      rule: "Form B — Unit Registration",
      requirement: "Form B registers individual units for sale",
      status: projectStatus === "Pre-Launch" ? "action_required" : "compliant",
      detail: "Each unit type must be registered with its specific price, size, and view. Must be filed after Form A approval.",
      authority: "RERA — Dubai",
    });
    checks.push({
      id: "perm-5",
      category: "Permit",
      rule: "Form F — Sales Agreement",
      requirement: "Form F is the standardized SPA template for off-plan sales",
      status: projectStatus === "Off-Plan" ? "compliant" : "not_applicable",
      detail: "RERA-mandated SPA template. Any modifications require RERA approval. Must include: payment plan, handover date, force majeure clause, and dispute resolution mechanism.",
      authority: "RERA — Dubai",
    });
  } else {
    checks.push({
      id: "perm-1-ad",
      category: "Permit",
      rule: "DMT Developer License",
      requirement: "Abu Dhabi: DMT developer license required",
      status: developerTier === 1 ? "compliant" : "warning",
      detail: `${developer} — Tier ${developerTier}. DMT developer license valid for 2 years. Must maintain minimum paid-up capital of AED 50M.`,
      authority: "DMT — Abu Dhabi",
    });
    checks.push({
      id: "perm-2-ad",
      category: "Permit",
      rule: "Project Registration (TAMM)",
      requirement: "Project must be registered through TAMM portal",
      status: projectStatus === "Pre-Launch" ? "action_required" : "compliant",
      detail: "Includes: land title deed, design approval from Abu Dhabi City Municipality, construction permit, and escrow account confirmation.",
      deadline: "Before marketing",
      authority: "DMT — Abu Dhabi",
    });
  }

  // === MARKETING ===
  checks.push({
    id: "mkt-1",
    category: "Marketing",
    rule: "Marketing Permit",
    requirement: "No marketing or advertising before permit issuance",
    status: projectStatus === "Pre-Launch" ? "action_required" : "compliant",
    detail: `${emirate === "Dubai" ? "RERA Form A + Trakheesi permit" : "DMT registration"} must be obtained before any billboard, digital ad, or brochure distribution. Violation: AED 50,000-200,000 fine + project suspension.`,
    authority: emirate === "Dubai" ? "RERA" : "DMT",
  });

  checks.push({
    id: "mkt-2",
    category: "Marketing",
    rule: "Broker License Requirement",
    requirement: "All marketing brokers must hold valid RERA/DMT broker card",
    status: "warning",
    detail: "Brokers must be registered with the relevant authority. Developer is responsible for verifying broker licenses. Unlicensed broker activity: AED 50,000 fine per violation.",
    authority: emirate === "Dubai" ? "RERA" : "DMT",
  });

  checks.push({
    id: "mkt-3",
    category: "Marketing",
    rule: "Advertising Content Approval",
    requirement: "All marketing materials must be approved before publication",
    status: "warning",
    detail: "Brochures, renderings, and digital ads must not misrepresent the project. Price claims must match registered Form B/TAMM prices. Delivery dates must match construction schedule.",
    authority: emirate === "Dubai" ? "RERA" : "DMT",
  });

  // === CONSTRUCTION ===
  checks.push({
    id: "con-1",
    category: "Construction",
    rule: "Construction Progress Reporting",
    requirement: "Quarterly progress reports to land department",
    status: projectStatus === "Under Construction" ? "action_required" : "not_applicable",
    detail: `Current progress: ${constructionProgress}%. Must submit quarterly certified progress reports. Escrow withdrawals linked to verified milestones. Delay > 6 months triggers RERA/DMT review.`,
    deadline: "Quarterly",
    authority: emirate === "Dubai" ? "RERA" : "DMT",
  });

  checks.push({
    id: "con-2",
    category: "Construction",
    rule: "Handover Notification",
    requirement: "Form H (Dubai) / DMT handover notice required at completion",
    status: constructionProgress > 90 ? "action_required" : "not_applicable",
    detail: "Must notify land department 30 days before handover. DLD/DMT inspects the property. Oqood/TAMM converts to title deed. Buyer has 60 days to complete transfer.",
    deadline: "30 days before handover",
    authority: emirate === "Dubai" ? "DLD" : "DMT",
  });

  // === FINANCIAL ===
  checks.push({
    id: "fin-1",
    category: "Financial",
    rule: "Minimum Capital Requirement",
    requirement: `Developer must maintain minimum paid-up capital: ${emirate === "Dubai" ? "AED 300M (Tier 1)" : "AED 50M"}`,
    status: developerTier === 1 ? "compliant" : "warning",
    detail: `Tier ${developerTier} developer. Capital must be maintained throughout project lifecycle. Audited financials required annually.`,
    authority: emirate === "Dubai" ? "RERA" : "DMT",
  });

  checks.push({
    id: "fin-2",
    category: "Financial",
    rule: "Escrow Withdrawal Limitation",
    requirement: "Developer can withdraw only against certified construction progress",
    status: projectStatus === "Under Construction" ? "warning" : "not_applicable",
    detail: `Current progress: ${constructionProgress}%. Developer eligible to withdraw up to ${constructionProgress}% of escrow. Remaining funds retained until next milestone certification. Independent consultant must certify each milestone.`,
    authority: emirate === "Dubai" ? "DLD" : "DMT",
  });

  // Summary
  const compliant = checks.filter((c) => c.status === "compliant").length;
  const warnings = checks.filter((c) => c.status === "warning").length;
  const actionsRequired = checks.filter((c) => c.status === "action_required").length;
  const notApplicable = checks.filter((c) => c.status === "not_applicable").length;
  const overallStatus = actionsRequired > 0 ? "Action Required" : warnings > 2 ? "Critical Issues" : "Fully Compliant";

  return {
    emirate,
    checks,
    summary: { compliant, warnings, actionsRequired, notApplicable, overallStatus },
    escrowRequirements: {
      escrowPercentage: emirate === "Dubai" ? 100 : 100,
      minimumDepositPct: emirate === "Dubai" ? 25 : 20,
      maxDeveloperWithdrawalBeforeHandover: 70,
      retentionAtHandover: 7,
    },
    registrationRequirements: {
      oqoodRequired: projectStatus !== "Completed",
      oqoodFee: Math.round(totalProjectValue * 0.04),
      titleDeedFee: Math.round(totalProjectValue * 0.04),
      transferFee: Math.round(totalProjectValue * 0.04),
    },
    marketingRequirements: {
      permitRequired: projectStatus === "Pre-Launch" || projectStatus === "Off-Plan",
      permitType: emirate === "Dubai" ? "Form A + Trakheesi" : "DMT Registration",
      maxPreLaunchMarketing: 0,
      brokerLicenseRequired: true,
    },
  };
}
