
"use client";

import GameAtmosphere from "@/components/game/GameAtmosphere";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { trackGameEvent } from "@/lib/analytics";
import { ScoreReveal } from "@/components/game/ScoreReveal";
import { RarityReport } from "@/components/game/RarityReport";
import { PromptHeading } from "@/components/game/PromptHeading";
import {
  GameHeader,
  GameProgress,
  GamePanel,
  DiscoveryRow,
} from "@/components/game/GameUI";

type Duration = "relaxed" | "300" | "180" | "90";
type Phase = "setup" | "loading" | "playing" | "reveal" | "done";

type Challenge = {
  id?: string;
  title: string;
  label: string;
  tags: string[];
  startsWith?: string;
  contains?: string;
  length?: number;
};

type Discovery = {
  word: string;
  rarity: number;
  rarityPercentile?: number | null;
  tier: number;
  prompt: string;
};

type WordResult = {
  recognized: boolean;
  eligible: boolean | null;
  word: string;
  rarity?: number;
  rarityPercentile?: number | null;
  tier?: number;
};

const fallback: Challenge[] = [
  {
    title: "Name a five-letter word beginning with A",
    label: "FIRST LETTER",
    tags: ["Starts with A", "5 letters"],
    startsWith: "a",
    length: 5,
  },
  {
    title: "Name a word containing X",
    label: "LETTER HUNT",
    tags: ["Contains X"],
    contains: "x",
  },
  {
    title: "Name a seven-letter word",
    label: "LENGTH TEST",
    tags: ["7 letters"],
    length: 7,
  },
  {
    title: "Name a word beginning with Q",
    label: "FIRST LETTER",
    tags: ["Starts with Q"],
    startsWith: "q",
  },
  {
    title: "Name a six-letter word containing Z",
    label: "DOUBLE CONSTRAINT",
    tags: ["6 letters", "Contains Z"],
    length: 6,
    contains: "z",
  },
];

const settings: {
  value: Duration;
  title: string;
  description: string;
}[] = [
  { value: "relaxed", title: "Relaxed", description: "No clock" },
  { value: "300", title: "Casual", description: "5 minutes" },
  { value: "180", title: "Classic", description: "3 minutes" },
  { value: "90", title: "Sprint", description: "90 seconds" },
];

function timeString(ms: number) {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  return `${Math.floor(seconds / 60)}:${String(
    seconds % 60
  ).padStart(2, "0")}`;
}

function rarityGrade(value: number) {
  if (value >= 81)
    return { label: "OBSCURE", color: "#f4bf61" };
  if (value >= 61)
    return { label: "DEEP CUT", color: "#bca6fa" };
  if (value >= 41)
    return { label: "CURIOUS", color: "#77c9cf" };
  if (value >= 21)
    return { label: "FAMILIAR", color: "#a5d7aa" };

  return { label: "COMMON", color: "#9ca7a3" };
}

function bestKey(duration: Duration) {
  return `playobscure:words:best:v3:${duration}`;
}

function displayChallenge(item: {
  id?: string;
  title: string;
  startsWith?: string;
  contains?: string;
  length?: number;
}): Challenge {
  const tags: string[] = [];

  if (item.startsWith)
    tags.push(`Starts with ${item.startsWith.toUpperCase()}`);

  if (item.contains)
    tags.push(`Contains ${item.contains.toUpperCase()}`);

  if (item.length !== undefined)
    tags.push(`${item.length} letters`);

  return {
    ...item,
    label:
      tags.length > 1 ? "DOUBLE CONSTRAINT" : "WORD CHALLENGE",
    tags,
  };
}

const button =
  "inline-flex min-h-14 items-center justify-center " +
  "rounded-xl bg-[#CCF28A] px-7 font-bold text-[#142017] " +
  "transition hover:bg-[#e2ffb1] " +
  "disabled:cursor-not-allowed disabled:opacity-40";

