"use client";

import { motion } from "framer-motion";
import { POI_CATEGORIES, type ProximityResult } from "@/lib/engines/dubai-poi";
import { Train, Waves, GraduationCap, ShoppingBag, Trees, Hospital, Route } from "lucide-react";

const ICONS: Record<string, any> = {
  metro: Train,
  sea: Waves,
  school: GraduationCap,
  mall: ShoppingBag,
  park: Trees,
  hospital: Hospital,
  highway: Route,
};

interface ProximityDashboardProps {
  results: ProximityResult[];
  totalPremium: number;
}

export function ProximityDashboard({ results, totalPremium }: ProximityDashboardProps) {
  return (
    <div className="space-y-3">
      {/* Total location premium banner */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-lg border flex items-center justify-between"
        style={{
          background: "color-mix(in srgb, var(--gold) 8%, var(--surface))",
          borderColor: "var(--gold)",
          borderLeftWidth: 3,
        }}
      >
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--text-muted)" }}>
            Total Location Premium
          </div>
          <div className="text-2xl font-bold mt-1" style={{ color: "var(--gold)" }}>
            +AED {totalPremium}/sqft
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            Added to base PSF
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            {results.filter((r) => r.premiumAed > 0).length}/{results.length} amenities in range
          </div>
        </div>
      </motion.div>

      {/* Per-category proximity list */}
      <div className="grid grid-cols-1 gap-2">
        {results.map((result, i) => {
          const config = POI_CATEGORIES[result.category];
          const Icon = ICONS[result.category] || Train;
          const inRange = result.distanceKm <= 3;
          const distanceStr =
            result.distanceKm === Infinity
              ? "—"
              : result.distanceKm < 1
              ? `${Math.round(result.distanceKm * 1000)}m`
              : `${result.distanceKm.toFixed(1)}km`;

          return (
            <motion.div
              key={result.category}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="flex items-center gap-3 p-3 rounded-lg border"
              style={{
                background: inRange ? "var(--surface)" : "color-mix(in srgb, var(--surface) 50%, transparent)",
                borderColor: inRange ? config.color : "var(--border)",
                opacity: inRange ? 1 : 0.5,
              }}
            >
              {/* Icon */}
              <div
                className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                style={{ background: `color-mix(in srgb, ${config.color} 15%, transparent)` }}
              >
                <Icon size={14} style={{ color: config.color }} />
              </div>

              {/* Category + nearest name */}
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  {config.label}
                </div>
                <div className="text-xs truncate" style={{ color: "var(--text-body)" }}>
                  {result.nearest?.name || "No data"}
                </div>
              </div>

              {/* Distance */}
              <div className="text-right flex-shrink-0">
                <div className="text-xs font-mono font-semibold" style={{ color: inRange ? "var(--text-heading)" : "var(--text-muted)" }}>
                  {distanceStr}
                </div>
              </div>

              {/* Premium */}
              <div className="text-right flex-shrink-0 w-16">
                {result.premiumAed > 0 ? (
                  <div className="text-xs font-mono font-bold" style={{ color: config.color }}>
                    +{result.premiumAed}
                  </div>
                ) : (
                  <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    —
                  </div>
                )}
                <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                  AED/sqft
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
