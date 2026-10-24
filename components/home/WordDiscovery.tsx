"use client";

import { useState } from "react";

const entries = [
  { word: "susurrus", kind: "noun", meaning: "A soft whispering or rustling sound.", note: "A word that practically sounds like its meaning." },
  { word: "apricity", kind: "noun", meaning: "The warmth of the sun on a cold day.", note: "An old, wonderfully specific English word." },
  { word: "palimpsest", kind: "noun", meaning: "Something bearing traces of earlier versions.", note: "A reminder that language holds layers of history." },
  { word: "halcyon", kind: "adjective", meaning: "Calm, peaceful, and untroubled.", note: "Often used for idyllic days remembered fondly." },
];

export default function WordDiscovery() {
  const [index, setIndex] = useState(0);
  const entry = entries[index];
  return (
    <section className="po-discovery" aria-labelledby="po-discovery-heading">
      <div className="po-discoveryText">
        <span className="po-eyebrow">THE ART OF FINDING WORDS <span className="po-eyebrowLine" /></span>
        <h2 id="po-discovery-heading">Rare words.<br/><em>Real discoveries.</em></h2>
        <p>Compete for an unusual answer, then learn something worth remembering. PlayObscure is a game about the words you almost never get to use.</p>
      </div>
      <div className="po-discoveryCard" aria-live="polite">
        <div className="po-discoveryTop"><span>THE WORD ARCHIVE</span><span>0{index + 1} / 0{entries.length}</span></div>
        <div className="po-discoveryOrb" aria-hidden="true"><span>✳</span></div>
        <div className="po-discoveryInfo" key={entry.word}>
          <span className="po-wordClass">{entry.kind}</span>
          <h3>{entry.word}</h3>
          <p>{entry.meaning}</p>
          <small>{entry.note}</small>
        </div>
        <div className="po-discoveryBottom">
          <span>CURIOUS? THERE'S MORE.</span>
          <button type="button" onClick={() => setIndex(i => (i + 1) % entries.length)}>
            NEXT WORD <span aria-hidden="true">↗</span>
          </button>
        </div>
      </div>
    </section>
  );
}
