"use client";

import { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  UAE_POIS,
  POI_CATEGORIES,
  detectEmirate,
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

export function MapComponent() {
  const [selectedLat, setSelectedLat] = useState<number | null>(25.0772);
  const [selectedLng, setSelectedLng] = useState<number | null>(55.1390);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "map-params") {
        if (e.data.selectedLat != null) setSelectedLat(e.data.selectedLat);
        if (e.data.selectedLng != null) setSelectedLng(e.data.selectedLng);
      }
    };
    window.addEventListener("message", handler);
    window.parent.postMessage({ type: "map-ready" }, "*");
    return () => window.removeEventListener("message", handler);
  }, []);

  const handleSelect = (lat: number, lng: number) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
    window.parent.postMessage({ type: "map-select", lat, lng }, "*");
  };

  const parcelEmirate = selectedLat ? detectEmirate(selectedLat, selectedLng || 0) : "Dubai";
  const visiblePOIs = UAE_POIS.filter((p) => p.emirate === parcelEmirate);

  useEffect(() => {
    if (mapRef.current && selectedLat && selectedLng) {
      mapRef.current.panTo([selectedLat, selectedLng], { animate: true });
    }
  }, [selectedLat, selectedLng]);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "fixed", top: 0, left: 0, background: "#1a1a2e" }}>
      <MapContainer
        center={[25.0772, 55.1390]}
        zoom={13}
        style={{ width: "100vw", height: "100vh" }}
        ref={(map) => {
          if (map && !mapRef.current) {
            mapRef.current = map;
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
        <MapClickHandler onSelect={handleSelect} />
      </MapContainer>
    </div>
  );
}
