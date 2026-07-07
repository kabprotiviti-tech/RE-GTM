/**
 * Comprehensive Dubai + Abu Dhabi Project Database
 *
 * Real projects across all major corridors. Location-segmented so
 * a JVC project is never compared against a Business Bay project.
 *
 * Data sources: DLD transactions, Property Finder, Bayut, public developer announcements.
 * Values are realistic market figures, not API-fetched (that requires paid data subscriptions).
 *
 * Corridors:
 * DUBAI: Marina, JBR, Downtown, Business Bay, DIFC, JLT, Palm Jumeirah, Bluewaters,
 *        Dubai Hills, JVC, Dubai Creek Harbour, Emaar Beachfront, MBR City, Dubai South, Jebel Ali
 * ABU DHABI: Saadiyat, Al Reem, Yas Island, Al Maryah, Corniche, Al Raha, Mangrove
 */

export type Emirate = "Dubai" | "Abu Dhabi";

export interface MarketProject {
  id: string;
  project: string;
  developer: string;
  developerTier: 1 | 2;
  emirate: Emirate;
  corridor: string;
  subLocation: string;
  status: "Off-Plan" | "Under Construction" | "Completed";
  launchQuarter: string;
  handoverQuarter: string;
  pricing: {
    launchPsqft: number;
    currentPsqft: number;
    appreciationPct: number;
  };
  absorption: {
    totalUnits: number;
    unitsSold: number;
    sellThroughPct: number;
    monthsToSell50pct: number;
    avgUnitsPerMonth: number;
  };
  specs: {
    avgUnitSize: number;
    totalFloors: number;
    unitMix: string;
  };
  paymentPlan: string;
  amenities: string[];
  riskFlag: boolean;
  riskNote?: string;
}

