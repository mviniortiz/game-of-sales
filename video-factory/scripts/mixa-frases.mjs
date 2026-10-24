#!/usr/bin/env node
// Mix e master do filme, em Node (o ffmpeg do Remotion não tem sidechain,
// lowpass nem drawtext). Substitui mixa-frases.py + masterizar.sh do PC antigo.
//   - voz: cada frase aparada entra na sua batida (roteiro.json), empurrão de
//     +80 ms se a anterior ainda fala, nunca acelera;
//   - trilha: trecho da House 02, automação de passa-baixa (abafa no silêncio
//     do cliente, abre na virada) e ducking pela voz (sidechain);
//   - efeitos: um por gesto, na batida;
//   - master: -14 LUFS integrado, pico real abaixo de -1,5 dBTP (limitador
//     com antecipação; medição pelo loudnorm do ffmpeg).
// Uso: node scripts/mixa-frases.mjs films/<slug>/roteiro.json <video.mp4> <saida.mp4> [--wav saida.wav]
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { decode, writeWav, SR, dbToGain, gainToDb, measureLoudness, tmp } from "./lib/audio.mjs";
import { carregar, posicionarFalas, tempo } from "./lib/roteiro.mjs";

const [roteiroArq, video, saida, ...rest] = process.argv.slice(2);
if (!roteiroArq || !saida) { console.error("uso: mixa-frases.mjs <roteiro.json> <video.mp4> <saida.mp4> [--wav x.wav]"); process.exit(1); }
const r = carregar(roteiroArq);
const DUR = r.duracao, N = Math.round(DUR * SR);
const mix = [new Float32Array(N), new Float32Array(N)];
const somar = (src, t0, ganho = 1) => {
    const i0 = Math.round(t0 * SR);
    for (let c = 0; c < 2; c++) for (let i = 0; i < src[c].length; i++) { const k = i0 + i; if (k >= 0 && k < N) mix[c][k] += src[c][i] * ganho; }
};

// ── Voz ────────────────────────────────────────────────────────────────────
const falas = posicionarFalas(r);
const voz = [new Float32Array(N), new Float32Array(N)];
const vozGanho = dbToGain(r.voz?.ganho_db ?? 0);
for (const f of falas) {
    const [L, R] = decode(join(r.vozDir, f.arquivo));
    const i0 = Math.round(f.inicio * SR);
    for (let i = 0; i < L.length; i++) { const k = i0 + i; if (k < N) { voz[0][k] += L[i] * vozGanho; voz[1][k] += R[i] * vozGanho; } }
}

// ── Trilha: trecho, passa-baixa automatizado, ducking ─────────────────────
const [mL, mR] = decode(r.trilha.arquivo, { start: r.trilha.inicio || 0, duration: DUR + 0.1 });
const musica = [mL.slice(0, N), mR.slice(0, N)];
const auto = (r.trilha.automacao || []).map((a) => ({ t: a.beat != null ? tempo(r, a.beat, a.offset ?? 0) : a.t, lp: a.lp_hz ?? 20000, db: a.ganho_db ?? 0 }));
const interp = (t, key) => {
    if (!auto.length) return key === "lp" ? 20000 : 0;
    if (t <= auto[0].t) return auto[0][key];
    for (let i = 1; i < auto.length; i++) if (t <= auto[i].t) {
        const a = auto[i - 1], b = auto[i], u = (t - a.t) / Math.max(1e-6, b.t - a.t);
        return key === "lp" ? Math.exp(Math.log(a.lp) + (Math.log(b.lp) - Math.log(a.lp)) * u) : a.db + (b.db - a.db) * u;
    }
    return auto[auto.length - 1][key];
};
// passa-baixa de 2 polos (dois one-pole em série), corte variável por amostra
for (let c = 0; c < 2; c++) {
    let y1 = 0, y2 = 0; const x = musica[c];
    for (let i = 0; i < N; i++) {
        const fc = interp(i / SR, "lp");
        if (fc >= 19000) { y1 = y2 = x[i]; continue; }
        const a = Math.exp(-2 * Math.PI * fc / SR);
        y1 = a * y1 + (1 - a) * x[i]; y2 = a * y2 + (1 - a) * y1; x[i] = y2;
    }
}
// envelope da voz → ducking (ataque 25 ms, soltura 300 ms)
const duck = dbToGain(r.trilha.ducking_db ?? -9);
const atk = Math.exp(-1 / (0.025 * SR)), rel = Math.exp(-1 / (0.3 * SR));
let env = 0;
const base = dbToGain(r.trilha.ganho_db ?? -10);
const fadeIn = r.trilha.fade_in ?? 0.02, fadeOut = r.trilha.fade_out ?? 1.2;
for (let i = 0; i < N; i++) {
    const v = Math.max(Math.abs(voz[0][i]), Math.abs(voz[1][i])) > 0.02 ? 1 : 0;
    env = v > env ? atk * env + (1 - atk) * v : rel * env + (1 - rel) * v;
    const t = i / SR;
    let g = base * dbToGain(interp(t, "db")) * (1 - env * (1 - duck));
    if (t < fadeIn) g *= t / fadeIn;
    if (t > DUR - fadeOut) g *= Math.max(0, (DUR - t) / fadeOut);
    musica[0][i] *= g; musica[1][i] *= g;
}
// voz sobre trilha durante a fala (meta: voz ≥ 10 dB acima)
let sv = 0, sm = 0, nv = 0;
for (let i = 0; i < N; i++) if (Math.abs(voz[0][i]) + Math.abs(voz[1][i]) > 0) {
    let v = 0; for (let k = Math.max(0, i - 480); k < i; k++) v = Math.max(v, Math.abs(voz[0][k]));
    if (v > 0.05) { sv += voz[0][i] ** 2 + voz[1][i] ** 2; sm += musica[0][i] ** 2 + musica[1][i] ** 2; nv++; }
}
const vozSobreTrilha = nv ? gainToDb(Math.sqrt(sv / nv)) - gainToDb(Math.sqrt(sm / nv)) : null;
somar(musica, 0); somar(voz, 0);

