"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface TypewriterProps {
  text: string;
  speed?: number; // ms per word
  className?: string;
  onComplete?: () => void;
}

export function Typewriter({ text, speed = 35, className = "", onComplete }: TypewriterProps) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    if (!text) return;

    // Tokenize by words but preserve whitespace and markdown
    const tokens = text.match(/\S+\s*/g) || [text];
    let i = 0;
    const interval = setInterval(() => {
      if (i >= tokens.length) {
        clearInterval(interval);
        setDone(true);
        onComplete?.();
        return;
      }
      setDisplayed((prev) => prev + tokens[i]);
      i++;
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      {displayed}
      {!done && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
          className="inline-block w-2 h-4 ml-0.5 align-middle"
          style={{ background: "var(--gold)" }}
        />
      )}
    </motion.div>
  );
}
