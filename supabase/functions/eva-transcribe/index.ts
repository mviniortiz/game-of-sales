import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { base64ToBytes, transcrever } from "../_shared/transcribe.ts";

// eva-transcribe — transcrição de voz PRÓPRIA do Vyzon (substitui a Web Speech
// API do navegador, que só funciona bem no Chrome e depende do servidor do
// Google). Recebe um áudio curto (gravado no front com MediaRecorder, em base64)
// e devolve o texto via OpenAI Whisper. Estável em Chrome/Firefox/Safari/mobile.
//
// body: { audioBase64: string, mime?: string, language?: string }
// resp: { ok: true, text } | { ok:false, reason, message }

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (req.method !== "POST") return json(405, { ok: false, reason: "method", message: "Method not allowed" });
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

        let bytes: Uint8Array<ArrayBuffer>;
        try {
            bytes = base64ToBytes(audioBase64);
        } catch {
            return json(400, { ok: false, reason: "decode", message: "Não consegui ler o áudio. Tenta de novo." });
        }

        const mimeType = typeof mime === "string" && mime ? mime : "audio/webm";
        const lang = typeof language === "string" && language ? language.slice(0, 5) : "pt";
        const r = await transcrever(bytes, mimeType, lang);
        if (!r.ok) {
            if (r.reason === "no_key") return json(200, { ok: false, reason: "no_key", message: "Transcrição indisponível agora." });
            console.error("[eva-transcribe] whisper error:", r.detail);
            return json(200, { ok: false, reason: "stt_failed", message: "Não consegui transcrever agora. Pode digitar que funciona igual." });
        }
        const text = r.text;
        return json(200, { ok: true, text });
    } catch (error) {
        console.error("[eva-transcribe] error:", error);
        return json(500, { ok: false, reason: "error", message: "Erro ao transcrever o áudio." });
    }
});
