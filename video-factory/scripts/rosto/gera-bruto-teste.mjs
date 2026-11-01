#!/usr/bin/env node
// Gravação de teste para o molde "rosto" sem precisar do Markus na frente da
// câmera: cartela com cronômetro grande (nunca rosto gerado por IA) e áudio de
// frases do Nassif separadas por silêncios de tamanhos variados, com uma frase
// repetida para simular o erro regravado. Serve para provar corte, legenda e mix.
// Uso: node scripts/rosto/gera-bruto-teste.mjs [saida.mp4] [--girado]
//   --girado grava 1920x1080 com rotação de 90° nos metadados, como o iPhone.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { decode, writeWav, SR, tmp } from "../lib/audio.mjs";

const args = process.argv.slice(2);
const saida = resolve(args.find((a) => !a.startsWith("--")) || join(process.env.HOME, "Movies/vyzon-film/brutos/teste-rosto.mp4"));
const girado = args.includes("--girado");
const voz = join(process.env.HOME, "Movies/vyzon-film/voz/aparadas");
// [arquivo, silêncio depois (s)]
const roteiro = [["L1-t1.wav", 0.9], ["L2-t2.wav", 1.4], ["L4-t2.wav", 0.6], ["L4-t2.wav", 0.5], ["L5-t2.wav", 2.1], ["L6-t1.wav", 0.8]];
const partes = []; let n = Math.round(0.7 * SR);
for (const [f, pausa] of roteiro) { const s = decode(join(voz, f)); partes.push([n, s]); n += s[0].length + Math.round(pausa * SR); }
const L = new Float32Array(n), R = new Float32Array(n);
// ruído de sala baixo (-58 dBFS) para o detector não ver silêncio digital
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 2;
for (let i = 0; i < n; i++) { const r = rnd() * 0.0013; L[i] = r; R[i] = r; }
for (const [i0, [a, b]] of partes) for (let i = 0; i < a.length; i++) { L[i0 + i] += a[i]; R[i0 + i] += b[i]; }
const dur = n / SR, d = tmp();
writeWav(join(d, "a.wav"), [L, R]);

// cartela: papel, cronômetro e uma barra que anda (o corte fica visível na folha)
const proj = join(d, "cartela"); mkdirSync(proj);
const [W, H] = girado ? [1920, 1080] : [1080, 1920];
writeFileSync(join(proj, "index.html"), `<!doctype html><html><head><meta charset="utf-8">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js"></script>
<style>html,body{margin:0;width:${W}px;height:${H}px;background:#dfe3ea;font-family:Menlo,monospace;overflow:hidden}
#t{position:absolute;left:0;right:0;top:${H / 2 - 160}px;text-align:center;font-size:${girado ? 200 : 220}px;color:#0d1421}
#s{position:absolute;left:0;right:0;top:${H / 2 + 80}px;text-align:center;font-size:44px;color:#4a5363}
#b{position:absolute;left:0;top:${H - 140}px;height:40px;width:${W}px;background:#1556c0;transform-origin:0 50%}</style></head>
<body><div id="root" data-composition-id="root" data-start="0" data-duration="${dur.toFixed(3)}" data-width="${W}" data-height="${H}">
<div id="t">0.00</div><div id="s">GRAVAÇÃO DE TESTE · sem rosto</div><div id="b"></div></div>
<script>const tl=gsap.timeline({paused:true});const o={v:0};
tl.fromTo(o,{v:0},{v:${dur.toFixed(3)},duration:${dur.toFixed(3)},ease:"none",onUpdate:()=>document.getElementById("t").textContent=o.v.toFixed(2)},0);
tl.fromTo("#b",{scaleX:0},{scaleX:1,duration:${dur.toFixed(3)},ease:"none"},0);
window.__timelines=window.__timelines||{};window.__timelines.root=tl;</script></body></html>`);
execFileSync("hyperframes", ["render", ".", "--quality", "draft", "--fps", "30", "--output", join(d, "v.mp4")], { cwd: proj, stdio: "ignore" });
mkdirSync(dirname(saida), { recursive: true });
const rot = girado ? ["-display_rotation", "-90"] : [];
execFileSync("ffmpeg", ["-v", "error", "-y", ...rot, "-i", join(d, "v.mp4"), "-i", join(d, "a.wav"), "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", saida]);
rmSync(d, { recursive: true, force: true });
console.log(`${saida} · ${dur.toFixed(2)} s · ${W}x${H}${girado ? " com rotação -90° (vira 1080x1920 na tela)" : ""}`);
console.log("falas: L1, pausa 0,9 · L2, pausa 1,4 · L4, pausa 0,6 · L4 repetida, pausa 0,5 · L5, pausa 2,1 · L6");
