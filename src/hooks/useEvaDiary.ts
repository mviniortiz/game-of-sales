// useEvaDiary — o que a EVA fez desde ontem, em linguagem de gente.
//
// O agente age sozinho no interno (abre card, move etapa, agenda retomada) e
// escreve rascunhos que o dono aprova no WhatsApp. Este hook junta isso numa
// linha do tempo com hora, mais o que está parado esperando aprovação e o passo
// a passo de cada execução (agent_steps), para quem quiser conferir.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { quoteRpc, type QuoteBoard } from "@/hooks/useQuoteBoard";

/** Ações que viram uma linha na linha do tempo. As de leitura pura entram
 *  somadas numa linha por dia: provam trabalho sem virar ruído. */
const ACOES: Record<string, (nome: string) => string> = {
    create_deal: (n) => `Abriu uma oportunidade para ${n}`,
    update_deal_stage: (n) => `Moveu ${n} de etapa`,
    schedule_followup: (n) => `Agendou a retomada de ${n}`,
    mark_deal_lost: (n) => `Marcou ${n} como perdido`,
    create_deal_note: (n) => `Registrou a leitura da conversa com ${n}`,
    log_deal_activity: (n) => `Anotou uma atividade em ${n}`,
};

const TOOLS_DE_LEITURA = new Set(["get_deal_context", "get_conversation_summary", "list_deals_needing_attention"]);

const TIPOS_DE_RASCUNHO = ["followup", "outbound_message", "objection", "proposal"];

const MAX_EVENTOS = 8;

export interface EventoEva {
    id: string;
    quando: Date;
    texto: string;
    /** Rascunho escrito pela EVA: ganha o ponto roxo. */
    rascunho: boolean;
}

export interface RascunhoPendente {
    id: string;
    codigo: string | null;
    quem: string;
    noWhatsapp: boolean;
}

export interface PassoDoTrace {
    ordem: number;
    texto: string;
    duracaoMs: number | null;
}

export interface TraceDeRun {
    runId: string;
    hora: Date;
    sobre: string | null;
    passos: PassoDoTrace[];
}

export interface EvaDiary {
    /** Mais recente primeiro. */
    eventos: EventoEva[];
    rascunhos: RascunhoPendente[];
    /** Passo a passo de cada execução do agente, para quem quiser conferir. */
    traces: TraceDeRun[];
    loading: boolean;
}

type Step = {
    tool_key: string | null;
    arguments: Record<string, unknown> | null;
    output: Record<string, unknown> | null;
    created_at: string;
    run_id?: string | null;
    kind?: string | null;
    duration_ms?: number | null;
};

type Sugestao = {
    id: string;
    deal_id: string | null;
    notified_at: string | null;
    suggestion: { contact_name?: string | null } | null;
};

/** Nome de cada ferramenta na língua de quem vende, não na do catálogo. */
const PASSO_LEGIVEL: Record<string, string> = {
    get_deal_context: "Leu o card",
    get_conversation_summary: "Leu a conversa",
    list_deals_needing_attention: "Procurou o que estava parado",
    create_deal: "Abriu a oportunidade",
    update_deal_stage: "Moveu de etapa",
    mark_deal_lost: "Marcou como perdido",
    schedule_followup: "Agendou a retomada",
    create_deal_note: "Registrou a leitura",
    log_deal_activity: "Anotou a atividade",
    draft_outbound_message: "Escreveu a mensagem",
};

function inicioDeOntem(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
}

function dealDoStep(s: Step): string {
    return (s.output?.deal_id as string) || (s.arguments?.deal_id as string) || "";
}

