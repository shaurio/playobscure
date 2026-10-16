"use client";

import { useEffect, useRef } from "react";

/** Homepage-only decoration: infinitely drifting X wallpaper plus gentle cursor light. */
export default function HomeAmbient() {
  const cursorGlow = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onMove = (event: PointerEvent) => {
      const glow = cursorGlow.current;
      if (!glow || event.pointerType === "touch") return;
      glow.style.setProperty("--cursor-x", `${event.clientX}px`);
      glow.style.setProperty("--cursor-y", `${event.clientY}px`);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div className="obscure-ambient" aria-hidden="true">
      <div className="obscure-ambient-pattern" />
      <div className="obscure-ambient-depth" />
      <div ref={cursorGlow} className="obscure-ambient-cursor" />
    </div>
  );
}