export default function WordsPage() {
  const [duration, setDuration] = useState<Duration>("180");
  const [phase, setPhase] = useState<Phase>("setup");

  const [challenges, setChallenges] =
    useState<Challenge[]>(fallback);

  const [round, setRound] = useState(0);
  const [guess, setGuess] = useState("");
  const [discoveries, setDiscoveries] =
    useState<Discovery[]>([]);

  const [reveal, setReveal] = useState<Discovery | null>(null);

  const [timeLeft, setTimeLeft] = useState(180000);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [best, setBest] = useState<number | null>(null);
  const [newBest, setNewBest] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  const deadlineRef = useRef<number | null>(null);
  const remainingRef = useRef(180000);
  const requestRef = useRef(false);
  const sessionRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const score = discoveries.reduce(
    (sum, d) => sum + d.rarity,
    0
  );

  const activePrompt =
    challenges[Math.min(round, challenges.length - 1)];

  const isTimed = duration !== "relaxed";

  const durationName =
    settings.find((option) => option.value === duration)
      ?.title ?? "Classic";

  // -------------------------------------
  // PERSONAL BESTS
  // -------------------------------------

  useEffect(() => {
    try {
      const stored =
        window.localStorage.getItem(bestKey(duration));

      setBest(
        stored !== null && Number.isFinite(Number(stored))
          ? Number(stored)
          : null
      );
    } catch {
      setBest(null);
    }
  }, [duration]);

  // -------------------------------------
  // TIMER
  // -------------------------------------

  useEffect(() => {
    if (phase !== "playing" || !isTimed) return;

    const tick = () => {
      const deadline = deadlineRef.current;
      if (deadline === null) return;

      const remaining = Math.max(
        0,
        deadline - Date.now()
      );

      remainingRef.current = remaining;
      setTimeLeft(remaining);

      if (remaining === 0) {
        finishRun(true);
      }
    };

    tick();

    const interval = window.setInterval(tick, 200);

    return () => window.clearInterval(interval);
  }, [phase, duration, discoveries]);

  // -------------------------------------
  // FINISH RUN
  // -------------------------------------

  function finishRun(expired = false) {
    deadlineRef.current = null;
    sessionRef.current++;

    requestRef.current = false;
    setBusy(false);

    trackGameEvent("game_complete", "words", { score, answers_count: discoveries.length, timed_out: expired, duration });
    setTimedOut(expired);
    setPhase("done");
    setReveal(null);

    try {
      const previous = Number(
        window.localStorage.getItem(bestKey(duration)) ?? 0
      );

      if (score > previous) {
        window.localStorage.setItem(
          bestKey(duration),
          String(score)
        );

        setBest(score);
        setNewBest(true);
      }
    } catch {
      // Local records are optional.
    }
  }

  // -------------------------------------
  // START GAME AND GET RANDOM PROMPTS
  // -------------------------------------

  const startedOnceRef = useRef(false);

  async function startGame() {
    if (startedOnceRef.current) trackGameEvent("replay_start", "words", { duration });
    startedOnceRef.current = true;
    const session = ++sessionRef.current;

    requestRef.current = false;
    deadlineRef.current = null;

    setRound(0);
    setGuess("");
    setDiscoveries([]);
    setReveal(null);

    setError("");
    setNotice("");
    setNewBest(false);
    setCopied(false);
    setTimedOut(false);

    trackGameEvent("game_start", "words", { duration });
    setPhase("loading");
    setBusy(false);

    try {
      const seed = crypto.randomUUID();

      const response = await fetch(
        `/api/word/prompts?seed=${seed}&count=5`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error("Prompt lookup failed");
      }

      const payload =
        (await response.json()) as {
          prompts?: Challenge[];
        };

      if (
        !Array.isArray(payload.prompts) ||
        payload.prompts.length !== 5
      ) {
        throw new Error("Incomplete prompt set");
      }

      if (session !== sessionRef.current) return;

      setChallenges(
        payload.prompts.map(displayChallenge)
      );
    } catch {
      if (session !== sessionRef.current) return;

      setChallenges(fallback);
      setNotice(
        "The random prompt service was unavailable, so we're using starter questions."
      );
    }

    if (session !== sessionRef.current) return;

    const total =
      duration === "relaxed"
        ? 0
        : Number(duration) * 1000;

    remainingRef.current = total;
    setTimeLeft(total);

    deadlineRef.current = isTimed
      ? Date.now() + total
      : null;

    setPhase("playing");

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  // -------------------------------------
  // SUBMIT ANSWER
  // -------------------------------------

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      phase !== "playing" ||
      requestRef.current ||
      !activePrompt
    ) {
      return;
    }

    const word = guess.trim().toLowerCase();

    if (!/^[a-z]{3,24}$/.test(word)) {
      setError(
        "Please enter an English word of 3–24 letters."
      );
      return;
    }

    if (
      isTimed &&
      (
        deadlineRef.current === null ||
        deadlineRef.current <= Date.now()
      )
    ) {
      finishRun(true);
      return;
    }

    const session = sessionRef.current;

    const params = new URLSearchParams({ word });

    if (activePrompt.startsWith)
      params.set(
        "startsWith",
        activePrompt.startsWith
      );

    if (activePrompt.contains)
      params.set(
        "contains",
        activePrompt.contains
      );

    if (activePrompt.length !== undefined)
      params.set(
        "length",
        String(activePrompt.length)
      );

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
        (await response.json()) as WordResult;

      if (session !== sessionRef.current) return;

      if (
        isTimed &&
        (
          deadlineRef.current === null ||
          Date.now() >= deadlineRef.current
        )
      ) {
        finishRun(true);
        return;
      }

      if (!result.recognized) {
        trackGameEvent("answer_rejected", "words", { reason: "unknown" });
        setError(
          "Not in our vocabulary yet. Try another—no penalty."
        );
        return;
      }

      if (!result.eligible) {
        trackGameEvent("answer_rejected", "words", { reason: "not_eligible" });
        setError(
          "Recognized, but it doesn't satisfy this prompt."
        );
        return;
      }

      if (
        discoveries.some(
          (item) => item.word === result.word
        )
      ) {
        trackGameEvent("answer_rejected", "words", { reason: "duplicate" });
        setError(
          "You've used that word already. Try a different one."
        );
        return;
      }

      if (
        typeof result.rarity !== "number" ||
        typeof result.tier !== "number"
      ) {
        setError(
          "We recognize that word, but can't score it yet."
        );
        return;
      }

      const entry: Discovery = {
        word: result.word,
        rarity: result.rarity,
        rarityPercentile: result.rarityPercentile,
        tier: result.tier,
        prompt: activePrompt.title,
      };

      // Pause the timer on an accepted answer.
      if (
        isTimed &&
        deadlineRef.current !== null
      ) {
        remainingRef.current = Math.max(
          0,
          deadlineRef.current - Date.now()
        );

        setTimeLeft(
          remainingRef.current
        );

        deadlineRef.current = null;
      }

      trackGameEvent("answer_accepted", "words", { score: entry.rarity, question_number: round + 1 });
      setDiscoveries(
        (previous) => [...previous, entry]
      );

      setReveal(entry);
        setGuess("");
      setPhase("reveal");
    } catch {
      if (session === sessionRef.current) {
        setError(
          "Couldn't check your word. Try again."
        );
      }
    } finally {
      if (session === sessionRef.current) {
        requestRef.current = false;
        setBusy(false);
      }
    }
  }

  // -------------------------------------
  // NEXT QUESTION
  // -------------------------------------

  function continueRound() {
    window.dispatchEvent(new Event("playobscure:atmosphere-reset"));
    if (phase !== "reveal") return;

    setReveal(null);
    setError("");

    if (round === challenges.length - 1) {
      setRound(challenges.length);
      finishRun();
      return;
    }

    if (
      isTimed &&
      remainingRef.current <= 0
    ) {
      finishRun(true);
      return;
    }

    setRound((previous) => previous + 1);

    if (isTimed) {
      deadlineRef.current =
        Date.now() + remainingRef.current;
    }

    setPhase("playing");

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  // -------------------------------------
  // SHARE RESULTS
  // -------------------------------------

  async function shareResults() {
    const text = [
      `OBSCURE WORDS · ${durationName}`,
      `Score: ${score}/500`,
      `Discoveries: ${discoveries.length}/5`,
      ...discoveries.map(
        (item, i) =>
          `${i + 1}. ${item.rarity} points`
      ),
      "https://playobscure.com/words",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      trackGameEvent("result_share", "words", { method: "copy" });
      setCopied(true);
    } catch {
      setError("Couldn't copy your results.");
    }
  }

  const grade = reveal
    ? rarityGrade(reveal.rarity)
    : null;

  // -------------------------------------
  // INTERFACE
  // -------------------------------------

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0B100F] px-5 text-[#F0F2EA]">
      <GameAtmosphere />
      <div className="relative z-10 mx-auto max-w-[850px]">

        <GameHeader mode="unlimited" />

        <section className="pb-24 pt-12 sm:pt-18">

          {/* TITLE */}

          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#CCF28A]">
              The word laboratory
            </p>

            <h1 className="mt-5 text-4xl font-black tracking-[-0.065em] sm:text-6xl">
              Obscure Words
              <span className="text-[#CCF28A]">.</span>
            </h1>

            <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-white/50">
              Five prompts. Five discoveries.
              The less obvious, the better.
            </p>
          </div>

          {/* TIMER AND PROGRESS */}

          {phase !== "setup" && (
            <>
              <div className="mb-6 flex items-center justify-between gap-3 border-y border-white/10 py-4 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/40">
                    {durationName} mode
                  </p>

                  <p className="mt-1 text-xs text-white/40">
                    {isTimed
                      ? "Clock pauses on discoveries"
                      : "No time limit"}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs uppercase tracking-widest text-white/40">
                    {phase === "reveal"
                      ? "Time paused"
                      : phase === "done"
                        ? "Time at finish"
                        : "Time remaining"}
                  </p>

                  <p
                    className={`mt-1 text-2xl font-black tabular-nums ${
                      isTimed && timeLeft <= 30000
                        ? "text-[#f4bf61]"
                        : "text-[#CCF28A]"
                    }`}
                  >
                    {isTimed
                      ? timeString(timeLeft)
                      : "∞"}
                  </p>
                </div>
              </div>

              {phase !== "loading" && (
                <GameProgress
                  completed={discoveries.length}
                  score={score}
                  best={best}
                  finished={phase === "done"}
                />
              )}
            </>
          )}

          <GamePanel>
            <div className="px-6 py-10 sm:px-10 sm:py-12">

              {/* GAME SETUP */}

              {phase === "setup" ? (
                <div className="py-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#CCF28A]">
                    Choose your pace
                  </p>

                  <h2 className="mt-5 text-3xl font-bold tracking-tight">
                    Ready to get obscure?
                  </h2>

                  <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-white/50">
                    Five randomized word challenges.
                    Choose a timer, or take as long
                    as you like.
                  </p>

                  <div className="mt-10 grid grid-cols-2 gap-3 text-left sm:grid-cols-4">
                    {settings.map((option) => (
                      <button
                        key={option.value}
                        onClick={() =>
                          setDuration(option.value)
                        }
                        aria-pressed={
                          duration === option.value
                        }
                        className={`rounded-xl border px-3 py-5 transition ${
                          duration === option.value
                            ? "border-[#CCF28A] bg-[#CCF28A]/10"
                            : "border-white/15 bg-white/[0.025] hover:border-white/35"
                        }`}
                      >
                        <span
                          className={`block text-sm font-bold ${
                            duration === option.value
                              ? "text-[#CCF28A]"
                              : "text-white/85"
                          }`}
                        >
                          {option.title}
                        </span>

                        <span className="mt-2 block text-xs text-white/45">
                          {option.description}
                        </span>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={startGame}
                    className={`${button} mt-9 w-full`}
                  >
                    START UNLIMITED →
                  </button>

                  <p className="mt-6 text-xs text-white/35">
                    Your personal best is tracked
                    separately for each time setting.
                  </p>
                </div>

              ) : phase === "loading" ? (

                /* LOADING */

                <div className="py-20 text-center">
                  <p className="text-4xl text-[#CCF28A]">
                    ✳
                  </p>

                  <h2 className="mt-5 text-xl font-bold">
                    Preparing new questions...
                  </h2>
                </div>

              ) : phase === "done" ? (

                /* RESULTS */

                <div className="py-4 text-center">
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#CCF28A]">
                    {timedOut
                      ? "Time's up"
                      : discoveries.length === 5
                        ? "Five for five"
                        : "Run ended"}
                  </p>

                  <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
                    {timedOut
                      ? "That's your final score."
                      : "Nicely discovered."}
                  </h2>

                  <p className="mt-4 text-sm text-white/45">
                    {discoveries.length} of 5
                    questions completed · {durationName}
                  </p>

                  <div className="my-9 text-7xl font-black tracking-tight text-[#CCF28A] sm:text-8xl">
                    {score}
                    <span className="ml-2 text-lg font-medium text-white/30">
                      /500
                    </span>
                  </div>

                  {newBest && (
                    <p className="mb-8 text-sm font-bold text-[#f4bf61]">
                      ✦ NEW PERSONAL BEST
                    </p>
                  )}

                  <div className="rounded-xl border border-white/10 bg-white/[0.025] px-4 text-left sm:px-6">
                    {discoveries.length ? (
                      discoveries.map((entry, i) => (
                        <DiscoveryRow
                          key={`${entry.word}-${i}`}
                          index={i}
                          word={entry.word}
                          rarity={entry.rarity}
                          subtitle={entry.prompt}
                        />
                      ))
                    ) : (
                      <p className="py-7 text-center text-sm text-white/45">
                        No answers recorded this round.
                      </p>
                    )}
                  </div>

                  <RarityReport answers={discoveries} total={score} mode="words" />

                  <div className="mt-8 grid gap-3 sm:grid-cols-2">
                    <button
                      onClick={shareResults}
                      className={button}
                    >
                      {copied
                        ? "COPIED!"
                        : "SHARE RESULTS ↗"}
                    </button>

                    <button
                      onClick={startGame}
                      className="min-h-14 rounded-xl border border-white/20 px-6 font-bold transition hover:bg-white/10"
                    >
                      PLAY NEW QUESTIONS →
                    </button>
                  </div>

                  <button
                    onClick={() => setPhase("setup")}
                    className="mt-6 text-sm text-white/50 underline-offset-4 hover:text-white hover:underline"
                  >
                    Change time setting
                  </button>

                  {error && (
                    <p className="mt-4 text-sm text-[#f4bf61]">
                      {error}
                    </p>
                  )}
                </div>

              ) : phase === "reveal" && reveal && grade ? (

                /* SCORE REVEAL */

                <div
                  className="py-6 text-center"
                  aria-live="polite"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#CCF28A]">
                    Discovery {discoveries.length} / 5
                  </p>

                  <h2 className="mt-9 break-words text-4xl font-black capitalize tracking-tight sm:text-5xl">
                    {reveal.word}
                  </h2>

                  <ScoreReveal answer={reveal} />

                  <p className="mt-5 text-sm text-white/45">
                    {isTimed
                      ? `Clock paused · ${timeString(
                          timeLeft
                        )} remaining`
                      : "Take your time. There's no clock."}
                  </p>

                  <button
                    onClick={continueRound}
                    className={`${button} mt-9 w-full`}
                  >
                    {round === challenges.length - 1
                      ? "SEE FINAL RESULTS →"
                      : "NEXT QUESTION →"}
                  </button>
                </div>

              ) : (

                /* ACTIVE QUESTION */

                <div className="py-3 sm:py-7">
                  <PromptHeading
                    title={activePrompt.title}
                    round={round}
                    label={activePrompt.label}
                    tags={activePrompt.tags}
                  />

                  <form
                    onSubmit={submit}
                    className="mt-10"
                  >
                    <label
                      htmlFor="word-answer"
                      className="mb-3 block text-xs font-semibold uppercase tracking-widest text-white/50"
                    >
                      Your answer
                    </label>

                    <input
                      id="word-answer"
                      ref={inputRef}
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      maxLength={24}
                      disabled={busy}
                      value={guess}
                      onChange={(event) => {
                        setGuess(event.target.value);
                        setError("");
                      }}
                      placeholder="Think of something uncommon..."
                      className="w-full border-b border-white/25 bg-transparent px-1 py-5 text-xl outline-none placeholder:text-white/25 focus:border-[#CCF28A]"
                    />

                    <button
                      type="submit"
                      disabled={busy || !guess.trim()}
                      className={`${button} mt-8 w-full`}
                    >
                      {busy
                        ? "CHECKING..."
                        : "SUBMIT WORD →"}
                    </button>
                  </form>

                  {error && (
                    <p
                      role="status"
                      className="mt-6 text-sm text-[#f4bf61]"
                    >
                      {error}
                    </p>
                  )}

                  <p className="mt-8 text-xs text-white/35">
                    Wrong guesses cost no points.
                    The clock keeps running while you think.
                  </p>

                  {notice && (
                    <p className="mt-4 text-xs text-[#f4bf61]">
                      {notice}
                    </p>
                  )}

                  <button
                    onClick={() => finishRun()}
                    className="mt-8 text-xs text-white/40 underline-offset-4 hover:text-white hover:underline"
                  >
                    End run early
                  </button>
                </div>
              )}
            </div>
          </GamePanel>

          {/* DISCOVERY HISTORY */}

          {phase !== "setup" &&
            phase !== "done" &&
            discoveries.length > 0 && (
              <div className="mt-7 border-t border-white/10 pt-6">
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/45">
                  Your discoveries
                </p>

                <div className="flex flex-wrap gap-2">
                  {discoveries.map((item) => (
                    <span
                      key={item.word}
                      className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/80"
                    >
                      {item.word}{" "}
                      <span className="font-bold text-[#CCF28A]">
                        +{item.rarity}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

          <div className="mt-12 border-t border-white/10 pt-7 text-center text-sm text-white/45">
            Ready for tomorrow's challenge?
            <Link
              href="/daily"
              className="ml-2 font-semibold text-[#CCF28A] hover:underline"
            >
              Daily Dive →
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
