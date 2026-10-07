import { supabase } from "@/integrations/supabase/client";
import { getAttribution } from "@/lib/attribution";

// Funil das páginas de captura, gravado em landing_events pela RPC
// log_landing_event. Complementa o GA4, que só carrega depois da primeira
// interação e por isso não vê quem entra e sai sem tocar na página.

export type FunnelEvent =
    | "view"
    | "scroll_50"
    | "scroll_90"
    | "cta_click"
    | "whatsapp_click"
    | "form_start"
    | "form_submit"
    | "form_error";

const SID_KEY = "vyz_lp_sid";
let memorySid: string | null = null;

function sessionId(): string {
    try {
        const saved = sessionStorage.getItem(SID_KEY);
        if (saved) return saved;
        const fresh = crypto.randomUUID();
        sessionStorage.setItem(SID_KEY, fresh);
        return fresh;
    } catch {
        memorySid ??= Math.random().toString(36).slice(2) + Date.now().toString(36);
        return memorySid;
    }
}

export function logLandingEvent(page: string, variant: string, event: FunnelEvent, props: Record<string, string | number> = {}) {
    try {
        const a = getAttribution();
        const payload = {
            event,
            page,
            variant,
            session_id: sessionId(),
            utm_source: a?.utm_source ?? null,
            utm_medium: a?.utm_medium ?? null,
            utm_campaign: a?.utm_campaign ?? null,
            utm_content: a?.utm_content ?? null,
            utm_term: a?.utm_term ?? null,
            fbclid: a?.fbclid ?? null,
            referrer: a?.referrer ?? null,
            props,
        };
        // RPC nova ainda fora dos tipos gerados.
        void supabase.rpc("log_landing_event" as never, { payload } as never).then(
            () => undefined,
            () => undefined,
        );
    } catch {
        // medição nunca derruba a página
    }
}
