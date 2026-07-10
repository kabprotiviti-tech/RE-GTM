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
  type ProximityResult,
} from "@/lib/engines/dubai-poi";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const parcelIcon = L.divIcon({
  className: "",
  html: `<div style="width:20px;height:20px;background:#C9A961;border:2px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 20],
});

function createPOIIcon(color: string, label: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:16px;height:16px;background:${color};border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:bold;color:#fff;font-family:Inter,sans-serif;box-shadow:0 1px 4px rgba(0,0,0,0.2);">${label}</div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
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

  const parcelEmirate = selectedLat ? detectEmirate(selectedLat, selectedLng || 0) : "Dubai";
  const visiblePOIs = UAE_POIS.filter((p) => visibleCategories.has(p.category) && p.emirate === parcelEmirate);

  useEffect(() => {
    if (mapRef.current && selectedLat && selectedLng) {
      mapRef.current.panTo([selectedLat, selectedLng], { animate: true });
    }
  }, [selectedLat, selectedLng]);

  return (
    <MapContainer
      center={[25.0772, 55.1390]}
      zoom={13}
      style={{ width: "100%", height: "100%", background: "#E8EAED" }}
      ref={(map) => {
        if (map && !mapRef.current) {
          mapRef.current = map;
          setTimeout(() => map.invalidateSize(), 100);
          setTimeout(() => map.invalidateSize(), 500);
          setTimeout(() => map.invalidateSize(), 1000);
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
                {poi.description && <><br /><span style={{ color: "#666", fontSize: "10px" }}>{poi.description}</span></>}
              </div>
            </Popup>
          </Marker>
        );
      })}
      {selectedLat && selectedLng && (
        <Marker position={[selectedLat, selectedLng]} icon={parcelIcon}>
          <Popup>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px" }}>
              <strong style={{ color: "#C9A961" }}>Selected Parcel</strong><br />
              <span style={{ color: "#666", fontSize: "10px" }}>{selectedLat.toFixed(4)}, {selectedLng.toFixed(4)}</span>
            </div>
          </Popup>
        </Marker>
      )}
      {proximityResults.map((result) => {
        if (!result.nearest || result.distanceKm > 3) return null;
        const config = POI_CATEGORIES[result.category];
        return (
          <Circle key={`circle-${result.category}`} center={[result.nearest.lat, result.nearest.lng]} radius={result.distanceKm * 1000}
            pathOptions={{ color: config.color, fillColor: config.color, fillOpacity: 0.05, weight: 1, dashArray: "4 4" }} />
        );
      })}
      <MapClickHandler onSelect={onSelect} />
    </MapContainer>
  );
}
