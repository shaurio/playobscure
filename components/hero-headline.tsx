"use client";

import MetallicPaint from "./MetallicPaint";

export default function HeroHeadline() {
  return (
    <div className="relative mx-auto flex w-full max-w-[1000px] flex-col items-center">
      <h1 className="sr-only">Obscure — How obscure can you get?</h1>

      <div
        className="relative h-[145px] w-full sm:h-[210px] lg:h-[265px]"
        aria-hidden="true"
      >
        <MetallicPaint
          text="OBSCURE"
          fontFamily="Arial, sans-serif"
          fontWeight={900}
          color="#9cc4ff"
          backgroundColor="#08090e"
          dispersion={1}
          density={6}
          softness={0.8}
          distortion={0.4}
          edgeBend={0.4}
          angle={0}
          speed={0.35}
          mouseTilt={0.3}
          intro={true}
          dpr={1.5}
        />
      </div>

      <p className="mt-2 text-center text-xl font-medium tracking-tight text-[#e4e5eb] sm:text-2xl">
        How obscure can you get?
      </p>
    </div>
  );
}
