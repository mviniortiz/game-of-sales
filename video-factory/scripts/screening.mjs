#!/usr/bin/env node
// Sala de projeção: o que o ouvido e o olho do revisor precisam conferir em números.
//   - loudness e pico real do master;
//   - silêncios (< -45 dBFS por mais de 0,4 s);
//   - zonas mortas de imagem (> 2,0 s sem mudança visível);
//   - cada efeito do roteiro: atraso do ataque medido em relação à batida
//     (o detector marca o pico ~150 ms depois do início; âncora na batida conta).
// Substitui screening.py. Uso: node scripts/screening.mjs <final.mp4> <roteiro.json>
import { execFileSync } from "node:child_process";
import { decode, SR, rmsEnvelope, gainToDb, measureLoudness, probeDuration } from "./lib/audio.mjs";
import { carregar, tempo, posicionarFalas } from "./lib/roteiro.mjs";
const [video, roteiroArq] = process.argv.slice(2);
const r = carregar(roteiroArq);
const dur = probeDuration(video);
const L = measureLoudness(video);
console.log(`duração ${dur.toFixed(2)} s · ${L.I} LUFS · pico real ${L.TP} dBTP · LRA ${L.LRA}`);
console.log(`  ${L.I >= -14.5 && L.I <= -13.5 ? "ok" : "FORA"} loudness · ${L.TP < -1.5 ? "ok" : "FORA"} pico real`);
const [x] = decode(video, { channels: 1 });
const env = rmsEnvelope(x, 0.05);
let sil = [], ini = null;
env.forEach((v, i) => { const q = gainToDb(v) < -45; if (q && ini == null) ini = i; if (!q && ini != null) { if ((i - ini) * 0.05 > 0.4) sil.push([ini * 0.05, i * 0.05]); ini = null; } });
if (ini != null && (env.length - ini) * 0.05 > 0.4) sil.push([ini * 0.05, env.length * 0.05]);
console.log(`silêncios > 0,4 s: ${sil.length ? sil.map(([a, b]) => `${a.toFixed(2)}–${b.toFixed(2)}`).join(", ") : "nenhum"}`);
// imagem: diferença média entre quadros 54x96 em cinza a 10 qps
const raw = execFileSync("ffmpeg", ["-v", "error", "-i", video, "-r", "10", "-vf", "scale=54:96", "-pix_fmt", "gray", "-f", "image2pipe", "-vcodec", "rawvideo", "pipe:1"], { maxBuffer: 1 << 28 });
const F = 54 * 96, n = Math.floor(raw.length / F);
const mov = [];
for (let k = 1; k < n; k++) { let s = 0; for (let i = 0; i < F; i++) s += Math.abs(raw[k * F + i] - raw[(k - 1) * F + i]); mov.push(s / F); }
let mortas = [], ii = null;
mov.forEach((m, k) => { const parado = m < 0.15; if (parado && ii == null) ii = k; if (!parado && ii != null) { if ((k - ii) / 10 > 2.0) mortas.push([ii / 10, k / 10]); ii = null; } });
if (ii != null && (mov.length - ii) / 10 > 2.0) mortas.push([ii / 10, mov.length / 10]);
console.log(`zonas mortas de imagem > 2 s: ${mortas.length ? mortas.map(([a, b]) => `${a.toFixed(1)}–${b.toFixed(1)}`).join(", ") : "nenhuma"}`);
// efeitos na batida
const flux = []; for (let i = 1; i < env.length; i++) flux.push(Math.max(0, env[i] - env[i - 1]));
console.log("efeitos (âncora → ataque medido):");
for (const s of r.sfx || []) {
    const t = tempo(r, s.beat, 0), ti = Math.round(t / 0.05);
    let best = 0, bi = ti; for (let k = ti - 2; k <= ti + 4; k++) if ((flux[k] || 0) > best) { best = flux[k]; bi = k; }
    const dt = bi * 0.05 - t;
    console.log(`  b${String(s.beat).padEnd(4)} ${t.toFixed(2)} s  ${s.arquivo.padEnd(22)} ataque ${dt >= 0 ? "+" : ""}${(dt * 1000).toFixed(0)} ms ${Math.abs(dt) <= 0.2 ? "na batida" : "CONFERIR"}`);
}
for (const f of posicionarFalas(r)) if (f.empurrao > 0.5) console.log(`  fala ${f.id} empurrada ${f.empurrao}s: encurtar`);
