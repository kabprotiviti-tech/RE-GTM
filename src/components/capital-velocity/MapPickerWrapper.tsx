"use client";

import dynamic from "next/dynamic";

// Dynamically import MapPicker with ssr: false — Leaflet requires window
const MapPicker = dynamic(() => import("./MapPicker").then((m) => m.MapPicker), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--ground)" }}>
      <div className="text-xs" style={{ color: "var(--text-muted)" }}>Loading map...</div>
    </div>
  ),
});

export function MapPickerWrapper(props: any) {
  return <MapPicker {...props} />;
}
