
import Link from "next/link";
import type { Metadata } from "next";
import HomeAmbient from "../components/home-ambient";
import HeroHeadline from "../components/hero-headline";
import "./home-ambient.css";

export const metadata: Metadata = {
  title: "Play Obscure — How Obscure Can You Get?",
  description:
    "Five prompts. Five answers. Discover rare words and unexpected knowledge in Play Obscure.",
};

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#101718] text-[#F0F2EA]">
      {/* Animated blue/purple ambience, isolated to the homepage. */}
      <HomeAmbient />

      <div className="relative mx-auto max-w-[1200px] px-6 sm:px-10">
        {/* Navigation */}
        <header className="flex min-h-[88px] items-center justify-between gap-4 border-b border-white/10">
          <Link
            href="/"
            className="text-[29px] font-black tracking-[-0.08em]"
          >
            obscure<span className="text-[#CCF28A]">.</span>
          </Link>

          <nav className="flex items-center gap-5 text-sm sm:gap-8">
            <Link
              href="/words"
              className="text-white/65 transition hover:text-white"
            >
              Words
            </Link>
            <Link
              href="/arcade"
              className="text-white/65 transition hover:text-white"
            >
              Arcade
            </Link>
          </nav>
        </header>

        {/* Above-the-fold game invitation */}
        <section className="relative flex min-h-[calc(100svh-88px)] flex-col items-center justify-center py-20 text-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[350px] w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#CCF28A]/[0.045] blur-[85px]"
          />

          <div className="relative flex max-w-[850px] flex-col items-center">
            <div className="mb-10 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#B8D49E]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#CCF28A]" />
              A game of unexpected answers
            </div>

            <HeroHeadline />

            <p className="mt-9 max-w-[490px] text-base leading-8 text-[#A5B8AB] sm:text-lg">
              Five prompts. Five answers.
              <br />
              The less obvious your answers, the better.
            </p>

            <Link
              href="/daily"
              className="group mt-12 flex min-h-[74px] w-full max-w-[300px] items-center justify-center gap-5 rounded-xl bg-[#CCF28A] px-10 text-lg font-black tracking-[-0.01em] text-[#162218] shadow-[0_15px_60px_rgba(204,242,138,0.12)] transition duration-200 hover:-translate-y-1 hover:bg-[#E1FFAD] hover:shadow-[0_20px_80px_rgba(204,242,138,0.2)] active:translate-y-0"
            >
              PLAY NOW
              <span className="text-2xl transition group-hover:translate-x-1">
                →
              </span>
            </Link>
            <div className="mt-4 grid w-full max-w-[300px] grid-cols-2 gap-3">
  <Link
    href="/words"
    className="flex min-h-12 items-center justify-center rounded-lg border border-white/20 px-3 text-center text-sm font-semibold text-white/75 transition hover:border-[#CCF28A]/60 hover:text-[#CCF28A]"
  >
    Play Unlimited
  </Link>

  <Link
    href="/arcade"
    className="flex min-h-12 items-center justify-center rounded-lg border border-white/20 px-3 text-center text-sm font-semibold text-white/75 transition hover:border-[#CCF28A]/60 hover:text-[#CCF28A]"
  >
    Play Extra
  </Link>
