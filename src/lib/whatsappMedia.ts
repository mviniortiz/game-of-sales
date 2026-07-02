// INBOX.PERF.2 — Mídia do WhatsApp direto do Storage (signed URL) em vez de
// base64 via edge getMedia. O webhook já baixa a mídia na entrada e grava
// `media_ref.storage_path` (bucket privado whatsapp-media); a policy
// whatsapp_media_select_company permite o authenticated assinar URLs da pasta
// da própria company. A edge getMedia continua como fallback pra mensagens
// sem storage_path (mídia antiga ou captura que falhou).
import { supabase } from "@/integrations/supabase/client";

const SIGNED_URL_TTL_S = 60 * 60; // 1h — mídia é imutável, TTL longo é seguro
/** Margem antes de expirar em que o cache deixa de valer (re-assina). */
const EXPIRY_SAFETY_MS = 60_000;

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

/** Gera (com cache) uma signed URL pro arquivo no bucket whatsapp-media.
 *  Retorna null se a policy não permitir ou o objeto não existir — o caller
 *  deve cair pro fallback via edge. */
export async function getSignedWhatsAppMediaUrl(storagePath: string): Promise<string | null> {
    if (!storagePath) return null;
    const cached = signedUrlCache.get(storagePath);
    if (cached && cached.expiresAt - EXPIRY_SAFETY_MS > Date.now()) return cached.url;
    try {
        const { data, error } = await supabase.storage
            .from("whatsapp-media")
            .createSignedUrl(storagePath, SIGNED_URL_TTL_S);
        if (error || !data?.signedUrl) return null;
        signedUrlCache.set(storagePath, {
            url: data.signedUrl,
            expiresAt: Date.now() + SIGNED_URL_TTL_S * 1000,
        });
        return data.signedUrl;
    } catch {
        return null;
    }
}

/** Resolve a melhor fonte da mídia: Storage (signed URL, barato) primeiro,
 *  edge getMedia (base64, caro) como fallback. */
export async function resolveWhatsAppMediaSrc(
    messageId: string,
    storagePath: string | undefined,
    getMediaFallback: (messageId: string) => Promise<string | null>,
): Promise<string | null> {
    if (storagePath) {
        const url = await getSignedWhatsAppMediaUrl(storagePath);
        if (url) return url;
    }
    return getMediaFallback(messageId);
}
