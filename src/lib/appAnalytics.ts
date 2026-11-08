// Analytics do app logado (plano: docs/analytics/plano-de-tagging-app.md).
// trackApp grava em duas camadas: app_events no nosso banco (por empresa e
// pessoa, em lote) e GA4 + Clarity pelo trackBehavior. Nunca joga exceção:
// se algo falhar, a tela segue.
import { isDemoSession, trackBehavior } from "@/lib/analytics";

export const APP_EVENTS = {
    // Navegação
    SESSION_STARTED: "app_session_started",
    SCREEN_VIEWED: "screen_viewed",
    SEARCH_USED: "search_used",
    LIST_MORE_SHOWN: "list_more_shown",
    // Ativação
    WHATSAPP_CONNECT_STARTED: "whatsapp_connect_started",
    WHATSAPP_CONNECTED: "whatsapp_connected",
    WHATSAPP_CONNECT_FAILED: "whatsapp_connect_failed",
    RAIOX_VIEWED: "raiox_viewed",
    // Conversas e Lume
    CONVERSATION_OPENED: "conversation_opened",
    MESSAGE_SENT: "message_sent",
    LUME_ANALYSIS_REQUESTED: "lume_analysis_requested",
    // Funil, orçamentos e obras
    DEAL_CREATED: "deal_created",
    DEAL_STAGE_CHANGED: "deal_stage_changed",
    QUOTE_OUTCOME_SET: "quote_outcome_set",
    FILTER_APPLIED: "filter_applied",
    // Lembretes
    REMINDER_COMPLETED: "reminder_completed",
    REMINDER_SNOOZED: "reminder_snoozed",
} as const;

export type AppEventName = (typeof APP_EVENTS)[keyof typeof APP_EVENTS] | `eva_suggestion_${string}` | "team_invite_sent";
type Props = Record<string, string | number | boolean>;

/** Nome curto da tela a partir da rota. */
export function telaDaRota(pathname: string): string {
    const p = pathname.split("/")[1] || "inicio";
    const MAPA: Record<string, string> = {
        inicio: "inicio",
        dashboard: "inicio",
        inbox: "conversas",
        pipeline: "funil",
        crm: "funil",
        deals: "negocio",
        orcamentos: "orcamentos",
        obras: "obras",
        admin: "resultados",
        "eva-studio": "lume",
        eva: "lume",
        "configurar-eva": "lume_config",
        agenda: "agenda",
        calendario: "agenda",
        configuracoes: "config",
        profile: "config",
        integracoes: "config",
        upgrade: "assinatura",
        checkout: "assinatura",
        docs: "ajuda",
        "raio-x": "raio_x",
        relatorio: "raio_x",
    };
    return MAPA[p] ?? p.replace(/[^a-z0-9_]/gi, "_").slice(0, 30);
}

// ── Contexto e fila ─────────────────────────────────────────────────────────

const SID_KEY = "vyz_app_sid";
let empresaAtual: string | null = null;
let telaAtual = "";
let abaAtual = "";
let fila: Array<{ event: string; tela: string; aba: string; props: Props; at: string; session_id: string }> = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function sessionId(): string {
    try {
        const s = sessionStorage.getItem(SID_KEY);
        if (s) return s;
        const novo = crypto.randomUUID();
        sessionStorage.setItem(SID_KEY, novo);
        return novo;
    } catch {
        return "sem-sessao";
    }
}

/** Empresa efetiva (activeCompanyId || companyId) e tela atual, ditas pelo layout. */
export function setAppContext(ctx: { empresa?: string | null; tela?: string; aba?: string }) {
    if (ctx.empresa !== undefined) empresaAtual = ctx.empresa;
    if (ctx.tela !== undefined) telaAtual = ctx.tela;
    if (ctx.aba !== undefined) abaAtual = ctx.aba;
}

async function enviar() {
    timer = null;
    if (!fila.length) return;
    const lote = fila.splice(0, 50);
    try {
        // Carrega o cliente só na hora de enviar: quem só importa trackApp não abre conexão.
        const { supabase } = await import("@/integrations/supabase/client");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC nova, fora dos tipos gerados
        await (supabase as any).rpc("log_app_events", { eventos: lote, empresa: empresaAtual });
    } catch {
        // Analytics nunca derruba a tela; o lote perdido não volta.
    }
    if (fila.length) agendar(0);
}

function agendar(ms = 5000) {
    if (timer) return;
    timer = setTimeout(() => void enviar(), ms);
}

if (typeof window !== "undefined") {
    // Aba escondida ou fechando: manda o que tiver na fila.
    const agora = () => {
        if (timer) clearTimeout(timer);
        timer = null;
        void enviar();
    };
    document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && agora());
    window.addEventListener("pagehide", agora);
}

/**
 * Registra um evento do app. `props` só com texto, número ou sim/não, nunca
 * nome, telefone, e-mail ou texto de mensagem de cliente.
 */
export function trackApp(event: AppEventName, props: Props = {}) {
    try {
        const tela = (props.tela as string) ?? telaAtual;
        const aba = (props.aba as string) ?? abaAtual;
        trackBehavior(event, { ...props, tela, ...(aba ? { aba } : {}) });
        if (isDemoSession()) return;
        const { tela: _t, aba: _a, ...resto } = props;
        fila.push({ event, tela, aba, props: resto, at: new Date().toISOString(), session_id: sessionId() });
        agendar();
    } catch {
        // idem
    }
}

/** Só para testes: esvazia a fila sem enviar. */
export function _limparFila() {
    fila = [];
    if (timer) clearTimeout(timer);
    timer = null;
}
export function _fila() {
    return fila;
}
