#!/usr/bin/env node
// Passo 4 do reel com rosto: o áudio. A voz é a do próprio bruto, cortada nos
// mesmos trechos do vídeo (cortes.json), com emenda de 12 ms em potência
// constante (sem clique), passa-alta de 80 Hz contra ronco de ambiente e master
// -14 LUFS / pico real < -1,5 dBTP (lib/master.mjs). Trilha é opcional e baixa
// (rosto.json "trilha"): a opinião segura o vídeo, não a música.
// Uso: node scripts/rosto/mixa-rosto.mjs films/<slug>/rosto.json <video-mudo.mp4> <saida.mp4> [--wav x.wav]
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decode, writeWav, SR, dbToGain, gainToDb, tmp } from "../lib/audio.mjs";
import { carregar } from "../lib/roteiro.mjs";
import { masterizar } from "../lib/master.mjs";

const [arq, video, saida, ...rest] = process.argv.slice(2);
const r = carregar(arq);
const { clipes, duracao } = JSON.parse(readFileSync(join(r._dir, "cortes.json"), "utf8"));
const [bL, bR] = decode(join(r._dir, "renders", `${r.slug}-bruto.wav`));
const N = Math.round(duracao * SR), X = Math.round(0.012 * SR);
const voz = [new Float32Array(N + X), new Float32Array(N + X)];
for (const c of clipes) {
    const i0 = Math.round(c.de * SR), n = Math.round(c.dur * SR), o = Math.round(c.em * SR);
    for (let k = -X; k < n + X; k++) {
        const src = i0 + k, dst = o + k;
        if (src < 0 || src >= bL.length || dst < 0 || dst >= voz[0].length) continue;
        // rampa de potência constante nas duas pontas do trecho (emenda cruzada)
        let g = 1;
        if (k < 0) g = Math.sin(((k + X) / X) * Math.PI / 2);
        else if (k >= n) g = Math.cos(((k - n) / X) * Math.PI / 2);
        voz[0][dst] += bL[src] * g; voz[1][dst] += bR[src] * g;
    }
}
// passa-alta 80 Hz de 1 polo
const a = Math.exp(-2 * Math.PI * 80 / SR);
for (const c of voz) { let xp = 0, yp = 0; for (let i = 0; i < c.length; i++) { const y = a * (yp + c[i] - xp); xp = c[i]; yp = y; c[i] = y; } }
const mix = [voz[0].slice(0, N), voz[1].slice(0, N)];
if (r.trilha?.arquivo) {
    const [mL, mR] = decode(r.trilha.arquivo, { start: r.trilha.inicio || 0, duration: duracao + 0.1 });
    const base = dbToGain(r.trilha.ganho_db ?? -26), duck = dbToGain(r.trilha.ducking_db ?? -8);
    const atk = Math.exp(-1 / (0.03 * SR)), rel = Math.exp(-1 / (0.4 * SR)); let env = 0;
    for (let i = 0; i < N && i < mL.length; i++) {
        const v = Math.abs(mix[0][i]) > 0.02 ? 1 : 0;
        env = v > env ? atk * env + (1 - atk) * v : rel * env + (1 - rel) * v;
        const fade = Math.min(1, i / (0.5 * SR), (N - i) / (1.0 * SR));
        const g = base * (1 - env * (1 - duck)) * fade;
        mix[0][i] += mL[i] * g; mix[1][i] += mR[i] * g;
    }
}
const { final, m0, m1 } = masterizar(mix, { lufs: r.master?.lufs ?? -14, truePeak: r.master?.true_peak ?? -1.5 });
const wav = (() => { const i = rest.indexOf("--wav"); return i >= 0 ? rest[i + 1] : join(tmp(), "master.wav"); })();
writeWav(wav, final);
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", video, "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-t", String(duracao), saida]);
console.log(`voz: ${clipes.length} trechos emendados, ${duracao.toFixed(2)} s${r.trilha?.arquivo ? " + trilha" : " (sem trilha)"}`);
console.log(`pré-master I ${m0.I} LUFS TP ${m0.TP} · master I ${m1.I} LUFS TP ${m1.TP} dBTP LRA ${m1.LRA}`);
console.log(`→ ${saida}`);
