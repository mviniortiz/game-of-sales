// ─────────────────────────────────────────────────────────────────────────────
// F5C.6 (2026-05-25) — useCentralEvaAssistant
//
// Torna o input da EVA na Central funcional de forma CONTROLADA. Respostas
// DETERMINÍSTICAS, derivadas só dos dados já carregados em useCommandCenterData
// (+ pipeline de useInicioData). Sem IA, sem edge function, sem mutation, sem
// enviar mensagem, sem mover deal, sem reanalisar conversa, sem chamar
// whatsapp-copilot/Evolution/Meta.
//
// Edge function central-eva-assistant (fallback LLM) NÃO foi criada nesta versão
// — o briefing pede pra começar local/determinístico, e os 6 comandos cobrem o
// escopo sem LLM.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from "react";
import type {
    AttentionItem,
    CommandCenterMetrics,
    DailyPriority,
    EvaHighlight,
    RecentActivityItem,
} from "./useCommandCenterData";

export type EvaAssistantState =
    | "idle"
    | "loading"
    | "answered"
    | "error"
    | "out_of_scope";

export type EvaActionType = "conversation" | "deal" | "context" | "pipeline";

export interface EvaAction {
    label: string;
    href: string;
    type: EvaActionType;
}

export interface EvaResponse {
    answer: string;
    actions: EvaAction[];
    confidence: "high" | "medium" | "low";
}

export type CentralEvaCommandId =
    | "resolve_now"
    | "leads_no_reply"
    | "stale_deals"
    | "today_summary"
    | "pipeline_stuck"
    | "eva_context_gaps";

export interface SuggestedCommand {
    id: CentralEvaCommandId;
    label: string;
}

// Chips sugeridos (ordem = ordem de exibição)
export const CENTRAL_EVA_COMMANDS: SuggestedCommand[] = [
    { id: "resolve_now", label: "O que preciso resolver agora?" },
    { id: "leads_no_reply", label: "Quais leads estão sem resposta?" },
    { id: "stale_deals", label: "Quais oportunidades estão paradas?" },
    { id: "today_summary", label: "Resumo da operação de hoje" },
    { id: "pipeline_stuck", label: "Onde meu pipeline está travando?" },
    { id: "eva_context_gaps", label: "Quais conversas precisam de contexto da EVA?" },
];

interface PipelineStageLite {
    name: string;
    count: number;
    key: string;
}