function nomeCurto(deal: { customer_name?: string | null; account_name?: string | null; title?: string | null }): string {
    return deal.customer_name || deal.account_name || deal.title || "sem nome";
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

async function buscarDiario(companyId: string): Promise<Omit<EvaDiary, "loading">> {
    const desde = inicioDeOntem();

    const [stepsRes, feitosRes, pendentesRes, propostasRes] = await Promise.all([
        supabase
            .from("agent_steps")
            .select("tool_key, arguments, output, created_at, run_id, kind, duration_ms")
            .eq("company_id", companyId)
            .eq("status", "ok")
            .gte("created_at", desde)
            .order("created_at", { ascending: true }),
        supabase
            .from("agent_suggestions")
            .select("id, deal_id, notified_at, created_at, suggestion")
            .eq("company_id", companyId)
            .in("kind", TIPOS_DE_RASCUNHO)
            .gte("created_at", desde)
            .order("created_at", { ascending: false })
            .limit(MAX_EVENTOS),
        supabase
            .from("agent_suggestions")
            .select("id, approval_code, deal_id, notified_at, suggestion")
            .eq("company_id", companyId)
            .eq("status", "pending")
            .in("kind", TIPOS_DE_RASCUNHO)
            .order("created_at", { ascending: false })
            .limit(5),
        // Proposta em PDF com valor: o valor saiu do arquivo (ou da legenda) e foi pro card.
        quoteRpc<QuoteBoard>("get_quote_board", { p_company_id: companyId, p_days: 2 }),
    ]);

    const steps = (stepsRes.data ?? []) as Step[];
    const feitos = (feitosRes.data ?? []) as Array<Sugestao & { created_at: string }>;
    const pendentes = (pendentesRes.data ?? []) as Array<Sugestao & { approval_code: string | null }>;
    // Placar indisponível (RPC fora do ar) não derruba a linha do tempo: só some a proposta.
    const propostas = (propostasRes.data?.items ?? []).filter(
        (q) => q.detected_by === "pdf" && q.amount != null && new Date(q.sent_at) >= new Date(desde),
    );

    // Um único lookup de nomes para tudo.
    const ids = new Set<string>();
    for (const s of steps) if (dealDoStep(s)) ids.add(dealDoStep(s));
    for (const r of [...feitos, ...pendentes]) if (r.deal_id) ids.add(r.deal_id);
    const nomePorDeal = new Map<string, string>();
    if (ids.size > 0) {
        const { data: deals } = await supabase
            .from("deals")
            .select("id, customer_name, account_name, title")
            .in("id", [...ids]);
        for (const d of deals ?? []) nomePorDeal.set(d.id, nomeCurto(d));
    }
    const nomeDe = (dealId: string | null | undefined, reserva?: string | null) =>
        (dealId && nomePorDeal.get(dealId)) || reserva || "um cliente";

    const eventos: EventoEva[] = [];

    for (const s of steps) {
        const frase = s.tool_key ? ACOES[s.tool_key] : undefined;
        if (!frase) continue;
        eventos.push({
            id: `step-${s.run_id ?? ""}-${s.created_at}-${s.tool_key}`,
            quando: new Date(s.created_at),
            texto: frase(nomeDe(dealDoStep(s), s.arguments?.customer_name as string | undefined)),
            rascunho: false,
        });
    }

    // Leituras somadas por dia, na hora da última.
    const leiturasPorDia = new Map<string, { n: number; ultima: string }>();
    for (const s of steps) {
        if (!s.tool_key || !TOOLS_DE_LEITURA.has(s.tool_key)) continue;
        const dia = new Date(s.created_at).toDateString();
        leiturasPorDia.set(dia, { n: (leiturasPorDia.get(dia)?.n ?? 0) + 1, ultima: s.created_at });
    }
    for (const [dia, { n, ultima }] of leiturasPorDia) {
        eventos.push({ id: `leitura-${dia}`, quando: new Date(ultima), texto: `Leu ${n} ${n === 1 ? "conversa" : "conversas"}`, rascunho: false });
    }

    for (const r of feitos) {
        const quem = nomeDe(r.deal_id, r.suggestion?.contact_name);
        eventos.push({
            id: `rascunho-${r.id}`,
            quando: new Date(r.created_at),
            texto: r.notified_at
                ? `Escreveu a retomada de ${quem} e mandou no seu WhatsApp para aprovar`
                : `Escreveu uma retomada para ${quem}`,
            rascunho: true,
        });
    }

    for (const q of propostas) {
        eventos.push({
            id: `proposta-${q.id}`,
            quando: new Date(q.sent_at),
            texto: `Registrou a proposta em PDF enviada a ${q.contact_name?.trim() || nomeDe(q.deal_id)}: ${brl(Number(q.amount))}`,
            rascunho: false,
        });
    }

    // Trace por execução: o dado sempre esteve em agent_steps. É o que responde
    // "como ela chegou nessa conclusão" sem exigir que a pessoa confie na EVA.
    const porRun = new Map<string, Step[]>();
    for (const st of steps) {
        if (!st.run_id) continue;
        porRun.set(st.run_id, [...(porRun.get(st.run_id) ?? []), st]);
    }
    const traces: TraceDeRun[] = [...porRun.entries()]
        .map(([runId, doRun]) => {
            const comDeal = doRun.find((st) => dealDoStep(st));
            return {
                runId,
                hora: new Date(doRun[0].created_at),
                sobre: comDeal ? nomePorDeal.get(dealDoStep(comDeal)) ?? null : null,
                passos: doRun.map((st, i) => ({
                    ordem: i + 1,
                    texto: st.kind === "llm_call"
                        ? "Pensou no próximo passo"
                        : PASSO_LEGIVEL[st.tool_key ?? ""] ?? (st.tool_key ?? "Passo"),
                    duracaoMs: st.duration_ms ?? null,
                })),
            };
        })
        .sort((a, b) => b.hora.getTime() - a.hora.getTime())
        .slice(0, 6);

    return {
        eventos: eventos.sort((a, b) => b.quando.getTime() - a.quando.getTime()).slice(0, MAX_EVENTOS),
        traces,
        rascunhos: pendentes.map((p) => ({
            id: p.id,
            codigo: p.approval_code,
            quem: nomeDe(p.deal_id, p.suggestion?.contact_name),
            noWhatsapp: Boolean(p.notified_at),
        })),
    };
}

export function useEvaDiary(): EvaDiary {
    const { companyId } = useAuth();
    const { activeCompanyId } = useTenant();
    const effectiveCompanyId = activeCompanyId || companyId;

    const query = useQuery({
        queryKey: ["eva-diary", effectiveCompanyId],
        enabled: !!effectiveCompanyId,
        staleTime: 60_000,
        queryFn: () => buscarDiario(effectiveCompanyId!),
    });

    return {
        eventos: query.data?.eventos ?? [],
        rascunhos: query.data?.rascunhos ?? [],
        traces: query.data?.traces ?? [],
        loading: query.isLoading,
    };
}
