/**
 * src/lib/engines/mock-data.ts
 * Project Capital Velocity — Market Intelligence Layer (TypeScript port)
 *
 * Direct port of data/mock_dubai_marina.json. Embedded as a typed constant
 * so the Next.js API routes don't need filesystem access. The Python file
 * remains the canonical source for the FastAPI layer; this TS mirror exists
 * so the Next.js prototype can run standalone.
 */

export interface Comp {
  comp_id: string;
  project: string;
  developer: string;
  unit_type: "1BR" | "2BR" | "3BR";
  view: "Marina" | "Sea" | "City";
  floor_premium_pct: number;
  base_psf: number;
  amenity_score: number;
  payment_plan: string;
  absorption_days_50pct: number;
  avg_discount_off_asking: number;
}

export const MOCK_COMPS: Comp[] = [
  {
    comp_id: "CV-001",
    project: "Marina Gate III",
    developer: "Select Group",
    unit_type: "1BR",
    view: "Marina",
    floor_premium_pct: 1.5,
    base_psf: 2400,
    amenity_score: 8,
    payment_plan: "60/40",
    absorption_days_50pct: 65,
    avg_discount_off_asking: 5.0,
  },
  {
    comp_id: "CV-002",
    project: "Six Senses Residences Dubai Marina",
    developer: "Select Group",
    unit_type: "3BR",
    view: "Sea",
    floor_premium_pct: 2.2,
    base_psf: 3200,
    amenity_score: 10,
    payment_plan: "50/50",
    absorption_days_50pct: 92,
    avg_discount_off_asking: 6.5,
  },
  {
    comp_id: "CV-003",
    project: "Emaar Beachfront - Beach Hill",
    developer: "Emaar Properties",
    unit_type: "2BR",
    view: "Sea",
    floor_premium_pct: 2.0,
    base_psf: 3050,
    amenity_score: 9,
    payment_plan: "70/30",
    absorption_days_50pct: 48,
    avg_discount_off_asking: 3.0,
  },
  {
    comp_id: "CV-004",
    project: "Bluewaters Residences",
    developer: "Meraas",
    unit_type: "2BR",
    view: "Sea",
    floor_premium_pct: 1.8,
    base_psf: 2850,
    amenity_score: 8,
    payment_plan: "60/40",
    absorption_days_50pct: 58,
    avg_discount_off_asking: 4.5,
  },
  {
    comp_id: "CV-005",
    project: "Jumeirah Living Marina Gate",
    developer: "Meraas",
    unit_type: "1BR",
    view: "City",
    floor_premium_pct: 1.0,
    base_psf: 2300,
    amenity_score: 7,
    payment_plan: "60/40",
    absorption_days_50pct: 110,
    avg_discount_off_asking: 8.0,
  },
  {
    comp_id: "CV-006",
    project: "Muraba Residences",
    developer: "Muraba",
    unit_type: "2BR",
    view: "Sea",
    floor_premium_pct: 2.5,
    base_psf: 3100,
    amenity_score: 9,
    payment_plan: "50/50",
    absorption_days_50pct: 88,
    avg_discount_off_asking: 5.0,
  },
  {
    comp_id: "CV-007",
    project: "Marina Gate II",
    developer: "Select Group",
    unit_type: "2BR",
    view: "Marina",
    floor_premium_pct: 1.6,
    base_psf: 2650,
    amenity_score: 8,
    payment_plan: "70/30",
    absorption_days_50pct: 72,
    avg_discount_off_asking: 6.0,
  },
  {
    comp_id: "CV-008",
    project: "Beach Vista - Emaar Beachfront",
    developer: "Emaar Properties",
    unit_type: "3BR",
    view: "Sea",
    floor_premium_pct: 2.1,
    base_psf: 3150,
    amenity_score: 9,
    payment_plan: "70/30",
    absorption_days_50pct: 55,
    avg_discount_off_asking: 3.5,
  },
];
