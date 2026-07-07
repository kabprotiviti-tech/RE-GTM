/**
 * UAE POI Dataset — Dubai + Abu Dhabi landmarks
 *
 * Emirate-aware: parcels in Abu Dhabi use Abu Dhabi POIs only.
 * Fixes the "Al Reem showing 96km to beach" bug.
 *
 * Categories: metro, sea, school, mall, park, hospital, highway
 */

export type POICategory = "metro" | "sea" | "school" | "mall" | "park" | "hospital" | "highway";
export type Emirate = "Dubai" | "Abu Dhabi";

export interface POI {
  id: string;
  name: string;
  category: POICategory;
  emirate: Emirate;
  lat: number;
  lng: number;
  description?: string;
}

export const UAE_POIS: POI[] = [
  // === DUBAI: Metro ===
  { id: "dx-metro-1", name: "DMCC Metro", category: "metro", emirate: "Dubai", lat: 25.0805, lng: 55.1403, description: "JLT — Red Line" },
  { id: "dx-metro-2", name: "Dubai Marina Metro", category: "metro", emirate: "Dubai", lat: 25.0762, lng: 55.1397, description: "Marina — Red Line" },
  { id: "dx-metro-3", name: "Mall of Emirates Metro", category: "metro", emirate: "Dubai", lat: 25.1181, lng: 55.2008, description: "Red Line" },
  { id: "dx-metro-4", name: "Business Bay Metro", category: "metro", emirate: "Dubai", lat: 25.1886, lng: 55.2633, description: "Red Line" },
  { id: "dx-metro-5", name: "Burj Khalifa/Dubai Mall Metro", category: "metro", emirate: "Dubai", lat: 25.1972, lng: 55.2744, description: "Red Line" },
  { id: "dx-metro-6", name: "Emirates Towers Metro", category: "metro", emirate: "Dubai", lat: 25.2174, lng: 55.2785, description: "DIFC — Red Line" },
  { id: "dx-metro-7", name: "Internet City Metro", category: "metro", emirate: "Dubai", lat: 25.0947, lng: 55.1439, description: "Red Line" },
  { id: "dx-metro-8", name: "Nakheel Mall Metro", category: "metro", emirate: "Dubai", lat: 25.0528, lng: 55.1383, description: "Palm — Red Line" },
  { id: "dx-metro-9", name: "JLT Metro", category: "metro", emirate: "Dubai", lat: 25.0665, lng: 55.1393, description: "Red Line" },
  { id: "dx-metro-10", name: "Sobha Realty Metro", category: "metro", emirate: "Dubai", lat: 25.0633, lng: 55.1389, description: "Red Line" },

  // === DUBAI: Sea/Beach ===
  { id: "dx-sea-1", name: "Marina Beach", category: "sea", emirate: "Dubai", lat: 25.0805, lng: 55.1373, description: "Public beach" },
  { id: "dx-sea-2", name: "JBR Beach", category: "sea", emirate: "Dubai", lat: 25.0772, lng: 55.1311, description: "Open beach" },
  { id: "dx-sea-3", name: "Kite Beach", category: "sea", emirate: "Dubai", lat: 25.1654, lng: 55.2092, description: "Umm Suqeim" },
  { id: "dx-sea-4", name: "Palm Jumeirah Shore", category: "sea", emirate: "Dubai", lat: 25.1124, lng: 55.1390, description: "Iconic island" },
  { id: "dx-sea-5", name: "Bluewaters Island", category: "sea", emirate: "Dubai", lat: 25.0772, lng: 55.1164, description: "Island destination" },
  { id: "dx-sea-6", name: "Dubai Harbour", category: "sea", emirate: "Dubai", lat: 25.0744, lng: 55.1197, description: "Marina + cruise" },
  { id: "dx-sea-7", name: "La Mer Beach", category: "sea", emirate: "Dubai", lat: 25.2336, lng: 55.2594, description: "Jumeirah 1" },
  { id: "dx-sea-8", name: "Emaar Beachfront", category: "sea", emirate: "Dubai", lat: 25.0720, lng: 55.1180, description: "Private island beach" },

  // === DUBAI: Schools ===
  { id: "dx-sch-1", name: "Dubai College", category: "school", emirate: "Dubai", lat: 25.1471, lng: 55.1889, description: "British — Al Sufouh" },
  { id: "dx-sch-2", name: "Emirates International Jumeirah", category: "school", emirate: "Dubai", lat: 25.1486, lng: 55.1931, description: "IB — Umm Suqeim" },
  { id: "dx-sch-3", name: "Kings' School Al Barsha", category: "school", emirate: "Dubai", lat: 25.1167, lng: 55.1856, description: "British — Al Barsha" },
  { id: "dx-sch-4", name: "Dubai British School", category: "school", emirate: "Dubai", lat: 25.0517, lng: 55.1536, description: "British — The Springs" },
  { id: "dx-sch-5", name: "Regent International", category: "school", emirate: "Dubai", lat: 25.0647, lng: 55.1433, description: "British — The Greens" },
  { id: "dx-sch-6", name: "Wellington International", category: "school", emirate: "Dubai", lat: 25.1136, lng: 55.1964, description: "British — Al Sufouh" },
  { id: "dx-sch-7", name: "American School of Dubai", category: "school", emirate: "Dubai", lat: 25.1064, lng: 55.1628, description: "American — Al Barsha" },
  { id: "dx-sch-8", name: "JESS Arabian Ranches", category: "school", emirate: "Dubai", lat: 25.0708, lng: 55.2539, description: "British — Arabian Ranches" },

  // === DUBAI: Malls ===
  { id: "dx-mall-1", name: "Mall of the Emirates", category: "mall", emirate: "Dubai", lat: 25.1181, lng: 55.2008, description: "Major shopping + Ski Dubai" },
  { id: "dx-mall-2", name: "The Dubai Mall", category: "mall", emirate: "Dubai", lat: 25.1972, lng: 55.2796, description: "World's largest mall" },
  { id: "dx-mall-3", name: "Dubai Marina Mall", category: "mall", emirate: "Dubai", lat: 25.0792, lng: 55.1397, description: "Waterfront shopping" },
  { id: "dx-mall-4", name: "Ibn Battuta Mall", category: "mall", emirate: "Dubai", lat: 25.0439, lng: 55.1181, description: "Themed — Jebel Ali" },
  { id: "dx-mall-5", name: "City Walk", category: "mall", emirate: "Dubai", lat: 25.2094, lng: 55.2606, description: "Outdoor — Jumeirah" },
  { id: "dx-mall-6", name: "Nakheel Mall", category: "mall", emirate: "Dubai", lat: 25.0528, lng: 55.1383, description: "Palm Jumeirah" },

  // === DUBAI: Parks ===
  { id: "dx-park-1", name: "Zabeel Park", category: "park", emirate: "Dubai", lat: 25.2283, lng: 55.2889, description: "Dubai Frame" },
  { id: "dx-park-2", name: "Al Safa Park", category: "park", emirate: "Dubai", lat: 25.1864, lng: 55.2333, description: "Jumeirah" },
  { id: "dx-park-3", name: "Al Barsha Pond Park", category: "park", emirate: "Dubai", lat: 25.1108, lng: 55.1858, description: "Al Barsha" },
  { id: "dx-park-4", name: "JLT Park", category: "park", emirate: "Dubai", lat: 25.0665, lng: 55.1393, description: "Lakeside" },

  // === DUBAI: Hospitals ===
  { id: "dx-hos-1", name: "Saudi German Hospital", category: "hospital", emirate: "Dubai", lat: 25.1864, lng: 55.2600, description: "Barsha Heights" },
  { id: "dx-hos-2", name: "Medcare Hospital Al Safa", category: "hospital", emirate: "Dubai", lat: 25.1864, lng: 55.2333, description: "Al Safa" },
  { id: "dx-hos-3", name: "Emirates Hospital Jumeirah", category: "hospital", emirate: "Dubai", lat: 25.2336, lng: 55.2594, description: "Jumeirah" },
  { id: "dx-hos-4", name: "Mediclinic City Hospital", category: "hospital", emirate: "Dubai", lat: 25.2283, lng: 55.2889, description: "Healthcare City" },

  // === DUBAI: Highway ===
  { id: "dx-hwy-1", name: "SZR Exit 32 — Marina", category: "highway", emirate: "Dubai", lat: 25.0772, lng: 55.1397, description: "Sheikh Zayed Road" },
  { id: "dx-hwy-2", name: "SZR Exit 29 — JLT", category: "highway", emirate: "Dubai", lat: 25.0647, lng: 55.1433, description: "Sheikh Zayed Road" },
  { id: "dx-hwy-3", name: "SZR Exit 36 — Internet City", category: "highway", emirate: "Dubai", lat: 25.0947, lng: 55.1439, description: "Sheikh Zayed Road" },
  { id: "dx-hwy-4", name: "SZR Exit 39 — MoE", category: "highway", emirate: "Dubai", lat: 25.1181, lng: 55.2008, description: "Sheikh Zayed Road" },
  { id: "dx-hwy-5", name: "SZR Exit 51 — Business Bay", category: "highway", emirate: "Dubai", lat: 25.1886, lng: 55.2633, description: "Sheikh Zayed Road" },
  { id: "dx-hwy-6", name: "SZR Exit 53 — DIFC", category: "highway", emirate: "Dubai", lat: 25.2127, lng: 55.2733, description: "Sheikh Zayed Road" },

  // === ABU DHABI: Sea/Beach ===
  { id: "ad-sea-1", name: "Saadiyat Public Beach", category: "sea", emirate: "Abu Dhabi", lat: 24.5430, lng: 54.4250, description: "Saadiyat Island — public beach" },
  { id: "ad-sea-2", name: "Al Reem Beach (Boutik)", category: "sea", emirate: "Abu Dhabi", lat: 24.4930, lng: 54.6130, description: "Al Reem Island — beach access" },
  { id: "ad-sea-3", name: "Corniche Beach", category: "sea", emirate: "Abu Dhabi", lat: 24.4860, lng: 54.3210, description: "Abu Dhabi Corniche — public beach" },
  { id: "ad-sea-4", name: "Yas Beach", category: "sea", emirate: "Abu Dhabi", lat: 24.4670, lng: 54.6050, description: "Yas Island — beach" },
  { id: "ad-sea-5", name: "Al Bateen Beach", category: "sea", emirate: "Abu Dhabi", lat: 24.4520, lng: 54.3450, description: "Al Bateen — waterfront" },
  { id: "ad-sea-6", name: "Saadiyat Marina", category: "sea", emirate: "Abu Dhabi", lat: 24.5350, lng: 54.4280, description: "Saadiyat — marina waterfront" },
  { id: "ad-sea-7", name: "Al Raha Beach", category: "sea", emirate: "Abu Dhabi", lat: 24.4230, lng: 54.6120, description: "Al Raha — beachfront" },
  { id: "ad-sea-8", name: "Mangrove National Park Waterfront", category: "sea", emirate: "Abu Dhabi", lat: 24.4420, lng: 54.6320, description: "Mangrove kayaking + waterfront" },
  { id: "ad-sea-9", name: "Reem Island Beachfront", category: "sea", emirate: "Abu Dhabi", lat: 24.4950, lng: 54.6150, description: "Shams Abu Dhabi — direct beach access" },

  // === ABU DHABI: Schools ===
  { id: "ad-sch-1", name: "American Community School", category: "school", emirate: "Abu Dhabi", lat: 24.4710, lng: 54.3210, description: "American curriculum — Abu Dhabi city" },
  { id: "ad-sch-2", name: "British School Al Khubairat", category: "school", emirate: "Abu Dhabi", lat: 24.4830, lng: 54.3620, description: "British — oldest in AD" },
  { id: "ad-sch-3", name: "Raha International School", category: "school", emirate: "Abu Dhabi", lat: 24.4230, lng: 54.6120, description: "IB — Al Raha" },
  { id: "ad-sch-4", name: "NYU Abu Dhabi", category: "school", emirate: "Abu Dhabi", lat: 24.5260, lng: 54.4240, description: "University — Saadiyat" },
  { id: "ad-sch-5", name: "Lycée Louis Massignon", category: "school", emirate: "Abu Dhabi", lat: 24.4770, lng: 54.3710, description: "French — Abu Dhabi" },
  { id: "ad-sch-6", name: "GEMS American Academy", category: "school", emirate: "Abu Dhabi", lat: 24.4480, lng: 54.6580, description: "American — Khalifa City" },
  { id: "ad-sch-7", name: "Cranleigh Abu Dhabi", category: "school", emirate: "Abu Dhabi", lat: 24.5390, lng: 54.4220, description: "British — Saadiyat" },
  { id: "ad-sch-8", name: "Amity International School", category: "school", emirate: "Abu Dhabi", lat: 24.4550, lng: 54.6750, description: "CBSE — Shakhbout" },

  // === ABU DHABI: Malls ===
  { id: "ad-mall-1", name: "Yas Mall", category: "mall", emirate: "Abu Dhabi", lat: 24.4940, lng: 54.6180, description: "Largest in Abu Dhabi — Yas Island" },
  { id: "ad-mall-2", name: "Abu Dhabi Mall", category: "mall", emirate: "Abu Dhabi", lat: 24.4930, lng: 54.3620, description: "City center — near Corniche" },
  { id: "ad-mall-3", name: "Marina Mall", category: "mall", emirate: "Abu Dhabi", lat: 24.4620, lng: 54.3310, description: "Corniche Breakwater" },
  { id: "ad-mall-4", name: "Al Wahda Mall", category: "mall", emirate: "Abu Dhabi", lat: 24.4870, lng: 54.3680, description: "Central Abu Dhabi" },
  { id: "ad-mall-5", name: "Galleria Al Maryah", category: "mall", emirate: "Abu Dhabi", lat: 24.5060, lng: 54.3840, description: "Luxury — Al Maryah Island" },
  { id: "ad-mall-6", name: "World Trade Center Mall", category: "mall", emirate: "Abu Dhabi", lat: 24.4870, lng: 54.3570, description: "Central Abu Dhabi" },

  // === ABU DHABI: Parks ===
  { id: "ad-park-1", name: "Mangrove National Park", category: "park", emirate: "Abu Dhabi", lat: 24.4420, lng: 54.6320, description: "Mangrove forest — kayaking" },
  { id: "ad-park-2", name: "Umm Al Emarat Park", category: "park", emirate: "Abu Dhabi", lat: 24.4710, lng: 54.3840, description: "Central Abu Dhabi — family park" },
  { id: "ad-park-3", name: "Corniche Park", category: "park", emirate: "Abu Dhabi", lat: 24.4860, lng: 54.3210, description: "Waterfront promenade" },
  { id: "ad-park-4", name: "Yas Park", category: "park", emirate: "Abu Dhabi", lat: 24.4670, lng: 54.6050, description: "Yas Island — green spaces" },
  { id: "ad-park-5", name: "Capital Park", category: "park", emirate: "Abu Dhabi", lat: 24.4870, lng: 54.3570, description: "Central — near WTC" },

  // === ABU DHABI: Hospitals ===
  { id: "ad-hos-1", name: "Cleveland Clinic Abu Dhabi", category: "hospital", emirate: "Abu Dhabi", lat: 24.5060, lng: 54.3840, description: "Al Maryah — world-class" },
  { id: "ad-hos-2", name: "Sheikh Shakhbout Medical City", category: "hospital", emirate: "Abu Dhabi", lat: 24.4550, lng: 54.6750, description: "Khalifa City — large public" },
  { id: "ad-hos-3", name: "Burjeel Medical City", category: "hospital", emirate: "Abu Dhabi", lat: 24.4480, lng: 54.6580, description: "Mohammed Bin Zayed City" },
  { id: "ad-hos-4", name: "Mediclinic Al Noor Hospital", category: "hospital", emirate: "Abu Dhabi", lat: 24.4710, lng: 54.3620, description: "Central Abu Dhabi" },
  { id: "ad-hos-5", name: "NMC Royal Hospital", category: "hospital", emirate: "Abu Dhabi", lat: 24.4230, lng: 54.6120, description: "Al Raha / Khalifa" },

  // === ABU DHABI: Highway ===
  { id: "ad-hwy-1", name: "E10 — Abu Dhabi → Dubai", category: "highway", emirate: "Abu Dhabi", lat: 24.4070, lng: 54.5430, description: "Sheikh Maktoum Bin Rashid Rd" },
  { id: "ad-hwy-2", name: "E12 — Yas Island", category: "highway", emirate: "Abu Dhabi", lat: 24.4670, lng: 54.6050, description: "Yas Island access" },
  { id: "ad-hwy-3", name: "E10 — Saadiyat", category: "highway", emirate: "Abu Dhabi", lat: 24.5350, lng: 54.4280, description: "Saadiyat access" },
  { id: "ad-hwy-4", name: "Sheikh Zayed Tunnel", category: "highway", emirate: "Abu Dhabi", lat: 24.4870, lng: 54.3570, description: "Central — underground highway" },
  { id: "ad-hwy-5", name: "E11 — Al Reem Island", category: "highway", emirate: "Abu Dhabi", lat: 24.4930, lng: 54.6130, description: "Reem Island bridge access" },
  { id: "ad-hwy-6", name: "E22 — Al Ain Road", category: "highway", emirate: "Abu Dhabi", lat: 24.3870, lng: 54.5430, description: "Abu Dhabi → Al Ain" },
];

