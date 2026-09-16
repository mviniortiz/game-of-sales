// useEvaDiary — o que a EVA fez hoje, em linguagem de gente.
//
// Até 2026-08-24 nada de agent_runs/agent_steps aparecia no app: o agente agia
// sozinho e o dono não tinha como saber o quê. Este hook traduz os passos
// técnicos do loop em linhas legíveis, e junta o que está parado esperando
// aprovação no WhatsApp.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";

/** Ações que valem uma linha no diário. As de leitura pura entram somadas numa
 *  linha só: provam trabalho sem virar ruído. */
const ACOES = {
    create_deal: { verbo: "Abri", substantivo: (n: number) => (n === 1 ? "oportunidade" : "oportunidades") },
    update_deal_stage: { verbo: "Movi", substantivo: (n: number) => (n === 1 ? "card de etapa" : "cards de etapa") },
    schedule_followup: { verbo: "Agendei", substantivo: (n: number) => (n === 1 ? "retomada" : "retomadas") },
    mark_deal_lost: { verbo: "Marquei", substantivo: (n: number) => (n === 1 ? "card como perdido" : "cards como perdidos") },
    create_deal_note: { verbo: "Registrei", substantivo: (n: number) => (n === 1 ? "leitura" : "leituras") },
    log_deal_activity: { verbo: "Anotei", substantivo: (n: number) => (n === 1 ? "atividade" : "atividades") },
} as const;

const TOOLS_DE_LEITURA = new Set(["get_deal_context", "get_conversation_summary", "list_deals_needing_attention"]);

export interface LinhaDiario {
    chave: string;
    texto: string;
    detalhe: string | null;
}

export interface RascunhoPendente {
    id: string;
    codigo: string | null;
    quem: string;
    noWhatsapp: boolean;
}

export interface EvaDiary {
    linhas: LinhaDiario[];
    rascunhos: RascunhoPendente[];
    /** Passo a passo de cada execução do agente, para quem quiser conferir. */
    traces: TraceDeRun[];
    primeiraAcao: Date | null;
    trabalhou: boolean;
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

function inicioDoDia(): string {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
}

function idsDeDeal(steps: Step[]): string[] {
    const ids = new Set<string>();
    for (const s of steps) {
        const doArgumento = s.arguments?.deal_id;
        const doOutput = s.output?.deal_id;
        if (typeof doArgumento === "string") ids.add(doArgumento);
        if (typeof doOutput === "string") ids.add(doOutput);
    }
    return [...ids];
}

function nomeCurto(deal: { customer_name?: string | null; account_name?: string | null; title?: string | null }): string {
    return deal.customer_name || deal.account_name || deal.title || "sem nome";
}

/** Junta os nomes em "Maria, Studio Alfa e mais 2" — a lista inteira vira
 *  parede de texto no card. */
function listaCurta(nomes: string[], teto = 2): string | null {
    const unicos = [...new Set(nomes.filter(Boolean))];
    if (unicos.length === 0) return null;
    if (unicos.length <= teto) return unicos.join(", ");
    return `${unicos.slice(0, teto).join(", ")} e mais ${unicos.length - teto}`;
}

async function buscarDiario(companyId: string): Promise<Omit<EvaDiary, "loading">> {
    const desde = inicioDoDia();

    const [stepsRes, pendentesRes] = await Promise.all([
        supabase
            .from("agent_steps")
            .select("tool_key, arguments, output, created_at, run_id, kind, duration_ms")
            .eq("company_id", companyId)
            .eq("status", "ok")
            .gte("created_at", desde)
            .order("created_at", { ascending: true }),
        supabase
            .from("agent_suggestions")
            .select("id, approval_code, deal_id, notified_at, suggestion")
            .eq("company_id", companyId)
            .eq("status", "pending")
            .in("kind", ["followup", "outbound_message", "objection", "proposal"])
            .order("created_at", { ascending: false })
            .limit(5),
    ]);

    const steps = (stepsRes.data ?? []) as Step[];
    const pendentes = (pendentesRes.data ?? []) as Array<{
        id: string;
        approval_code: string | null;
        deal_id: string | null;
        notified_at: string | null;
        suggestion: { contact_name?: string | null } | null;
    }>;

    // Um único lookup de nomes para steps e rascunhos.
    const ids = new Set(idsDeDeal(steps));
    for (const p of pendentes) if (p.deal_id) ids.add(p.deal_id);

    const nomePorDeal = new Map<string, string>();
    if (ids.size > 0) {
        const { data: deals } = await supabase
            .from("deals")
            .select("id, customer_name, account_name, title")
            .in("id", [...ids]);
        for (const d of deals ?? []) nomePorDeal.set(d.id, nomeCurto(d));
    }

    const linhas: LinhaDiario[] = [];
    let lidas = 0;

    for (const [tool, copy] of Object.entries(ACOES)) {
        const doTipo = steps.filter((s) => s.tool_key === tool);
        if (doTipo.length === 0) continue;

        const nomes = doTipo.map((s) => {
            const id = (s.output?.deal_id as string) || (s.arguments?.deal_id as string) || "";
            return nomePorDeal.get(id) || (s.arguments?.customer_name as string) || "";
        });

        linhas.push({
            chave: tool,
            texto: `${copy.verbo} ${doTipo.length} ${copy.substantivo(doTipo.length)}`,
            detalhe: listaCurta(nomes),
        });
    }

    for (const s of steps) {
        if (s.tool_key && TOOLS_DE_LEITURA.has(s.tool_key)) lidas += 1;
    }
    if (lidas > 0) {
        linhas.push({
            chave: "leitura",
            texto: `Li ${lidas} ${lidas === 1 ? "contexto" : "contextos"} de conversa`,
            detalhe: null,
        });
    }

    // Trace por execução: o dado sempre esteve em agent_steps e nunca apareceu
    // na tela. É o que responde "como ela chegou nessa conclusão" sem exigir
    // que a pessoa confie na palavra da EVA.
    const porRun = new Map<string, Step[]>();
    for (const st of steps) {
        if (!st.run_id) continue;
        const lista = porRun.get(st.run_id) ?? [];
        lista.push(st);
        porRun.set(st.run_id, lista);
    }

    const traces: TraceDeRun[] = [...porRun.entries()]
        .map(([runId, doRun]) => {
            const comDeal = doRun.find((st) => (st.arguments?.deal_id as string) || (st.output?.deal_id as string));
            const dealId = ((comDeal?.arguments?.deal_id as string) || (comDeal?.output?.deal_id as string)) ?? "";
            return {
                runId,
                hora: new Date(doRun[0].created_at),
                sobre: nomePorDeal.get(dealId) ?? null,
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
        linhas,
        traces,
        rascunhos: pendentes.map((p) => ({
            id: p.id,
            codigo: p.approval_code,
            quem: (p.deal_id && nomePorDeal.get(p.deal_id)) || p.suggestion?.contact_name || "sem nome",
            noWhatsapp: Boolean(p.notified_at),
        })),
        primeiraAcao: steps.length > 0 ? new Date(steps[0].created_at) : null,
        trabalhou: steps.length > 0,
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
        linhas: query.data?.linhas ?? [],
        traces: query.data?.traces ?? [],
        rascunhos: query.data?.rascunhos ?? [],
        primeiraAcao: query.data?.primeiraAcao ?? null,
        trabalhou: query.data?.trabalhou ?? false,
        loading: query.isLoading,
    };
}
