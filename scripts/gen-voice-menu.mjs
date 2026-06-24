// Lista as vozes da conta ElevenLabs e gera amostras das femininas
// pra escolher a mais suave/natural. Saída: public/audio/vo/samples/<nome>.mp3
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
async function loadEnv() {
    try {
        const raw = await fs.readFile(path.join(ROOT, ".env"), "utf-8");
        for (const line of raw.split(/\r?\n/)) {
            const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
            if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
        }
    } catch {}
}
await loadEnv();
const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) { console.error("sem ELEVENLABS_API_KEY"); process.exit(1); }

const MODEL = "eleven_multilingual_v2";
// frase de teste (boa pra avaliar suavidade)
const SAMPLE = "Ela lê cada conversa, e entende o que importa. Num clique, você sabe quem está pronto pra fechar.";
// settings mais NATURAIS (suaves, com alma — sem o flat do style 0.08)
const SETTINGS = { stability: 0.45, similarity_boost: 0.85, style: 0.32, use_speaker_boost: true };

// vozes femininas premade do ElevenLabs (acessíveis em qualquer plano)
const FEMALES = [
    { name: "Sarah", id: "EXAVITQu4vr4xnSDxMaL" },     // suave, madura (a que estava em uso)
    { name: "Matilda", id: "XrExE9yKIg1WjnnlVkGX" },   // amigável, jovem
    { name: "Charlotte", id: "XB0fDUnXU5powFXDhCwa" }, // calma, sedosa
    { name: "Lily", id: "pFZP5JQG7iQjIQuC4Bku" },      // quente, suave
    { name: "Alice", id: "Xb7hH8MSUJpSbSDYk0k2" },     // clara, confiante
    { name: "Jessica", id: "cgSgspJ2msm6clMCkdW9" },   // expressiva, jovem
    { name: "Aria", id: "9BWtsMINqrJLrRacOk9x" },      // natural, expressiva
];

const OUT = path.join(ROOT, "public", "audio", "vo", "samples");
await fs.mkdir(OUT, { recursive: true });
async function tts(voiceId, text) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "xi-api-key": API_KEY, "Content-Type": "application/json", accept: "audio/mpeg" },
        body: JSON.stringify({ text, model_id: MODEL, voice_settings: SETTINGS }),
    });
    if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 120)}`);
    return Buffer.from(await res.arrayBuffer());
}
console.log(`Gerando amostras (settings naturais ${JSON.stringify(SETTINGS)}):`);
for (const v of FEMALES) {
    try {
        const buf = await tts(v.id, SAMPLE);
        await fs.writeFile(path.join(OUT, `${v.name}.mp3`), buf);
        console.log(`  ${v.name.padEnd(12)} OK (${(buf.length / 1024).toFixed(0)}kb)`);
    } catch (e) { console.log(`  ${v.name.padEnd(12)} FAIL ${e.message}`); }
}
console.log(`\n→ ouça em public/audio/vo/samples/`);
