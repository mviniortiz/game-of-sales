// DEMO.SYNC — gera a narração PRÉ-RENDERIZADA do tour da demo (fase
// roteirizada) com o endpoint with-timestamps do ElevenLabs: mp3 por cena +
// timestamps POR FRASE (derivados dos timestamps por caractere), salvos em
// public/demo-tour/. Rodar 1x (e re-rodar só quando o roteiro mudar):
//   node scripts/generate-demo-narration.mjs
// Requer ELEVENLABS_API_KEY no .env. Mesma voz/modelo da edge eva-tts.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "public", "demo-tour");
mkdirSync(outDir, { recursive: true });

const env = readFileSync(resolve(root, ".env"), "utf8");
const API_KEY = (env.match(/^ELEVENLABS_API_KEY=(.+)$/m) || [])[1]?.trim();
if (!API_KEY) { console.error("ELEVENLABS_API_KEY não encontrada no .env"); process.exit(1); }

const VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Sarah (mesma da edge eva-tts)
const MODEL_ID = "eleven_multilingual_v2";

// Roteiro FINAL da EVA por cena (1ª pessoa, tom caloroso e consultivo).
// Mantido alinhado com SCREEN_CAPTION/TOUR_PROMPT do DemoLiveStage.
// DEMO.RITMO.2 (2026-07-28): roteiro encurtado pra ~8-10s por cena (o core
// tinha 54s de áudio; visitante de site não espera cena de 15-20s). O
// essencial fica; o "seu time aprova" fica; o resto era gordura.
const SCRIPT = {
    "inicio": "Essa é a Central de Comando. Eu leio a operação inteira e te mostro o que precisa de atenção agora, com o próximo passo de cada conversa.",
    "inbox": "Essa é a Caixa de Entrada: todas as conversas num lugar só, na ordem do que precisa de resposta agora.",
    "inbox-analise": "Aqui eu li a conversa da Carla inteira: lead quente, com intenção de preço. A resposta já está pronta, e seu time revisa e aprova antes de enviar.",
    "pipeline": "E esse é o Pipeline: cada conversa vira uma oportunidade no funil, e eu aviso quando alguém precisa de follow-up.",
    "lead": "No detalhe da oportunidade você vê o contexto, o histórico da conversa e o próximo passo que eu sugiro.",
    "eva-studio": "Esse é o EVA Studio: aqui você monta agentes especialistas de qualificação, follow-up, propostas e reativação.",
    "eva-studio-criar": "Criar um agente é uma conversa: você responde algumas perguntas e ele fica pronto em minutos, já qualificando seus leads.",
    "metas": "Em Metas você acompanha o objetivo do time em tempo real, e eu mostro o quanto falta e o ritmo necessário.",
    "ranking": "E esse é o Ranking, o placar da equipe: motiva o time sem expor ninguém.",
};

// mesma quebra de frases do DemoLiveStage (legenda por frase)
function splitSentences(t) {
    const out = [];
    let cur = "";
    for (const ch of t) {
        cur += ch;
        if (".!?…".indexOf(ch) >= 0) { const s = cur.trim(); if (s) out.push(s); cur = ""; }
    }
    const tail = cur.trim();
    if (tail) out.push(tail);
    return out;
}

async function tts(text) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/with-timestamps`, {
        method: "POST",
        headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
            text,
            model_id: MODEL_ID,
            voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
        }),
    });
    if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return res.json(); // { audio_base64, alignment: { characters, character_start_times_seconds, character_end_times_seconds } }
}

// timestamps por caractere → [start, end] por FRASE
function sentenceTimings(text, alignment) {
    const sentences = splitSentences(text);
    const chars = alignment.characters;
    const starts = alignment.character_start_times_seconds;
    const ends = alignment.character_end_times_seconds;
    const timings = [];
    let cursor = 0;
    for (const sen of sentences) {
        // acha a frase na sequência de caracteres do alinhamento (mesmo texto)
        const joined = chars.join("");
        const idx = joined.indexOf(sen, cursor);
        if (idx < 0) throw new Error(`frase não encontrada no alinhamento: "${sen.slice(0, 40)}…"`);
        const endIdx = idx + sen.length - 1;
        timings.push({ text: sen, start: starts[idx], end: ends[endIdx] });
        cursor = endIdx + 1;
    }
    return timings;
}

const manifest = {};
for (const [screen, text] of Object.entries(SCRIPT)) {
    process.stdout.write(`→ ${screen}… `);
    const data = await tts(text);
    writeFileSync(resolve(outDir, `${screen}.mp3`), Buffer.from(data.audio_base64, "base64"));
    const sentences = sentenceTimings(text, data.alignment);
    manifest[screen] = { text, duration: sentences[sentences.length - 1].end, sentences };
    console.log(`ok (${manifest[screen].duration.toFixed(1)}s, ${sentences.length} frases)`);
}
writeFileSync(resolve(outDir, "narration.json"), JSON.stringify(manifest, null, 2));
console.log(`\nGerado em public/demo-tour/ (${Object.keys(manifest).length} cenas + narration.json)`);
