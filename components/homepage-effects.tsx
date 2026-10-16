"use client";

import { useEffect, useRef } from "react";
import styles from "./homepage-styles";

/**
 * Custom CSS-based ambient animation, inspired by glitchworker's public
 * "Bubbles Background Animation" CodePen (MIT):
 * https://codepen.io/glitchworker/pen/jENZGOV
 * Built independently for this page; no external assets or dependencies.
 */
export function FluidBackdrop() {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = backdropRef.current;
    if (!element) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(pointer: fine)");
    if (reducedMotion.matches || !finePointer.matches) return;

    let frame = 0;
    let targetX = 50;
    let targetY = 50;
    let x = 50;
    let y = 50;

    function onPointerMove(event: PointerEvent) {
      targetX = (event.clientX / window.innerWidth) * 100;
      targetY = (event.clientY / window.innerHeight) * 100;
      if (!frame) frame = window.requestAnimationFrame(animate);
    }

    function animate() {
      x += (targetX - x) * 0.09;
      y += (targetY - y) * 0.09;
      element?.style.setProperty("--pointer-x", `${x}%`);
      element?.style.setProperty("--pointer-y", `${y}%`);
      frame = 0;
      // Only animate while the glow is moving; don't run an idle 60fps loop.
      if (Math.abs(targetX - x) + Math.abs(targetY - y) > 0.2) {
        frame = window.requestAnimationFrame(animate);
      }
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className={styles.backdrop} ref={backdropRef} aria-hidden="true">
      <div className={styles.backdropBase} />
      <div className={styles.orbOne} />
      <div className={styles.orbTwo} />
      <div className={styles.orbThree} />
      <div className={styles.orbFour} />
      <div className={styles.orbFive} />
      <div className={styles.pointerGlow} />
      <div className={styles.backdropVignette} />
    </div>
  );
}

/**
 * Original SVG/CSS title treatment informed by Robin Delaporte's public
 * "Fluid text hover" CodePen (MIT):
 * https://codepen.io/robin-dela/pen/KKPYoBq
 * Uses a lightweight SVG displacement filter rather than its WebGL/OGL setup.
 */
export function FluidWordmark() {
  const wordRef = useRef<HTMLDivElement>(null);

  function onMove(event: React.PointerEvent<HTMLDivElement>) {
    const element = wordRef.current;
    if (!element) return;
    const { left, top, width, height } = element.getBoundingClientRect();
    element.style.setProperty("--ink-x", `${((event.clientX - left) / width) * 100}%`);
    element.style.setProperty("--ink-y", `${((event.clientY - top) / height) * 100}%`);
  }

  return (
    <div
      className={styles.wordmarkWrap}
      ref={wordRef}
      onPointerMove={onMove}
      onPointerLeave={() => wordRef.current?.style.removeProperty("--ink-x")}
    >
      <svg width="0" height="0" className={styles.svgDefs} aria-hidden="true">
        <defs>
          <filter
            id="obscure-liquid-lettering"
            x="-15%"
            y="-35%"
            width="130%"
            height="170%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.016 0.041"
              numOctaves="2"
              seed="8"
              result="noise"
            >
              <animate
                attributeName="baseFrequency"
                values="0.016 0.041;0.023 0.031;0.016 0.041"
                dur="7s"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="23"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
      <h1 id="obscure-title" className={styles.wordmark}>
        obscure<span className={styles.wordmarkDot}>.</span>
      </h1>
      <div className={styles.wordmarkLiquid} aria-hidden="true">
        obscure<span className={styles.wordmarkDot}>.</span>
      </div>
      <div className={styles.wordmarkShine} aria-hidden="true" />
    </div>
  );
}
