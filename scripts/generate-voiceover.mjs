// Generates ElevenLabs voiceover MP3s for SalesVideoV2.
//
// Usage:
//   1. Add to .env:   ELEVENLABS_API_KEY=sk_...
//   2. (Optional) set ELEVENLABS_VOICE_ID to override default (Brian, pt-BR via multilingual_v2)
//   3. Run:  node scripts/generate-voiceover.mjs
//
// Output: public/audio/vo/scene-{1..7}.mp3  (1=Hook, 2=Transition, ..., 7=CTA)
// Transition é silêncio (2s), não gera áudio.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// --- Config ---------------------------------------------------------------

// Load .env manually (no dotenv dep)
async function loadEnv() {
    try {
        const raw = await fs.readFile(path.join(ROOT, ".env"), "utf-8");
        for (const line of raw.split(/\r?\n/)) {
            const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
            if (m && !process.env[m[1]]) {
                process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
            }
        }
    } catch {
        /* ok if missing */
    }
}

await loadEnv();

const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) {
    console.error("[!] ELEVENLABS_API_KEY não encontrado em .env");
    console.error("    Pegue em https://elevenlabs.io e adicione ao .env");
    process.exit(1);
}

// Vozes disponíveis — passa como 1º arg: `node scripts/generate-voiceover.mjs rachel`
// Default voices disponíveis no free tier (testadas em 2026-04).
// Library voices (Rachel/Charlotte/Elli/Domi/Josh/Sam etc) precisam paid.
const VOICES = {
    brian: { id: "nPczCjzI2devNBz1zQrb", label: "Brian (m, corporate)" },
    adam: { id: "pNInz6obpgDQGcFmaJgB", label: "Adam (m, autoridade)" },
    antoni: { id: "ErXwobaYiN019PkySvjV", label: "Antoni (m, claro)" },
    arnold: { id: "VR6AewLTigWG4xSOukaG", label: "Arnold (m, crisp)" },
    bella: { id: "EXAVITQu4vr4xnSDxMaL", label: "Bella (f, suave madura)" },
    matilda: { id: "XrExE9yKIg1WjnnlVkGX", label: "Matilda (f, amigável)" },
};

// Scripts por variante — cada ICP tem arco narrativo próprio.
// ATTENTION: mudar o ID/texto aqui desalinha do subtitles em variants.ts — sempre update dos 2.
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

const variantArg = (process.argv[2] || "brian").toLowerCase();
if (!VOICES[variantArg] || !SCRIPTS[variantArg]) {
    console.error(`[!] Variante "${variantArg}" desconhecida. Disponíveis: ${Object.keys(SCRIPTS).join(", ")}`);
    process.exit(1);
}

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || VOICES[variantArg].id;
const VOICE_NAME = variantArg;
const MODEL = "eleven_multilingual_v2";

// --- Script (por cena) — resolve da variante selecionada -----------------

const SCENE_NAMES = {
    1: "Hook",
    3: "Pulse",
    4: "PipelineRanking",
    5: "Eva",
    6: "Dashboard",
    7: "CTA",
};

const SCENES = SCRIPTS[variantArg].map((s) => ({
    id: s.id,
    name: SCENE_NAMES[s.id] || `Scene${s.id}`,
    text: s.text,
}));

// --- Generation -----------------------------------------------------------

const OUT_DIR = path.join(ROOT, "public", "audio", "vo", VOICE_NAME);
await fs.mkdir(OUT_DIR, { recursive: true });

async function synthesize(scene) {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`;
    const body = {
        text: scene.text,
        model_id: MODEL,
        voice_settings: {
            stability: 0.55,      // mais estável = menos emotivo, mais corporate
            similarity_boost: 0.75,
            style: 0.25,          // leve expressividade
            use_speaker_boost: true,
        },
    };

    const res = await fetch(url, {
        method: "POST",
        headers: {
            "xi-api-key": API_KEY,
            "Content-Type": "application/json",
            accept: "audio/mpeg",
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`ElevenLabs ${res.status}: ${err}`);
    }

    const buf = Buffer.from(await res.arrayBuffer());
    const outPath = path.join(OUT_DIR, `scene-${scene.id}.mp3`);
    await fs.writeFile(outPath, buf);
    return { outPath, bytes: buf.length };
}

console.log(`🎙  Gerando voz "${VOICE_NAME}" — ${VOICES[variantArg].label}\n    Model: ${MODEL} / ID: ${VOICE_ID}\n    Output: public/audio/vo/${VOICE_NAME}/\n`);

for (const scene of SCENES) {
    process.stdout.write(`  [${scene.id}] ${scene.name.padEnd(18)} "${scene.text.slice(0, 48)}..." `);
    try {
        const { bytes } = await synthesize(scene);
        console.log(`OK (${(bytes / 1024).toFixed(1)} kb)`);
    } catch (e) {
        console.log(`FAIL`);
        console.error(`      ${e.message}`);
    }
}

console.log(`\n✓ Concluído. Arquivos em ${path.relative(ROOT, OUT_DIR)}/`);
console.log(`  Abra SalesVideoV2.tsx e mude ENABLE_VOICEOVER para true.\n`);
