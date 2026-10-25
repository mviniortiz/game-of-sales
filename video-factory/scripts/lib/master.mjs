// Master comum dos filmes: ganho até o alvo de loudness integrado e limitador
// com antecipação para o pico real ficar abaixo do teto. Medição pelo loudnorm
// do ffmpeg (ITU BS.1770). Usado por mixa-frases.mjs e rosto/mixa-rosto.mjs.
import { join } from "node:path";
import { writeWav, SR, dbToGain, measureLoudness, tmp } from "./audio.mjs";

/** mix = [L, R] (Float32Array). Devolve { final, m0, m1, ganho, tetoAmostra }. */
export function masterizar(mix, { lufs = -14, truePeak = -1.5 } = {}) {
    const N = mix[0].length, d = tmp();
    const medir = (chans, nome) => { const f = join(d, nome); writeWav(f, chans); return measureLoudness(f); };
    const m0 = medir(mix, "pre.wav");
    const aplicar = (ganhoDb, tetoDb) => {
        const g = dbToGain(ganhoDb), c = dbToGain(tetoDb);
        const out = [Float32Array.from(mix[0], (v) => v * g), Float32Array.from(mix[1], (v) => v * g)];
        const look = Math.round(0.004 * SR), relL = Math.exp(-1 / (0.08 * SR));
        const need = new Float32Array(N);
        for (let i = 0; i < N; i++) { const p = Math.max(Math.abs(out[0][i]), Math.abs(out[1][i])); need[i] = p > c ? c / p : 1; }
        // mínimo deslizante à frente (antecipação) + soltura exponencial
        const gain = new Float32Array(N); let cur = 1; const dq = [];
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
    };
    // folga de 0,9 dB: o encoder AAC sobe o pico real em ~0,15 dB
    let ganho = lufs - m0.I, tetoAmostra = truePeak - 0.9, final, m1;
    for (let k = 0; k < 4; k++) {
        final = aplicar(ganho, tetoAmostra);
        m1 = medir(final, `m${k}.wav`);
        if (Math.abs(lufs - m1.I) <= 0.3 && m1.TP < truePeak) break;
        if (m1.TP >= truePeak) tetoAmostra -= m1.TP - truePeak + 0.2;
        ganho += lufs - m1.I;
    }
    return { final, m0, m1, ganho, tetoAmostra };
}
