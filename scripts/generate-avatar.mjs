// Generates HeyGen talking-avatar videos per scene using the same scripts
// used by ElevenLabs voiceover. Output: public/avatar/{variant}/scene-{N}.mp4
//
// Usage:
//   node scripts/generate-avatar.mjs [variant] [avatar_id] [voice_id]
//   node scripts/generate-avatar.mjs matilda Abigail_expressive_2024112501
//
// Defaults: matilda + Abigail + Ana Carvalho Friendly (PT-BR f casual).

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

const VARIANT = (process.argv[2] || "matilda").toLowerCase();
const AVATAR_ID = process.argv[3] || "Abigail_expressive_2024112501";
// Ana Carvalho - Friendly (PT-BR female, casual warm) - default match pra Matilda
const VOICE_ID = process.argv[4] || "6c0a95599317428a8151293305deceba";

// Scripts idênticos ao ElevenLabs (single source of truth seria ideal, mas duplicado aqui por simplicidade)
const SCRIPTS = {
    brian: [
        { id: 1, text: "Toda segunda, a mesma história. Planilha desatualizada, grupo cobrando número." },
        { id: 3, text: "No Vyzon, conversa do WhatsApp vira oportunidade. Automático." },
        { id: 4, text: "Pipeline que se move sozinho. Ranking ao vivo pra todo o time." },
        { id: 5, text: "E quando você precisa de resposta, a Eva analisa seus dados em segundos." },
        { id: 6, text: "Resultado? Meta batida, visível pra todos, todo dia." },
        { id: 7, text: "Vyzon. Em cinco minutos no ar. Quatorze dias de trial. Só cobra depois." },
    ],
    adam: [
        { id: 1, text: "Seu time comercial perde três horas por dia com planilha. Isso custa doze mil reais por mês." },
        { id: 3, text: "Aqui, cada conversa vira oportunidade. Sem trabalho manual." },
        { id: 4, text: "Pipeline atualiza sozinho. Ranking ao vivo. Time engajado." },
        { id: 5, text: "E quando você precisa de resposta, dado e direção em segundos." },
        { id: 6, text: "Resultado? Vinte e sete por cento acima da meta. Visível pra todos, todo dia." },
        { id: 7, text: "Quatorze dias pra provar. Se não valer, não cobra nada." },
    ],
    bella: [
        { id: 1, text: "Como organizar as vendas sem planilha? Assim." },
        { id: 3, text: "Passo um. A conversa do WhatsApp vira card, automático." },
        { id: 4, text: "Passo dois. Arrasta o card. O ranking do time atualiza sozinho." },
        { id: 5, text: "Passo três. Pergunta pra Eva. Ela responde com dado." },
        { id: 6, text: "Passo quatro. Acompanha a meta batida, todo dia. Todo mundo do time vê igual." },
        { id: 7, text: "E foi isso. Cinco minutos no ar, quatorze dias pra testar." },
    ],
    matilda: [
        { id: 1, text: "Essa era minha segunda-feira. Planilha, grupo, caos." },
        { id: 3, text: "Juro que eu achava que planilha dava conta." },
        { id: 4, text: "Daí vi o pipeline se mexendo sozinho. Meu time subiu no ranking. Literal." },
        { id: 5, text: "A Eva lê meus dados pra mim. Eu só pergunto." },
        { id: 6, text: "Hoje eu bato meta e ainda sobra tempo." },
        { id: 7, text: "Testa grátis. Depois me agradece." },
    ],
};

if (!SCRIPTS[VARIANT]) {
    console.error(`[!] Variante "${VARIANT}" desconhecida. Use: ${Object.keys(SCRIPTS).join(", ")}`);
    process.exit(1);
}

const SCENE_NAMES = { 1: "Hook", 3: "Pulse", 4: "PipelineRanking", 5: "Eva", 6: "Dashboard", 7: "CTA" };

const OUT_DIR = path.join(ROOT, "public", "avatar", VARIANT);
await fs.mkdir(OUT_DIR, { recursive: true });

// -- API helpers -----------------------------------------------------------

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
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 400)}`);
    }
    return json;
}

async function createVideo(sceneText) {
    // Dimensão portrait (720x1280) — facilita composição como PiP no Remotion 9:16.
    // Background sólido #06080a = brand bg; assim o card overlay blendeia com o fundo.
    const body = {
        video_inputs: [
            {
                character: {
                    type: "avatar",
                    avatar_id: AVATAR_ID,
                    avatar_style: "normal",
                },
                voice: {
                    type: "text",
                    input_text: sceneText,
                    voice_id: VOICE_ID,
                    speed: 1.05,
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

async function pollStatus(videoId, timeoutMs = 300000) {
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
        await new Promise((r) => setTimeout(r, 4000));
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

// -- Main ------------------------------------------------------------------

console.log(`🎭  Gerando avatar HeyGen`);
console.log(`    Variant:  ${VARIANT}`);
console.log(`    Avatar:   ${AVATAR_ID}`);
console.log(`    Voice:    ${VOICE_ID}`);
console.log(`    Output:   public/avatar/${VARIANT}/\n`);

for (const scene of SCRIPTS[VARIANT]) {
    const sceneName = (SCENE_NAMES[scene.id] || `Scene${scene.id}`).padEnd(18);
    process.stdout.write(`  [${scene.id}] ${sceneName} "${scene.text.slice(0, 42)}..."`);
    try {
        const videoId = await createVideo(scene.text);
        const videoUrl = await pollStatus(videoId);
        const outPath = path.join(OUT_DIR, `scene-${scene.id}.mp4`);
        const bytes = await downloadTo(videoUrl, outPath);
        console.log(` OK (${(bytes / 1024 / 1024).toFixed(2)} MB)`);
    } catch (e) {
        console.log(" FAIL");
        console.error(`      ${e.message}`);
    }
}

console.log(`\n✓ Concluído. Arquivos em public/avatar/${VARIANT}/`);
console.log(`  Composition SalesVideoV2Reels-${VARIANT.charAt(0).toUpperCase() + VARIANT.slice(1)}-Avatar agora pode ser renderizada.`);
