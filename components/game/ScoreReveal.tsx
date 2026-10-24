"use client";

import { useEffect, useState } from "react";
import type { RarityAnswer } from "./rarity-types";
import { rarityTheme } from "./rarity-types";
import "./score-effects.css";

export function ScoreReveal({ answer }: { answer: RarityAnswer }) {
  const [display, setDisplay] = useState(0);
  const [entered, setEntered] = useState(false);
  const palette = rarityTheme(answer.rarity);
  const intensity = answer.rarity >= 91 ? "legendary" : answer.rarity >= 81 ? "high" : answer.rarity >= 61 ? "medium" : "low";

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      // A deferred update is unnecessary when the user requests reduced motion.
      setDisplay(answer.rarity);
      setEntered(true);
      return;
    }
    setDisplay(0);
    setEntered(false);
    let raf = 0;
    const start = performance.now();
    const duration = 940;
    function tick(now: number) {
      const t = Math.max(0, Math.min(1, (now - start) / duration));
      const eased = 1 - Math.pow(1 - t, 4);
      setDisplay(Math.round(answer.rarity * eased));
      if (t > 0.11) setEntered(true);
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [answer.word, answer.rarity]);

  return (
    <div className={`po-reveal po-reveal--${intensity} ${entered ? "po-reveal--entered" : ""}`} style={{ "--rarity-color": palette.color } as React.CSSProperties} aria-label={`Rarity score ${answer.rarity} of 100`}>
      <div className="po-reveal__grain" aria-hidden="true" />
      {intensity !== "low" && <div className="po-reveal__ring po-reveal__ring--one" aria-hidden="true" />}
      {(intensity === "high" || intensity === "legendary") && <div className="po-reveal__ring po-reveal__ring--two" aria-hidden="true" />}
      {intensity === "legendary" && <div className="po-reveal__rays" aria-hidden="true" />}
      {intensity !== "low" && <div className="po-reveal__sparks" aria-hidden="true">
        {Array.from({ length: intensity === "legendary" ? 22 : intensity === "high" ? 16 : 9 }, (_, i) => (
          <i key={i} style={{ "--i": i, "--count": intensity === "legendary" ? 22 : intensity === "high" ? 16 : 9, "--distance": `${78 + (i % 5) * 15}px` } as React.CSSProperties} />
        ))}
      </div>}
      <div className="po-reveal__body">
        <p className="po-reveal__eyebrow">THE VERDICT</p>
        <div className="po-reveal__score"><span className="po-reveal__number">{display}</span><span className="po-reveal__denominator">/ 100</span></div>
        <p className="po-reveal__tier">✦ {palette.label} ✦</p>
        <div className="po-reveal__meter"><div style={{ width: `${display}%` }} /></div>
        {answer.rarityPercentile != null && <p className="po-reveal__explanation">Rarer than {answer.rarityPercentile}% of valid answers for this prompt</p>}
        {intensity === "legendary" && <p className="po-reveal__exception">A remarkable discovery.</p>}
        {intensity === "high" && <p className="po-reveal__exception">Exceptional find.</p>}
      </div>
    </div>
  );
}
