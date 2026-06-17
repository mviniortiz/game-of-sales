import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// eva-tts — narração por voz da EVA (demo do hero, Fase 1). Recebe um trecho de
// texto e devolve áudio mp3 (base64) gerado pelo ElevenLabs (voz feminina PT-BR,
// eleven_multilingual_v2). Se a chave não estiver configurada, devolve
// { ok:false, reason:"no_key" } pro front cair no fallback (SpeechSynthesis).
// Pública (a landing é pública); texto limitado pra controlar custo.

const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
// Voz padrão (Sarah, feminina, multilingual). Configurável por env.
const VOICE_ID = Deno.env.get("ELEVENLABS_VOICE_ID") || "EXAVITQu4vr4xnSDxMaL";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

function toBase64(buf: ArrayBuffer): string {
    const bytes = new Uint8Array(buf);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
}

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed" });

    if (!ELEVENLABS_API_KEY) return json(200, { ok: false, reason: "no_key" });

    try {
        const { text } = await req.json().catch(() => ({ text: "" }));
        const clean = String(text || "").trim().slice(0, 700);
        if (!clean) return json(400, { ok: false, error: "text vazio" });

        const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
            method: "POST",
            headers: {
                "xi-api-key": ELEVENLABS_API_KEY,
                "Content-Type": "application/json",
                Accept: "audio/mpeg",
            },
            body: JSON.stringify({
                text: clean,
                model_id: "eleven_multilingual_v2",
                voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
            }),
        });

        if (!resp.ok) {
            console.error("[eva-tts] elevenlabs error:", resp.status, await resp.text());
            return json(200, { ok: false, reason: "tts_error" });
        }

        const audio = toBase64(await resp.arrayBuffer());
        return json(200, { ok: true, audio, format: "mp3" });
    } catch (e) {
        console.error("[eva-tts] fatal:", e);
        return json(200, { ok: false, reason: "exception" });
    }
});