export interface CentralEvaInput {
    metrics: CommandCenterMetrics | null;
    attentionItems: AttentionItem[];
    dailyPriorities: DailyPriority[];
    evaHighlights: EvaHighlight[];
    recentActivity: RecentActivityItem[];
    pipelineStages: PipelineStageLite[];
    pipelineTotal: number;
    dataError?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hrefToType(href: string): EvaActionType {
    if (href.startsWith("/deals/")) return "deal";
    if (href.startsWith("/configuracoes/eva")) return "context";
    if (href.startsWith("/pipeline")) return "pipeline";
    return "conversation"; // /inbox…
}

function defaultLabel(type: EvaActionType): string {
    switch (type) {
        case "deal": return "Ver oportunidade";
        case "context": return "Completar contexto da EVA";
        case "pipeline": return "Ver pipeline";
        default: return "Abrir conversa";
    }
}

// Higiene de CTA: só href truthy, sem duplicado, no máximo `limit`.
function capActions(acts: EvaAction[], limit = 3): EvaAction[] {
    const seen = new Set<string>();
    const out: EvaAction[] = [];
    for (const a of acts) {
        if (!a.href || seen.has(a.href)) continue;
        seen.add(a.href);
        out.push(a);
        if (out.length >= limit) break;
    }
    return out;
}

// Ações de conversa: priorities (source conversation) + attention com conversationId.
function conversationActions(input: CentralEvaInput): EvaAction[] {
    const acts: EvaAction[] = [];
    for (const p of input.dailyPriorities) {
        if (p.source === "conversation" && p.href) {
            acts.push({ label: "Abrir conversa", href: p.href, type: "conversation" });
        }
    }
    for (const it of input.attentionItems) {
        if (it.conversationId) {
            acts.push({ label: "Abrir conversa", href: `/inbox?conversationId=${it.conversationId}`, type: "conversation" });
        }
    }
    return acts;
}

function norm(s: string): string {
    return s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

// Roteia pergunta livre pra um dos 6 comandos. null = fora de escopo.
// Ordem importa (pipeline antes de "parado"; "sem resposta" antes de deal).
function routeQuestion(question: string): CentralEvaCommandId | null {
    const t = norm(question);
    if (!t.trim()) return null;
    if (/(pipeline|funil|travand|gargalo|etapa|estagio)/.test(t)) return "pipeline_stuck";
    if (/(sem resposta|aguardando|sem retorno|nao respond|nao respondi|responder)/.test(t)) return "leads_no_reply";
    if (/(oportunidad|\bdeal|negocio|parad)/.test(t)) return "stale_deals";
    if (/(context|conhecimento|lacuna|\bgap)/.test(t)) return "eva_context_gaps";
    if (/(resumo|panorama|visao geral|operacao|como esta|como estamos|do dia|de hoje)/.test(t)) return "today_summary";
    if (/(resolv|agora|priorid|urgente|primeiro|foco)/.test(t)) return "resolve_now";
    return null;
}

// ─── Builders determinísticos ────────────────────────────────────────────────

function respondTo(cmd: CentralEvaCommandId, input: CentralEvaInput): EvaResponse | "error" {
    switch (cmd) {
        case "resolve_now": {
            const top = input.dailyPriorities.slice(0, 3);
            if (top.length === 0 && input.attentionItems.length === 0) {
                return {
                    answer: "Sem prioridades críticas agora. Continuo de olho nas conversas e te aviso quando aparecer algo urgente.",
                    actions: [],
                    confidence: "high",
                };
            }
            const parts: string[] = [];
            if (top.length > 0) {
                const n = input.dailyPriorities.length;
                parts.push(`Você tem ${n} ${n === 1 ? "prioridade" : "prioridades"} pra resolver agora.`);
                parts.push(`Mais urgente: ${top[0].title}.`);
                if (top[1]) parts.push(`Em seguida: ${top[1].title}${top[2] ? ` e ${top[2].title}` : ""}.`);
            } else {
                const a = input.attentionItems.length;
                parts.push(`${a} ${a === 1 ? "ponto" : "pontos"} de atenção na operação. Veja os destaques abaixo.`);
            }
            const priorityActs: EvaAction[] = top
                .filter((p) => p.href)
                .map((p) => {
                    const type = hrefToType(p.href!);
                    return {
                        label: p.actionLabel && p.actionLabel !== "—" ? p.actionLabel : defaultLabel(type),
                        href: p.href!,
                        type,
                    };
                });
            const actions = capActions(priorityActs.length > 0 ? priorityActs : conversationActions(input), 3);
            return { answer: parts.join(" "), actions, confidence: "high" };
        }

        case "leads_no_reply": {
            const need = input.metrics?.needsFollowUp ?? 0;
            const acts = capActions(conversationActions(input), 3);
            if (need === 0 && acts.length === 0) {
                return {
                    answer: "Nenhum lead esperando resposta agora. Quando alguém ficar sem retorno, eu aponto aqui.",
                    actions: [],
                    confidence: "high",
                };
            }
            const examples = [
                ...input.dailyPriorities.filter((p) => p.source === "conversation").map((p) => p.title),
                ...input.attentionItems.filter((a) => a.conversationId).map((a) => a.title),
            ].slice(0, 2);
            const count = need || acts.length;
            let answer = `${count} ${count === 1 ? "conversa aguardando" : "conversas aguardando"} resposta.`;
            if (examples.length) answer += ` Ex.: ${examples.join("; ")}.`;
            const finalActs = acts.length > 0 ? acts : [{ label: "Abrir Inbox", href: "/inbox", type: "conversation" as const }];
            return { answer, actions: finalActs, confidence: "high" };
        }

        case "stale_deals": {
            // Dedup por href de deal (priorities source deal + attention stale_deal)
            const dealMap = new Map<string, string>(); // href -> title
            for (const p of input.dailyPriorities) {
                if (p.source === "deal" && p.href && !dealMap.has(p.href)) dealMap.set(p.href, p.title);
            }
            for (const a of input.attentionItems) {
                if (a.type === "stale_deal" && a.dealId) {
                    const href = `/deals/${a.dealId}`;
                    if (!dealMap.has(href)) dealMap.set(href, a.title);
                }
            }
            const entries = Array.from(dealMap.entries());
            if (entries.length === 0) {
                return {
                    answer: "Nenhuma oportunidade parada no momento. Os deals abertos tiveram atividade recente.",
                    actions: input.pipelineTotal > 0
                        ? [{ label: "Ver pipeline", href: "/pipeline", type: "pipeline" }]
                        : [],
                    confidence: "medium",
                };
            }
            const titles = entries.slice(0, 2).map(([, t]) => t);
            const answer = `${entries.length} ${entries.length === 1 ? "oportunidade parada" : "oportunidades paradas"} sem atualização recente. Ex.: ${titles.join("; ")}.`;
            const acts: EvaAction[] = entries.map(([href]) => ({ label: "Ver oportunidade", href, type: "deal" as const }));
            acts.push({ label: "Ver pipeline", href: "/pipeline", type: "pipeline" });
            return { answer, actions: capActions(acts, 3), confidence: "high" };
        }

        case "today_summary": {
            const m = input.metrics;
            if (!m) return "error";
            const np = input.dailyPriorities.length;
            const answer =
                `Hoje: ${m.activeConversations} ${m.activeConversations === 1 ? "conversa ativa" : "conversas ativas"}, ` +
                `${m.hotLeads} ${m.hotLeads === 1 ? "lead quente" : "leads quentes"}, ` +
                `${m.needsFollowUp} aguardando resposta e ${m.opportunitiesOpen} ${m.opportunitiesOpen === 1 ? "oportunidade aberta" : "oportunidades abertas"}. ` +
                `${np} ${np === 1 ? "prioridade" : "prioridades"} pra resolver e ${input.recentActivity.length} ${input.recentActivity.length === 1 ? "movimento recente" : "movimentos recentes"}.`;
            const acts: EvaAction[] = [];
            const first = input.dailyPriorities[0];
            if (first?.href) {
                const type = hrefToType(first.href);
                acts.push({ label: first.actionLabel && first.actionLabel !== "—" ? first.actionLabel : defaultLabel(type), href: first.href, type });
            }
            acts.push({ label: "Abrir Inbox", href: "/inbox", type: "conversation" });
            if (input.pipelineTotal > 0) acts.push({ label: "Ver pipeline", href: "/pipeline", type: "pipeline" });
            return { answer, actions: capActions(acts, 3), confidence: "high" };
        }

        case "pipeline_stuck": {
            const open = input.pipelineStages.filter((s) => s.key !== "closed_won" && s.key !== "closed_lost");
            const totalOpen = open.reduce((acc, s) => acc + s.count, 0);
            if (input.pipelineTotal === 0 || totalOpen === 0) {
                return {
                    answer: "Ainda não tenho deals suficientes no pipeline para apontar gargalo com segurança.",
                    actions: [],
                    confidence: "low",
                };
            }
            const top = [...open].sort((a, b) => b.count - a.count)[0];
            const pct = Math.round((top.count / totalOpen) * 100);
            if (pct >= 35) {
                return {
                    answer: `${pct}% dos deals abertos estão concentrados em ${top.name} (${top.count} ${top.count === 1 ? "deal" : "deals"}). Vale revisar se algum está parado nessa etapa.`,
                    actions: [{ label: "Ver pipeline", href: "/pipeline", type: "pipeline" }],
                    confidence: "medium",
                };
            }
            // Sem stage_entered_at e sem concentração relevante → honesto.
            return {
                answer: "Ainda não tenho histórico de etapa suficiente para apontar gargalo com segurança.",
                actions: [{ label: "Ver pipeline", href: "/pipeline", type: "pipeline" }],
                confidence: "low",
            };
        }

        case "eva_context_gaps": {
            const gapHighlights = input.evaHighlights.filter(
                (h) => h.type === "missing_information" || h.source === "knowledge_gap",
            );
            const gapAttention = input.attentionItems.filter((a) => a.type === "knowledge_gap");
            if (gapHighlights.length === 0 && gapAttention.length === 0) {
                return {
                    answer: "Nenhuma lacuna de contexto aberta agora. A EVA está conseguindo responder com o material atual.",
                    actions: [],
                    confidence: "high",
                };
            }
            const count =
                gapHighlights.reduce((acc, h) => acc + (h.count ?? 1), 0) || gapAttention.length;
            return {
                answer: `${count} ${count === 1 ? "lacuna" : "lacunas"} no contexto da EVA. Resolver melhora as respostas dela e a qualificação dos leads.`,
                actions: [{ label: "Completar contexto da EVA", href: "/configuracoes/eva?tab=conhecimento", type: "context" }],
                confidence: "high",
            };
        }

        default:
            return "error";
    }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useCentralEvaAssistant(input: CentralEvaInput) {
    const [state, setState] = useState<EvaAssistantState>("idle");
    const [response, setResponse] = useState<EvaResponse | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState("");

    // Computa a resposta com os dados MAIS RECENTES no momento do timeout.
    const inputRef = useRef(input);
    inputRef.current = input;
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) window.clearTimeout(timerRef.current);
        };
    }, []);

    const reset = useCallback(() => {
        if (timerRef.current) window.clearTimeout(timerRef.current);
        setState("idle");
        setResponse(null);
        setCurrentQuestion("");
    }, []);

    const ask = useCallback((question: string, commandId?: CentralEvaCommandId) => {
        const q = question.trim();
        if (!q) return;
        if (timerRef.current) window.clearTimeout(timerRef.current);
        setCurrentQuestion(q);
        setResponse(null);
        setState("loading");
        // Pequeno delay só pra UX do "EVA analisando…". Cálculo é síncrono.
        timerRef.current = window.setTimeout(() => {
            const data = inputRef.current;
            if (data.dataError) {
                setState("error");
                return;
            }
            const cmd = commandId ?? routeQuestion(q);
            if (!cmd) {
                setState("out_of_scope");
                return;
            }
            const res = respondTo(cmd, data);
            if (res === "error") {
                setState("error");
                return;
            }
            setResponse(res);
            setState("answered");
        }, 650);
    }, []);

    return {
        state,
        response,
        currentQuestion,
        ask,
        reset,
        commands: CENTRAL_EVA_COMMANDS,
    };
}
