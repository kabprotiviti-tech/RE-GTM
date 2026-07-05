"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, animate } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  format?: "aed" | "psf" | "number" | "percent" | "days";
  duration?: number;
  className?: string;
}

const formatters: Record<string, (v: number) => string> = {
  aed: (v) => `AED ${Math.round(v).toLocaleString("en-US")}`,
  psf: (v) => `AED ${Math.round(v).toLocaleString("en-US")}/sqft`,
  number: (v) => Math.round(v).toLocaleString("en-US"),
  percent: (v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`,
  days: (v) => `${v.toFixed(1)} days`,
};

export function AnimatedCounter({
  value,
  format = "number",
  duration = 1.2,
  className = "",
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState("0");
  const formatter = formatters[format];

  useEffect(() => {
    if (!inView) return;
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.16, 1, 0.3, 1], // expo-out — weighted, deliberate
      onUpdate: (latest) => {
        setDisplay(formatter(latest));
      },
    });
    return () => controls.stop();
  }, [inView, value, duration, formatter, motionValue]);

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : {}}
      transition={{ duration: 0.4 }}
    >
      {display}
    </motion.span>
  );
}