// Category config
export const POI_CATEGORIES: Record<POICategory, { label: string; color: string; icon: string; premiumPerKm: number }> = {
  metro: { label: "Metro Station", color: "#10B981", icon: "M", premiumPerKm: 50 },
  sea: { label: "Sea / Beach", color: "#3B82F6", icon: "S", premiumPerKm: 100 },
  school: { label: "School", color: "#F59E0B", icon: "E", premiumPerKm: 30 },
  mall: { label: "Shopping Mall", color: "#EC4899", icon: "M", premiumPerKm: 25 },
  park: { label: "Park", color: "#22C55E", icon: "P", premiumPerKm: 20 },
  hospital: { label: "Hospital", color: "#EF4444", icon: "H", premiumPerKm: 15 },
  highway: { label: "Highway Access", color: "#94A3B8", icon: "A", premiumPerKm: 10 },
};

// Haversine distance
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Detect emirate from parcel coordinates
export function detectEmirate(lat: number, lng: number): Emirate {
  // Abu Dhabi is roughly south/west of 24.6 lat or east of 54.8 lng
  // Dubai is roughly 25.0-25.3 lat and 55.1-55.4 lng
  if (lat < 24.7 || lng > 54.8) return "Abu Dhabi";
  return "Dubai";
}

// Get POIs for the parcel's emirate ONLY — fixes the Al Reem bug
export function getEmiratePOIs(emirate: Emirate): POI[] {
  return UAE_POIS.filter((p) => p.emirate === emirate);
}

