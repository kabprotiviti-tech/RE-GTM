"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  type ProximityResult,
} from "@/lib/engines/dubai-poi";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const parcelIcon = L.divIcon({
  className: "parcel-marker",
  html: `<div style="width:24px;height:24px;background:#D4AF37;border:3px solid #0A0A0A;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 4px 12px rgba(212,175,55,0.6);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

function createPOIIcon(color: string, label: string) {
  return L.divIcon({
    className: "poi-marker",
    html: `<div style="width:18px;height:18px;background:${color};border:2px solid rgba(0,0,0,0.4);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:bold;color:white;font-family:Inter,sans-serif;">${label}</div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function MapClickHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onSelect(e.latlng.lat, e.latlng.lng); } });
  return null;
}

interface MapPickerProps {
  selectedLat: number | null;
  selectedLng: number | null;
  onSelect: (lat: number, lng: number) => void;
  visibleCategories: Set<string>;
  proximityResults: ProximityResult[];
}

export function MapPicker({
  selectedLat,
  selectedLng,
  onSelect,
  visibleCategories,
  proximityResults,
}: MapPickerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dims, setDims] = useState({ w: 800, h: 450 });
  const [mapReady, setMapReady] = useState(false);

  // Measure the parent container's actual pixel dimensions
  useEffect(() => {
    if (!containerRef.current) return;
    const measure = () => {
      const rect = containerRef.current!.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDims({ w: Math.round(rect.width), h: Math.round(rect.height) });
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const parcelEmirate = selectedLat ? detectEmirate(selectedLat, selectedLng || 0) : "Dubai";
  const visiblePOIs = UAE_POIS.filter((poi) =>
    visibleCategories.has(poi.category) && poi.emirate === parcelEmirate
  );

  useEffect(() => {
    if (mapRef.current && selectedLat && selectedLng) {
      mapRef.current.panTo([selectedLat, selectedLng], { animate: true });
    }
  }, [selectedLat, selectedLng]);

  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => mapRef.current?.invalidateSize(), 50);
    }
  }, [dims]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Use explicit pixel dimensions — no percentage inheritance */}
      <div style={{ width: `${dims.w}px`, height: `${dims.h}px`, position: "relative" }}>
        <MapContainer
          center={[25.0772, 55.1390]}
          zoom={13}
          style={{ width: `${dims.w}px`, height: `${dims.h}px` }}
          ref={(map) => {
            if (map && !mapRef.current) {
              mapRef.current = map;
              setMapReady(true);
              setTimeout(() => map.invalidateSize(), 100);
              setTimeout(() => map.invalidateSize(), 500);
            }
          }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap &copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          {visiblePOIs.map((poi) => {
            const config = POI_CATEGORIES[poi.category];
            return (
              <Marker key={poi.id} position={[poi.lat, poi.lng]} icon={createPOIIcon(config.color, config.icon)}>
                <Popup>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px" }}>
                    <strong style={{ color: config.color }}>{config.label}</strong><br />
                    {poi.name}
                    {poi.description && <><br /><span style={{ color: "#64748B", fontSize: "10px" }}>{poi.description}</span></>}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {selectedLat && selectedLng && (
            <Marker position={[selectedLat, selectedLng]} icon={parcelIcon}>
              <Popup>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px" }}>
                  <strong style={{ color: "#D4AF37" }}>Selected Parcel</strong><br />
                  <span style={{ color: "#64748B", fontSize: "10px" }}>{selectedLat.toFixed(4)}, {selectedLng.toFixed(4)}</span>
                </div>
              </Popup>
            </Marker>
          )}

          {proximityResults.map((result) => {
            if (!result.nearest || result.distanceKm > 3) return null;
            const config = POI_CATEGORIES[result.category];
            return (
              <Circle
                key={`circle-${result.category}`}
                center={[result.nearest.lat, result.nearest.lng]}
                radius={result.distanceKm * 1000}
                pathOptions={{ color: config.color, fillColor: config.color, fillOpacity: 0.05, weight: 1, dashArray: "4 4" }}
              />
            );
          })}

          <MapClickHandler onSelect={onSelect} />
        </MapContainer>
      </div>

      {!mapReady && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a2e", zIndex: 1000 }}>
          <div style={{ color: "#94A3B8", fontSize: "12px" }}>Loading map...</div>
        </div>
      )}

      {mapReady && !selectedLat && (
        <div style={{ position: "absolute", top: "16px", left: "50%", transform: "translateX(-50%)", padding: "8px 16px", borderRadius: "8px", background: "rgba(20,20,20,0.9)", border: "1px solid #D4AF37", backdropFilter: "blur(8px)", zIndex: 1000, pointerEvents: "none" }}>
          <span style={{ color: "#D4AF37", fontSize: "12px", fontWeight: 500 }}>Click on the map to select your land parcel</span>
        </div>
      )}
    </div>
  );
}
