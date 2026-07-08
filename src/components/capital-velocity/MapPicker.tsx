"use client";

import { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import {
  UAE_POIS,
  POI_CATEGORIES,
  detectEmirate,
  calculateProximity,
  type ProximityResult,
} from "@/lib/engines/dubai-poi";

// Fix Leaflet's default icon paths (needed for bundlers)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Create custom parcel icon (gold)
const parcelIcon = L.divIcon({
  className: "parcel-marker",
  html: `<div style="
    width: 24px; height: 24px;
    background: #D4AF37;
    border: 3px solid #0A0A0A;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    box-shadow: 0 4px 12px rgba(212, 175, 55, 0.6);
  "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

// Create POI icon
function createPOIIcon(color: string, label: string) {
  return L.divIcon({
    className: "poi-marker",
    html: `<div style="
      width: 18px; height: 18px;
      background: ${color};
      border: 2px solid rgba(0,0,0,0.4);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      font-weight: bold;
      color: white;
      font-family: Inter, sans-serif;
    ">${label}</div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

interface MapPickerProps {
  selectedLat: number | null;
  selectedLng: number | null;
  onSelect: (lat: number, lng: number) => void;
  visibleCategories: Set<string>;
  proximityResults: ProximityResult[];
}

// Component that handles map clicks
function MapClickHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function MapPicker({
  selectedLat,
  selectedLng,
  onSelect,
  visibleCategories,
  proximityResults,
}: MapPickerProps) {
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  // Default center: Dubai Marina
  const defaultCenter: [number, number] = [25.0772, 55.1390];

  // Filter visible POIs
  // Filter visible POIs — emirate-aware (show POIs for the parcel's emirate)
  const parcelEmirate = selectedLat ? detectEmirate(selectedLat, selectedLng || 0) : "Dubai";
  const visiblePOIs = UAE_POIS.filter((poi) =>
    visibleCategories.has(poi.category) && poi.emirate === parcelEmirate
  );

  // Pan to selected location when it changes
  useEffect(() => {
    if (mapRef.current && selectedLat && selectedLng) {
      mapRef.current.panTo([selectedLat, selectedLng], { animate: true });
    }
  }, [selectedLat, selectedLng]);

  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", background: "#1a1a2e" }}>
      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}
        ref={(map) => {
          if (map) {
            mapRef.current = map;
            setMapReady(true);
            // Invalidate size after mount and on resize to prevent grey tiles
            setTimeout(() => map.invalidateSize(), 200);
            setTimeout(() => map.invalidateSize(), 500);
          }
        }}
      >
        {/* Voyager light tiles — readable against dark UI, pops with contrast */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* POI markers */}
        {visiblePOIs.map((poi) => {
          const config = POI_CATEGORIES[poi.category];
          return (
            <Marker
              key={poi.id}
              position={[poi.lat, poi.lng]}
              icon={createPOIIcon(config.color, config.icon)}
            >
              <Popup>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px" }}>
                  <strong style={{ color: config.color }}>{config.label}</strong>
                  <br />
                  {poi.name}
                  {poi.description && (
                    <>
                      <br />
                      <span style={{ color: "#64748B", fontSize: "10px" }}>
                        {poi.description}
                      </span>
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Selected parcel marker */}
        {selectedLat && selectedLng && (
          <Marker position={[selectedLat, selectedLng]} icon={parcelIcon}>
            <Popup>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px" }}>
                <strong style={{ color: "#D4AF37" }}>Selected Parcel</strong>
                <br />
                <span style={{ color: "#64748B", fontSize: "10px" }}>
                  {selectedLat.toFixed(4)}, {selectedLng.toFixed(4)}
                </span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Proximity circles for the nearest POIs */}
        {proximityResults.map((result) => {
          if (!result.nearest || result.distanceKm > 3) return null;
          const config = POI_CATEGORIES[result.category];
          const radiusMeters = result.distanceKm * 1000;
          return (
            <Circle
              key={`circle-${result.category}`}
              center={[result.nearest.lat, result.nearest.lng]}
              radius={radiusMeters}
              pathOptions={{
                color: config.color,
                fillColor: config.color,
                fillOpacity: 0.05,
                weight: 1,
                dashArray: "4 4",
              }}
            />
          );
        })}

        <MapClickHandler onSelect={onSelect} />
      </MapContainer>

      {/* Loading overlay */}
      {!mapReady && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: "var(--ground)" }}
        >
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            Loading map...
          </div>
        </div>
      )}

      {/* Instructions overlay */}
      {mapReady && !selectedLat && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg pointer-events-none"
          style={{
            background: "color-mix(in srgb, var(--surface) 90%, transparent)",
            border: "1px solid var(--gold)",
            backdropFilter: "blur(8px)",
          }}
        >
          <span className="text-xs font-medium" style={{ color: "var(--gold)" }}>
            Click on the map to select your land parcel
          </span>
        </div>
      )}
    </div>
  );
}