// Proximity calculation — emirate-aware
export interface ProximityResult {
  category: POICategory;
  nearest: POI | null;
  distanceKm: number;
  premiumAed: number;
}

export function calculateProximity(parcelLat: number, parcelLng: number): ProximityResult[] {
  const emirate = detectEmirate(parcelLat, parcelLng);
  const pois = getEmiratePOIs(emirate);

  const categories: POICategory[] = ["metro", "sea", "school", "mall", "park", "hospital", "highway"];

  return categories.map((category) => {
    const categoryPOIs = pois.filter((p) => p.category === category);
    if (categoryPOIs.length === 0) {
      return { category, nearest: null, distanceKm: Infinity, premiumAed: 0 };
    }

    let nearest = categoryPOIs[0];
    let minDistance = haversineDistance(parcelLat, parcelLng, nearest.lat, nearest.lng);

    for (const poi of categoryPOIs.slice(1)) {
      const dist = haversineDistance(parcelLat, parcelLng, poi.lat, poi.lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = poi;
      }
    }

    const config = POI_CATEGORIES[category];
    const premiumAed = Math.max(0, Math.round(config.premiumPerKm * Math.max(0, 1 - minDistance / 3)));
    return {
      category,
      nearest,
      distanceKm: Math.round(minDistance * 100) / 100,
      premiumAed,
    };
  });
}

export function calculateTotalLocationPremium(proximityResults: ProximityResult[]): number {
  return proximityResults.reduce((sum, r) => sum + r.premiumAed, 0);
}
