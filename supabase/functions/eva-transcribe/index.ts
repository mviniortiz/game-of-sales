import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// eva-transcribe — transcrição de voz PRÓPRIA do Vyzon (substitui a Web Speech
// API do navegador, que só funciona bem no Chrome e depende do servidor do
// Google). Recebe um áudio curto (gravado no front com MediaRecorder, em base64)
// e devolve o texto via OpenAI Whisper. Estável em Chrome/Firefox/Safari/mobile.
//
// body: { audioBase64: string, mime?: string, language?: string }
// resp: { ok: true, text } | { ok:false, reason, message }

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

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

// Whisper precisa de um nome de arquivo com extensão válida pra detectar o
// container. Deriva a extensão do mime do MediaRecorder.
function extFromMime(mime: string): string {
    const m = mime.toLowerCase();
    if (m.includes("mp4") || m.includes("m4a") || m.includes("aac")) return "mp4";
    if (m.includes("ogg")) return "ogg";
    if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
    if (m.includes("wav")) return "wav";
    return "webm";
}

function base64ToBytes(b64: string): Uint8Array {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (req.method !== "POST") return json(405, { ok: false, reason: "method", message: "Method not allowed" });
    if (!OPENAI_API_KEY) return json(200, { ok: false, reason: "no_key", message: "Transcrição indisponível agora." });

    try {
        const body = await req.json().catch(() => ({}));
        const { audioBase64, mime, language } = body as { audioBase64?: string; mime?: string; language?: string };

        if (typeof audioBase64 !== "string" || audioBase64.length < 32) {
            return json(400, { ok: false, reason: "empty", message: "Áudio vazio. Tenta gravar de novo." });
        }
        // ~33% de inflação do base64; teto defensivo (~10MB de áudio) pra ditados curtos.
        if (audioBase64.length > 14_000_000) {
            return json(413, { ok: false, reason: "too_large", message: "Áudio muito longo. Grava trechos mais curtos." });
        }

        // Rate-limit por IP (mesmo padrão da eva-studio-chat): fail-open.
        const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "anon";
        try {
            const { data } = await admin.rpc("consume_rate_limit", {
                p_bucket: `eva-transcribe:${ip}`,
                p_limit: 120,
                p_window_seconds: 3600,
            });
            if (data === false) return json(429, { ok: false, reason: "rate_limit", message: "Muitas gravações. Aguarde um pouco." });
        } catch {
            /* fail-open */
        }

        let bytes: Uint8Array;
        try {
            bytes = base64ToBytes(audioBase64);
        } catch {
            return json(400, { ok: false, reason: "decode", message: "Não consegui ler o áudio. Tenta de novo." });
        }

        const mimeType = typeof mime === "string" && mime ? mime : "audio/webm";
        const ext = extFromMime(mimeType);
        const lang = typeof language === "string" && language ? language.slice(0, 5) : "pt";

        const audioBlob = new Blob([bytes], { type: mimeType });
        const formData = new FormData();
        formData.append("file", audioBlob, `audio.${ext}`);
        formData.append("model", "whisper-1");
        formData.append("language", lang);
        formData.append("response_format", "text");

        const whisper = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
            body: formData,
        });

        if (!whisper.ok) {
            const detail = await whisper.text().catch(() => "");
            console.error("[eva-transcribe] whisper error:", whisper.status, detail.slice(0, 300));
            return json(200, { ok: false, reason: "stt_failed", message: "Não consegui transcrever agora. Pode digitar que funciona igual." });
        }

        const text = (await whisper.text()).trim();
        return json(200, { ok: true, text });
    } catch (error) {
        console.error("[eva-transcribe] error:", error);
        return json(500, { ok: false, reason: "error", message: "Erro ao transcrever o áudio." });
    }
});