// ── Efeitos ────────────────────────────────────────────────────────────────
for (const s of r.sfx || []) {
    const src = decode(join(r.sfxDir, s.arquivo));
    somar(src, tempo(r, s.beat, s.offset ?? 0), dbToGain(s.ganho_db ?? -8));
}

// ── Master: ganho até -14 LUFS e limitador com antecipação ─────────────────
const d = tmp();
const medir = (chans, nome) => { const f = join(d, nome); writeWav(f, chans); return measureLoudness(f); };
const m0 = medir(mix, "pre.wav");
const alvo = r.master?.lufs ?? -14, teto = r.master?.true_peak ?? -1.5;
function masterizar(ganhoDb, tetoAmostra) {
    const g = dbToGain(ganhoDb), c = dbToGain(tetoAmostra);
    const out = [Float32Array.from(mix[0], (v) => v * g), Float32Array.from(mix[1], (v) => v * g)];
    const look = Math.round(0.004 * SR), relL = Math.exp(-1 / (0.08 * SR));
    const need = new Float32Array(N);
    for (let i = 0; i < N; i++) { const p = Math.max(Math.abs(out[0][i]), Math.abs(out[1][i])); need[i] = p > c ? c / p : 1; }
    // mínimo deslizante à frente (antecipação) + soltura exponencial
    const gain = new Float32Array(N); let cur = 1;
    const dq = []; // deque de índices com need crescente
    for (let i = 0; i < N + look; i++) {
        if (i < N) { while (dq.length && need[dq[dq.length - 1]] >= need[i]) dq.pop(); dq.push(i); }
        const j = i - look; if (j < 0) continue;
        while (dq[0] < j) dq.shift();
        const alvoG = need[dq[0]];
        cur = alvoG < cur ? alvoG : relL * cur + (1 - relL) * alvoG;
        gain[j] = cur;
    }
    for (let i = 0; i < N; i++) { out[0][i] *= gain[i]; out[1][i] *= gain[i]; }
    return out;
}
// folga de 0,9 dB: o encoder AAC sobe o pico real em ~0,15 dB
let ganho = alvo - m0.I, tetoAmostra = teto - 0.9, final, m1;
for (let k = 0; k < 4; k++) {
    final = masterizar(ganho, tetoAmostra);
    m1 = medir(final, `m${k}.wav`);
    const erroI = alvo - m1.I;
    if (Math.abs(erroI) <= 0.3 && m1.TP < teto) break;
    if (m1.TP >= teto) tetoAmostra -= m1.TP - teto + 0.2;
    ganho += erroI;
}
const wavFinal = (() => { const i = rest.indexOf("--wav"); return i >= 0 ? rest[i + 1] : join(d, "master.wav"); })();
writeWav(wavFinal, final);
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", video, "-i", wavFinal, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-t", String(DUR), saida]);
console.log("falas:");
for (const f of falas) console.log(`  ${f.id.padEnd(4)} ${f.arquivo.padEnd(12)} âncora ${f.ancora.toFixed(2)} entra ${f.inicio.toFixed(2)} sai ${f.fim.toFixed(2)}${f.empurrao ? `  empurrão ${f.empurrao}s` : ""}${f.empurrao > 0.5 ? "  REVER" : ""}`);
console.log(`voz sobre a trilha durante a fala: ${vozSobreTrilha?.toFixed(1)} dB (meta ≥ 10)`);
console.log(`pré-master  I ${m0.I} LUFS  TP ${m0.TP} dBTP`);
console.log(`master      I ${m1.I} LUFS  TP ${m1.TP} dBTP  LRA ${m1.LRA}  (ganho ${ganho.toFixed(2)} dB, teto amostra ${tetoAmostra.toFixed(2)} dBFS)`);
console.log(`→ ${saida}`);
