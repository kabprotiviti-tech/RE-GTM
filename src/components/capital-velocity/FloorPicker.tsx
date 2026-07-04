"use client";

import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";

interface FloorPickerProps {
  minFloor: number;
  maxFloor: number;
  floor: number;
  onChange: (floor: number) => void;
}

export function FloorPicker({ minFloor, maxFloor, floor, onChange }: FloorPickerProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const floorToPct = (f: number) => ((f - minFloor) / (maxFloor - minFloor)) * 100;
  const pctToFloor = (pct: number) =>
    Math.round(minFloor + (pct / 100) * (maxFloor - minFloor));

  const handlePointer = (clientY: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    onChange(pctToFloor(100 - pct));
  };

  useEffect(() => {
    if (!isDragging) return;
    if (typeof window === "undefined") return;
    const move = (e: MouseEvent) => handlePointer(e.clientY);
    const touchMove = (e: TouchEvent) => handlePointer(e.touches[0].clientY);
    const up = () => setIsDragging(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("touchmove", touchMove);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("touchmove", touchMove);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchend", up);
    };
  }, [isDragging]);

  const indicatorPct = floorToPct(floor);
  const indicatorTop = `${100 - indicatorPct}%`;

  return (
    <div className="flex items-stretch gap-4" style={{ height: "320px" }}>
      {/* Tower visualization */}
      <div className="relative w-12 flex-shrink-0">
        <div
          className="absolute inset-0 rounded-sm border"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
          }}
        />
        {Array.from({ length: maxFloor - minFloor + 1 }, (_, i) => {
          const f = minFloor + i;
          const pct = floorToPct(f);
          return (
            <div
              key={f}
              className="absolute left-0 right-0 border-t"
              style={{
                top: `${100 - pct}%`,
                borderColor: "var(--border)",
                opacity: f === floor || f % 10 === 0 ? 0.8 : 0.25,
              }}
            />
          );
        })}
        <motion.div
          className="absolute left-0 right-0 h-8 rounded-sm"
          style={{ background: "var(--gold)", opacity: 0.18 }}
          animate={{ top: `calc(${indicatorTop} - 16px)` }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      <div
        ref={trackRef}
        className="relative flex-1 cursor-pointer touch-none"
        onMouseDown={(e) => {
          setIsDragging(true);
          handlePointer(e.clientY);
        }}
        onTouchStart={(e) => {
          setIsDragging(true);
          handlePointer(e.touches[0].clientY);
        }}
      >
        <div
          className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full"
          style={{ background: "var(--border)" }}
        />
        <div
          className="absolute left-0 w-0.5 rounded-full"
          style={{
            top: indicatorTop,
            bottom: 0,
            background: "var(--gold)",
          }}
        />
        <motion.div
          className="absolute -left-[7px] w-4 h-4 rounded-full border-2 shadow-lg"
          style={{
            background: "var(--surface)",
            borderColor: "var(--gold)",
          }}
          animate={{ top: `calc(${indicatorTop} - 8px)` }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.div
          className="absolute left-8 -translate-y-1/2 px-3 py-1 rounded text-xs font-semibold whitespace-nowrap"
          style={{
            background: "var(--surface-raised)",
            color: "var(--text-heading)",
            border: "1px solid var(--border)",
          }}
          animate={{ top: indicatorTop }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          Floor {floor}
        </motion.div>
      </div>
    </div>
  );
}
