import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAttribution } from "@/lib/attribution";
import { ehInterno, trackEvent, type EventParams } from "@/lib/analytics";

// Funil das páginas de captura, gravado em landing_events pela RPC
// log_landing_event. Complementa o GA4, que só carrega depois da primeira
// interação e por isso não vê quem entra e sai sem tocar na página.
// As ações (clique, download, formulário, WhatsApp) saem daqui também para o
// GA4, com o mesmo page/variant/props: quem mede chama só logLandingEvent.

export type FunnelEvent =
    | "view"
    | "scroll_50"
    | "scroll_90"
    | "cta_click"
    | "whatsapp_click"
    | "form_start"
    | "form_submit"
    | "form_error"
    | "section_view";

// Ação da landing → evento do GA4. Visita e rolagem ficam de fora: o GA4 já tem
// page_view e scroll próprios.
export const LANDING_GA4 = {
    cta_click: "landing_cta_click",
    download: "landing_download",
    whatsapp_click: "landing_whatsapp_click",
    form_start: "landing_form_start",
    form_submit: "landing_form_submit",
} as const;

// cta_click nesses lugares é download de arquivo (planilha, Word, PDF do gerador).
const LUGAR_DE_DOWNLOAD = new Set(["download", "baixar_pdf"]);

function eventoGa4(event: FunnelEvent, props: Record<string, string | number>): string | null {
    if (event === "cta_click") return LUGAR_DE_DOWNLOAD.has(String(props.placement)) ? LANDING_GA4.download : LANDING_GA4.cta_click;
    if (event === "whatsapp_click" || event === "form_start" || event === "form_submit") return LANDING_GA4[event];
    return null;
}

// O banco aceita 60 eventos por sessão. Visita, rolagem e seção vista param em
// 40, para sobrar lugar para o clique e o envio de quem navegou muito antes de
// chegar no cadastro (duas sessões de novembro bateram no teto).
const RUIDO = new Set<FunnelEvent>(["view", "scroll_50", "scroll_90", "section_view"]);
const TETO_RUIDO = 40;
const CONTA_KEY = "vyz_lp_n";
let contaMemoria = 0;

function cabeNoTeto(event: FunnelEvent): boolean {
    let n = contaMemoria;
    try {
        n = Number(sessionStorage.getItem(CONTA_KEY)) || 0;
    } catch {
        // sem storage: conta só nesta página
    }
    if (RUIDO.has(event) && n >= TETO_RUIDO) return false;
    contaMemoria = n + 1;
    try {
        sessionStorage.setItem(CONTA_KEY, String(n + 1));
    } catch {
        // idem
    }
    return true;
}

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

// Visita e rolagem de uma página de conteúdo (blog): uma visita por página e
// carregamento, e scroll_50/scroll_90 uma vez cada. Mesmo funil da home, para o
// blog aparecer no mesmo relatório (page='blog', variant=slug).
const viewedContent = new Set<string>();
export function useContentFunnel(page: string, variant: string | undefined) {
    useEffect(() => {
        if (!variant) return;
        const key = `${page}:${variant}`;
        if (!viewedContent.has(key)) {
            viewedContent.add(key);
            logLandingEvent(page, variant, "view", { path: window.location.pathname });
        }
        const seen = new Set<string>();
        const onScroll = () => {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            if (max <= 0) return;
            const ratio = window.scrollY / max;
            for (const [mark, event] of [[0.5, "scroll_50"], [0.9, "scroll_90"]] as const) {
                if (ratio >= mark && !seen.has(event)) {
                    seen.add(event);
                    logLandingEvent(page, variant, event);
                }
            }
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, [page, variant]);
}

export function logLandingEvent(page: string, variant: string, event: FunnelEvent, props: Record<string, string | number> = {}) {
    try {
        const ga4 = eventoGa4(event, props);
        if (ga4) trackEvent(ga4, { page, variant, ...props } as EventParams);
    } catch {
        // medição nunca derruba a página
    }
    try {
        if (!cabeNoTeto(event)) return;
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
            // Aparelho do time: dá para tirar da conta do funil no SQL.
            props: ehInterno() ? { ...props, interno: 1 } : props,
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
