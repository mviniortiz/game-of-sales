// Locução do reel de anúncio (ad-eva-reel) — Gemini TTS voz Achernar.
// Uso: node scripts/gen-vo-ad-reel.mjs   → grava public/audio/vo/adreel/V1..V6.wav
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = {};
const raw = await fs.readFile(path.join(ROOT, ".env"), "utf-8");
for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const KEY = env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

const VOICE = "Achernar";
const STYLE = "Narradora firme, confiante e forte, com autoridade e presença, ritmo decidido de anúncio";

const LINES = {
    V1: "Sua agência recebe conversas o dia todo.",
    V2: "E sem resposta a tempo... é ali que os leads esfriam.",
    V3: "Conheça a EVA.",
    V4: "Ela lê cada conversa, e aponta quem está pronto pra fechar.",
    V5: "Ela sugere a resposta certa. E você aprova antes de enviar.",
    V6: "Vyzon. A EVA sugere, você aprova. Teste grátis por quatorze dias.",
};

async function tts(text) {
    const r = await fetch(`${URL}/functions/v1/gemini-tts`, {
        method: "POST",
        headers: { "content-type": "application/json", apikey: KEY, authorization: `Bearer ${KEY}` },
        body: JSON.stringify({ text, voice: VOICE, style: STYLE }),
    });
    if (!r.ok) throw new Error(`${r.status}: ${(await r.text()).slice(0, 200)}`);
    return Buffer.from(await r.arrayBuffer());
}

const OUT = path.join(ROOT, "public", "audio", "vo", "adreel");
await fs.mkdir(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const [id, text] of Object.entries(LINES)) {
    const f = path.join(OUT, `${id}.wav`);
    try { await fs.access(f); console.log(`${id} já existe, pulando`); continue; } catch {}
    for (let tent = 1; tent <= 3; tent++) {
        try { const b = await tts(text); await fs.writeFile(f, b); console.log(`${id} OK ${(b.length / 1024).toFixed(0)}kb`); break; }
        catch (e) { console.log(`${id} tent${tent} FAIL ${e.message.slice(0, 80)}`); await sleep(25000); }
    }
    await sleep(22000);
}
console.log("done");