</div>

            <p className="mt-5 text-xs text-[#82978A]">
              One daily attempt · 3 minutes · Free to play
            </p>

            <Link
              href="#explore"
              className="mt-14 flex flex-col items-center gap-3 text-xs text-white/35 transition hover:text-white/70"
            >
              Explore more
              <span className="text-xl">↓</span>
            </Link>
          </div>
        </section>

        {/* Other ways to play */}
        <section
          id="explore"
          className="scroll-mt-10 border-t border-white/10 py-20 sm:py-28"
        >
          <div className="mb-12">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-[#CCF28A]">
              More to discover
            </p>

            <h2 className="text-4xl font-bold tracking-[-0.055em] sm:text-5xl">
              Find your kind of obscure.
            </h2>

            <p className="mt-5 max-w-xl text-sm leading-7 text-[#8DA097]">
              Words are only the beginning. Explore rare knowledge
              through different challenges.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Link
              href="/words"
              className="group flex min-h-[290px] flex-col rounded-xl border border-white/10 bg-[#1C2C25] p-8 transition hover:border-[#CCF28A]/45 sm:p-10"
            >
              <span className="text-4xl font-semibold tracking-[-0.07em] text-[#CCF28A]">
                Aa.
              </span>

              <div className="mt-auto">
                <h3 className="text-3xl font-bold tracking-[-0.05em]">
                  Obscure Words
                </h3>
                <p className="mt-4 max-w-xs text-sm leading-7 text-[#A2BAAB]">
                  Endless vocabulary challenges. How many
                  unusual words can you remember?
                </p>

                <div className="mt-7 flex items-center justify-between border-t border-white/10 pt-5">
                  <span className="text-xs text-[#A5BBAB]">
                    Unlimited mode
                  </span>
                  <span className="text-xl text-[#CCF28A] transition group-hover:translate-x-1">
                    ↗
                  </span>
                </div>
              </div>
            </Link>

            <Link
              href="/arcade"
              className="group flex min-h-[290px] flex-col rounded-xl border border-white/10 bg-[#1A272D] p-8 transition hover:border-[#9BC8DC]/45 sm:p-10"
            >
              <span className="text-4xl text-[#A2D9E4]">◈</span>

              <div className="mt-auto">
                <h3 className="text-3xl font-bold tracking-[-0.05em]">
                  The Arcade
                </h3>
                <p className="mt-4 max-w-xs text-sm leading-7 text-[#9CB5BD]">
                  Marine life, rarity climbs, obscure creatures,
                  and six experimental game modes.
                </p>

                <div className="mt-7 flex items-center justify-between border-t border-white/10 pt-5">
                  <span className="text-xs text-[#9CB5BD]">
                    Six game modes
                  </span>
                  <span className="text-xl text-[#A2D9E4] transition group-hover:translate-x-1">
                    ↗
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* Next feature */}
        <section className="grid gap-12 border-t border-white/10 py-20 sm:py-28 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.25em] text-[#CCF28A]">
              Coming soon
            </p>

            <h2 className="text-4xl font-bold tracking-[-0.055em] sm:text-5xl">
              The Daily Dive.
            </h2>

            <p className="mt-6 max-w-lg text-base leading-8 text-[#A5B8AB]">
              One new challenge each day. Five questions.
              One scored attempt.
            </p>

            <p className="mt-4 max-w-md text-sm leading-7 text-[#80988B]">
              Everyone plays the same questions. Return tomorrow
              to discover something new.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 p-7 sm:p-10">
            <div className="mb-8 flex items-center justify-between gap-3">
              <span className="text-xs uppercase tracking-[0.18em] text-[#A7B8AC]">
                The Daily Dive
              </span>
              <span className="text-xs text-[#CCF28A]">
                In development
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className="flex aspect-square items-center justify-center rounded-lg border border-white/10 bg-white/[0.025] text-xl font-bold text-white/35"
                >
                  {n}
                </div>
              ))}
            </div>

            <p className="mt-8 text-center text-xs text-[#81978A]">
              A fresh set of five, every day.
            </p>
          </div>
        </section>

        {/* Future player features */}
        <section className="border-t border-white/10 py-16 sm:py-20">
          <div className="flex flex-wrap items-center justify-between gap-8">
            <div>
              <h2 className="text-2xl font-bold tracking-[-0.04em]">
                Your discoveries matter.
              </h2>

              <p className="mt-3 max-w-lg text-sm leading-7 text-[#81978A]">
                Personal records, achievements, daily streaks,
                and First Discoverer titles are on our roadmap.
              </p>
            </div>

            <span className="rounded-full border border-white/15 px-4 py-2 text-xs text-white/45">
              More coming soon
            </span>
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-5 border-t border-white/10 py-9">
          <Link
            href="/"
            className="text-xl font-black tracking-[-0.075em]"
          >
            obscure<span className="text-[#CCF28A]">.</span>
          </Link>

          <p className="text-xs text-[#71897B]">
            The obvious is only the beginning.
          </p>

          <div className="flex gap-6 text-xs text-[#9AAB9E]">
            <Link href="/words" className="hover:text-white">
              Words
            </Link>
            <Link href="/arcade" className="hover:text-white">
              Arcade
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
