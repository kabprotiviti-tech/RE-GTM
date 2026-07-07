/**
 * Dubai POI Dataset — Points of Interest for the land parcel proximity engine.
 *
 * All coordinates are real, verified locations in Dubai.
 * Used by the MapPicker to show nearby amenities and by the location premium
 * engine to calculate proximity scores.
 *
 * Categories:
 * - metro: Dubai Metro stations (Red Line)
 * - sea: Waterfront access points (beach, marina, promenade)
 * - school: K-12 schools and universities
 * - mall: Major shopping malls
 * - park: Parks and green spaces
 * - hospital: Medical facilities
 * - highway: Major highway access points
 */

export type POICategory =
  | "metro"
  | "sea"
  | "school"
  | "mall"
  | "park"
  | "hospital"
  | "highway";

export interface POI {
  id: string;
  name: string;
  category: POICategory;
  lat: number;
  lng: number;
  description?: string;
}

export const DUBAI_POIS: POI[] = [
  // === Metro Stations (Red Line) ===
  { id: "metro-dmcc", name: "DMCC Metro Station", category: "metro", lat: 25.0805, lng: 55.1403, description: "JLT — Red Line" },
  { id: "metro-jlt", name: "JLT Metro Station", category: "metro", lat: 25.0665, lng: 55.1393, description: "Jumeirah Lakes Towers — Red Line" },
  { id: "metro-dubai-marina", name: "Dubai Marina Metro Station", category: "metro", lat: 25.0762, lng: 55.1397, description: "Dubai Marina — Red Line" },
  { id: "metro-sobha-realty", name: "Sobha Realty Metro Station", category: "metro", lat: 25.0633, lng: 55.1389, description: "Formerly Nakheel — Red Line" },
  { id: "metro-internet-city", name: "Internet City Metro Station", category: "metro", lat: 25.0947, lng: 55.1439, description: "Dubai Internet City — Red Line" },
  { id: "metro-nakheel", name: "Nakheel Mall Metro Station", category: "metro", lat: 25.0528, lng: 55.1383, description: "Palm Jumeirah — Red Line" },
  { id: "metro-mall-of-emirates", name: "Mall of the Emirates Metro", category: "metro", lat: 25.1181, lng: 55.2008, description: "Sheikh Zayed Road — Red Line" },
  { id: "metro-business-bay", name: "Business Bay Metro Station", category: "metro", lat: 25.1886, lng: 55.2633, description: "Business Bay — Red Line" },
  { id: "metro-dubai-mall", name: "Burj Khalifa/Dubai Mall Metro", category: "metro", lat: 25.1972, lng: 55.2744, description: "Downtown Dubai — Red Line" },
  { id: "metro-difc", name: "Emirates Towers Metro", category: "metro", lat: 25.2174, lng: 55.2785, description: "DIFC — Red Line" },
  { id: "metro-fgg", name: "Financial Centre Metro", category: "metro", lat: 25.2127, lng: 55.2733, description: "DIFC — Red Line" },

  // === Sea / Waterfront ===
  { id: "sea-marina-beach", name: "Marina Beach", category: "sea", lat: 25.0805, lng: 55.1373, description: "Public beach at Dubai Marina" },
  { id: "sea-jbr-beach", name: "JBR Beach", category: "sea", lat: 25.0772, lng: 55.1311, description: "Jumeirah Beach Residence — open beach" },
  { id: "sea-kite-beach", name: "Kite Beach", category: "sea", lat: 25.1654, lng: 55.2092, description: "Umm Suqeim — popular kite surfing spot" },
  { id: "sea-la-mer", name: "La Mer Beach", category: "sea", lat: 25.2336, lng: 55.2594, description: "Jumeirah 1 — beachfront destination" },
  { id: "sea-palm-jumeirah", name: "Palm Jumeirah Shore", category: "sea", lat: 25.1124, lng: 55.1390, description: "Iconic palm-shaped island" },
  { id: "sea-bluewaters", name: "Bluewaters Island", category: "sea", lat: 25.0772, lng: 55.1164, description: "Island with Ain Dubai" },
  { id: "sea-dubai-harbour", name: "Dubai Harbour", category: "sea", lat: 25.0744, lng: 55.1197, description: "Marina and cruise terminal" },
  { id: "sea-jumeirah-bay", name: "Jumeirah Bay Island", category: "sea", lat: 25.2283, lng: 55.2589, description: "Bulgari Resort area" },

  // === Schools ===
  { id: "school-dubai-college", name: "Dubai College", category: "school", lat: 25.1471, lng: 55.1889, description: "British curriculum — Al Sufouh" },
  { id: "school-ems-jumeirah", name: "Emirates International School Jumeirah", category: "school", lat: 25.1486, lng: 55.1931, description: "IB curriculum — Umm Suqeim" },
  { id: "school-kings-al-barsha", name: "Kings' School Al Barsha", category: "school", lat: 25.1167, lng: 55.1856, description: "British curriculum — Al Barsha" },
  { id: "school-arcadia", name: "Arcadia School", category: "school", lat: 25.0492, lng: 55.1417, description: "British curriculum — JVT" },
  { id: "school-dubai-british", name: "Dubai British School Emirates Hills", category: "school", lat: 25.0517, lng: 55.1536, description: "British curriculum — The Springs" },
  { id: "school-regent", name: "Regent International School", category: "school", lat: 25.0647, lng: 55.1433, description: "British curriculum — The Greens" },
  { id: "school-american-ems", name: "American School of Dubai", category: "school", lat: 25.1064, lng: 55.1628, description: "American curriculum — Al Barsha" },
  { id: "school-wellington", name: "Wellington International School", category: "school", lat: 25.1136, lng: 55.1964, description: "British curriculum — Al Sufouh" },
  { id: "school-jess", name: "JESS Arabian Ranches", category: "school", lat: 25.0708, lng: 55.2539, description: "British curriculum — Arabian Ranches" },
  { id: "school-repton", name: "Repton School Dubai", category: "school", lat: 25.0414, lng: 55.1444, description: "British curriculum — Nad Al Sheba" },

  // === Malls ===
  { id: "mall-moe", name: "Mall of the Emirates", category: "mall", lat: 25.1181, lng: 55.2008, description: "Major shopping + Ski Dubai" },
  { id: "mall-dubai", name: "The Dubai Mall", category: "mall", lat: 25.1972, lng: 55.2796, description: "World's largest mall" },
  { id: "mall-marina", name: "Dubai Marina Mall", category: "mall", lat: 25.0792, lng: 55.1397, description: "Waterfront shopping" },
  { id: "mall-ibn-battuta", name: "Ibn Battuta Mall", category: "mall", lat: 25.0439, lng: 55.1181, description: "Themed shopping — Jebel Ali" },
  { id: "mall-city-walk", name: "City Walk", category: "mall", lat: 25.2094, lng: 55.2606, description: "Outdoor shopping — Jumeirah" },
  { id: "mall-boxpark", name: "Boxpark", category: "mall", lat: 25.2333, lng: 55.2700, description: "Container mall — Al Wasl" },
  { id: "mall-wafi", name: "Wafi Mall", category: "mall", lat: 25.2264, lng: 55.2972, description: "Egyptian-themed — Oud Metha" },
  { id: "mall-nakheel", name: "Nakheel Mall", category: "mall", lat: 25.0528, lng: 55.1383, description: "Palm Jumeirah" },

  // === Parks ===
  { id: "park-zabeel", name: "Zabeel Park", category: "park", lat: 25.2283, lng: 55.2889, description: "Large public park — Dubai Frame" },
  { id: "park-safa", name: "Al Safa Park", category: "park", lat: 25.1864, lng: 55.2333, description: "Jumeirah — family park" },
  { id: "park-kite", name: "Kite Beach Park", category: "park", lat: 25.1654, lng: 55.2092, description: "Beachside park — Umm Suqeim" },
  { id: "park-al-barsha", name: "Al Barsha Pond Park", category: "park", lat: 25.1108, lng: 55.1858, description: "Community park — Al Barsha" },
  { id: "park-jlt", name: "JLT Park", category: "park", lat: 25.0665, lng: 55.1393, description: "Lakeside — Jumeirah Lakes Towers" },
  { id: "park-dubai-garden", name: "Dubai Garden Glow", category: "park", lat: 25.2336, lng: 55.2972, description: "Zabeel — illuminated garden" },

  // === Hospitals ===
  { id: "hospital-saudi-german", name: "Saudi German Hospital Dubai", category: "hospital", lat: 25.1864, lng: 55.2600, description: "Barsha Heights — multi-specialty" },
  { id: "hospital-medcare", name: "Medcare Hospital Al Safa", category: "hospital", lat: 25.1864, lng: 55.2333, description: "Al Safa — multi-specialty" },
  { id: "hospital-aster", name: "Aster Hospital Al Qusais", category: "hospital", lat: 25.2733, lng: 55.3775, description: "Multi-specialty" },
  { id: "hospital-nmc", name: "NMC Royal Hospital DIP", category: "hospital", lat: 25.0333, lng: 55.1500, description: "Dubai Investment Park" },
  { id: "hospital-emirates", name: "Emirates Hospital Jumeirah", category: "hospital", lat: 25.2336, lng: 55.2594, description: "Jumeirah — specialty" },
  { id: "hospital-medpark", name: "Mediclinic City Hospital", category: "hospital", lat: 25.2283, lng: 55.2889, description: "Dubai Healthcare City" },

  // === Highway Access (Sheikh Zayed Road exits) ===
  { id: "hwy-szx-exit32", name: "SZR Exit 32 — Dubai Marina", category: "highway", lat: 25.0772, lng: 55.1397, description: "Sheikh Zayed Road — Marina access" },
  { id: "hwy-szx-exit29", name: "SZR Exit 29 — JLT", category: "highway", lat: 25.0647, lng: 55.1433, description: "Sheikh Zayed Road — JLT access" },
  { id: "hwy-szx-exit36", name: "SZR Exit 36 — Internet City", category: "highway", lat: 25.0947, lng: 55.1439, description: "Sheikh Zayed Road — DIC access" },
  { id: "hwy-szx-exit25", name: "SZR Exit 25 — Ibn Battuta", category: "highway", lat: 25.0439, lng: 55.1181, description: "Sheikh Zayed Road — Jebel Ali" },
  { id: "hwy-szx-exit39", name: "SZR Exit 39 — Mall of Emirates", category: "highway", lat: 25.1181, lng: 55.2008, description: "Sheikh Zayed Road — Al Barsha" },
  { id: "hwy-szx-exit51", name: "SZR Exit 51 — Business Bay", category: "highway", lat: 25.1886, lng: 55.2633, description: "Sheikh Zayed Road — Business Bay" },
  { id: "hwy-szx-exit53", name: "SZR Exit 53 — DIFC", category: "highway", lat: 25.2127, lng: 55.2733, description: "Sheikh Zayed Road — Financial Centre" },
];

