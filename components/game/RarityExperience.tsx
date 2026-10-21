"use client";

import { useEffect, useState } from "react";

type Answer = { word: string; rarity: number; prompt: string; rarityPercentile?: number | null };

function theme(score: number) {
  if (score >= 81) return { label: "OBSCURE", color: "#f4bf61" };
  if (score >= 61) return { label: "DEEP CUT", color: "#bca6fa" };
  if (score >= 41) return { label: "CURIOUS", color: "#77c9cf" };
  if (score >= 21) return { label: "FAMILIAR", color: "#a5d7aa" };
  return { label: "COMMON", color: "#9ca7a3" };
}

export function RarityReveal({ answer }: { answer: Answer }) {
  const [display, setDisplay] = useState(0);
  const color = theme(answer.rarity);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setDisplay(answer.rarity); return; }
    const start = performance.now();
    let frame = 0;
    function animate(time: number) {
      const t = Math.min(1, (time - start) / 850);
      setDisplay(Math.round(answer.rarity * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [answer.word, answer.rarity]);
  const strong = answer.rarity >= 81;
  return <div className="relative mx-auto mt-7 max-w-[470px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] px-6 py-8 text-center" aria-label={`Rarity score ${answer.rarity} of 100`}>
    {strong && <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(244,191,97,0.16),transparent_70%)]" />}
    <div className="relative">
      <div className={`text-7xl font-black tabular-nums tracking-tight sm:text-8xl ${strong ? "drop-shadow-[0_0_24px_rgba(244,191,97,0.42)]" : ""}`} style={{ color: color.color }}>{display}<span className="ml-2 text-lg font-medium text-white/30">/100</span></div>
      <p className="mt-4 text-xs font-bold tracking-[0.28em]" style={{ color: color.color }}>✦ {color.label} ✦</p>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${display}%`, backgroundColor: color.color }} /></div>
      {answer.rarityPercentile != null && <p className="mt-4 text-sm text-white/65">Rarer than {answer.rarityPercentile}% of valid answers for this prompt</p>}
      {strong && <p className="mt-3 text-xs text-[#f4bf61]">Exceptional find.</p>}
    </div>
  </div>;
}

export function RarityReport({ answers, total, mode }: { answers: readonly Answer[]; total: number; mode: "daily" | "words" }) {
  const [definitions, setDefinitions] = useState<Record<string, string | null>>({});
  const top = [...answers].sort((a,b) => b.rarity - a.rarity).slice(0, 3);
  useEffect(() => {
    if (!top.length) return;
    const abort = new AbortController();
    Promise.all(top.map(async item => {
      try {
        const response = await fetch(`/api/definition?word=${encodeURIComponent(item.word)}`, { signal: abort.signal });
        if (!response.ok) return [item.word, null] as const;
        const data = await response.json();
        return [item.word, typeof data.definition === "string" ? data.definition : null] as const;
      } catch { return [item.word, null] as const; }
    })).then(pairs => { if (!abort.signal.aborted) setDefinitions(Object.fromEntries(pairs)); });
    return () => abort.abort();
  // A finished round is immutable; load definitions once for that set of words.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers.map(a => a.word).join("|")]);
  const best = top[0];
  return <div className="mt-8 space-y-5 text-left">
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4"><p className="text-xs font-bold uppercase tracking-wider text-white/45">Average rarity</p><p className="mt-2 text-3xl font-black text-[#CCF28A]">{answers.length ? Math.round(total / answers.length) : 0}<span className="text-sm text-white/35"> / 100</span></p></div>
      <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4"><p className="text-xs font-bold uppercase tracking-wider text-white/45">Rarest find</p><p className="mt-2 text-3xl font-black text-[#f4bf61]">{best?.rarity ?? 0}<span className="text-sm text-white/35"> / 100</span></p></div>
    </div>
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-5">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#CCF28A]">Your rarity report</p>
      <p className="mt-2 text-sm text-white/55">{mode === "daily" ? "Today's discoveries" : "Your discoveries"} · prompt-relative scores</p>
      <div className="mt-5 space-y-4">{answers.map((answer, i) => <div key={`${answer.word}-${i}`}><div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="min-w-0 truncate font-medium text-white/85">{answer.word}</span><span className="font-bold tabular-nums" style={{ color: theme(answer.rarity).color }}>{answer.rarity}</span></div><div className="h-2 rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${answer.rarity}%`, backgroundColor: theme(answer.rarity).color }} /></div></div>)}{!answers.length && <p className="text-sm text-white/50">No answers this round.</p>}</div>
    </div>
    {!!top.length && <div className="rounded-xl border border-white/10 bg-white/[0.025] p-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#CCF28A]">Words worth knowing</p><p className="mt-2 text-sm text-white/50">Discover the meanings behind your rarest answers.</p><div className="mt-4 space-y-4">{top.map(item => <div key={item.word}><p className="font-bold capitalize" style={{ color: theme(item.rarity).color }}>{item.word}</p><p className="mt-1 text-sm leading-relaxed text-white/65">{definitions[item.word] === undefined ? "Looking up meaning…" : definitions[item.word] ?? "Definition unavailable for this word."}</p></div>)}</div><p className="mt-4 text-xs text-white/35">Definitions are informational and do not affect rarity scores.</p></div>}
  </div>;
}
