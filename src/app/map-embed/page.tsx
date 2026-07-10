"use client";

import dynamic from "next/dynamic";

const MapComponent = dynamic(() => import("./map-component").then((m) => m.MapComponent), {
  ssr: false,
  loading: () => (
    <div style={{ width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a2e" }}>
      <div style={{ color: "#94A3B8", fontSize: "12px" }}>Loading map...</div>
    </div>
  ),
});

export default function MapEmbed() {
  return <MapComponent />;
}