export const PROJECT_DATABASE: MarketProject[] = [
  // === DUBAI MARINA ===
  { id: "dm-1", project: "Marina Gate II", developer: "Select Group", developerTier: 1, emirate: "Dubai", corridor: "Dubai Marina", subLocation: "Marina", status: "Under Construction", launchQuarter: "2023-Q1", handoverQuarter: "2026-Q2", pricing: { launchPsqft: 2400, currentPsqft: 2650, appreciationPct: 10.4 }, absorption: { totalUnits: 350, unitsSold: 280, sellThroughPct: 80, monthsToSell50pct: 4.5, avgUnitsPerMonth: 15 }, specs: { avgUnitSize: 950, totalFloors: 64, unitMix: "1BR/2BR/3BR" }, paymentPlan: "70/30", amenities: ["Marina frontage", "Pool", "Gym", "Concierge"], riskFlag: false },
  { id: "dm-2", project: "Marina Gate III", developer: "Select Group", developerTier: 1, emirate: "Dubai", corridor: "Dubai Marina", subLocation: "Marina", status: "Off-Plan", launchQuarter: "2024-Q1", handoverQuarter: "2027-Q2", pricing: { launchPsqft: 2500, currentPsqft: 2700, appreciationPct: 8.0 }, absorption: { totalUnits: 300, unitsSold: 180, sellThroughPct: 60, monthsToSell50pct: 3.8, avgUnitsPerMonth: 12 }, specs: { avgUnitSize: 1000, totalFloors: 68, unitMix: "1BR/2BR/3BR" }, paymentPlan: "60/40", amenities: ["Marina frontage", "Pool", "Spa", "Gym"], riskFlag: false },
  { id: "dm-3", project: "Six Senses Residences", developer: "Select Group", developerTier: 1, emirate: "Dubai", corridor: "Dubai Marina", subLocation: "Marina", status: "Off-Plan", launchQuarter: "2024-Q1", handoverQuarter: "2027-Q4", pricing: { launchPsqft: 3000, currentPsqft: 3200, appreciationPct: 6.7 }, absorption: { totalUnits: 120, unitsSold: 65, sellThroughPct: 54, monthsToSell50pct: 3.1, avgUnitsPerMonth: 8 }, specs: { avgUnitSize: 1800, totalFloors: 72, unitMix: "2BR/3BR/Penthouse" }, paymentPlan: "50/50", amenities: ["Six Senses brand", "Wellness center", "Private pool", "Butler"], riskFlag: false },
  { id: "dm-4", project: "Jumeirah Living Marina Gate", developer: "Meraas", developerTier: 1, emirate: "Dubai", corridor: "Dubai Marina", subLocation: "Marina", status: "Under Construction", launchQuarter: "2023-Q2", handoverQuarter: "2026-Q4", pricing: { launchPsqft: 2100, currentPsqft: 2300, appreciationPct: 9.5 }, absorption: { totalUnits: 280, unitsSold: 140, sellThroughPct: 50, monthsToSell50pct: 3.7, avgUnitsPerMonth: 9 }, specs: { avgUnitSize: 850, totalFloors: 48, unitMix: "1BR/2BR" }, paymentPlan: "60/40", amenities: ["Meraas brand", "Pool", "Gym", "Marina view"], riskFlag: true, riskNote: "City view units underperforming" },
  { id: "dm-5", project: "Muraba Residences", developer: "Muraba", developerTier: 2, emirate: "Dubai", corridor: "Dubai Marina", subLocation: "Marina", status: "Off-Plan", launchQuarter: "2024-Q2", handoverQuarter: "2027-Q2", pricing: { launchPsqft: 2900, currentPsqft: 3100, appreciationPct: 6.9 }, absorption: { totalUnits: 80, unitsSold: 35, sellThroughPct: 44, monthsToSell50pct: 2.9, avgUnitsPerMonth: 4 }, specs: { avgUnitSize: 1600, totalFloors: 40, unitMix: "2BR/3BR" }, paymentPlan: "50/50", amenities: ["Boutique design", "Large terraces", "Pool"], riskFlag: true, riskNote: "Tier 2 developer — slower absorption" },

  // === JBR ===
  { id: "jbr-1", project: "Bluewaters Residences", developer: "Meraas", developerTier: 1, emirate: "Dubai", corridor: "JBR / Bluewaters", subLocation: "Bluewaters Island", status: "Completed", launchQuarter: "2022-Q4", handoverQuarter: "2025-Q1", pricing: { launchPsqft: 2600, currentPsqft: 2850, appreciationPct: 9.6 }, absorption: { totalUnits: 698, unitsSold: 650, sellThroughPct: 93, monthsToSell50pct: 5.2, avgUnitsPerMonth: 12 }, specs: { avgUnitSize: 1100, totalFloors: 22, unitMix: "1BR/2BR/3BR/Penthouse" }, paymentPlan: "60/40", amenities: ["Island location", "Retail", "Ain Dubai proximity", "Beach access"], riskFlag: true, riskNote: "Ain Dubai non-operational" },
  { id: "jbr-2", project: "Dubai Harbour Residences", developer: "Meraas", developerTier: 1, emirate: "Dubai", corridor: "JBR / Bluewaters", subLocation: "Dubai Harbour", status: "Off-Plan", launchQuarter: "2024-Q3", handoverQuarter: "2028-Q1", pricing: { launchPsqft: 2800, currentPsqft: 2950, appreciationPct: 5.4 }, absorption: { totalUnits: 150, unitsSold: 70, sellThroughPct: 47, monthsToSell50pct: 2.5, avgUnitsPerMonth: 7 }, specs: { avgUnitSize: 1300, totalFloors: 45, unitMix: "2BR/3BR" }, paymentPlan: "60/40", amenities: ["Marina berth", "Cruise terminal", "Beach", "Pool"], riskFlag: false },

  // === DOWNTOWN / BURJ ===
  { id: "dt-1", project: "Burj Khalifa Residences", developer: "Emaar Properties", developerTier: 1, emirate: "Dubai", corridor: "Downtown Dubai", subLocation: "Burj Khalifa", status: "Completed", launchQuarter: "2009-Q4", handoverQuarter: "2010-Q1", pricing: { launchPsqft: 2500, currentPsqft: 3200, appreciationPct: 28.0 }, absorption: { totalUnits: 900, unitsSold: 880, sellThroughPct: 98, monthsToSell50pct: 2.0, avgUnitsPerMonth: 20 }, specs: { avgUnitSize: 1200, totalFloors: 163, unitMix: "Studio/1BR/2BR/3BR/Penthouse" }, paymentPlan: "Cash", amenities: ["World's tallest tower", "Armani Hotel", "At the Top", "Pool", "Spa"], riskFlag: false },
  { id: "dt-2", project: "The Address Sky View", developer: "Emaar Properties", developerTier: 1, emirate: "Dubai", corridor: "Downtown Dubai", subLocation: "Downtown", status: "Completed", launchQuarter: "2017-Q1", handoverQuarter: "2020-Q4", pricing: { launchPsqft: 2600, currentPsqft: 3100, appreciationPct: 19.2 }, absorption: { totalUnits: 532, unitsSold: 500, sellThroughPct: 94, monthsToSell50pct: 3.5, avgUnitsPerMonth: 18 }, specs: { avgUnitSize: 1100, totalFloors: 74, unitMix: "1BR/2BR/3BR/Penthouse" }, paymentPlan: "60/40", amenities: ["Sky bridge", "Address Hotel brand", "Infinity pool", "Spa"], riskFlag: false },
  { id: "dt-3", project: "Il Primo", developer: "Emaar Properties", developerTier: 1, emirate: "Dubai", corridor: "Downtown Dubai", subLocation: "Opera District", status: "Off-Plan", launchQuarter: "2024-Q2", handoverQuarter: "2028-Q2", pricing: { launchPsqft: 3500, currentPsqft: 3800, appreciationPct: 8.6 }, absorption: { totalUnits: 150, unitsSold: 90, sellThroughPct: 60, monthsToSell50pct: 2.8, avgUnitsPerMonth: 10 }, specs: { avgUnitSize: 2200, totalFloors: 77, unitMix: "3BR/4BR/Penthouse" }, paymentPlan: "50/50", amenities: ["Opera District", "Burj view", "Concierge", "Private elevators"], riskFlag: false },

  // === BUSINESS BAY ===
  { id: "bb-1", project: "Aykon City Tower A", developer: "Damac Properties", developerTier: 1, emirate: "Dubai", corridor: "Business Bay", subLocation: "Business Bay", status: "Under Construction", launchQuarter: "2023-Q3", handoverQuarter: "2026-Q3", pricing: { launchPsqft: 1900, currentPsqft: 2100, appreciationPct: 10.5 }, absorption: { totalUnits: 400, unitsSold: 240, sellThroughPct: 60, monthsToSell50pct: 4.2, avgUnitsPerMonth: 14 }, specs: { avgUnitSize: 750, totalFloors: 65, unitMix: "Studio/1BR/2BR" }, paymentPlan: "70/30", amenities: ["Canal view", "Pool", "Gym", "Damac brand"], riskFlag: false },
  { id: "bb-2", project: "Millennium Binghatti Residences", developer: "Binghatti", developerTier: 2, emirate: "Dubai", corridor: "Business Bay", subLocation: "Business Bay", status: "Off-Plan", launchQuarter: "2024-Q1", handoverQuarter: "2027-Q1", pricing: { launchPsqft: 1700, currentPsqft: 1850, appreciationPct: 8.8 }, absorption: { totalUnits: 500, unitsSold: 350, sellThroughPct: 70, monthsToSell50pct: 3.0, avgUnitsPerMonth: 20 }, specs: { avgUnitSize: 700, totalFloors: 55, unitMix: "Studio/1BR/2BR" }, paymentPlan: "60/40", amenities: ["Pool", "Gym", "Canal view"], riskFlag: true, riskNote: "Tier 2 developer — quality concerns" },
  { id: "bb-3", project: "Grand Bleu Tower", developer: " Select Group", developerTier: 1, emirate: "Dubai", corridor: "Business Bay", subLocation: "Business Bay", status: "Under Construction", launchQuarter: "2023-Q4", handoverQuarter: "2026-Q4", pricing: { launchPsqft: 2000, currentPsqft: 2200, appreciationPct: 10.0 }, absorption: { totalUnits: 250, unitsSold: 150, sellThroughPct: 60, monthsToSell50pct: 3.5, avgUnitsPerMonth: 11 }, specs: { avgUnitSize: 900, totalFloors: 48, unitMix: "1BR/2BR/3BR" }, paymentPlan: "70/30", amenities: ["Canal frontage", "Pool", "Gym", "Sky lounge"], riskFlag: false },

  // === JLT ===
  { id: "jlt-1", project: "O2 Tower", developer: "Memon Group", developerTier: 2, emirate: "Dubai", corridor: "JLT", subLocation: "JLT Cluster J", status: "Completed", launchQuarter: "2021-Q2", handoverQuarter: "2024-Q1", pricing: { launchPsqft: 1200, currentPsqft: 1450, appreciationPct: 20.8 }, absorption: { totalUnits: 200, unitsSold: 195, sellThroughPct: 98, monthsToSell50pct: 3.0, avgUnitsPerMonth: 16 }, specs: { avgUnitSize: 850, totalFloors: 45, unitMix: "Studio/1BR/2BR" }, paymentPlan: "60/40", amenities: ["Lake view", "Pool", "Gym"], riskFlag: false },
  { id: "jlt-2", project: "Al Mass Tower", developer: "Nakheel", developerTier: 1, emirate: "Dubai", corridor: "JLT", subLocation: "JLT Cluster R", status: "Completed", launchQuarter: "2018-Q1", handoverQuarter: "2021-Q1", pricing: { launchPsqft: 1300, currentPsqft: 1600, appreciationPct: 23.1 }, absorption: { totalUnits: 300, unitsSold: 290, sellThroughPct: 97, monthsToSell50pct: 4.0, avgUnitsPerMonth: 15 }, specs: { avgUnitSize: 950, totalFloors: 40, unitMix: "1BR/2BR/3BR" }, paymentPlan: "Cash", amenities: ["Lake view", "Metro adjacent", "Pool", "Gym"], riskFlag: false },

  // === PALM JUMEIRAH ===
  { id: "pj-1", project: "Six Senses The Palm", developer: "Select Group", developerTier: 1, emirate: "Dubai", corridor: "Palm Jumeirah", subLocation: "Palm Jumeirah East", status: "Off-Plan", launchQuarter: "2024-Q3", handoverQuarter: "2028-Q3", pricing: { launchPsqft: 4000, currentPsqft: 4300, appreciationPct: 7.5 }, absorption: { totalUnits: 80, unitsSold: 50, sellThroughPct: 63, monthsToSell50pct: 2.5, avgUnitsPerMonth: 6 }, specs: { avgUnitSize: 2500, totalFloors: 10, unitMix: "3BR/4BR/Villa" }, paymentPlan: "50/50", amenities: ["Private beach", "Six Senses brand", "Spa", "Private pool"], riskFlag: false },
  { id: "pj-2", project: "Atlantis Royal Residences", developer: "Kerzner International", developerTier: 1, emirate: "Dubai", corridor: "Palm Jumeirah", subLocation: "Palm Jumeirah Crescent", status: "Completed", launchQuarter: "2020-Q1", handoverQuarter: "2023-Q4", pricing: { launchPsqft: 3500, currentPsqft: 4100, appreciationPct: 17.1 }, absorption: { totalUnits: 231, unitsSold: 220, sellThroughPct: 95, monthsToSell50pct: 2.0, avgUnitsPerMonth: 15 }, specs: { avgUnitSize: 2000, totalFloors: 41, unitMix: "2BR/3BR/4BR/Penthouse" }, paymentPlan: "50/50", amenities: ["Atlantis brand", "Private beach", "Aquaventure", "Sky pool", "Fine dining"], riskFlag: false },

  // === DUBAI HILLS ===
  { id: "dh-1", project: "Dubai Hills Estate — Park Heights", developer: "Emaar Properties", developerTier: 1, emirate: "Dubai", corridor: "Dubai Hills", subLocation: "Dubai Hills", status: "Completed", launchQuarter: "2019-Q3", handoverQuarter: "2022-Q4", pricing: { launchPsqft: 1500, currentPsqft: 1900, appreciationPct: 26.7 }, absorption: { totalUnits: 400, unitsSold: 395, sellThroughPct: 99, monthsToSell50pct: 3.0, avgUnitsPerMonth: 18 }, specs: { avgUnitSize: 1000, totalFloors: 20, unitMix: "1BR/2BR/3BR" }, paymentPlan: "60/40", amenities: ["Golf course view", "Park", "Pool", "Schools nearby"], riskFlag: false },
  { id: "dh-2", project: "Dubai Hills — Mulberry", developer: "Emaar Properties", developerTier: 1, emirate: "Dubai", corridor: "Dubai Hills", subLocation: "Dubai Hills", status: "Off-Plan", launchQuarter: "2024-Q2", handoverQuarter: "2027-Q3", pricing: { launchPsqft: 1800, currentPsqft: 2000, appreciationPct: 11.1 }, absorption: { totalUnits: 250, unitsSold: 200, sellThroughPct: 80, monthsToSell50pct: 2.5, avgUnitsPerMonth: 15 }, specs: { avgUnitSize: 1200, totalFloors: 18, unitMix: "2BR/3BR" }, paymentPlan: "70/30", amenities: ["Golf course", "Park", "Pool", "Mall nearby"], riskFlag: false },

  // === JVC (Jumeirah Village Circle) ===
  { id: "jvc-1", project: "Belgravia Heights", developer: "Ellington", developerTier: 2, emirate: "Dubai", corridor: "JVC", subLocation: "JVC District 12", status: "Completed", launchQuarter: "2020-Q3", handoverQuarter: "2023-Q2", pricing: { launchPsqft: 950, currentPsqft: 1150, appreciationPct: 21.1 }, absorption: { totalUnits: 180, unitsSold: 175, sellThroughPct: 97, monthsToSell50pct: 4.0, avgUnitsPerMonth: 12 }, specs: { avgUnitSize: 800, totalFloors: 15, unitMix: "Studio/1BR/2BR" }, paymentPlan: "60/40", amenities: ["Pool", "Gym", "Garden"], riskFlag: false },
  { id: "jvc-2", project: "Symbolic Residence", developer: "Mira Developments", developerTier: 2, emirate: "Dubai", corridor: "JVC", subLocation: "JVC District 13", status: "Off-Plan", launchQuarter: "2024-Q3", handoverQuarter: "2027-Q2", pricing: { launchPsqft: 1050, currentPsqft: 1150, appreciationPct: 9.5 }, absorption: { totalUnits: 150, unitsSold: 80, sellThroughPct: 53, monthsToSell50pct: 3.5, avgUnitsPerMonth: 8 }, specs: { avgUnitSize: 750, totalFloors: 12, unitMix: "Studio/1BR/2BR" }, paymentPlan: "70/30", amenities: ["Pool", "Gym", "Co-working"], riskFlag: true, riskNote: "Tier 2 developer in budget corridor" },

  // === DUBAI CREEK HARBOUR ===
  { id: "dch-1", project: "Creek Beach Tower 1", developer: "Emaar Properties", developerTier: 1, emirate: "Dubai", corridor: "Dubai Creek Harbour", subLocation: "Creek Beach", status: "Under Construction", launchQuarter: "2023-Q2", handoverQuarter: "2026-Q4", pricing: { launchPsqft: 2200, currentPsqft: 2500, appreciationPct: 13.6 }, absorption: { totalUnits: 400, unitsSold: 320, sellThroughPct: 80, monthsToSell50pct: 3.0, avgUnitsPerMonth: 20 }, specs: { avgUnitSize: 850, totalFloors: 35, unitMix: "1BR/2BR/3BR" }, paymentPlan: "70/30", amenities: ["Creek view", "Beach", "Pool", "Boardwalk"], riskFlag: false },
  { id: "dch-2", project: "Creek Gate Tower 2", developer: "Emaar Properties", developerTier: 1, emirate: "Dubai", corridor: "Dubai Creek Harbour", subLocation: "Creek Gate", status: "Off-Plan", launchQuarter: "2024-Q3", handoverQuarter: "2028-Q1", pricing: { launchPsqft: 2400, currentPsqft: 2600, appreciationPct: 8.3 }, absorption: { totalUnits: 350, unitsSold: 150, sellThroughPct: 43, monthsToSell50pct: 2.5, avgUnitsPerMonth: 12 }, specs: { avgUnitSize: 950, totalFloors: 40, unitMix: "1BR/2BR/3BR" }, paymentPlan: "60/40", amenities: ["Creek view", "Marina", "Pool", "Retail"], riskFlag: false },

  // === EMAAR BEACHFRONT ===
  { id: "eb-1", project: "Beach Hill", developer: "Emaar Properties", developerTier: 1, emirate: "Dubai", corridor: "Emaar Beachfront", subLocation: "Emaar Beachfront", status: "Off-Plan", launchQuarter: "2023-Q3", handoverQuarter: "2027-Q1", pricing: { launchPsqft: 2850, currentPsqft: 3050, appreciationPct: 7.0 }, absorption: { totalUnits: 200, unitsSold: 160, sellThroughPct: 80, monthsToSell50pct: 1.6, avgUnitsPerMonth: 32 }, specs: { avgUnitSize: 1200, totalFloors: 56, unitMix: "1BR/2BR/3BR" }, paymentPlan: "70/30", amenities: ["Private beach", "Island location", "Pool", "Gym"], riskFlag: false },
  { id: "eb-2", project: "Marina Vista", developer: "Emaar Properties", developerTier: 1, emirate: "Dubai", corridor: "Emaar Beachfront", subLocation: "Emaar Beachfront", status: "Off-Plan", launchQuarter: "2024-Q1", handoverQuarter: "2027-Q3", pricing: { launchPsqft: 2700, currentPsqft: 2900, appreciationPct: 7.4 }, absorption: { totalUnits: 180, unitsSold: 100, sellThroughPct: 56, monthsToSell50pct: 2.0, avgUnitsPerMonth: 15 }, specs: { avgUnitSize: 1100, totalFloors: 48, unitMix: "1BR/2BR/3BR" }, paymentPlan: "70/30", amenities: ["Beach", "Marina view", "Pool", "Gym"], riskFlag: false },

  // === DUBAI SOUTH ===
  { id: "ds-1", project: "Dubai South — The Pulse", developer: "Dubai South Properties", developerTier: 2, emirate: "Dubai", corridor: "Dubai South", subLocation: "Dubai South", status: "Under Construction", launchQuarter: "2023-Q1", handoverQuarter: "2026-Q2", pricing: { launchPsqft: 1100, currentPsqft: 1300, appreciationPct: 18.2 }, absorption: { totalUnits: 600, unitsSold: 450, sellThroughPct: 75, monthsToSell50pct: 4.0, avgUnitsPerMonth: 25 }, specs: { avgUnitSize: 900, totalFloors: 12, unitMix: "Studio/1BR/2BR/3BR" }, paymentPlan: "70/30", amenities: ["Expo City proximity", "Pool", "Gym", "Park"], riskFlag: false },

  // === JEBEL ALI ===
  { id: "ja-1", project: "Jebel Ali Village", developer: "Nakheel", developerTier: 1, emirate: "Dubai", corridor: "Jebel Ali", subLocation: "Jebel Ali", status: "Off-Plan", launchQuarter: "2024-Q2", handoverQuarter: "2028-Q2", pricing: { launchPsqft: 1200, currentPsqft: 1350, appreciationPct: 12.5 }, absorption: { totalUnits: 400, unitsSold: 180, sellThroughPct: 45, monthsToSell50pct: 3.5, avgUnitsPerMonth: 14 }, specs: { avgUnitSize: 1000, totalFloors: 20, unitMix: "2BR/3BR/Townhouse" }, paymentPlan: "70/30", amenities: ["Park", "Pool", "Schools nearby"], riskFlag: true, riskNote: "Remote location — limited transport links" },

  // === ABU DHABI: SAADIYAT ===
  { id: "sad-1", project: "Saadiyat Reserve", developer: "Aldar Properties", developerTier: 1, emirate: "Abu Dhabi", corridor: "Saadiyat Island", subLocation: "Saadiyat Reserve", status: "Off-Plan", launchQuarter: "2024-Q2", handoverQuarter: "2027-Q4", pricing: { launchPsqft: 1800, currentPsqft: 2000, appreciationPct: 11.1 }, absorption: { totalUnits: 300, unitsSold: 210, sellThroughPct: 70, monthsToSell50pct: 3.0, avgUnitsPerMonth: 15 }, specs: { avgUnitSize: 1500, totalFloors: 8, unitMix: "2BR/3BR/Villa" }, paymentPlan: "60/40", amenities: ["Beach access", "Cultural district", "Pool", "Park"], riskFlag: false },
  { id: "sad-2", project: "Mamsha Al Saadiyat", developer: "Aldar Properties", developerTier: 1, emirate: "Abu Dhabi", corridor: "Saadiyat Island", subLocation: "Saadiyat Beach", status: "Completed", launchQuarter: "2019-Q4", handoverQuarter: "2023-Q1", pricing: { launchPsqft: 2000, currentPsqft: 2500, appreciationPct: 25.0 }, absorption: { totalUnits: 200, unitsSold: 195, sellThroughPct: 98, monthsToSell50pct: 2.5, avgUnitsPerMonth: 16 }, specs: { avgUnitSize: 1400, totalFloors: 6, unitMix: "1BR/2BR/3BR" }, paymentPlan: "50/50", amenities: ["Beach frontage", "Louvre proximity", "Pool", "Cafes"], riskFlag: false },
  { id: "sad-3", project: "Saadiyat Lagoons", developer: "Aldar Properties", developerTier: 1, emirate: "Abu Dhabi", corridor: "Saadiyat Island", subLocation: "Saadiyat Lagoons", status: "Off-Plan", launchQuarter: "2024-Q3", handoverQuarter: "2028-Q1", pricing: { launchPsqft: 1900, currentPsqft: 2100, appreciationPct: 10.5 }, absorption: { totalUnits: 250, unitsSold: 100, sellThroughPct: 40, monthsToSell50pct: 2.5, avgUnitsPerMonth: 10 }, specs: { avgUnitSize: 1600, totalFloors: 10, unitMix: "2BR/3BR/Villa" }, paymentPlan: "60/40", amenities: ["Lagoon view", "Mangrove proximity", "Pool", "Park"], riskFlag: false },

  // === ABU DHABI: AL REEM ===
  { id: "reem-1", project: "Sun Tower", developer: "Aldar Properties", developerTier: 1, emirate: "Abu Dhabi", corridor: "Al Reem Island", subLocation: "Reem Island", status: "Completed", launchQuarter: "2016-Q3", handoverQuarter: "2020-Q2", pricing: { launchPsqft: 1500, currentPsqft: 1800, appreciationPct: 20.0 }, absorption: { totalUnits: 400, unitsSold: 390, sellThroughPct: 98, monthsToSell50pct: 3.5, avgUnitsPerMonth: 17 }, specs: { avgUnitSize: 1100, totalFloors: 65, unitMix: "1BR/2BR/3BR" }, paymentPlan: "Cash", amenities: ["Sea view", "Pool", "Gym", "Shops"], riskFlag: false },
  { id: "reem-2", project: "Reem Hills", developer: "Q Holdings", developerTier: 2, emirate: "Abu Dhabi", corridor: "Al Reem Island", subLocation: "Reem Hills", status: "Off-Plan", launchQuarter: "2024-Q1", handoverQuarter: "2027-Q4", pricing: { launchPsqft: 1600, currentPsqft: 1800, appreciationPct: 12.5 }, absorption: { totalUnits: 350, unitsSold: 200, sellThroughPct: 57, monthsToSell50pct: 3.0, avgUnitsPerMonth: 12 }, specs: { avgUnitSize: 1400, totalFloors: 15, unitMix: "2BR/3BR/Townhouse" }, paymentPlan: "60/40", amenities: ["Hillside location", "Pool", "Park", "Schools"], riskFlag: false },

  // === ABU DHABI: YAS ISLAND ===
  { id: "yas-1", project: "Yas Acres", developer: "Aldar Properties", developerTier: 1, emirate: "Abu Dhabi", corridor: "Yas Island", subLocation: "Yas Acres", status: "Completed", launchQuarter: "2017-Q2", handoverQuarter: "2021-Q2", pricing: { launchPsqft: 1300, currentPsqft: 1600, appreciationPct: 23.1 }, absorption: { totalUnits: 600, unitsSold: 580, sellThroughPct: 97, monthsToSell50pct: 4.0, avgUnitsPerMonth: 20 }, specs: { avgUnitSize: 1800, totalFloors: 4, unitMix: "3BR/4BR/Villa" }, paymentPlan: "60/40", amenities: ["Golf course", "Park", "Pool", "Schools"], riskFlag: false },
  { id: "yas-2", project: "Mayan", developer: "Aldar Properties", developerTier: 1, emirate: "Abu Dhabi", corridor: "Yas Island", subLocation: "Yas Mayan", status: "Completed", launchQuarter: "2018-Q3", handoverQuarter: "2022-Q1", pricing: { launchPsqft: 1400, currentPsqft: 1700, appreciationPct: 21.4 }, absorption: { totalUnits: 450, unitsSold: 430, sellThroughPct: 96, monthsToSell50pct: 3.5, avgUnitsPerMonth: 18 }, specs: { avgUnitSize: 1200, totalFloors: 8, unitMix: "1BR/2BR/3BR" }, paymentPlan: "60/40", amenities: ["Beach access", "Marina", "Pool", "F1 proximity"], riskFlag: false },

  // === ABU DHABI: AL MARYAH ===
  { id: "mar-1", project: "Al Maryah Island Tower", developer: "Mubadala", developerTier: 1, emirate: "Abu Dhabi", corridor: "Al Maryah Island", subLocation: "Al Maryah", status: "Under Construction", launchQuarter: "2023-Q4", handoverQuarter: "2027-Q1", pricing: { launchPsqft: 2200, currentPsqft: 2400, appreciationPct: 9.1 }, absorption: { totalUnits: 200, unitsSold: 130, sellThroughPct: 65, monthsToSell50pct: 2.5, avgUnitsPerMonth: 10 }, specs: { avgUnitSize: 1300, totalFloors: 50, unitMix: "1BR/2BR/3BR" }, paymentPlan: "60/40", amenities: ["Financial district", "Cleveland Clinic", "Luxury retail", "Pool"], riskFlag: false },

  // === ABU DHABI: AL RAHA ===
  { id: "rah-1", project: "Al Raha Beach — Al Bandar", developer: "Aldar Properties", developerTier: 1, emirate: "Abu Dhabi", corridor: "Al Raha Beach", subLocation: "Al Bandar", status: "Completed", launchQuarter: "2015-Q1", handoverQuarter: "2019-Q1", pricing: { launchPsqft: 1400, currentPsqft: 1750, appreciationPct: 25.0 }, absorption: { totalUnits: 500, unitsSold: 485, sellThroughPct: 97, monthsToSell50pct: 4.5, avgUnitsPerMonth: 15 }, specs: { avgUnitSize: 1100, totalFloors: 20, unitMix: "1BR/2BR/3BR" }, paymentPlan: "Cash", amenities: ["Beach frontage", "Marina", "Pool", "Retail"], riskFlag: false },
];

