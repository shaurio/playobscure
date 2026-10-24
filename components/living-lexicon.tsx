"use client";

import { useEffect, useRef } from "react";

const WORDS = ["susurrus", "sonder", "apricity", "petrichor", "liminal", "vellichor", "quixotic", "halcyon", "ineffable", "ephemeral", "palimpsest", "serendipity", "luminous", "threnody", "aurora", "whisper", "obscure", "lexicon"];
type Particle = { x:number;y:number;vx:number;vy:number;word:string;size:number;opacity:number;phase:number };

/** Decorative canvas, intentionally isolated from gameplay and excluded from the accessibility tree. */
export default function LivingLexicon() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha:true });
    if (!context) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(pointer: coarse)");
    let width=1, height=1, raf=0, last=0;
    const pointer={x:-1000,y:-1000};
    const particles:Particle[]=[];
    const resize=()=>{
      const rect=canvas.getBoundingClientRect();
      width=Math.max(1,rect.width);height=Math.max(1,rect.height);
      const ratio=Math.min(window.devicePixelRatio||1,2);
      canvas.width=Math.ceil(width*ratio);canvas.height=Math.ceil(height*ratio);
      context.setTransform(ratio,0,0,ratio,0,0);
      const target=Math.min(coarse.matches?19:40,Math.max(12,Math.floor(width*height/25000)));
      while(particles.length<target){const i=particles.length;particles.push({x:Math.random()*width,y:Math.random()*height,vx:(Math.random()-.5)*.17,vy:-.08-Math.random()*.22,word:WORDS[i%WORDS.length],size:11+Math.random()*13,opacity:.10+Math.random()*.21,phase:Math.random()*6.28});}
      particles.length=target;
    };
    const onMove=(event:PointerEvent)=>{if(event.pointerType!=="touch"){const rect=canvas.getBoundingClientRect();pointer.x=event.clientX-rect.left;pointer.y=event.clientY-rect.top;}};
    const onLeave=()=>{pointer.x=-1000;pointer.y=-1000;};
    const draw=(timestamp:number)=>{
      const dt=Math.min((timestamp-last)/16.67||1,2);last=timestamp;
      context.clearRect(0,0,width,height);
      for(const p of particles){
        if(!reduced.matches){p.x+=p.vx*dt;p.y+=p.vy*dt;p.phase+=.007*dt;
          const dx=p.x-pointer.x,dy=p.y-pointer.y,d2=dx*dx+dy*dy;
          if(d2<190*190&&d2>16){const influence=(1-Math.sqrt(d2)/190)*1.15*dt;p.x+=dx/Math.sqrt(d2)*influence;p.y+=dy/Math.sqrt(d2)*influence;}
          if(p.y < -45) p.y=height+35;if(p.x < -160)p.x=width+100;if(p.x>width+160)p.x=-100;
        }
        context.font=`${p.size}px Georgia, serif`;
        context.fillStyle=`rgba(203,239,188,${p.opacity*(.77+.23*Math.sin(p.phase))})`;
        context.fillText(p.word,p.x,p.y);
      }
      if(!reduced.matches)raf=requestAnimationFrame(draw);
    };
    resize();draw(0);
    const observer=new ResizeObserver(resize);observer.observe(canvas);
    window.addEventListener("pointermove",onMove,{passive:true});
    window.addEventListener("pointerleave",onLeave);
    return()=>{cancelAnimationFrame(raf);observer.disconnect();window.removeEventListener("pointermove",onMove);window.removeEventListener("pointerleave",onLeave);};
  },[]);
  return <div className="lexicon-backdrop" aria-hidden="true"><div className="lexicon-halo"/><canvas ref={canvasRef} className="lexicon-canvas"/><div className="lexicon-fade"/></div>;
}
