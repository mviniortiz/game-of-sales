// Áudio em Node sem dependência: o ffmpeg do Remotion decodifica e codifica,
// o processamento (mix, ducking, envelope) é feito aqui em Float32Array.
import { execFileSync, spawnSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const SR = 48000;

/** Decodifica qualquer arquivo para PCM float. channels=1 → mono, 2 → [L, R]. */
export function decode(file, { channels = 2, sr = SR, start = 0, duration } = {}) {
    const args = ["-v", "error"];
    if (start) args.push("-ss", String(start));
    args.push("-i", file);
    if (duration) args.push("-t", String(duration));
    // Esta build não tem o muxer f32le: sai WAV 24 bits pelo pipe e a gente lê.
    args.push("-f", "wav", "-acodec", "pcm_s24le", "-ac", String(channels), "-ar", String(sr), "pipe:1");
    const buf = execFileSync("ffmpeg", args, { maxBuffer: 1 << 30 });
    const d = buf.indexOf("data", 12) + 8;
    const n24 = Math.floor((buf.length - d) / 3);
    const inter = new Float32Array(n24);
    for (let i = 0; i < n24; i++) inter[i] = buf.readIntLE(d + i * 3, 3) / 8388608;
    if (channels === 1) return [Float32Array.from(inter)];
    const n = inter.length / channels;
    const out = Array.from({ length: channels }, () => new Float32Array(n));
    for (let i = 0; i < n; i++) for (let c = 0; c < channels; c++) out[c][i] = inter[i * channels + c];
    return out;
}

/** Grava WAV float 32 (estéreo ou mono). */
export function writeWav(file, chans, sr = SR) {
    const n = chans[0].length, ch = chans.length;
    const data = Buffer.alloc(n * ch * 4);
    for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) data.writeFloatLE(chans[c][i], (i * ch + c) * 4);
    const h = Buffer.alloc(44);
    h.write("RIFF", 0); h.writeUInt32LE(36 + data.length, 4); h.write("WAVE", 8);
    h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(3, 20); h.writeUInt16LE(ch, 22);
    h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * ch * 4, 28); h.writeUInt16LE(ch * 4, 32); h.writeUInt16LE(32, 34);
    h.write("data", 36); h.writeUInt32LE(data.length, 40);
    writeFileSync(file, Buffer.concat([h, data]));
}

export const dbToGain = (db) => Math.pow(10, db / 20);
export const gainToDb = (g) => 20 * Math.log10(Math.max(g, 1e-9));

/** RMS em janelas de `win` segundos (mono). */
export function rmsEnvelope(x, win = 0.05, sr = SR) {
    const w = Math.max(1, Math.round(win * sr));
    const out = new Float32Array(Math.ceil(x.length / w));
    for (let k = 0; k < out.length; k++) {
        let s = 0, m = 0;
        for (let i = k * w; i < Math.min(x.length, (k + 1) * w); i++) { s += x[i] * x[i]; m++; }
        out[k] = Math.sqrt(s / Math.max(1, m));
    }
    return out;
}

/** Duração de mídia via ffprobe. */
export function probeDuration(file) {
    return Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());
}

/** Mede loudness com o loudnorm do ffmpeg (I, TP, LRA). */
export function measureLoudness(file) {
    const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-vn", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-c:a", "pcm_s16le", "-f", "null", "-"], { encoding: "utf8" });
    const m = r.stderr.match(/\{[\s\S]*?\}/g);
    const j = JSON.parse(m[m.length - 1]);
    return { I: Number(j.input_i), TP: Number(j.input_tp), LRA: Number(j.input_lra), thresh: Number(j.input_thresh), raw: j };
}

export const tmp = () => mkdtempSync(join(tmpdir(), "vf-"));
