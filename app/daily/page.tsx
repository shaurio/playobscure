
"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { trackGameEvent } from "@/lib/analytics";
import { RarityReveal, RarityReport } from "@/components/game/RarityExperience";

import {
  GameHeader,
  GameProgress,
  GamePanel,
  DiscoveryRow,
} from "@/components/game/GameUI";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type Challenge = {
  id: string;
  title: string;
  startsWith?: string;
  contains?: string;
  length?: number;
};

type WordResponse = {
  recognized: boolean;
  eligible: boolean | null;
  word: string;
  rarity?: number;
  rarityPercentile?: number | null;
  tier?: number;
  message?: string;
};

type Discovery = {
  word: string;
  rarity: number;
  rarityPercentile?: number | null;
  tier: number;
  prompt: string;
};

type DailyRun = {
  prompts: Challenge[];
  round: number;
  discoveries: Discovery[];
  phase: "guessing" | "reveal" | "done";
  remainingMs: number;
  deadlineMs: number | null;
};

// ─────────────────────────────────────────────
// CONSTANTS AND HELPERS
// ─────────────────────────────────────────────

const LIMIT_MS = 3 * 60 * 1000;

function formatTime(ms: number): string {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function scoreLabel(score: number): string {
  if (score >= 81) return "OBSCURE";
  if (score >= 61) return "DEEP CUT";
  if (score >= 41) return "CURIOUS";
  if (score >= 21) return "FAMILIAR";
  return "COMMON";
}

const primaryButton =
  "inline-flex min-h-14 w-full items-center justify-center " +
  "rounded-xl bg-[#CCF28A] px-7 font-bold text-[#152017] " +
  "transition hover:bg-[#E1FFAC] " +
  "disabled:cursor-not-allowed disabled:opacity-40";

// ─────────────────────────────────────────────
// DAILY DIVE
// ─────────────────────────────────────────────

export default function DailyPage() {
  const [day, setDay] = useState("");

  const [prompts, setPrompts] = useState<Challenge[]>([]);
  const [run, setRun] = useState<DailyRun | null>(null);

  const [loading, setLoading] = useState(true);
  const [guess, setGuess] = useState("");
  const [error, setError] = useState("");

  const [busy, setBusy] = useState(false);
  const [timeLeft, setTimeLeft] = useState(LIMIT_MS);
  const [copied, setCopied] = useState(false);

  const runRef = useRef<DailyRun | null>(null);
  const keyRef = useRef("");
  const requestRef = useRef(false);

  // ───────────────────────────────────────────
  // SAVE GAME PROGRESS
  // ───────────────────────────────────────────

  function save(next: DailyRun) {
    const previous = runRef.current;
    if (next.phase === "done" && previous?.phase !== "done") {
      trackGameEvent("game_complete", "daily", { score: next.discoveries.reduce((n, d) => n + d.rarity, 0), answers_count: next.discoveries.length, timed_out: next.remainingMs === 0 });
    }
    runRef.current = next;
    setRun(next);

    const remaining =
      next.phase === "guessing" && next.deadlineMs !== null
        ? Math.max(0, next.deadlineMs - Date.now())
        : next.remainingMs;

    setTimeLeft(remaining);

    try {
      localStorage.setItem(
        keyRef.current,
        JSON.stringify(next)
      );
    } catch {
      // Game remains usable if browser storage is unavailable.
    }
  }

  // ───────────────────────────────────────────
  // LOAD TODAY'S GAME
  // ───────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      // Everyone uses the same UTC date and prompt seed.
      const date = new Date().toISOString().slice(0, 10);
      const storageKey = `playobscure:daily:v2:${date}`;

      keyRef.current = storageKey;
      setDay(date);

      // Resume an existing daily attempt.
      try {
        const stored = localStorage.getItem(storageKey);

        if (stored) {
          const saved = JSON.parse(stored) as DailyRun;

          const valid =
            Array.isArray(saved.prompts) &&
            saved.prompts.length === 5 &&
            Array.isArray(saved.discoveries) &&
            Number.isInteger(saved.round) &&
            saved.round >= 0 &&
            saved.round <= 5 &&
            ["guessing", "reveal", "done"].includes(
              saved.phase
            ) &&
            Number.isFinite(saved.remainingMs);

          if (valid) {
            if (cancelled) return;

            // Leaving during a question does not pause
            // the countdown.
            if (
              saved.phase === "guessing" &&
              (
                saved.deadlineMs === null ||
                saved.deadlineMs <= Date.now()
              )
            ) {
              saved.phase = "done";
              saved.remainingMs = 0;
              saved.deadlineMs = null;
            }

            setPrompts(saved.prompts);
            runRef.current = saved;
            save(saved);
            setLoading(false);
            return;
          }
        }
      } catch {
        // Ignore invalid saved data.
      }

      // No previous attempt: fetch today's prompts.
      try {
        const response = await fetch(
          `/api/word/prompts?seed=daily-${date}&count=5`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error("Prompt service unavailable");
        }

        const result = (await response.json()) as {
          prompts: Challenge[];
        };

        if (
          !Array.isArray(result.prompts) ||
          result.prompts.length !== 5
        ) {
          throw new Error("Incomplete daily challenge");
        }

        if (!cancelled) {
          setPrompts(result.prompts);
        }
      } catch {
        if (!cancelled) {
          setError(
            "Couldn't load today's challenge. Refresh to retry."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  // ───────────────────────────────────────────
  // COUNTDOWN TIMER
  // ───────────────────────────────────────────

  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = runRef.current;

      if (
        !current ||
        current.phase !== "guessing" ||
        current.deadlineMs === null
      ) {
        return;
      }

      const remaining = Math.max(
        0,
        current.deadlineMs - Date.now()
      );

      setTimeLeft(remaining);

      if (remaining === 0) {
        save({
          ...current,
          phase: "done",
          remainingMs: 0,
          deadlineMs: null,
        });
      }
    }, 200);

    return () => window.clearInterval(timer);
  }, []);

  // ───────────────────────────────────────────
  // START THE DAILY DIVE
  // ───────────────────────────────────────────

  function start() {
    if (runRef.current || prompts.length !== 5) {
      return;
    }

    trackGameEvent("game_start", "daily");
    setError("");
    setGuess("");

    save({
      prompts,
      round: 0,
      discoveries: [],
      phase: "guessing",
      remainingMs: LIMIT_MS,
      deadlineMs: Date.now() + LIMIT_MS,
    });
  }

  // ───────────────────────────────────────────
  // SUBMIT AN ANSWER
  // ───────────────────────────────────────────

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const current = runRef.current;

    if (
      !current ||
      current.phase !== "guessing" ||
      requestRef.current
    ) {
      return;
    }

    const word = guess.trim().toLowerCase();

    if (!/^[a-z]{3,24}$/.test(word)) {
      setError(
        "Enter a word containing 3–24 English letters."
      );
      return;
    }

    if (
      current.deadlineMs === null ||
      Date.now() >= current.deadlineMs
    ) {
      return;
    }

    const challenge = current.prompts[current.round];

    if (!challenge) return;

    const params = new URLSearchParams({ word });

    if (challenge.startsWith) {
      params.set("startsWith", challenge.startsWith);
    }

    if (challenge.contains) {
      params.set("contains", challenge.contains);
    }

    if (challenge.length !== undefined) {
      params.set(
        "length",
        String(challenge.length)
      );
    }

    requestRef.current = true;
    setBusy(true);
    setError("");

    try {
      const response = await fetch(
        `/api/word?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Word lookup failed");
      }

      const result =
        (await response.json()) as WordResponse;

      const latest = runRef.current;

      // Ignore results if the game has moved on
      // or the time limit has expired.
      if (
        !latest ||
        latest.phase !== "guessing" ||
        latest.round !== current.round ||
        latest.deadlineMs === null ||
        Date.now() >= latest.deadlineMs
      ) {
        return;
      }

      if (!result.recognized) {
        trackGameEvent("answer_rejected", "daily", { reason: "unknown" });
        setError(
          "Not in our vocabulary yet. Try another word."
        );
        return;
      }

      if (!result.eligible) {
        trackGameEvent("answer_rejected", "daily", { reason: "not_eligible" });
        setError(
          "Recognized, but that word doesn't fit this prompt."
        );
        return;
      }

      if (
        latest.discoveries.some(
          (item) => item.word === result.word
        )
      ) {
        trackGameEvent("answer_rejected", "daily", { reason: "duplicate" });
        setError(
          "You've already used that word today."
        );
        return;
      }

      if (
        result.rarity === undefined ||
        result.tier === undefined
      ) {
        setError(
          "We couldn't score that word. Try another."
        );
        return;
      }

      const discovery: Discovery = {
        word: result.word,
        rarity: result.rarity,
        rarityPercentile: result.rarityPercentile,
        tier: result.tier,
        prompt: challenge.title,
      };

      trackGameEvent("answer_accepted", "daily", { score: discovery.rarity, question_number: latest.round + 1 });
      // Successful answer: pause the clock.
      const remaining = Math.max(
        0,
        latest.deadlineMs - Date.now()
      );

      save({
        ...latest,
        discoveries: [
          ...latest.discoveries,
          discovery,
        ],
        phase: "reveal",
        remainingMs: remaining,
        deadlineMs: null,
      });

      setGuess("");
    } catch {
      setError(
        "Couldn't check your answer. Please try again."
      );
    } finally {
      requestRef.current = false;
      setBusy(false);
    }
  }

  // ───────────────────────────────────────────
  // CONTINUE AFTER A SCORE REVEAL
  // ───────────────────────────────────────────

  function continueRun() {
    const current = runRef.current;

    if (!current || current.phase !== "reveal") {
      return;
    }

    const nextRound = current.round + 1;

    setError("");

    if (
      nextRound >= current.prompts.length ||
      current.remainingMs <= 0
    ) {
      save({
        ...current,
        round: nextRound,
        phase: "done",
        deadlineMs: null,
      });
      return;
    }

    save({
      ...current,
      round: nextRound,
      phase: "guessing",
      deadlineMs:
        Date.now() + current.remainingMs,
    });
  }

  // ───────────────────────────────────────────
  // SHARE RESULTS
  // ───────────────────────────────────────────

  async function shareResults() {
    if (!run) return;

    const total = run.discoveries.reduce(
      (sum, item) => sum + item.rarity,
      0
    );

    const text = [
      `OBSCURE · Daily Dive · ${day}`,
      `Score: ${total}/500`,
      `Discoveries: ${run.discoveries.length}/5`,
      ...run.discoveries.map(
        (item, i) =>
          `${i + 1}. ${item.rarity} points`
      ),
      "https://playobscure.com",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      trackGameEvent("result_share", "daily", { method: "copy" });
      setCopied(true);
    } catch {
      setError("Clipboard unavailable.");
    }
  }

  // ───────────────────────────────────────────
  // DERIVED GAME VALUES
  // ───────────────────────────────────────────

  const currentChallenge = run
    ? run.prompts[
        Math.min(
          run.round,
          run.prompts.length - 1
        )
      ]
    : null;

  const latestDiscovery =
    run?.discoveries[
      run.discoveries.length - 1
    ];

  const total =
    run?.discoveries.reduce(
      (sum, item) => sum + item.rarity,
      0
    ) ?? 0;

  const completed =
    run?.discoveries.length === 5;

  const timeLabel =
    run?.phase === "done"
      ? "Time left at finish"
      : run?.phase === "reveal"
        ? "Time paused"
        : "Time remaining";

  // ───────────────────────────────────────────
  // INTERFACE
  // ───────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[#0B100F] px-5 text-[#F0F2EA]">
      <div className="mx-auto max-w-[850px]">

        {/* SHARED NAVIGATION */}

        <GameHeader mode="daily" />

        <section className="pb-24 pt-14 sm:pt-20">

          {/* PAGE INTRODUCTION */}

          <div className="mb-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#CCF28A]">
              A game of uncommon knowledge
            </p>

            <h1 className="mt-6 text-5xl font-black tracking-[-0.065em] sm:text-6xl">
              Daily Dive<span className="text-[#CCF28A]">.</span>
            </h1>

            <p className="mt-5 text-base leading-8 text-white/50">
              Five words. Three minutes. One attempt.
            </p>
          </div>

          {/* DATE AND TIMER */}

          <div className="mb-10 flex flex-wrap items-center justify-between gap-5 border-y border-white/10 py-6">

            <div>
              <p className="text-xs uppercase tracking-widest text-white/35">
                Today's challenge
              </p>

              <p className="mt-2 text-sm text-white/80">
                {day || "Loading..."} · UTC
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs uppercase tracking-widest text-white/35">
                {timeLabel}
              </p>

              <p
                className={`mt-2 text-3xl font-black tabular-nums ${
                  timeLeft <= 30000
                    ? "text-[#F4BF61]"
                    : "text-[#CCF28A]"
                }`}
              >
                {formatTime(timeLeft)}
              </p>
            </div>
          </div>

          {/* SHARED PROGRESS */}

          {run && (
            <GameProgress
              completed={run.discoveries.length}
              score={total}
              finished={run.phase === "done"}
            />
          )}

          {/* SHARED GAME PANEL */}

          <GamePanel>
            <div className="px-6 py-10 sm:px-10 sm:py-12">

              {/* LOADING */}

              {loading ? (
                <div className="py-16 text-center">
                  <div className="mb-6 text-4xl text-[#CCF28A]">
                    ✳
                  </div>

                  <h2 className="text-xl font-bold">
                    Preparing today's challenge...
                  </h2>

                  <p className="mt-3 text-sm text-white/45">
                    Finding five questions for today.
                  </p>
                </div>
              ) : !run ? (

                /* PRE-GAME */

                <div className="py-6 text-center sm:py-10">

                  <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#CCF28A]/25 bg-[#CCF28A]/10 text-3xl text-[#CCF28A]">
                    ✳
                  </div>

                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#CCF28A]">
                    Ready when you are
                  </p>

                  <h2 className="mt-5 text-3xl font-black tracking-tight">
                    One chance to go obscure.
                  </h2>

                  <p className="mx-auto mt-6 max-w-md text-sm leading-8 text-white/55">
                    Five word challenges. Three minutes
                    of guessing time. Your first valid
                    answer to each question is final.
                  </p>

                  <p className="mx-auto mt-4 max-w-md text-xs leading-6 text-white/35">
                    The clock pauses during score reveals.
                    Leaving during a question does not pause it.
                  </p>

                  <button
                    onClick={start}
                    disabled={prompts.length !== 5}
                    className={`${primaryButton} mx-auto mt-10 max-w-[340px]`}
                  >
                    START TODAY'S DIVE →
                  </button>

                  {error && (
                    <p className="mt-6 text-sm text-[#F4BF61]">
                      {error}
                    </p>
                  )}
                </div>

              ) : run.phase === "done" ? (

                /* FINISHED RESULTS */

                <div className="py-3 sm:py-6">

                  <div className="text-center">

                    <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#CCF28A]/25 bg-[#CCF28A]/10 text-3xl text-[#CCF28A]">
                      ✳
                    </div>

                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#CCF28A]">
                      {completed
                        ? "Five for five"
                        : "Dive finished"}
                    </p>

                    <h2 className="mt-5 text-3xl font-black tracking-[-0.045em] sm:text-4xl">
                      {completed
                        ? "Nicely discovered."
                        : "Your dive has ended."}
                    </h2>

                    <p className="mt-4 text-sm text-white/45">
                      {run.discoveries.length} of 5 questions completed
                    </p>

                    <div className="my-10 flex items-baseline justify-center gap-2">
                      <span className="text-7xl font-black tracking-[-0.07em] text-[#CCF28A] sm:text-8xl">
                        {total}
                      </span>

                      <span className="text-lg text-white/30">
                        / 500
                      </span>
                    </div>
                  </div>

                  {/* ANSWER HISTORY */}

                  <div className="rounded-xl border border-white/10 bg-white/[0.025] px-5 sm:px-7">

                    {run.discoveries.map((item, index) => (
                      <DiscoveryRow
                        key={`${item.word}-${index}`}
                        index={index}
                        word={item.word}
                        rarity={item.rarity}
                        subtitle={item.prompt}
                      />
                    ))}

                    {run.discoveries.length === 0 && (
                      <p className="py-8 text-center text-sm text-white/45">
                        No discoveries recorded today.
                      </p>
                    )}
                  </div>

                  <RarityReport answers={run.discoveries} total={total} mode="daily" />

                  <button
                    onClick={shareResults}
                    className={`${primaryButton} mt-9`}
                  >
                    {copied
                      ? "COPIED!"
                      : "SHARE YOUR RESULTS ↗"}
                  </button>

                  {error && (
                    <p className="mt-5 text-center text-sm text-[#F4BF61]">
                      {error}
                    </p>
                  )}

                  <p className="mt-7 text-center text-xs text-white/35">
                    Come back tomorrow for a new Daily Dive.
                  </p>
                </div>

              ) : run.phase === "reveal" && latestDiscovery ? (

                /* DISCOVERY REVEAL */

                <div className="py-8 text-center sm:py-12">

                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#CCF28A]">
                    Discovery {run.round + 1} / 5
                  </p>

                  <div className="mx-auto mt-10 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#CCF28A]/25 bg-[#CCF28A]/10 text-3xl text-[#CCF28A]">
                    ✳
                  </div>

                  <h2 className="mt-9 break-words text-4xl font-black capitalize tracking-[-0.05em] sm:text-5xl">
                    {latestDiscovery.word}
                  </h2>

                  <RarityReveal answer={latestDiscovery} />

                  <p className="mt-10 text-sm text-white/45">
                    Clock paused · {formatTime(run.remainingMs)} remaining
                  </p>

                  <button
                    onClick={continueRun}
                    className={`${primaryButton} mx-auto mt-8 max-w-[360px]`}
                  >
                    {run.round === 4
                      ? "SEE FINAL RESULTS →"
                      : "NEXT QUESTION →"}
                  </button>
                </div>

              ) : (

                /* ACTIVE QUESTION */

                <div className="py-3 sm:py-6">

                  <p className="text-center text-xs font-bold uppercase tracking-[0.25em] text-[#CCF28A]">
                    The word laboratory
                  </p>

                  <h2 className="mx-auto mt-12 max-w-[600px] text-center text-3xl font-black leading-[1.25] tracking-[-0.045em] sm:text-4xl">
                    {currentChallenge?.title}
                  </h2>

                  <form
                    onSubmit={submit}
                    className="mx-auto mt-12 max-w-[560px]"
                  >
                    <label
                      htmlFor="daily-answer"
                      className="mb-3 block text-sm text-white/50"
                    >
                      Your answer
                    </label>

                    <input
                      id="daily-answer"
                      autoFocus
                      value={guess}
                      onChange={(event) =>
                        setGuess(event.target.value)
                      }
                      disabled={busy}
                      maxLength={24}
                      autoComplete="off"
                      placeholder="Think of something obscure..."
                      className="w-full border-b border-white/25 bg-transparent px-1 py-5 text-xl text-white outline-none placeholder:text-white/25 focus:border-[#CCF28A]"
                    />

                    <button
                      type="submit"
                      disabled={
                        busy ||
                        !guess.trim() ||
                        timeLeft <= 0
                      }
                      className={`${primaryButton} mt-8`}
                    >
                      {busy
                        ? "CHECKING..."
                        : "SUBMIT ANSWER →"}
                    </button>
                  </form>

                  {error && (
                    <p
                      role="status"
                      className="mx-auto mt-6 max-w-[560px] text-sm text-[#F4BF61]"
                    >
                      {error}
                    </p>
                  )}

                  <p className="mt-10 text-center text-xs leading-6 text-white/35">
                    Invalid answers don't consume a question.
                    <br />
                    Your first valid answer is final.
                  </p>
                </div>
              )}

            </div>
          </GamePanel>

          {/* FOOTER LINKS */}

          <div className="mt-12 border-t border-white/10 pt-8 text-center">

            <p className="text-sm text-white/45">
              Want to keep playing?
            </p>

            <Link
              href="/words"
              className="mt-3 inline-block text-sm font-bold text-[#CCF28A] transition hover:text-[#E1FFAC]"
            >
              Play Unlimited →
            </Link>

            <div className="mt-8 flex justify-center gap-6 text-xs text-white/35">
              <Link
                href="/"
                className="hover:text-white"
              >
                Home
              </Link>

              <Link
                href="/arcade"
                className="hover:text-white"
              >
                Arcade
              </Link>
            </div>
          </div>

        </section>
      </div>
    </main>
  );
}
