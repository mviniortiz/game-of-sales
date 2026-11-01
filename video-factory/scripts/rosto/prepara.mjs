#!/usr/bin/env node
// Passo 1 do reel com rosto: deixa a gravação pronta para o resto.
//   - proxy de vídeo em pé (aplica a rotação do iPhone), 1080x1920 recortado ao
//     centro, H.264 com keyframe a cada segundo (o HyperFrames busca quadro a
//     quadro e reclama de keyframe esparso), sem áudio → films/<slug>/midia/bruto.mp4
//   - áudio WAV 48 kHz para o corte e o mix → films/<slug>/renders/<slug>-bruto.wav
//   - MP3 para transcrever na ElevenLabs → ~/Movies/vyzon-film/transcrever/<slug>-bruto.mp3
// Uso: node scripts/rosto/prepara.mjs films/<slug>/rosto.json
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { carregar } from "../lib/roteiro.mjs";

const r = carregar(process.argv[2]);
const info = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", r.bruto]).toString());
const v = info.streams.find((s) => s.codec_type === "video");
const a = info.streams.find((s) => s.codec_type === "audio");
if (!v || !a) throw new Error("a gravação precisa ter vídeo e áudio");
const rot = Number(v.side_data_list?.find((d) => d.rotation != null)?.rotation ?? 0);
const [num, den] = String(v.avg_frame_rate || v.r_frame_rate).split("/").map(Number);
const fpsFonte = den ? num / den : num;
const fps = fpsFonte > 45 ? 60 : 30;
const dur = Number(info.format.duration);
console.log(`bruto: ${v.width}x${v.height} ${v.codec_name} ${fpsFonte.toFixed(2)} qps, rotação ${rot}°, ${dur.toFixed(2)} s, áudio ${a.codec_name} ${a.sample_rate} Hz`);

mkdirSync(join(r._dir, "midia"), { recursive: true });
mkdirSync(join(r._dir, "renders"), { recursive: true });
const proxy = join(r._dir, "midia", "bruto.mp4");
// a rotação é aplicada pelo autorotate do ffmpeg (precisa do ffmpeg completo de bin/full)
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", r.bruto, "-an",
    "-vf", "scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,setsar=1",
    "-r", String(fps), "-c:v", "libx264", "-preset", "medium", "-crf", "14", "-g", String(fps), "-keyint_min", String(fps),
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", proxy], { stdio: "inherit" });
const wav = join(r._dir, "renders", `${r.slug}-bruto.wav`);
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", r.bruto, "-vn", "-ac", "2", "-ar", "48000", "-c:a", "pcm_s24le", wav]);
const dirT = join(process.env.HOME, "Movies/vyzon-film/transcrever"); mkdirSync(dirT, { recursive: true });
const mp3 = join(dirT, `${r.slug}-bruto.mp3`);
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", r.bruto, "-vn", "-ac", "1", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "128k", mp3]);
console.log(`proxy  → ${proxy} (1080x1920, ${fps} qps)`);
console.log(`áudio  → ${wav}`);
console.log(`transcrever → ${mp3}`);
console.log("Próximo: transcreva o MP3 na ElevenLabs (scribe, com tempo por palavra), salve o JSON e rode");
console.log(`  node scripts/rosto/importa-palavras.mjs <transcricao.json> ${join(r._dir, "palavras.json")}`);
