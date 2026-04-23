// Generates ONE continuous HeyGen talking-head video in 9:16 portrait.
// Saída: public/avatar/matilda-host.mp4 — pronto pra subir direto no TikTok/Reels.
//
// Usage:
//   node scripts/generate-avatar-host.mjs [avatar_id] [voice_id]
//
// Defaults: Abigail + Ana Carvalho Friendly.

import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

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

const API_KEY = process.env.HEYGEN_API_KEY;
if (!API_KEY) {
    console.error("[!] HEYGEN_API_KEY não encontrado em .env");
    process.exit(1);
}

const AVATAR_ID = process.argv[2] || "Abigail_expressive_2024112501";
const VOICE_ID = process.argv[3] || "6c0a95599317428a8151293305deceba"; // Ana Carvalho - Friendly

// Script único contínuo — narração POV Matilda
const FULL_SCRIPT = `Essa era minha segunda-feira. Planilha, grupo, caos. Juro que eu achava que planilha dava conta.

Daí conheci o Vyzon. Conversa do WhatsApp vira oportunidade, automático. O pipeline se mexe sozinho, meu time subiu no ranking.

A Eva analisa meus dados em segundos, eu só pergunto. Hoje bato meta e ainda sobra tempo.

Testa grátis, quatorze dias. Só cobra depois. Depois me agradece.`;

async function heyGenRequest(method, url, body) {
    const res = await fetch(url, {
        method,
        headers: {
            "X-API-KEY": API_KEY,
            "Content-Type": "application/json",
            accept: "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const txt = await res.text();
    let json;
    try { json = JSON.parse(txt); } catch { json = { raw: txt }; }
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 500)}`);
    }
    return json;
}

async function createVideo() {
    const body = {
        video_inputs: [
            {
                character: {
                    type: "avatar",
                    avatar_id: AVATAR_ID,
                    avatar_style: "normal",
                    scale: 1.0,
                },
                voice: {
                    type: "text",
                    input_text: FULL_SCRIPT,
                    voice_id: VOICE_ID,
                    speed: 1.0,
                },
                background: {
                    type: "color",
                    value: "#06080a",
                },
            },
        ],
        dimension: { width: 720, height: 1280 },
    };
    const res = await heyGenRequest("POST", "https://api.heygen.com/v2/video/generate", body);
    return res.data?.video_id;
}

async function pollStatus(videoId, timeoutMs = 600000) {
    const start = Date.now();
    let last = "";
    while (Date.now() - start < timeoutMs) {
        const res = await heyGenRequest("GET", `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`);
        const status = res.data?.status;
        if (status !== last) {
            process.stdout.write(` [${status}]`);
            last = status;
        }
        if (status === "completed") return res.data?.video_url;
        if (status === "failed") throw new Error(`video ${videoId} failed: ${JSON.stringify(res.data?.error || res.data)}`);
        await new Promise((r) => setTimeout(r, 5000));
    }
    throw new Error(`poll timeout (${videoId})`);
}

async function downloadTo(url, dest) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`download HTTP ${res.status}`);
    await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
    const stat = await fs.stat(dest);
    return stat.size;
}

const OUT_DIR = path.join(ROOT, "public", "avatar");
await fs.mkdir(OUT_DIR, { recursive: true });
const OUT_PATH = path.join(OUT_DIR, "matilda-host.mp4");

console.log(`🎭 HeyGen Host Video`);
console.log(`   Avatar:   ${AVATAR_ID}`);
console.log(`   Voice:    ${VOICE_ID}`);
console.log(`   Script:   ${FULL_SCRIPT.replace(/\s+/g, " ").slice(0, 80)}...`);
console.log(`   Output:   public/avatar/matilda-host.mp4\n`);

process.stdout.write(`Generating...`);
try {
    const videoId = await createVideo();
    process.stdout.write(` id=${videoId}`);
    const videoUrl = await pollStatus(videoId);
    process.stdout.write(` downloading...`);
    const bytes = await downloadTo(videoUrl, OUT_PATH);
    console.log(` OK (${(bytes / 1024 / 1024).toFixed(2)} MB)\n`);
    console.log(`✓ Arquivo: ${path.relative(ROOT, OUT_PATH)}`);
    console.log(`  Pode subir direto no TikTok/Reels/Stories.`);
} catch (e) {
    console.log(` FAIL`);
    console.error(`  ${e.message}`);
    process.exit(1);
}
