"use client";

import { useEffect, useState } from "react";

const specimens=[
  {word:"susurrus",definition:"A soft whispering or rustling sound.",tier:"A QUIET DISCOVERY"},
  {word:"apricity",definition:"The warmth of sunlight on a cold day.",tier:"AN UNEXPECTED WORD"},
  {word:"palimpsest",definition:"Something bearing traces of an earlier version.",tier:"A LAYERED MEANING"},
  {word:"halcyon",definition:"Calm, peaceful, and untroubled.",tier:"A WORD TO KEEP"},
];
export default function RaritySpecimen(){
  const [index,setIndex]=useState(0);
  const [revealed,setRevealed]=useState(false);
  const [nonce,setNonce]=useState(0);
  useEffect(()=>{setRevealed(false);const id=window.setTimeout(()=>setRevealed(true),250);return()=>window.clearTimeout(id);},[index,nonce]);
  const item=specimens[index];
  return <section className="specimen-section" aria-label="Explore curious words">
    <div className="specimen-intro"><span className="specimen-kicker">THE LIVING LEXICON / 001</span><h2>There is more to a word.</h2><p>Some words hide entire worlds inside them. Turn a page and uncover another.</p></div>
    <div className={`specimen-card ${revealed?"is-revealed":""}`}>
      <div className="specimen-top"><span>THE WORD COLLECTION</span><span>NO. {String(index+1).padStart(3,"0")}</span></div>
      <div className="specimen-sigil" aria-hidden="true"><span>✳</span></div>
      <p className="specimen-tier">{item.tier}</p>
      <h3 key={item.word}>{item.word}</h3>
      <p className="specimen-definition">{item.definition}</p>
      <div className="specimen-bottom"><span>Discover language beyond the obvious</span><button type="button" onClick={()=>{setIndex(i=>(i+1)%specimens.length);setNonce(n=>n+1);}} aria-label="Reveal another interesting word">ANOTHER WORD <span aria-hidden="true">↗</span></button></div>
    </div>
    <p className="specimen-note">These are vocabulary specimens, not game scores. In-game rarity is calculated from each prompt's valid answers.</p>
  </section>;
}
