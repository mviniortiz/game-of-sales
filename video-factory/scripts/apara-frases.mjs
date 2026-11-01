#!/usr/bin/env node
// Corta só o silêncio das pontas de cada frase (a respiração interna fica) e
// grava WAV 48 kHz estéreo pronto pro mix. Parte da receita de voz da skill:
// uma frase inteira por chamada, nunca uma tomada única cortada no meio.
// Uso: node scripts/apara-frases.mjs <pasta-com-mp3> <pasta-saida> [--limiar -42] [--folga 0.04]
import { readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";
import { decode, writeWav, SR, gainToDb } from "./lib/audio.mjs";

const [src, dst, ...rest] = process.argv.slice(2);
const opt = (k, d) => { const i = rest.indexOf(k); return i >= 0 ? Number(rest[i + 1]) : d; };
const limiar = opt("--limiar", -42), folga = opt("--folga", 0.04);
if (!src || !dst) { console.error("uso: apara-frases.mjs <src> <dst>"); process.exit(1); }
mkdirSync(dst, { recursive: true });
const rel = {};
for (const f of readdirSync(src).filter((n) => /\.(mp3|wav)$/i.test(n)).sort()) {
    const [L, R] = decode(join(src, f));
    const w = Math.round(0.01 * SR), lim = Math.pow(10, limiar / 20);
    const rms = (i) => { let s = 0; for (let k = i; k < Math.min(L.length, i + w); k++) s += L[k] * L[k] + R[k] * R[k]; return Math.sqrt(s / (2 * w)); };
    let a = 0; while (a < L.length - w && rms(a) < lim) a += w;
    let b = L.length - w; while (b > a && rms(b) < lim) b -= w;
    a = Math.max(0, a - Math.round(folga * SR)); b = Math.min(L.length, b + w + Math.round(folga * 2 * SR));
    const out = [L.slice(a, b), R.slice(a, b)];
    // micro fade de 8 ms nas pontas: corte sem clique
    const fd = Math.round(0.008 * SR);
    for (let i = 0; i < fd; i++) for (const c of out) { c[i] *= i / fd; c[c.length - 1 - i] *= i / fd; }
    let pk = 0; for (const c of out) for (const v of c) pk = Math.max(pk, Math.abs(v));
    const nome = basename(f).replace(/\.(mp3|wav)$/i, ".wav");
    writeWav(join(dst, nome), out);
    rel[nome] = { dur: +((b - a) / SR).toFixed(3), inicio_cortado: +(a / SR).toFixed(3), pico_db: +gainToDb(pk).toFixed(1) };
    console.log(`${nome.padEnd(14)} ${rel[nome].dur.toFixed(2)} s  (cortou ${rel[nome].inicio_cortado.toFixed(2)} s no começo)  pico ${rel[nome].pico_db} dB`);
}
writeFileSync(join(dst, "duracoes.json"), JSON.stringify(rel, null, 1));