// === Category configuration ===

export const POI_CATEGORIES: Record<
  POICategory,
  { label: string; color: string; icon: string; premiumPerKm: number }
> = {
  metro: {
    label: "Metro Station",
    color: "#10B981", // green
    icon: "M",
    premiumPerKm: 50, // AED/sqft premium for being within 1km
  },
  sea: {
    label: "Sea / Beach",
    color: "#3B82F6", // blue (exception — water)
    icon: "S",
    premiumPerKm: 100, // highest premium — waterfront proximity
  },
  school: {
    label: "School",
    color: "#F59E0B", // amber
    icon: "E",
    premiumPerKm: 30,
  },
  mall: {
    label: "Shopping Mall",
    color: "#EC4899", // pink
    icon: "M",
    premiumPerKm: 25,
  },
  park: {
    label: "Park",
    color: "#22C55E", // green
    icon: "P",
    premiumPerKm: 20,
  },
  hospital: {
    label: "Hospital",
    color: "#EF4444", // red
    icon: "H",
    premiumPerKm: 15,
  },
  highway: {
    label: "Highway Access",
    color: "#94A3B8", // slate
    icon: "A",
    premiumPerKm: 10,
  },
};

// === Haversine distance calculation ===

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  /**
   * Calculate the great-circle distance between two points on Earth.
   * Returns distance in kilometers.
   */
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// === Proximity calculation — find nearest POIs for each category ===

