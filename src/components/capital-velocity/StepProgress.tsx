"use client";

import { motion } from "framer-motion";
import { MapPin, Settings, DollarSign, Shield, TrendingUp, Brain, Check } from "lucide-react";

interface StepProgressProps {
  currentStep: number;
  maxStep: number;
  onStepClick: (step: number) => void;
}

const STEPS = [
  { id: 1, label: "Land Parcel", icon: MapPin },
  { id: 2, label: "Unit Spec", icon: Settings },
  { id: 3, label: "Pricing", icon: DollarSign },
  { id: 4, label: "Finance & Compliance", icon: Shield },
  { id: 5, label: "Scenarios", icon: TrendingUp },
  { id: 6, label: "GTM Strategy", icon: Brain },
];

export function StepProgress({ currentStep, maxStep, onStepClick }: StepProgressProps) {
  return (
    <div className="flex items-center justify-center gap-1 md:gap-2 py-4 px-4">
      {STEPS.map((step, i) => {
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;
        const isAccessible = step.id <= maxStep;
        const Icon = step.icon;

        return (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => isAccessible && onStepClick(step.id)}
              disabled={!isAccessible}
              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
              style={{
                background: isActive ? "var(--surface-raised)" : "transparent",
                border: `1px solid ${isActive ? "var(--gold)" : isCompleted ? "var(--positive)" : "var(--border)"}`,
                opacity: isAccessible ? 1 : 0.3,
                cursor: isAccessible ? "pointer" : "not-allowed",
              }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: isCompleted ? "var(--positive)" : isActive ? "var(--gold)" : "var(--surface-raised)",
                  color: isCompleted || isActive ? "var(--ground)" : "var(--text-muted)",
                }}
              >
                {isCompleted ? <Check size={14} /> : <Icon size={14} />}
              </div>
              <span
                className="text-xs font-medium hidden md:inline"
                style={{
                  color: isActive ? "var(--gold)" : isCompleted ? "var(--positive)" : "var(--text-muted)",
                }}
              >
                {step.label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className="w-4 md:w-8 h-px mx-1"
                style={{
                  background: currentStep > step.id ? "var(--positive)" : "var(--border)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
