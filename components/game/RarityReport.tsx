"use client";

import { useEffect, useState } from "react";
import type { RarityAnswer } from "./rarity-types";
import { rarityTheme } from "./rarity-types";

export function RarityReport({ answers, total, mode }: { answers: readonly RarityAnswer[]; total: number; mode: "daily" | "words" }) {
  const [definitions, setDefinitions] = useState<Record<string, string | null>>({});
  const top = [...answers].sort((a,b) => b.rarity - a.rarity).slice(0, 3);
  useEffect(() => {
    if (!top.length) return;
    let active = true;
    Promise.all(top.map(async item => {
      try {
        const response = await fetch(`/api/definition?word=${encodeURIComponent(item.word)}`);
        if (!response.ok) return [item.word, null] as const;
        const data = await response.json();
        return [item.word, typeof data.definition === "string" ? data.definition : null] as const;
      } catch { return [item.word, null] as const; }
    })).then(pairs => { if (active) setDefinitions(Object.fromEntries(pairs)); });
    return () => { active = false; };
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
      <div className="mt-5 space-y-4">{answers.map((answer, i) => <div key={`${answer.word}-${i}`}><div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="min-w-0 truncate font-medium text-white/85">{answer.word}</span><span className="font-bold tabular-nums" style={{ color: rarityTheme(answer.rarity).color }}>{answer.rarity}</span></div><div className="h-2 rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${answer.rarity}%`, backgroundColor: rarityTheme(answer.rarity).color }} /></div></div>)}{!answers.length && <p className="text-sm text-white/50">No answers this round.</p>}</div>
    </div>
    {!!top.length && <div className="rounded-xl border border-white/10 bg-white/[0.025] p-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#CCF28A]">Words worth knowing</p><p className="mt-2 text-sm text-white/50">Discover the meanings behind your rarest answers.</p><div className="mt-4 space-y-4">{top.map(item => <div key={item.word}><p className="font-bold capitalize" style={{ color: rarityTheme(item.rarity).color }}>{item.word}</p><p className="mt-1 text-sm leading-relaxed text-white/65">{definitions[item.word] === undefined ? "Looking up meaning…" : definitions[item.word] ?? "Definition unavailable for this word."}</p></div>)}</div><p className="mt-4 text-xs text-white/35">Definitions are informational and do not affect rarity scores.</p></div>}
  </div>;
}
