// Monta o filme único: normaliza cada peça (1080x1920, 30fps), acelera as cenas,
// encadeia com transições xfade e (opcional) mistura uma trilha.
// uso: node scripts/build-film.mjs [trilha.mp3]
import { execFileSync } from "node:child_process";

const B = "scripts/";
const W = 1080, H = 1920, FPS = 30, TRANS = 0.55;

// ordem do filme + transição de entrada + velocidade (cenas aceleradas)
const clips = [
  { f: "intro.webm",                    x: "fade" },
  { f: "beat-1.webm",                   x: "fade" },
  { f: "story-eva-clean.webm",          x: "fade",       speed: 1.5 },
  { f: "beat-2.webm",                   x: "slideleft" },
  { f: "story-criar-clean.webm",        x: "fade",       speed: 1.5 },
  { f: "beat-3.webm",                   x: "slideleft" },
  { f: "story-prioridades-clean.webm",  x: "fade",       speed: 1.45 },
  { f: "outro.webm",                    x: "fade" },
];

const run = (args) => execFileSync("ffmpeg", ["-y", ...args], { stdio: "ignore" });
const probe = (f) => parseFloat(execFileSync("ffprobe",
  ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", f]).toString().trim());

// 1) normalizar cada peça
const norm = clips.map((c, i) => {
  const out = `${B}_n${i}.mp4`;
  const vf = [
    `scale=${W}:${H}:force_original_aspect_ratio=decrease`,
    `pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2`, `setsar=1`, `fps=${FPS}`, `format=yuv420p`,
  ].join(",");
  const filt = c.speed ? `setpts=PTS/${c.speed},${vf}` : vf;
  run(["-i", `${B}${c.f}`, "-an", "-vf", filt, "-c:v", "libx264", "-crf", "18", out]);
  return out;
});

// 2) durações
const dur = norm.map(probe);
const total = dur.reduce((a, b) => a + b, 0) - TRANS * (norm.length - 1);

// 3) cadeia xfade
const inputs = norm.flatMap((f) => ["-i", f]);
let fc = "", prev = "[0:v]", offset = 0;
for (let i = 1; i < norm.length; i++) {
  offset += dur[i - 1] - TRANS;
  const out = i === norm.length - 1 ? "[v]" : `[x${i}]`;
  fc += `${prev}[${i}:v]xfade=transition=${clips[i].x || "fade"}:duration=${TRANS}:offset=${offset.toFixed(3)}${out};`;
  prev = out;
}
fc = fc.replace(/;$/, "");

// 4) trilha opcional
const music = process.argv[2];
const args = [...inputs];
if (music) {
  args.push("-i", music);
  const fo = Math.max(0, total - 1.6);
  fc += `;[${norm.length}:a]volume=0.8,afade=t=in:st=0:d=1.2,afade=t=out:st=${fo.toFixed(2)}:d=1.6[a]`;
}
args.push("-filter_complex", fc, "-map", "[v]");
if (music) args.push("-map", "[a]", "-c:a", "aac", "-b:a", "192k");
args.push("-c:v", "libx264", "-crf", "19", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
  "-t", total.toFixed(2), `${B}vyzon-film.mp4`);
run(args);
console.log(`OK: ${B}vyzon-film.mp4  (~${total.toFixed(1)}s)`);
