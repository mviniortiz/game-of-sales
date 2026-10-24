#!/usr/bin/env node
// audiomap: grade de batidas e energia por compasso de uma trilha.
// Substitui o audiomap.py do PC antigo. Uso:
//   node scripts/audiomap.mjs trilha.mp3 [--bpm 123] [-o trilha.audiomap.json]
// Saída: { bpm, beat, offset, beats:[s...], bars:[{t, rms_db}] }. Cole `beats`
// (a partir do ponto de corte) em BEATS no index.html e ancore as cenas em B(k).
import { writeFileSync } from "node:fs";
import { decode, rmsEnvelope, gainToDb } from "./lib/audio.mjs";

const args = process.argv.slice(2);
const file = args[0];
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
if (!file) { console.error("uso: audiomap.mjs <trilha> [--bpm 123] [-o saida.json]"); process.exit(1); }
const sr = 22050;
const [x] = decode(file, { channels: 1, sr });
const dur = x.length / sr;

// Envelope de ataque: energia em quadros de 512 com diferença positiva
// (fluxo de energia), pesando o grave (o bumbo marca a batida na house).
const hop = 256, frame = 1024;
const nF = Math.floor((x.length - frame) / hop);
const flux = new Float32Array(nF);
let lp = 0, prev = 0;
const a = Math.exp(-2 * Math.PI * 150 / sr); // passa-baixa ~150 Hz
const low = new Float32Array(x.length);
for (let i = 0; i < x.length; i++) { lp = a * lp + (1 - a) * x[i]; low[i] = lp; }
for (let f = 0; f < nF; f++) {
    let e = 0;
    for (let i = f * hop; i < f * hop + frame; i++) e += low[i] * low[i] + 0.25 * x[i] * x[i];
    e = Math.log1p(e * 100);
    flux[f] = Math.max(0, e - prev); prev = e;
}
const fps = sr / hop;

// BPM: o informado ou o melhor entre 90 e 160 por autocorrelação do fluxo.
let bpm = Number(opt("--bpm", 0));
if (!bpm) {
    let best = 0;
    for (let b = 90; b <= 160; b += 0.25) {
        const lag = 60 / b * fps; let s = 0;
        for (let f = 0; f + lag < nF; f++) s += flux[f] * flux[Math.round(f + lag)];
        if (s > best) { best = s; bpm = b; }
    }
}
// Andamento fino + fase juntos: a grade (bpm, fase) que mais soma ataque de
// grave na faixa inteira. Numa faixa de 2 min, 1 BPM de erro já desloca a
// grade em meia batida no fim, então a busca é em passos de 0,01 BPM.
function gridScore(b, o) {
    const bt = 60 / b; let s = 0;
    for (let t = o; t < dur; t += bt) { const f = Math.round(t * fps); s += (flux[f] || 0) + 0.5 * ((flux[f - 1] || 0) + (flux[f + 1] || 0)); }
    return s;
}
let offset = 0, bestS = -1, bestB = bpm;
for (let b = bpm - 2; b <= bpm + 2; b += 0.01) {
    const bt = 60 / b;
    for (let o = 0; o < bt; o += 0.004) { const s = gridScore(b, o); if (s > bestS) { bestS = s; offset = o; bestB = b; } }
}
bpm = Number(bestB.toFixed(2));
for (let o = Math.max(0, offset - 0.01); o < offset + 0.01; o += 0.001) { const s = gridScore(bpm, o); if (s >= bestS) { bestS = s; offset = o; } }
const beat = 60 / bpm;
const beats = [];
for (let t = offset; t < dur; t += beat) beats.push(Number(t.toFixed(3)));

// Energia por compasso (4 batidas) para achar entrada do bumbo, quebras e virada.
const env = rmsEnvelope(x, beat * 4, sr);
const bars = [];
for (let t = offset, k = 0; t < dur - beat * 4; t += beat * 4, k++) {
    const i0 = Math.floor(t * sr), i1 = Math.floor((t + beat * 4) * sr);
    let s = 0, sl = 0;
    for (let i = i0; i < i1; i++) { s += x[i] * x[i]; sl += low[i] * low[i]; }
    bars.push({ bar: k, t: Number(t.toFixed(3)), rms_db: Number(gainToDb(Math.sqrt(s / (i1 - i0))).toFixed(1)), low_db: Number(gainToDb(Math.sqrt(sl / (i1 - i0))).toFixed(1)) });
}
const out = { file, duration: Number(dur.toFixed(3)), bpm, beat: Number(beat.toFixed(5)), offset: Number(offset.toFixed(3)), beats, bars };
const o = opt("-o", null);
if (o) writeFileSync(o, JSON.stringify(out, null, 1));
console.log(`bpm ${bpm} · batida ${beat.toFixed(4)} s · fase ${offset.toFixed(3)} s · ${beats.length} batidas`);
for (const b of bars) console.log(`compasso ${String(b.bar).padStart(2)}  ${b.t.toFixed(2).padStart(6)} s  rms ${b.rms_db} dB  grave ${b.low_db} dB  ${"#".repeat(Math.max(0, Math.round((b.rms_db + 40) / 1.5)))}`);