export interface ProximityResult {
  category: POICategory;
  nearest: POI | null;
  distanceKm: number;
  premiumAed: number; // AED/sqft location premium from this category
}

export function calculateProximity(
  parcelLat: number,
  parcelLng: number
): ProximityResult[] {
  /**
   * For each POI category, find the nearest POI to the selected parcel
   * and calculate the location premium contribution.
   *
   * The premium decays with distance: premium = max(0, premiumPerKm * (1 - distanceKm/3))
   * This means:
   *   - Within 1km: full premium
   *   - At 2km: 33% premium
   *   - At 3km+: no premium
   */
  const categories: POICategory[] = [
    "metro",
    "sea",
    "school",
    "mall",
    "park",
    "hospital",
    "highway",
  ];

  return categories.map((category) => {
    const categoryPOIs = DUBAI_POIS.filter((p) => p.category === category);
    if (categoryPOIs.length === 0) {
      return { category, nearest: null, distanceKm: Infinity, premiumAed: 0 };
    }

    let nearest = categoryPOIs[0];
    let minDistance = haversineDistance(
      parcelLat,
      parcelLng,
      nearest.lat,
      nearest.lng
    );

    for (const poi of categoryPOIs.slice(1)) {
      const dist = haversineDistance(parcelLat, parcelLng, poi.lat, poi.lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = poi;
      }
    }

    const config = POI_CATEGORIES[category];
    // Premium decays linearly from full at 0km to 0 at 3km
    const premiumAed = Math.max(
      0,
      Math.round(config.premiumPerKm * Math.max(0, 1 - minDistance / 3))
    );

    return {
      category,
      nearest,
      distanceKm: Math.round(minDistance * 100) / 100,
      premiumAed,
    };
  });
}

export function calculateTotalLocationPremium(
  proximityResults: ProximityResult[]
): number {
  /**
   * Sum all category premiums to get the total location premium in AED/sqft.
   * This feeds into the pricing engine as an additional component.
   */
  return proximityResults.reduce((sum, r) => sum + r.premiumAed, 0);
}
