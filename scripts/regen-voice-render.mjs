// Autossuficiente: gera as 12 narrações com a voz Kore (firme) via edge gemini-tts,
// converte WAV->MP3 e re-renderiza o filme. Feito pra rodar sozinho na madrugada
// (após o reset da cota do Gemini), agendado no Windows Task Scheduler.
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(ROOT);
const LOG = path.join(ROOT, "scripts", "regen-kore.log");
const log = async (m) => { const line = `[${new Date().toISOString()}] ${m}`; console.log(line); await fs.appendFile(LOG, line + "\n").catch(() => {}); };

const env = {};
try {
    const raw = await fs.readFile(path.join(ROOT, ".env"), "utf-8");
    for (const line of raw.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
        if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
} catch {}
const URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const KEY = env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || Object.entries(env).find(([k]) => /PUBLISHABLE|ANON/i.test(k))?.[1];

const VOICE = "Kore";
const STYLE = "Narradora firme, confiante e forte, com autoridade e presença, ritmo decidido";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TX = {
    L1: "Uma cliente chega. Quente, pronta pra começar.",
    L2: "Mas ninguém responde.",
    L3: "Passam horas. Passam dias.",
    L4: "E mais um lead esfria no WhatsApp.",
    A1: "Não é só uma cliente. Todo mês, vários escapam.",
    A2: "Até que a EVA entra em cena.",
    A3: "Ela lê cada conversa, e entende o que importa.",
    A4: "Num clique, você sabe quem está pronto pra fechar.",
    A5: "Um especialista pra cada etapa da venda.",
    A6: "Você monta o seu, em três perguntas.",
    A7: "A EVA organiza. Seu time fecha.",
    A8: "Vyzon. A EVA sugere, você aprova.",
};

async function tts(text) {
    const r = await fetch(`${URL}/functions/v1/gemini-tts`, {
        method: "POST",
        headers: { "content-type": "application/json", apikey: KEY, authorization: `Bearer ${KEY}` },
        body: JSON.stringify({ text, voice: VOICE, style: STYLE }),
    });
    if (!r.ok) { const e = new Error(`${r.status}`); e.status = r.status; e.body = (await r.text()).slice(0, 200); throw e; }
    return Buffer.from(await r.arrayBuffer());
}

// gera com retry em 429 (espera 65s) — robusto contra rate-limit residual
async function genWithRetry(id, tries = 5) {
    const dir = id.startsWith("L") ? "cine" : "film";
    const outDir = path.join(ROOT, "public", "audio", "vo", dir);
    await fs.mkdir(outDir, { recursive: true });
    for (let t = 1; t <= tries; t++) {
        try {
            const buf = await tts(TX[id]);
            await fs.writeFile(path.join(outDir, `${id}.wav`), buf);
            await log(`  ${dir}/${id} OK (${(buf.length / 1024).toFixed(0)}kb)`);
            return true;
        } catch (e) {
            await log(`  ${dir}/${id} try ${t}/${tries} fail ${e.status || ""} ${e.body || e.message}`);
            if (e.status === 429 && t < tries) { await sleep(65000); continue; }
            if (t < tries) { await sleep(8000); continue; }
            return false;
        }
    }
    return false;
}

function run(cmd, args) {
    const r = spawnSync(cmd, args, { cwd: ROOT, shell: true, encoding: "utf-8" });
    return { code: r.status, out: (r.stdout || "") + (r.stderr || "") };
}

await log(`=== regen Kore start ===`);
if (!URL || !KEY) { await log("FALTOU SUPABASE_URL/KEY"); process.exit(1); }

const IDS = Object.keys(TX);
let ok = 0;
for (const id of IDS) { if (await genWithRetry(id)) ok++; await sleep(20000); }
await log(`gerados ${ok}/${IDS.length}`);
if (ok < IDS.length) { await log("ABORT: nem todas as narrações geraram (cota?). Filme NÃO re-renderizado."); process.exit(1); }

// converte WAV->MP3 (loudnorm) substituindo as atuais
for (const id of IDS) {
    const dir = id.startsWith("L") ? "cine" : "film";
    const w = path.join(ROOT, "public", "audio", "vo", dir, `${id}.wav`);
    const mp3 = w.replace(/\.wav$/, ".mp3");
    if (!existsSync(w)) continue;
    const r = run("ffmpeg", ["-loglevel", "error", "-y", "-i", `"${w}"`, "-af", "loudnorm=I=-17:TP=-2,afade=t=in:d=0.06", "-c:a", "libmp3lame", "-b:a", "192k", `"${mp3}"`]);
    if (r.code === 0) await fs.rm(w).catch(() => {});
    await log(`  conv ${dir}/${id} -> ${r.code === 0 ? "mp3 OK" : "FALHOU"}`);
}

await log("renderizando filme...");
const rr = run("npx", ["remotion", "render", "FilmLight", "scripts/vyzon-film-v10.mp4", "--concurrency=4"]);
await log(rr.code === 0 ? "RENDER OK -> scripts/vyzon-film-v10.mp4" : `RENDER FALHOU\n${rr.out.slice(-1500)}`);
await log(`=== fim (voz ${VOICE}) ===`);
