// Gera narração (ElevenLabs) da cena cinemática de abertura, por FRASE,
// pra sincronizar cada linha com o beat visual.
// Saída: public/audio/vo/cine/L{1..4}.mp3
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

// Bella (f, suave/madura) — combina com a voz da EVA. Trocar via 1º arg (id).
const VOICE_ID = process.argv[2] || "EXAVITQu4vr4xnSDxMaL";
const MODEL = "eleven_multilingual_v2";

const LINES = [
    { id: 1, text: "Uma cliente chega. Quente, pronta pra começar." },
    { id: 2, text: "Mas ninguém responde." },
    { id: 3, text: "Passam horas. Passam dias." },
    { id: 4, text: "E mais um lead esfria no WhatsApp." },
];

const OUT = path.join(ROOT, "public", "audio", "vo", "cine");
await fs.mkdir(OUT, { recursive: true });

async function tts(line) {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`;
    const res = await fetch(url, {
        method: "POST",
        headers: { "xi-api-key": API_KEY, "Content-Type": "application/json", accept: "audio/mpeg" },
        body: JSON.stringify({
            text: line.text,
            model_id: MODEL,
            voice_settings: { stability: 0.74, similarity_boost: 0.8, style: 0.08, use_speaker_boost: true },
        }),
    });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const p = path.join(OUT, `L${line.id}.mp3`);
    await fs.writeFile(p, buf);
    return buf.length;
}

for (const l of LINES) {
    try { const b = await tts(l); console.log(`L${l.id} OK ${(b / 1024).toFixed(1)}kb  "${l.text}"`); }
    catch (e) { console.log(`L${l.id} FAIL ${e.message}`); }
}
