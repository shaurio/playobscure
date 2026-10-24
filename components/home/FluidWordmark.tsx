"use client";

import { useEffect, useState } from "react";
import LiquidChrome from "../LiquidChrome";

// Keep this array stable: LiquidChrome watches its prop identity.
const CHROME_COLOR: [number, number, number] = [0.19, 0.21, 0.26];

export default function FluidWordmark() {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setAnimate(!mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <div className="po-wordmark" aria-label="Obscure">
      <h1 className="po-visually-hidden">OBSCURE</h1>
      <div className="po-wordmarkFallback" aria-hidden="true" />
      {animate && (
        <div className="po-wordmarkLiquid" aria-hidden="true">
          <LiquidChrome
            speed={0.20}
            amplitude={0.26}
            frequencyX={2.8}
            frequencyY={2.5}
            interactive
          />
        </div>
      )}
      <div className="po-wordmarkSheen" aria-hidden="true" />
    </div>
  );
}
