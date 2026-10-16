"use client";

import type { PointerEvent } from "react";

/** A soft light/ripple follows the pointer across the original headline. */
export default function HeroHeadline() {
  const moveLight = (event: PointerEvent<HTMLHeadingElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--light-x", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--light-y", `${event.clientY - rect.top}px`);
  };

  return (
    <h1
      onPointerMove={moveLight}
      className="obscure-reactive-headline text-[clamp(3.4rem,8.5vw,7rem)] font-black leading-[1.02] tracking-[-0.075em]"
    >
      <span className="obscure-headline-base">
        How obscure<br />can you <span className="text-[#CCF28A]">get?</span>
      </span>
      <span className="obscure-headline-light" aria-hidden="true">
        How obscure<br />can you <span>get?</span>
      </span>
    </h1>
  );
}
