
"use client";

import { useEffect, useRef, useState } from "react";
import type { Category } from "@/lib/answers";
import type { AnswerResult } from "@/lib/answer-engine";
import {
  applyAnswer,
  categoryNames,
  createGame,
  currentCategory,
  modes,
  requirement,
  resolveVault,
} from "@/lib/game-engine";
import type { Game, Mode } from "@/lib/game-engine";

export default function Home() {
  const [game, setGame] = useState<Game | null>(null);
  const [category, setCategory] = useState<Category>("ocean");
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const session = useRef(0);
  const busyRef = useRef(false);

  // Only The Collector has a countdown timer.
  useEffect(() => {
    if (!game || game.mode !== "collector" || game.finished) return;

    const timer = window.setInterval(() => {
      setGame((current) => {
        if (!current || current.mode !== "collector" || current.finished)
          return current;

        const seconds = Math.max(0, current.seconds - 1);

        return {
          ...current,
          seconds,
          finished: seconds === 0,
        };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [game?.mode, game?.finished]);

  function start(mode: Mode) {
    session.current++;
    busyRef.current = false;
    setGame(createGame(mode, category));
    setGuess("");
    setFeedback("");
    setBusy(false);
    setCopied(false);
  }

  function home() {
    session.current++;
    busyRef.current = false;
    setGame(null);
    setGuess("");
    setFeedback("");
    setBusy(false);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!game || game.finished || busyRef.current || game.pending) return;

    const name = guess.trim();
    if (!name || name.length > 100) {
      setFeedback("Enter an answer between 1 and 100 characters.");
      return;
    }

    const currentSession = session.current;
    const activeCategory = currentCategory(game);

    busyRef.current = true;
    setBusy(true);
    setFeedback("Checking your discovery...");

    try {
      const params = new URLSearchParams({
        name,
        category: activeCategory,
      });

      const response = await fetch(`/api/answer?${params.toString()}`);

      if (!response.ok) throw new Error("Answer service unavailable");

      const result = (await response.json()) as AnswerResult;

      if (currentSession !== session.current) return;

      const evaluation = applyAnswer(game, result);

      setGame(evaluation.game);
      setFeedback(evaluation.message);

      if (evaluation.success) {
        setGuess("");
      }
    } catch {
      if (currentSession === session.current) {
        setFeedback("Could not check your answer. Try again.");
      }
    } finally {
      if (currentSession === session.current) {
        busyRef.current = false;
        setBusy(false);
      }
    }
  }

  function chooseVault(keep: boolean) {
    if (!game?.pending) return;
    setFeedback(
      keep
        ? `${game.pending.name} locked into your vault!`
        : "Answer discarded. Try something rarer."
    );
    setGame(resolveVault(game, keep));
  }

  function finish() {
    if (!game) return;
    session.current++;
    busyRef.current = false;
    setBusy(false);
    setGame({ ...game, finished: true });
  }

  async function share() {
    if (!game) return;

    const title = modes.find((m) => m.id === game.mode)?.name;
    const text = [
      `OBSCURE · ${title}`,
      `Score: ${game.score}`,
      `Discoveries: ${game.discoveries.length}`,
      `https://playobscure.com`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setFeedback("Clipboard unavailable. Copy your results manually.");
    }
  }

  const activeCategory = game ? currentCategory(game) : category;
  const mode = modes.find((m) => m.id === game?.mode);

  const panel =
    "rounded-3xl border border-white/10 bg-[#171d24] p-6 sm:p-8";
  const primary =
    "cursor-pointer rounded-xl bg-[#d9ff72] px-6 py-4 font-bold text-[#101710] transition hover:bg-[#edffb0] disabled:cursor-not-allowed disabled:opacity-50";
  const secondary =
    "cursor-pointer rounded-xl border border-white/15 px-5 py-3 text-sm text-white/75 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <main className="min-h-screen bg-[#0b0e12] text-[#f5f7f2]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(120,170,100,0.12),transparent_60%)]" />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <header className="flex items-center justify-between border-b border-white/10 py-6">
          <button
            onClick={home}
            className="cursor-pointer text-3xl font-black tracking-[-0.075em]"
          >
            obscure<span className="text-[#d9ff72]">.</span>
          </button>
          <span className="rounded-full border border-[#d9ff72]/30 bg-[#d9ff72]/10 px-3 py-1 text-xs text-[#d9ff72]">
            ARCADE BETA
          </span>
        </header>

        {!game ? (
          <div className="pb-24">
            <section className="pb-12 pt-16">
              <p className="mb-5 text-xs font-bold tracking-[0.25em] text-[#d9ff72]">
                WELCOME TO PLAY OBSCURE
              </p>
              <h1 className="text-5xl font-black leading-[1.05] tracking-[-0.065em] sm:text-7xl">
                THINK DIFFERENT.
                <br />
                <span className="text-[#d9ff72]">THINK OBSCURE.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-white/50">
                Six games about strange knowledge, rare answers, and
                unexpected discoveries. How obscure can you get?
              </p>
            </section>

            <div className="mb-8 flex flex-wrap items-center gap-3">
              <span className="text-sm text-white/50">Choose a category:</span>
              {(Object.keys(categoryNames) as Category[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`cursor-pointer rounded-full border px-4 py-2 text-sm ${
                    category === cat
                      ? "border-[#d9ff72] bg-[#d9ff72]/10 text-[#d9ff72]"
                      : "border-white/15 text-white/50 hover:text-white"
                  }`}
                >
                  {categoryNames[cat]}
                </button>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {modes.map((item, i) => (
                <article
                  key={item.id}
                  className="group flex flex-col rounded-3xl border border-white/10 bg-[#171d24] p-7 transition hover:-translate-y-1 hover:border-[#d9ff72]/40"
                >
                  <div className="mb-7 flex items-center justify-between">
                    <span className="text-5xl">{item.icon}</span>
                    <span className="text-xs text-white/30">
                      GAME {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black">{item.name}</h2>
                  <p className="mt-3 flex-1 text-sm leading-6 text-white/50">
                    {item.description}
                  </p>
                  <button
                    onClick={() => start(item.id)}
                    className="mt-8 flex cursor-pointer justify-between rounded-xl border border-white/15 px-5 py-4 font-bold transition group-hover:border-[#d9ff72] group-hover:bg-[#d9ff72] group-hover:text-black"
                  >
                    Play now <span>↗</span>
                  </button>
                </article>
              ))}
            </div>

            <p className="mt-10 text-center text-xs text-white/35">
              Experimental rarity scores · No accounts required
            </p>
          </div>
        ) : (
          <section className="pb-24 pt-10">
            <button
              onClick={home}
              className="mb-9 cursor-pointer text-sm text-white/45 hover:text-white"
            >
              ← Back to arcade
            </button>

            <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
              <div>
                <h1 className="text-4xl font-black sm:text-5xl">
                  {mode?.icon} {mode?.name}
                </h1>
                <p className="mt-3 text-sm text-white/50">
                  {categoryNames[activeCategory]}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-widest text-white/35">
                  Total score
                </p>
                <p className="text-4xl font-black text-[#d9ff72]">
                  {game.score.toLocaleString()}
                </p>
              </div>
            </div>

            {game.finished ? (
              <div className={`${panel} mx-auto max-w-2xl py-14 text-center`}>
                <p className="text-6xl">🏆</p>
                <p className="mt-7 text-xs font-bold tracking-widest text-[#d9ff72]">
                  RUN COMPLETE
                </p>
                <h2 className="mt-3 text-4xl font-black">Your discoveries.</h2>
                <p className="mt-4 text-white/50">
                  {game.discoveries.length} unique answers discovered
                </p>
                <p className="my-10 text-7xl font-black text-[#d9ff72]">
                  {game.score.toLocaleString()}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button onClick={share} className={primary}>
                    {copied ? "Copied!" : "Share results ↗"}
                  </button>
                  <button onClick={() => start(game.mode)} className={secondary}>
                    Play again
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[1fr_290px]">
                <div className={panel}>
                  <div className="mb-8 flex items-center justify-between gap-3">
                    <span className="text-xs font-bold tracking-widest text-[#d9ff72]">
                      {game.mode === "collector"
                        ? "COLLECTION RUN"
                        : game.mode === "climb"
                        ? `CHAIN ${game.round}`
                        : `ROUND ${Math.min(game.round + 1, 5)} / 5`}
                    </span>
                    <span className="text-sm text-white/45">
                      {game.discoveries.length} discoveries
                    </span>
                  </div>

                  {game.mode === "iceberg" && (
                    <>
                      <div className="mb-7 grid grid-cols-5 gap-2">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <div
                            key={n}
                            className={`rounded-lg border p-3 text-center ${
                              n <= game.round + 1
                                ? "border-[#d9ff72]/40 bg-[#d9ff72]/10 text-[#d9ff72]"
                                : "border-white/10 text-white/30"
                            }`}
                          >
                            {n}
                          </div>
                        ))}
                      </div>
                      <h2 className="text-3xl font-black">
                        Depth {game.round + 1}
                      </h2>
                      <p className="mt-4 text-white/55">
                        Name something in {categoryNames[activeCategory]}.
                        You need <strong className="text-[#d9ff72]">
                          Tier {requirement(game)}+
                        </strong> to descend.
                      </p>
                    </>
                  )}

                  {game.mode === "climb" && (
                    <>
                      <h2 className="text-3xl font-black">
                        Go rarer. Every time.
                      </h2>
                      <p className="mt-5 text-white/50">
                        Previous obscurity score:
                      </p>
                      <p className="my-5 text-6xl font-black text-[#d9ff72]">
                        {game.previous}
                        <span className="text-xl text-white/25">/100</span>
                      </p>
                      <p className="text-sm text-white/45">
                        Your next answer must score higher.
                      </p>
                    </>
                  )}

                  {game.mode === "vault" && (
                    <>
                      <h2 className="text-3xl font-black">
                        Build your vault.
                      </h2>
                      <div className="mt-6 grid grid-cols-5 gap-2">
                        {Array.from({ length: 5 }, (_, i) => (
                          <div
                            key={i}
                            className={`rounded-xl border p-3 text-center ${
                              i < game.round
                                ? "border-[#d9ff72]/40 bg-[#d9ff72]/10"
                                : "border-white/10"
                            }`}
                          >
                            {i < game.round ? "💎" : "◇"}
                          </div>
                        ))}
                      </div>
                      <p className="mt-5 text-sm text-white/50">
                        {game.swaps} rerolls remaining.
                      </p>
                    </>
                  )}

                  {game.mode === "extinction" && (
                    <>
                      <h2 className="text-3xl font-black">
                        Make every tier extinct.
                      </h2>
                      <p className="mt-4 text-white/50">
                        Each accepted answer eliminates its rarity tier.
                        Find all five without reusing a tier.
                      </p>
                      <div className="mt-7 grid grid-cols-5 gap-2">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <div
                            key={n}
                            className={`rounded-xl border p-3 text-center ${
                              game.excluded.includes(n)
                                ? "border-red-400/25 bg-red-400/10 text-red-300/60 line-through"
                                : "border-[#d9ff72]/30 text-[#d9ff72]"
                            }`}
                          >
                            {n}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {game.mode === "roulette" && (
                    <>
                      <h2 className="text-3xl font-black">
                        {categoryNames[activeCategory]}
                      </h2>
                      <p className="mt-4 text-white/55">
                        Submit an answer with rarity{" "}
                        <strong className="text-[#d9ff72]">
                          Tier {requirement(game)}+
                        </strong>.
                      </p>
                      <p className="mt-4 text-sm text-white/40">
                        {game.lives} lives remaining · Five rounds
                      </p>
                    </>
                  )}

                  {game.mode === "collector" && (
                    <>
                      <h2 className="text-3xl font-black">
                        Collect everything.
                      </h2>
                      <p className="mt-4 text-white/50">
                        Name as many unique things as possible
                        before time runs out.
                      </p>
                      <p className="mt-6 text-5xl font-black text-[#d9ff72]">
                        {game.seconds}s
                      </p>
                      <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-[#d9ff72] transition-all"
                          style={{
                            width: `${(game.seconds / 90) * 100}%`,
                          }}
                        />
                      </div>
                    </>
                  )}

                  {game.pending ? (
                    <div className="mt-9 rounded-2xl border border-[#d9ff72]/30 bg-[#d9ff72]/10 p-6">
                      <p className="text-xs font-bold tracking-widest text-[#d9ff72]">
                        VAULT CANDIDATE
                      </p>
                      <h3 className="mt-3 text-2xl font-black">
                        {game.pending.name}
                      </h3>
                      <p className="mt-2 text-sm text-white/60">
                        Obscurity {game.pending.rarity}/100 ·
                        Tier {game.pending.tier}
                      </p>
                      <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        <button className={primary} onClick={() => chooseVault(true)}>
                          Lock answer
                        </button>
                        <button
                          className={secondary}
                          onClick={() => chooseVault(false)}
                          disabled={game.swaps === 0}
                        >
                          Reroll ({game.swaps})
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={submit} className="mt-9">
                      <label htmlFor="answer" className="mb-3 block text-sm font-semibold text-white/70">
                        Enter your discovery
                      </label>
                      <input
                        id="answer"
                        value={guess}
                        onChange={(e) => setGuess(e.target.value)}
                        disabled={busy}
                        autoComplete="off"
                        maxLength={100}
                        placeholder="Think of something unusual..."
                        className="w-full rounded-xl border border-white/15 bg-[#0b1016] px-5 py-4 text-white outline-none placeholder:text-white/25 focus:border-[#d9ff72]"
                      />
                      <button
                        type="submit"
                        disabled={busy || !guess.trim()}
                        className={`${primary} mt-3 w-full`}
                      >
                        {busy ? "Checking..." : "Submit discovery ↗"}
                      </button>
                    </form>
                  )}

                  {feedback && (
                    <div
                      role="status"
                      aria-live="polite"
                      className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/75"
                    >
                      {feedback}
                    </div>
                  )}

                  <div className="mt-8 flex justify-between gap-4">
                    <button
                      onClick={() => {
                        session.current++;
                        busyRef.current = false;
                        setBusy(false);
                        setGame(createGame(game.mode, game.category));
                        setGuess("");
                        setFeedback("");
                      }}
                      className="cursor-pointer text-sm text-white/40 hover:text-white"
                    >
                      Restart
                    </button>
                    <button
                      onClick={finish}
                      className="cursor-pointer text-sm text-[#d9ff72] hover:underline"
                    >
                      Finish run →
                    </button>
                  </div>
                </div>

                <aside className="space-y-5">
                  <div className={panel}>
                    <h3 className="mb-5 text-sm font-bold">
                      Your discoveries
                    </h3>

                    {game.discoveries.length === 0 ? (
                      <p className="text-sm leading-6 text-white/35">
                        Your discoveries will appear here.
                      </p>
                    ) : (
                      <div className="max-h-[400px] space-y-3 overflow-y-auto">
                        {game.discoveries.map((item, i) => (
                          <div
                            key={`${item.identity}-${i}`}
                            className="flex items-center justify-between gap-2 border-b border-white/10 pb-3"
                          >
                            <div className="min-w-0">
                              <p className="break-words text-sm text-white/80">
                                {i + 1}. {item.name}
                              </p>
                              <p className="text-xs text-white/35">
                                Tier {item.tier}
                                {item.estimated ? " · Estimated" : ""}
                              </p>
                            </div>
                            <span className="font-bold text-[#d9ff72]">
                              {item.rarity}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={panel}>
                    <p className="text-xs uppercase tracking-widest text-white/40">
                      Category
                    </p>
                    <p className="mt-3 text-xl font-bold">
                      {categoryNames[activeCategory]}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-white/40">
                      Rarity scores are experimental estimates of
                      how obscure an answer may be.
                    </p>
                  </div>
                </aside>
              </div>
            )}
          </section>
        )}

        <footer className="border-t border-white/10 py-8 text-center text-xs text-white/30">
          PLAY OBSCURE © 2026 · THE OBVIOUS IS ONLY THE BEGINNING
        </footer>
      </div>
    </main>
  );
}
