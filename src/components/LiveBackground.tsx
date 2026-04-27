"use client";

import { useMemo } from "react";

export function LiveBackground() {
  const sparks = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        left: `${(i * 73 + 11) % 100}%`,
        delay: `${(i * 1.7) % 14}s`,
        duration: `${10 + ((i * 3) % 12)}s`,
        size: 2 + (i % 3),
      })),
    []
  );

  return (
    <div className="live-bg" aria-hidden>
      <div className="live-bg-grid" />
      {sparks.map((s, i) => (
        <span
          key={i}
          className="live-bg-spark"
          style={{
            left: s.left,
            bottom: "-10px",
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDelay: s.delay,
            animationDuration: s.duration,
          }}
        />
      ))}
    </div>
  );
}
