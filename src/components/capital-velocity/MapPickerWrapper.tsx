"use client";

import dynamic from "next/dynamic";

const MapPicker = dynamic(() => import("./MapPicker").then((m) => m.MapPicker), {
  ssr: false,
  loading: () => (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a2e" }}>
      <div style={{ color: "#94A3B8", fontSize: "12px" }}>Loading map...</div>
    </div>
  ),
});

export function MapPickerWrapper(props: any) {
  return <MapPicker {...props} />;
}
