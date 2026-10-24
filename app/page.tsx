import GameAtmosphere from "@/components/game/GameAtmosphere";
import Link from "next/link";
import type { Metadata } from "next";
import FluidWordmark from "../components/home/FluidWordmark";
import WordDiscovery from "../components/home/WordDiscovery";
import "./obscure-home.css";

export const metadata: Metadata = {
  title: "PlayObscure — Find the unexpected",
  description: "Five prompts. Five answers. Chase rare words in PlayObscure's daily and unlimited word games.",
};

export default function HomePage() {
  return (
    <main className="po-home" id="top">
      <GameAtmosphere mode="ambient" />
      <div className="po-ambient" aria-hidden="true"><i /><i /><i /></div>
      <div className="po-shell">
        <header className="po-nav">
          <Link href="/" className="po-logo" aria-label="PlayObscure home">obscure<span>.</span></Link>
          <nav aria-label="Main navigation">
            <Link href="/daily">Daily</Link>
            <Link href="/words">Unlimited</Link>
            <Link href="/arcade">Arcade</Link>
          </nav>
          <Link href="/daily" className="po-navPlay">PLAY NOW <span aria-hidden="true">↗</span></Link>
        </header>

        <section className="po-hero" aria-labelledby="po-hero-subtitle">
          <div className="po-heroAura" aria-hidden="true" />
          
          <FluidWordmark />
          <h2 className="po-subtitle" id="po-hero-subtitle">How obscure can you get?</h2>
          <p className="po-heroCopy">Five prompts. Five answers.<br />The less obvious your answers, the better.</p>
          <div className="po-heroActions">
            <Link className="po-primaryButton" href="/daily">PLAY DAILY <span aria-hidden="true">↗</span></Link>
            <Link className="po-secondaryButton" href="/words">PLAY UNLIMITED <span aria-hidden="true">→</span></Link>
          </div>
          <p className="po-heroNote">No signup. Just words, intuition, and a little imagination.</p>
          <Link href="#discover" className="po-scrollCue">EXPLORE THE UNKNOWN <span aria-hidden="true">↓</span></Link>
        </section>

        <section className="po-modes" id="discover" aria-labelledby="po-modes-title">
          <div className="po-sectionIntro">
            <span className="po-eyebrow">01 / CHOOSE YOUR GAME <span className="po-eyebrowLine" /></span>
            <h2 id="po-modes-title">An invitation<br /><em>to think differently.</em></h2>
            <p>Every prompt has an obvious answer. The fun starts when you ignore it.</p>
          </div>
          <div className="po-modeGrid">
            <Link href="/daily" className="po-modeCard po-dailyCard">
              <span className="po-cardNumber">01 / THE DAILY</span>
              <span className="po-cardArt" aria-hidden="true"><i /><i /><i /><i /><i /></span>
              <div className="po-cardBody"><h3>One day.<br />One attempt.</h3><p>Five shared prompts. A fresh challenge every day. Make each answer count.</p></div>
              <span className="po-cardBottom">ENTER THE DAILY <span aria-hidden="true">↗</span></span>
            </Link>
            <Link href="/words" className="po-modeCard po-unlimitedCard">
              <span className="po-cardNumber">02 / UNLIMITED</span>
              <span className="po-cardRings" aria-hidden="true"><i /><i /><i /></span>
              <div className="po-cardBody"><h3>There's always<br />another word.</h3><p>Keep playing, find unlikely answers, and chase a new personal best.</p></div>
              <span className="po-cardBottom">PLAY UNLIMITED <span aria-hidden="true">↗</span></span>
            </Link>
          </div>
          <Link href="/arcade" className="po-arcadeLink"><span>WANT SOMETHING DIFFERENT?</span><strong>Explore the Arcade</strong><span aria-hidden="true">↗</span></Link>
        </section>

        <WordDiscovery />

        <section className="po-finalCall" aria-label="Begin playing">
          <span className="po-eyebrow">THE OBVIOUS IS ONLY THE BEGINNING</span>
          <h2>Your next answer<br /><em>might surprise you.</em></h2>
          <Link href="/daily" className="po-primaryButton">LET'S PLAY <span aria-hidden="true">↗</span></Link>
        </section>

        <footer className="po-footer">
          <Link href="/" className="po-logo">obscure<span>.</span></Link>
          <span>Find the unexpected. © 2026 PlayObscure</span>
          <div><Link href="/daily">Daily</Link><Link href="/words">Unlimited</Link><Link href="/arcade">Arcade</Link></div>
        </footer>
      </div>
    </main>
  );
}
