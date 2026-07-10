"use client";

import dynamic from "next/dynamic";

const MapPicker = dynamic(() => import("./MapPicker").then((m) => m.MapPicker), {
  ssr: false,
  loading: () => (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#E8EAED" }}>
      <div style={{ color: "#666", fontSize: "13px" }}>Loading map...</div>
    </div>
  ),
});

export function MapPickerWrapper(props: any) {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden", borderRadius: "12px" }}>
      <MapPicker {...props} />
    </div>
  );
}
