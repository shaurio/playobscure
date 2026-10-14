
"use client";

import { useEffect, useState } from "react";

type Question = {
  prompt: string;
  options: string[];
  answer: number;
  fact: string;
};

const questions: Question[] = [
  {
    prompt: "Which animal has three hearts?",
    options: ["Octopus", "Dolphin", "Penguin", "Seahorse"],
    answer: 0,
    fact: "Octopuses have two hearts for their gills and one for their body.",
  },
  {
    prompt: "Which country has the most time zones, including overseas territories?",
    options: ["Russia", "United States", "France", "China"],
    answer: 2,
    fact: "France spans 12 standard time zones through its overseas territories.",
  },
  {
    prompt: "What is the name for the smell after rain?",
    options: ["Petrichor", "Geosmin", "Ozone", "Ambrosia"],
    answer: 0,
    fact: "Petrichor describes the earthy smell associated with rain on dry ground.",
  },
  {
    prompt: "Which element was named after the Greek word for green?",
    options: ["Chromium", "Chlorine", "Cobalt", "Copper"],
    answer: 1,
    fact: "Chlorine takes its name from chloros, referring to its greenish-yellow color.",
  },
  {
    prompt: "Which planet has the shortest day?",
    options: ["Mercury", "Neptune", "Saturn", "Jupiter"],
    answer: 3,
    fact: "Jupiter rotates approximately once every 10 hours.",
  },
  {
    prompt: "What does the word 'sonder' refer to?",
    options: [
      "A type of cloud",
      "The realization that others have complex lives",
      "A forgotten melody",
      "A brief moment of silence",
    ],
    answer: 1,
    fact: "Sonder is a coined word popularized by The Dictionary of Obscure Sorrows.",
  },
];

function utcDay() {
  return new Date().toISOString().slice(0, 10);
}

function dailyQuestions(day: string) {
  const seed = Number(day.replaceAll("-", ""));
  const start = seed % questions.length;
  return Array.from({ length: 5 }, (_, i) =>
    questions[(start + i) % questions.length]
  );
}

export default function Home() {
  const [day, setDay] = useState("");
  const [answers, setAnswers] = useState<number[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const today = utcDay();
    setDay(today);

    try {
      const saved = JSON.parse(
        localStorage.getItem(`obscure-${today}`) || "[]"
      );
      if (
        Array.isArray(saved) &&
        saved.every((v) => Number.isInteger(v) && v >= 0 && v < 4)
      ) {
        setAnswers(saved.slice(0, 5));
      }
    } catch {
      setAnswers([]);
    }
  }, []);

  if (!day) return <main className="min-h-screen bg-[#101014]" />;

  const daily = dailyQuestions(day);
  const index = answers.length;
  const finished = index >= daily.length;
  const score = answers.reduce(
    (total, answer, i) => total + (answer === daily[i].answer ? 100 : 0),
    0
  );

  const selectAnswer = (answer: number) => {
    if (finished) return;
    const next = [...answers, answer];
    setAnswers(next);
    localStorage.setItem(`obscure-${day}`, JSON.stringify(next));
  };

  const share = async () => {
    const result = daily
      .map((q, i) => (answers[i] === q.answer ? "🟩" : "⬛"))
      .join("");

    const text = `OBSCURE · ${day}\n${result}\n${score}/500\nplayobscure.com`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#101014] text-[#f6f4ec]">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl font-black tracking-[-0.07em]">
              obscure<span className="text-[#dbff74]">.</span>
            </h1>
            <p className="mt-1 text-xs tracking-[0.2em] text-white/40 uppercase">
              Knowledge beyond the obvious
            </p>
          </div>
          <div className="rounded-full border border-white/15 px-4 py-2 text-xs text-white/60">
            DAILY CHALLENGE
          </div>
        </header>

        <section className="py-12">
          <p className="mb-3 text-sm font-medium text-[#dbff74]">
            {finished
              ? "CHALLENGE COMPLETE"
              : `QUESTION ${index + 1} OF ${daily.length}`}
          </p>

          <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">
            {finished ? "Nicely played." : "How obscure is your knowledge?"}
          </h2>

          <p className="mt-4 text-white/50">
            {finished
              ? "Your results are ready. Share them with your friends."
              : "Five questions. One daily challenge. No second guesses."}
          </p>
        </section>

        {!finished ? (
          <section className="rounded-3xl border border-white/10 bg-[#1b1b20] p-6 md:p-8">
            <div className="mb-8 flex gap-2">
              {daily.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${
                    i < index ? "bg-[#dbff74]" : "bg-white/10"
                  }`}
                />
              ))}
            </div>

            <h3 className="mb-8 text-2xl font-medium leading-snug">
              {daily[index].prompt}
            </h3>

            <div className="grid gap-3">
              {daily[index].options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => selectAnswer(i)}
                  className="flex w-full cursor-pointer items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-[#dbff74] hover:bg-[#dbff74]/10"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sm font-semibold">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>{option}</span>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-3xl border border-[#dbff74]/30 bg-[#1b1b20] p-8 text-center">
            <p className="text-sm uppercase tracking-widest text-white/40">
              Final score
            </p>
            <p className="my-5 text-7xl font-black tracking-tight text-[#dbff74]">
              {score}
              <span className="text-2xl text-white/30">/500</span>
            </p>

            <div className="my-8 flex justify-center gap-3 text-3xl">
              {daily.map((q, i) => (
                <span key={i}>
                  {answers[i] === q.answer ? "🟩" : "⬛"}
                </span>
              ))}
            </div>

            <button
              onClick={share}
              className="w-full cursor-pointer rounded-xl bg-[#dbff74] px-6 py-4 font-bold text-[#101014] transition hover:bg-[#efffae]"
            >
              {copied ? "Copied!" : "Share results ↗"}
            </button>

            <div className="mt-8 space-y-4 text-left">
              {daily.map((q, i) => (
                <div key={i} className="border-t border-white/10 pt-4">
                  <p className="text-sm font-semibold">
                    {answers[i] === q.answer ? "✓" : "✗"} {q.prompt}
                  </p>
                  <p className="mt-2 text-sm text-[#dbff74]">
                    {q.options[q.answer]}
                  </p>
                  <p className="mt-1 text-sm text-white/50">{q.fact}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-16 border-t border-white/10 pt-6 text-center text-xs text-white/30">
          OBSCURE © 2026 · A LITTLE KNOWLEDGE GOES A LONG WAY
        </footer>
      </div>
    </main>
  );
}
