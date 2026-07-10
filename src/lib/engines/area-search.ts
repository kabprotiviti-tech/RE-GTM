/**
 * Area Search — predefined Dubai + Abu Dhabi locations for quick map navigation
 * Uses Nominatim (OpenStreetMap free geocoder) as fallback for custom searches.
 */

export interface AreaResult {
  name: string;
  emirate: string;
  lat: number;
  lng: number;
  description: string;
}

export const PREDEFINED_AREAS: AreaResult[] = [
  // Dubai
  { name: "Dubai Marina", emirate: "Dubai", lat: 25.0772, lng: 55.1390, description: "Waterfront residential district" },
  { name: "Downtown Dubai", emirate: "Dubai", lat: 25.1972, lng: 55.2744, description: "Burj Khalifa / Dubai Mall" },
  { name: "Business Bay", emirate: "Dubai", lat: 25.1886, lng: 55.2633, description: "Commercial + residential hub" },
  { name: "Palm Jumeirah", emirate: "Dubai", lat: 25.1124, lng: 55.1390, description: "Iconic palm-shaped island" },
  { name: "JBR", emirate: "Dubai", lat: 25.0772, lng: 55.1311, description: "Jumeirah Beach Residence" },
  { name: "JLT", emirate: "Dubai", lat: 25.0665, lng: 55.1393, description: "Jumeirah Lakes Towers" },
  { name: "Bluewaters Island", emirate: "Dubai", lat: 25.0772, lng: 55.1164, description: "Island with Ain Dubai" },
  { name: "Dubai Hills", emirate: "Dubai", lat: 25.0670, lng: 55.2000, description: "Golf course community" },
  { name: "JVC", emirate: "Dubai", lat: 25.0570, lng: 55.2100, description: "Jumeirah Village Circle" },
  { name: "Dubai Creek Harbour", emirate: "Dubai", lat: 25.1950, lng: 55.3500, description: "Future Creek Tower district" },
  { name: "Emaar Beachfront", emirate: "Dubai", lat: 25.0720, lng: 55.1180, description: "Private island beachfront" },
  { name: "Dubai South", emirate: "Dubai", lat: 24.8960, lng: 55.1460, description: "Expo City / Al Maktoum Airport" },
  { name: "Jebel Ali", emirate: "Dubai", lat: 25.0120, lng: 55.0700, description: "Port + industrial zone" },
  { name: "DIFC", emirate: "Dubai", lat: 25.2127, lng: 55.2733, description: "Financial Centre" },
  { name: "Al Barsha", emirate: "Dubai", lat: 25.1100, lng: 55.2000, description: "Mall of Emirates area" },
  { name: "Al Sufouh", emirate: "Dubai", lat: 25.1470, lng: 55.1900, description: "Knowledge Village / Media City" },

  // Abu Dhabi
  { name: "Saadiyat Island", emirate: "Abu Dhabi", lat: 24.5350, lng: 54.4280, description: "Cultural district + beaches" },
  { name: "Al Reem Island", emirate: "Abu Dhabi", lat: 24.4930, lng: 54.6130, description: "Residential island" },
  { name: "Yas Island", emirate: "Abu Dhabi", lat: 24.4670, lng: 54.6050, description: "F1 / Ferrari World / Mall" },
  { name: "Al Maryah Island", emirate: "Abu Dhabi", lat: 24.5060, lng: 54.3840, description: "Financial district" },
  { name: "Corniche", emirate: "Abu Dhabi", lat: 24.4860, lng: 54.3210, description: "Waterfront promenade" },
  { name: "Al Raha Beach", emirate: "Abu Dhabi", lat: 24.4230, lng: 54.6120, description: "Beachfront community" },
  { name: "Khalifa City", emirate: "Abu Dhabi", lat: 24.4480, lng: 54.6580, description: "Family residential" },
  { name: "Mangrove Village", emirate: "Abu Dhabi", lat: 24.4420, lng: 54.6320, description: "Mangrove waterfront" },
];

export function searchAreas(query: string): AreaResult[] {
  if (!query || query.trim().length < 2) return [];
  const q = query.toLowerCase().trim();
  return PREDEFINED_AREAS.filter(a =>
    a.name.toLowerCase().includes(q) ||
    a.emirate.toLowerCase().includes(q) ||
    a.description.toLowerCase().includes(q)
  ).slice(0, 8);
}
