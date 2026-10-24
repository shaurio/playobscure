"use client";

import { useEffect, useRef, useState } from "react";
import MoltenMetal from "../MoltenMetal";
import {
  RARITY_ATMOSPHERE_EVENT,
  type RarityAtmosphereDetail,
} from "../../lib/rarity-atmosphere";

const IDLE_OPACITY = 0.20;

const PALETTES = {
  idle: ["#17191d", "#a5acb5", "#ffffff"],
  common: ["#252a32", "#b9c0c9", "#ffffff"],
  uncommon: ["#03465a", "#1ce2ff", "#e1fbff"],
  rare: ["#29105a", "#a56dff", "#ffb9ef"],
  legendary: ["#762559", "#ffb348", "#fff1bc"],
} as const;

type Palette = keyof typeof PALETTES;

function paletteFor(score: number): Palette {
  if (score >= 90) return "legendary";
  if (score >= 70) return "rare";
  if (score >= 40) return "uncommon";
  return "common";
}

/** One continuously visible Molten Metal layer. Score and cursor control its visibility. */
export default function GameAtmosphere({ mode = "game" }: { mode?: "game" | "ambient" }) {
  const [opacity, setOpacity] = useState(IDLE_OPACITY);
  const [palette, setPalette] = useState<Palette>("idle");
  const layerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (mode === "ambient") {
      const layer = layerRef.current;
      if (!layer) return;
      let x = -1000;
      let y = -1000;
      const update = (event: PointerEvent) => {
        if (event.pointerType === "touch") return;
        x = event.clientX;
        y = event.clientY;
        // Normal coverage is 20%; near the pointer, 75%. No React rerenders.
        const mask = `radial-gradient(circle 230px at ${x}px ${y}px, black 0%, rgba(0,0,0,.75) 32%, rgba(0,0,0,.2) 100%)`;
        layer.style.maskImage = mask;
        layer.style.webkitMaskImage = mask;
      };
      window.addEventListener("pointermove", update, { passive: true });
      return () => window.removeEventListener("pointermove", update);
    }

    const handler = (event: Event) => {
      const score = (event as CustomEvent<RarityAtmosphereDetail>).detail?.score;
      if (typeof score !== "number" || !Number.isFinite(score)) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const clamped = Math.max(0, Math.min(100, score));
      setOpacity(clamped / 100); // Exactly linear: 100/100 -> full-strength shader.
      setPalette(paletteFor(clamped));
      
    };
    
    const resetAtmosphere = () => {
      setOpacity(IDLE_OPACITY);
      setPalette("idle");
    };

    window.addEventListener("playobscure:atmosphere-reset", resetAtmosphere);

    window.addEventListener(RARITY_ATMOSPHERE_EVENT, handler);
    return () => {
      window.removeEventListener(RARITY_ATMOSPHERE_EVENT, handler);
      window.removeEventListener("playobscure:atmosphere-reset", resetAtmosphere);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [mode]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#05060a]">
      <div
        ref={layerRef}
        className="absolute inset-0"
        style={{
          // Ambient cursor light is handled by the alpha mask, without a second GPU canvas.
          opacity: mode === "ambient" ? 1 : opacity,
          transition: mode === "ambient" ? undefined : "opacity 550ms ease-out",
          maskImage: mode === "ambient" ? "linear-gradient(rgba(0,0,0,.2), rgba(0,0,0,.2))" : undefined,
          WebkitMaskImage: mode === "ambient" ? "linear-gradient(rgba(0,0,0,.2), rgba(0,0,0,.2))" : undefined,
        }}
      >
        <MoltenMetal
          key={palette}
          colors={[...PALETTES[palette]]}
          speed={0.2}
          detail={8}
          brightness={0.90}
          mouseInteraction={false}
        />
      </div>
      {/* Much weaker vignette: previously it obscured even 100% score effects. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_65%,rgba(5,6,10,.3)_100%)]" />
    </div>
  );
}
