"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface IframeMapPickerProps {
  mapHeight: number;
  selectedLat: number | null;
  selectedLng: number | null;
  onSelect: (lat: number, lng: number) => void;
  visibleCategories: Set<string>;
  proximityResults: any[];
}

export function IframeMapPicker({
  mapHeight,
  selectedLat,
  selectedLng,
  onSelect,
}: IframeMapPickerProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeReady, setIframeReady] = useState(false);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://re-gtm.vercel.app";

  // Listen for messages from the iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "map-ready") {
        setIframeReady(true);
        // Send current selection to the iframe
        if (iframeRef.current?.contentWindow && selectedLat != null) {
          iframeRef.current.contentWindow.postMessage({
            type: "map-params",
            selectedLat,
            selectedLng,
          }, "*");
        }
      }
      if (e.data?.type === "map-select") {
        onSelect(e.data.lat, e.data.lng);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onSelect, selectedLat, selectedLng]);

  // Send updated selection to iframe when it changes
  useEffect(() => {
    if (iframeReady && iframeRef.current?.contentWindow && selectedLat != null) {
      iframeRef.current.contentWindow.postMessage({
        type: "map-params",
        selectedLat,
        selectedLng,
      }, "*");
    }
  }, [selectedLat, selectedLng, iframeReady]);

  return (
    <iframe
      ref={iframeRef}
      src={`${baseUrl}/map-embed`}
      style={{
        width: "100%",
        height: `${mapHeight}px`,
        border: "none",
        borderRadius: "8px",
        display: "block",
      }}
      title="Land Parcel Map"
      loading="eager"
    />
  );
}
