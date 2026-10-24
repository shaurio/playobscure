"use client";

import { useEffect, useRef, useState } from "react";
import "./hero-headline.css";

const VERTEX = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const FRAGMENT = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uMask;
uniform float uTime;
uniform vec2 uMouse;
uniform float uHover;
uniform float uAspect;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}
float fbm(vec2 p) {
  float n = 0.0;
  n += 0.53 * noise(p); p = p * 2.07 + 8.2;
  n += 0.27 * noise(p); p = p * 2.03 - 3.7;
  n += 0.13 * noise(p); p *= 2.1;
  n += 0.07 * noise(p);
  return n;
}
vec3 spectral(float p) {
  vec3 c = 0.52 + 0.48*cos(6.2831853*(p + vec3(0.0, 0.30, 0.64)));
  return c;
}
void main() {
  vec2 uv = vUv;
  vec2 p = vec2(uv.x*uAspect, uv.y);
  float t = uTime * 0.25;
  vec2 pointer = vec2(uMouse.x*uAspect, uMouse.y);
  vec2 delta = p - pointer;
  float dist = length(delta);
  float influence = exp(-dist*dist*18.0) * uHover;
  float ripple = sin(dist*39.0 - uTime*8.5) * influence;

  float flow = fbm(p*3.4 + vec2(t*0.55, -t*0.26));
  float flow2 = fbm(p*5.8 + vec2(-t*0.35, t*0.40) + flow*2.2);
  vec2 warp = vec2(flow2-0.5, flow-0.5)*0.045;
  warp += (delta / max(dist, 0.09)) * ripple * 0.007;
  vec2 wuv = uv + vec2(warp.x/max(uAspect,0.2),warp.y);

  float baseMask = texture2D(uMask, uv).a;
  float warpedMask = texture2D(uMask, wuv).a;
  float coverage = max(baseMask*0.97, warpedMask*0.72);
  if (coverage < 0.005) discard;

  // Long liquid-metal folds: high-frequency bands broken up by flowing noise.
  float folds = sin(p.x*21.0 + p.y*10.0 + flow*11.0 + flow2*5.0 - t*2.0);
  float fine = sin(p.x*45.0 - p.y*18.0 + flow2*17.0 + t*3.5);
  float polished = pow(abs(folds), 15.0);
  float filament = pow(max(fine,0.0), 20.0);
  float broad = smoothstep(-0.9, 0.95, folds);
  float liquidShade = 0.035 + 0.23*broad + 0.58*polished + 0.22*filament;

  float hue = flow2*0.95 + p.x*0.30 + 0.09*sin(p.y*12.0+flow*7.0+t);
  vec3 rainbow = spectral(hue);
  vec3 chrome = mix(vec3(0.018,0.024,0.040), vec3(0.38,0.52,0.71), broad);
  chrome += rainbow * (0.21 + 0.57*polished + 0.24*filament);
  chrome += vec3(0.76, 0.82, 0.96)*polished*0.64;
  chrome += vec3(0.18, 0.23, 0.31)*liquidShade;
  chrome += vec3(0.44,0.58,0.78)*influence*0.19;
  chrome = clamp(chrome, 0.0, 1.0);

  // Thin, bright edge reflections, not a fuzzy glow.
  float edge = clamp((baseMask-texture2D(uMask, uv+vec2(0.0017,0.0025)).a)*5.0, 0.0, 1.0);
  chrome += vec3(0.48,0.65,0.86)*edge*0.30;
  gl_FragColor = vec4(chrome, coverage);
}`;

function shader(gl: WebGLRenderingContext, type: number, source: string) {
  const item = gl.createShader(type);
  if (!item) throw new Error("Unable to create WebGL shader");
  gl.shaderSource(item, source);
  gl.compileShader(item);
  if (!gl.getShaderParameter(item, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(item);
    gl.deleteShader(item);
    throw new Error(error || "Unable to compile shader");
  }
  return item;
}

export default function HeroHeadline() {
  const root = useRef<HTMLHeadingElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pointer = useRef({ x: 0.5, y: 0.5, hover: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const node = root.current;
    const surface = canvas.current;
    if (!node || !surface || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const gl = surface.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: true });
    if (!gl) return;
    let frame = 0;
    let active = true;
    let visible = true;
    let program: WebGLProgram | null = null;
    let texture: WebGLTexture | null = null;
    let buffer: WebGLBuffer | null = null;
    let last = 0;
    const started = performance.now();

    function redrawText() {
      if (!gl || !node || !surface) return;
      const rect = node.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      surface.width = Math.round(rect.width * dpr);
      surface.height = Math.round(rect.height * dpr);
      const textCanvas = document.createElement("canvas");
      textCanvas.width = surface.width;
      textCanvas.height = surface.height;
      const ctx = textCanvas.getContext("2d");
      if (!ctx || !texture) return;
      const styles = getComputedStyle(node);
      const size = parseFloat(styles.fontSize) * dpr;
      ctx.font = `${styles.fontWeight} ${size}px ${styles.fontFamily}`;
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const mid = textCanvas.width / 2;
      const spacing = size * 1.07;
      const cy = textCanvas.height / 2;
      ctx.fillText("How obscure", mid, cy - spacing * 0.52);
      ctx.fillText("can you get?", mid, cy + spacing * 0.48);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textCanvas);
      gl.viewport(0, 0, surface.width, surface.height);
    }

    try {
      program = gl.createProgram();
      if (!program) return;
      const vs = shader(gl, gl.VERTEX_SHADER, VERTEX);
      const fs = shader(gl, gl.FRAGMENT_SHADER, FRAGMENT);
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("WebGL linking failed");
      gl.useProgram(program);
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, "aPosition");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      redrawText();
      setReady(true);
    } catch (error) {
      console.warn("Liquid headline unavailable; showing regular text", error);
      return;
    }

    const uniforms = {
      time: gl.getUniformLocation(program!, "uTime"),
      mouse: gl.getUniformLocation(program!, "uMouse"),
      hover: gl.getUniformLocation(program!, "uHover"),
      aspect: gl.getUniformLocation(program!, "uAspect"),
      mask: gl.getUniformLocation(program!, "uMask"),
    };
    gl.uniform1i(uniforms.mask, 0);

    function draw(now: number) {
      if (!active || !gl || !surface) return;
      frame = requestAnimationFrame(draw);
      if (!visible || now - last < 30) return; // cap around 30 fps
      last = now;
      gl.clearColor(0,0,0,0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uniforms.time, (now-started)/1000);
      gl.uniform2f(uniforms.mouse, pointer.current.x, pointer.current.y);
      gl.uniform1f(uniforms.hover, pointer.current.hover);
      gl.uniform1f(uniforms.aspect, surface.width/surface.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    const resize = new ResizeObserver(redrawText);
    resize.observe(node);
    const observer = new IntersectionObserver((entries) => { visible = entries[0]?.isIntersecting ?? true; });
    observer.observe(node);
    frame = requestAnimationFrame(draw);
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      resize.disconnect();
      observer.disconnect();
      setReady(false);
      if (texture) gl.deleteTexture(texture);
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
    };
  }, []);

  return (
    <h1
      ref={root}
      className={`liquid-chrome-title${ready ? " liquid-chrome-title--ready" : ""}`}
      onPointerMove={(event) => {
        const r = event.currentTarget.getBoundingClientRect();
        pointer.current = { x: (event.clientX-r.left)/r.width, y: 1-(event.clientY-r.top)/r.height, hover: 1 };
      }}
      onPointerLeave={() => { pointer.current.hover = 0; }}
    >
      <span className="liquid-chrome-title__text">How obscure<br />can you get?</span>
      <canvas ref={canvas} className="liquid-chrome-title__canvas" aria-hidden="true" />
    </h1>
  );
}
