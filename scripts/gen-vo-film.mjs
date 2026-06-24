// Narração do FILME completo (ElevenLabs · Bella calma), por cena.
// Saída: public/audio/vo/film/A{1..8}.mp3  (Hook usa public/audio/vo/cine/L1-4)
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

const VOICE_ID = process.argv[2] || "EXAVITQu4vr4xnSDxMaL"; // Bella
const MODEL = "eleven_multilingual_v2";

const LINES = [
    { id: 1, scene: "Agitacao", text: "Não é só uma cliente. Todo mês, vários escapam." },
    { id: 2, scene: "Opening", text: "Até que a EVA entra em cena." },
    { id: 3, scene: "EvaHero", text: "Ela lê cada conversa, e entende o que importa." },
    { id: 4, scene: "Analisar", text: "Num clique, você sabe quem está pronto pra fechar." },
    { id: 5, scene: "Studio", text: "Um especialista pra cada etapa da venda." },
    { id: 6, scene: "AgenteCriacao", text: "Você monta o seu, em três perguntas." },
    { id: 7, scene: "Pipeline", text: "A EVA organiza. Seu time fecha." },
    { id: 8, scene: "CTA", text: "Vyzon. A EVA sugere, você aprova." },
];

const OUT = path.join(ROOT, "public", "audio", "vo", "film");
await fs.mkdir(OUT, { recursive: true });

async function tts(line) {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`;
    const res = await fetch(url, {
        method: "POST",
        headers: { "xi-api-key": API_KEY, "Content-Type": "application/json", accept: "audio/mpeg" },
        body: JSON.stringify({ text: line.text, model_id: MODEL, voice_settings: { stability: 0.74, similarity_boost: 0.8, style: 0.08, use_speaker_boost: true } }),
    });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(path.join(OUT, `A${line.id}.mp3`), buf);
    return buf.length;
}

for (const l of LINES) {
    try { const b = await tts(l); console.log(`A${l.id} ${l.scene.padEnd(14)} OK ${(b / 1024).toFixed(1)}kb  "${l.text}"`); }
    catch (e) { console.log(`A${l.id} FAIL ${e.message}`); }
}