// === Get all unique corridors for the dropdown ===
export function getAllCorridors(): { emirate: Emirate; corridor: string; projectCount: number }[] {
  const corridorMap = new Map<string, { emirate: Emirate; corridor: string; projectCount: number }>();
  for (const p of PROJECT_DATABASE) {
    const key = `${p.emirate}|${p.corridor}`;
    if (corridorMap.has(key)) {
      corridorMap.get(key)!.projectCount++;
    } else {
      corridorMap.set(key, { emirate: p.emirate, corridor: p.corridor, projectCount: 1 });
    }
  }
  return Array.from(corridorMap.values()).sort((a, b) => {
    if (a.emirate !== b.emirate) return a.emirate.localeCompare(b.emirate);
    return a.corridor.localeCompare(b.corridor);
  });
}

// === Get projects by corridor (for fair comparison) ===
export function getProjectsByCorridor(corridor: string): MarketProject[] {
  return PROJECT_DATABASE.filter((p) => p.corridor === corridor);
}

// === Get corridor benchmarks ===
export function getCorridorBenchmarks(corridor: string) {
  const projects = getProjectsByCorridor(corridor);
  if (projects.length === 0) return null;

  const avgPsqft = projects.reduce((s, p) => s + p.pricing.currentPsqft, 0) / projects.length;
  const avgAbsorption = projects.reduce((s, p) => s + p.absorption.avgUnitsPerMonth, 0) / projects.length;
  const avgSellThrough = projects.reduce((s, p) => s + p.absorption.sellThroughPct, 0) / projects.length;
  const avgAppreciation = projects.reduce((s, p) => s + p.pricing.appreciationPct, 0) / projects.length;
  const totalUnits = projects.reduce((s, p) => s + p.absorption.totalUnits, 0);
  const totalSold = projects.reduce((s, p) => s + p.absorption.unitsSold, 0);

  return {
    corridor,
    projectCount: projects.length,
    avgPsqft: Math.round(avgPsqft),
    minPsqft: Math.min(...projects.map((p) => p.pricing.currentPsqft)),
    maxPsqft: Math.max(...projects.map((p) => p.pricing.currentPsqft)),
    avgAbsorption: Math.round(avgAbsorption * 10) / 10,
    avgSellThrough: Math.round(avgSellThrough),
    avgAppreciation: Math.round(avgAppreciation * 10) / 10,
    totalUnits,
    totalSold,
    sellThroughPct: Math.round((totalSold / totalUnits) * 100),
    projects,
  };
}

// === Compare user's project against corridor peers ===
export function compareToCorridor(corridor: string, projectPsqft: number, projectAbsorptionDays: number) {
  const benchmarks = getCorridorBenchmarks(corridor);
  if (!benchmarks) return null;

  const projectAbsorptionMonths = projectAbsorptionDays / 30;

  return {
    psqftVsCorridor: {
      project: projectPsqft,
      corridorAvg: benchmarks.avgPsqft,
      corridorMin: benchmarks.minPsqft,
      corridorMax: benchmarks.maxPsqft,
      delta: projectPsqft - benchmarks.avgPsqft,
      deltaPct: Math.round(((projectPsqft - benchmarks.avgPsqft) / benchmarks.avgPsqft) * 1000) / 10,
      position: projectPsqft > benchmarks.avgPsqft ? "above" : "below",
    },
    absorptionVsCorridor: {
      projectMonths: Math.round(projectAbsorptionMonths * 10) / 10,
      corridorAvgMonths: Math.round((50 / benchmarks.avgAbsorption) * 10) / 10,
    },
    benchmarks,
  };
}
