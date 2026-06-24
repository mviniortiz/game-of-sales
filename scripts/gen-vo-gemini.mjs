// Gera narração com a voz da EVA (Gemini TTS, voz Achernar) via edge gemini-tts.
// Uso:  node scripts/gen-vo-gemini.mjs test          -> 1 amostra
//       node scripts/gen-vo-gemini.mjs film          -> todas as narrações do filme
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = {};
try {
    const raw = await fs.readFile(path.join(ROOT, ".env"), "utf-8");
    for (const line of raw.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
        if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
} catch {}

const URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const KEY =
    env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY ||
    Object.entries(env).find(([k]) => /PUBLISHABLE|ANON/i.test(k))?.[1];
if (!URL || !KEY) { console.error("faltou SUPABASE_URL/KEY no .env. Chaves:", Object.keys(env).join(",")); process.exit(1); }

const VOICE = process.env.VOICE || "Achernar";
const STYLE = process.env.STYLE || "Narradora firme, confiante e forte, com autoridade e presença, ritmo decidido";

async function tts(text) {
    const r = await fetch(`${URL}/functions/v1/gemini-tts`, {
        method: "POST",
        headers: { "content-type": "application/json", apikey: KEY, authorization: `Bearer ${KEY}` },
        body: JSON.stringify({ text, voice: VOICE, style: STYLE }),
    });
    if (!r.ok) throw new Error(`${r.status}: ${(await r.text()).slice(0, 300)}`);
    const ct = r.headers.get("content-type") || "";
    if (!ct.includes("audio")) throw new Error(`resposta não-áudio: ${(await r.text()).slice(0, 300)}`);
    return Buffer.from(await r.arrayBuffer());
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mode = process.argv[2] || "test";

// modo "rest": (re)gera só os IDs passados, com espaçamento (respeita rate-limit).
// ex: node scripts/gen-vo-gemini.mjs rest A1 A2 A3 A4 A7 A8
if (mode === "rest") {
    const TX = {
        A1: "Não é só uma cliente. Todo mês, vários escapam.",
        A2: "Até que a EVA entra em cena.",
        A3: "Ela lê cada conversa, e entende o que importa.",
        A4: "Num clique, você sabe quem está pronto pra fechar.",
        A5: "Um especialista pra cada etapa da venda.",
        A6: "Você monta o seu, em três perguntas.",
        A7: "A EVA organiza. Seu time fecha.",
        A8: "Vyzon. A EVA sugere, você aprova.",
        L1: "Uma cliente chega. Quente, pronta pra começar.",
        L2: "Mas ninguém responde.",
        L3: "Passam horas. Passam dias.",
        L4: "E mais um lead esfria no WhatsApp.",
    };
    const ids = process.argv.slice(3);
    for (const id of ids) {
        const dir = id.startsWith("L") ? "cine" : "film";
        const outDir = path.join(ROOT, "public", "audio", "vo", dir);
        await fs.mkdir(outDir, { recursive: true });
        try { const b = await tts(TX[id]); await fs.writeFile(path.join(outDir, `${id}.wav`), b); console.log(`${dir}/${id} OK ${(b.length / 1024).toFixed(0)}kb`); }
        catch (e) { console.log(`${dir}/${id} FAIL ${e.message.slice(0, 80)}`); }
        await sleep(22000); // espaça p/ respeitar rate-limit
    }
    process.exit(0);
}

if (mode === "test") {
    const OUT = path.join(ROOT, "public", "audio", "vo", "samples");
    await fs.mkdir(OUT, { recursive: true });
    const buf = await tts("Ela lê cada conversa, e entende o que importa. Num clique, você sabe quem está pronto pra fechar.");
    const p = path.join(OUT, `Gemini_${VOICE}.wav`);
    await fs.writeFile(p, buf);
    console.log(`OK ${VOICE}: ${(buf.length / 1024).toFixed(0)}kb -> ${path.relative(ROOT, p)}`);
} else if (mode === "film") {
    // Hook (abertura) + 8 cenas
    const HOOK = [
        { id: "L1", text: "Uma cliente chega. Quente, pronta pra começar." },
        { id: "L2", text: "Mas ninguém responde." },
        { id: "L3", text: "Passam horas. Passam dias." },
        { id: "L4", text: "E mais um lead esfria no WhatsApp." },
    ];
    const FILM = [
        { id: "A1", text: "Não é só uma cliente. Todo mês, vários escapam." },
        { id: "A2", text: "Até que a EVA entra em cena." },
        { id: "A3", text: "Ela lê cada conversa, e entende o que importa." },
        { id: "A4", text: "Num clique, você sabe quem está pronto pra fechar." },
        { id: "A5", text: "Um especialista pra cada etapa da venda." },
        { id: "A6", text: "Você monta o seu, em três perguntas." },
        { id: "A7", text: "A EVA organiza. Seu time fecha." },
        { id: "A8", text: "Vyzon. A EVA sugere, você aprova." },
    ];
    const cineDir = path.join(ROOT, "public", "audio", "vo", "cine");
    const filmDir = path.join(ROOT, "public", "audio", "vo", "film");
    await fs.mkdir(cineDir, { recursive: true });
    await fs.mkdir(filmDir, { recursive: true });
    for (const l of HOOK) {
        try { const b = await tts(l.text); await fs.writeFile(path.join(cineDir, `${l.id}.wav`), b); console.log(`cine/${l.id} OK ${(b / 1024).toFixed(0)}kb`); }
        catch (e) { console.log(`cine/${l.id} FAIL ${e.message}`); }
    }
    for (const l of FILM) {
        try { const b = await tts(l.text); await fs.writeFile(path.join(filmDir, `${l.id}.wav`), b); console.log(`film/${l.id} OK ${(b / 1024).toFixed(0)}kb`); }
        catch (e) { console.log(`film/${l.id} FAIL ${e.message}`); }
    }
}
