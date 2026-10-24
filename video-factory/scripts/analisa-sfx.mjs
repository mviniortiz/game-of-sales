#!/usr/bin/env node
// Mede cada efeito para escolher variação sem depender só do ouvido:
// ataque (tempo até o pico), cauda (até cair 40 dB), pico, e brilho
// (cruzamentos por zero por segundo ~ frequência dominante).
// Uso: node scripts/analisa-sfx.mjs <pasta>
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { decode, SR, rmsEnvelope, gainToDb } from "./lib/audio.mjs";
const dir = process.argv[2];
for (const f of readdirSync(dir).filter((n) => /\.(mp3|wav)$/.test(n)).sort()) {
    const [x] = decode(join(dir, f), { channels: 1 });
    const env = rmsEnvelope(x, 0.005);
    let pk = 0, ipk = 0; env.forEach((v, i) => { if (v > pk) { pk = v; ipk = i; } });
    let i0 = 0; while (i0 < env.length && env[i0] < pk * 0.1) i0++;
    let iEnd = env.length - 1; while (iEnd > ipk && env[iEnd] < pk * 0.01) iEnd--;
    let zc = 0; for (let i = 1; i < x.length; i++) if ((x[i - 1] < 0) !== (x[i] < 0)) zc++;
    console.log(`${f.padEnd(24)} dur ${(x.length / SR).toFixed(2)}  início ${(i0 * 0.005).toFixed(3)}  pico ${(ipk * 0.005).toFixed(3)} (${gainToDb(pk).toFixed(1)} dB rms)  fim-40dB ${(iEnd * 0.005).toFixed(2)}  zc/s ${Math.round(zc / (x.length / SR))}`);
}
