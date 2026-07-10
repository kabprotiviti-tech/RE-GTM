"use client";

import { useState, useEffect } from "react";
import { MapPin, Settings, DollarSign, Shield, TrendingUp, Brain, Check } from "lucide-react";

const COLORS = {
  gold: "#C9A961",
  positive: "#059669",
  border: "#E8EAED",
  textMuted: "#9CA3AF",
  surface: "#FFFFFF",
  surfaceAlt: "#F8F9FB",
};

const STEPS = [
  { id: 1, label: "Land Parcel", icon: MapPin },
  { id: 2, label: "Unit Spec", icon: Settings },
  { id: 3, label: "Pricing", icon: DollarSign },
  { id: 4, label: "Finance", icon: Shield },
  { id: 5, label: "Scenarios", icon: TrendingUp },
  { id: 6, label: "GTM Strategy", icon: Brain },
];

export function StepProgress({ currentStep, maxStep, onStepClick }: { currentStep: number; maxStep: number; onStepClick: (step: number) => void }) {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => { setIsDesktop(window.innerWidth >= 768); }, []);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "8px 16px" }}>
      {STEPS.map((step, i) => {
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;
        const isAccessible = step.id <= maxStep;
        const Icon = step.icon;
        return (
          <div key={step.id} style={{ display: "flex", alignItems: "center" }}>
            <button onClick={() => isAccessible && onStepClick(step.id)} disabled={!isAccessible}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, border: `1px solid ${isActive ? COLORS.gold : isCompleted ? COLORS.positive : COLORS.border}`, background: isActive ? COLORS.surfaceAlt : "transparent", opacity: isAccessible ? 1 : 0.3, cursor: isAccessible ? "pointer" : "not-allowed" }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: isCompleted ? COLORS.positive : isActive ? COLORS.gold : COLORS.surfaceAlt, color: isCompleted || isActive ? "#fff" : COLORS.textMuted }}>
                {isCompleted ? <Check size={12} /> : <Icon size={12} />}
              </div>
              <span style={{ fontSize: 11, fontWeight: 500, color: isActive ? COLORS.gold : isCompleted ? COLORS.positive : COLORS.textMuted, display: isDesktop ? "inline" : "none" }}>{step.label}</span>
            </button>
            {i < STEPS.length - 1 && <div style={{ width: 24, height: 1, margin: "0 4px", background: currentStep > step.id ? COLORS.positive : COLORS.border }} />}
          </div>
        );
      })}
    </div>
  );
}
