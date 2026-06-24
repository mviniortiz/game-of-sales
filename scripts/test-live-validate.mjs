// VALIDAÇÃO (Fase 1): o modelo Live half-cascade aguenta o tour de 9 telas numa
// SESSÃO ÚNICA (com tools + voz Achernar), sem travar (turno vazio) nem cair (1011)?
// Se sim, podemos remover a reconexão-por-tela e ter memória/conversa.
// Uso: node scripts/test-live-validate.mjs [modelo]
//   ex: node scripts/test-live-validate.mjs gemini-live-2.5-flash-preview
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
const KEY = env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || Object.entries(env).find(([k]) => /PUBLISHABLE|ANON/i.test(k))?.[1];

const MODEL = process.argv[2] || "gemini-live-2.5-flash-preview";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// token efêmero via edge
const tr = await fetch(`${URL}/functions/v1/gemini-live-token`, {
    method: "POST", headers: { "content-type": "application/json", apikey: KEY, authorization: `Bearer ${KEY}` }, body: "{}",
});
const tj = await tr.json();
if (!tj.ok) { console.error("token falhou:", tj); process.exit(1); }
console.log("token ok; modelo de teste:", MODEL);

const SCREEN_ORDER = ["inicio", "inbox", "inbox-analise", "pipeline", "lead", "eva-studio", "eva-studio-criar", "metas", "ranking"];
const TOUR_PROMPT = {
    inicio: "Você está mostrando a CENTRAL DE COMANDO. Em 3 frases calorosas, explique que é aqui que o gestor começa o dia. Ao terminar, pare.",
    inbox: "Agora a CAIXA DE ENTRADA. Em 2 ou 3 frases, explique que são todas as conversas dos canais num lugar só. Ao terminar, pare.",
    "inbox-analise": "Você ABRIU a conversa da Carla e seu painel de análise apareceu. Em 3 frases, mostre que você leu a conversa, viu que é lead quente e já deixou a resposta sugerida. Ao terminar, pare.",
    pipeline: "Agora o PIPELINE. Em 3 frases, explique o funil: cada conversa vira oportunidade e você avisa do follow-up. Ao terminar, pare.",
    lead: "Agora o DETALHE DA OPORTUNIDADE. Em 3 frases, explique o contexto do lead, histórico e próximo passo. Ao terminar, pare.",
    "eva-studio": "Agora o EVA STUDIO. Em 2 ou 3 frases, diga que aqui se cria agentes para qualificação, follow-up, propostas e reativação. Ao terminar, pare.",
    "eva-studio-criar": "Você SELECIONOU o agente de Qualificação. Em 3 frases, mostre como é simples montar conversando. Ao terminar, pare.",
    metas: "Agora as METAS. Em 3 frases, explique o acompanhamento em tempo real e configurar meta por vendedor. Ao terminar, pare.",
    ranking: "Agora o RANKING, última tela. Em 2 frases, explique o placar da equipe de forma sadia. Ao terminar, pare.",
};
const SYSTEM = "Você é a EVA, a inteligência da Vyzon (Central Comercial com IA para agências que vendem por conversa). Fale sempre em português do Brasil, calorosa e consultiva, frases curtas. Demo GUIADA: o sistema diz qual tela explicar; explique só ela em 3 frases e pare. Se a pessoa perguntar, responda e pare. A EVA sugere, o time aprova. Não invente preços nem números.";
const TOOLS = [{ functionDeclarations: [
    { name: "navegar", description: "Abre uma tela.", parameters: { type: "OBJECT", properties: { tela: { type: "STRING", enum: SCREEN_ORDER } }, required: ["tela"] } },
    { name: "agendar", description: "Conduz o agendamento.", parameters: { type: "OBJECT", properties: { acao: { type: "STRING", enum: ["abrir", "selecionar", "confirmar"] } }, required: ["acao"] } },
]}];

const { GoogleGenAI } = await import("@google/genai");
const ai = new GoogleGenAI({ apiKey: tj.token, httpOptions: { apiVersion: "v1alpha" } });

let stepIdx = 0;
let stepAudio = 0, stepTextLen = 0;
let resolveStep = null;
let closed = null;
const results = [];

function waitStep() { return new Promise((res) => { resolveStep = res; }); }

let session;
try {
    session = await ai.live.connect({
        model: MODEL,
        config: {
            responseModalities: ["AUDIO"],
            systemInstruction: SYSTEM,
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Achernar" } } },
            thinkingConfig: { thinkingBudget: 0 },
            contextWindowCompression: { slidingWindow: {} },
            tools: TOOLS,
            outputAudioTranscription: {},
            inputAudioTranscription: {},
        },
        callbacks: {
            onopen: () => console.log("WS open"),
            onmessage: (msg) => {
                const sc = msg.serverContent;
                if (sc?.modelTurn?.parts) for (const p of sc.modelTurn.parts) if (p.inlineData?.data) stepAudio += p.inlineData.data.length;
                if (sc?.outputTranscription?.text) stepTextLen += sc.outputTranscription.text.length;
                if (msg.toolCall?.functionCalls?.length) {
                    const functionResponses = msg.toolCall.functionCalls.map((fc) => ({ id: fc.id, name: fc.name, response: { result: "ok" } }));
                    try { session.sendToolResponse({ functionResponses }); } catch {}
                }
                if (sc?.turnComplete && resolveStep) { const r = resolveStep; resolveStep = null; r("complete"); }
            },
            onerror: (e) => console.log("WS error", e?.message || e),
            onclose: (e) => { closed = { code: e?.code, reason: e?.reason }; console.log("WS close", e?.code, e?.reason); if (resolveStep) { const r = resolveStep; resolveStep = null; r("closed"); } },
        },
    });
} catch (e) {
    console.error("connect falhou:", e?.message || e);
    process.exit(1);
}

await sleep(800);
for (stepIdx = 0; stepIdx < SCREEN_ORDER.length; stepIdx++) {
    if (closed) { console.log(`PAROU: sessão caiu antes do passo ${stepIdx}`); break; }
    const screen = SCREEN_ORDER[stepIdx];
    stepAudio = 0; stepTextLen = 0;
    try { session.sendClientContent({ turns: [{ role: "user", parts: [{ text: TOUR_PROMPT[screen] }] }], turnComplete: true }); } catch (e) { console.log("send falhou", e?.message); break; }
    let outcome = await Promise.race([waitStep(), sleep(12000).then(() => "timeout")]);
    // RETRY na MESMA sessão se veio vazio (testa: re-nudge recupera sem reconectar?)
    let retried = false;
    if (stepAudio < 5000 && !closed) {
        retried = true;
        await sleep(500);
        try { session.sendClientContent({ turns: [{ role: "user", parts: [{ text: "Continue: " + TOUR_PROMPT[screen] }] }], turnComplete: true }); } catch {}
        outcome = await Promise.race([waitStep(), sleep(12000).then(() => "timeout")]);
    }
    const ok = stepAudio > 5000;
    results.push({ screen, ok, retried });
    console.log(`  [${stepIdx}] ${screen.padEnd(16)} ${ok ? "FALOU" : "VAZIO"}${retried ? " (após retry)" : ""} audio=${Math.round(stepAudio / 1024)}kb (${outcome})`);
    if (outcome === "closed") break;
    await sleep(600);
}

try { session.close(); } catch {}
const spoke = results.filter((r) => r.ok).length;
console.log(`\n=== RESULTADO: ${spoke}/${SCREEN_ORDER.length} telas falaram | sessão ${closed ? `CAIU (${closed.code})` : "INTEIRA"} ===`);
process.exit(0);
