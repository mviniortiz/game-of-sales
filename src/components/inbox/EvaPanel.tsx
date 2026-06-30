// ─────────────────────────────────────────────────────────────────────────────
// EvaPanel (F4E.4.4, 2026-05-20) — Coluna direita da Inbox, AGORA REAL.
//
// Substitui mocks determinísticos (getLeadScore/buildEvaSummary/buildNextAction)
// pelo `useEvaInsight` que chama supabase.functions.invoke("whatsapp-copilot").
//
// Estados:
//   - sem chat selecionado → EmptyPanel
//   - chat sem mensagens → empty state pedindo conversa real
//   - loading → skeleton "EVA analisando…"
//   - error → retry button
//   - success → renderiza Resumo, Qualificação, Já sabemos / Falta,
//               Próxima ação, Resposta sugerida, Lacunas
//
// REGRA: EVA continua assistida — nenhuma ação automática.
// `deve_criar_oportunidade` e `deve_fazer_handoff` são apenas callouts
// recomendando ao humano. CTA "Criar oportunidade" continua manual.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { trackBehavior, clarityUpgrade, DEMO_EVENTS } from "@/lib/analytics";
import {
    AlertCircle,
    AlertTriangle,
    ArrowRight,
    ArrowUp,
    BarChart3,
    CheckCircle2,
    ChevronRight,
    Clock,
    Copy,
    Edit3,
    Flame,
    Info,
    Link2,
    Loader2,
    Plus,
    RefreshCw,
    ThermometerSun,
    UserCog,
    Workflow,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EvaNode } from "@/components/landing/EvaNode";
import { toast } from "sonner";
import { EvaOrb } from "@/components/landing-v2/EvaOrb";
import { EvaAnalyzingState } from "@/components/inbox/EvaAnalyzingState";
import { NovaOportunidadeModal } from "@/components/deals/NovaOportunidadeModal";
import { EvaCreateDealNudge } from "@/components/inbox/EvaCreateDealNudge";
import { VincularDealModal } from "@/components/deals/VincularDealModal";
import { sanitizeDisplayName } from "@/lib/displayName";
import { useCrmLookup } from "@/components/whatsapp/useCrmLookup";
import type { CrmDeal } from "@/components/whatsapp/helpers";
import type { Chat, MessageLine } from "@/hooks/useEvolutionAPI";
import { useEvaInsight, type EvaInsightResult } from "@/hooks/useEvaInsight";
import { useHybridAutoCreate } from "@/hooks/useHybridAutoCreate";
import { useCreateOpportunityFromConversation } from "@/hooks/useCreateOpportunityFromConversation";
import { useAgentSuggestionLog } from "@/hooks/useAgentSuggestionLog";
import { useEntityTags } from "@/hooks/useDealsTags";
import { getTagColorClass, isHexColor } from "@/lib/tags";
import type { Tag } from "@/types/tags";
import { EvaStudioRules } from "@/components/eva/EvaStudioRules";
import type {
    FitSugerido,
    KnowledgeGap,
    Qualification,
    Temperatura,
    Urgencia,
} from "@/lib/eva/qualificationSchema";

// ─── Movimento (disciplinado, com fallback de reduced-motion) ───────────────
// LP-INBOX.2 2026-06-21: as seções entram com fade+rise em stagger curto, o
// score conta pra cima, a barra anima a largura, o dossiê anima a altura.
// Tudo respeita prefers-reduced-motion: entrega o estado final estático.

const EVA_EASE = [0.22, 1, 0.36, 1] as const;

/** Rise + fade curto, usado como item dentro de um <Section> (StaggerGroup). */
const riseItem = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EVA_EASE } },
};

/** Container que orquestra o stagger dos filhos (~60ms entre cada). */
const staggerGroup = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
};

/**
 * Item animado de uma seção. Quando reduced-motion está ligado, renderiza um
 * <div> simples (estado final), nunca deixando conteúdo invisível.
 */
function RevealItem({
    children,
    className,
    style,
}: {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}) {
    const reduce = useReducedMotion();
    if (reduce) {
        return (
            <div className={className} style={style}>
                {children}
            </div>
        );
    }
    return (
        <motion.div variants={riseItem} className={className} style={style}>
            {children}
        </motion.div>
    );
}

/** Conta de 0 (ou do valor anterior) até `value` ao montar. Respeita reduced-motion. */
function useCountUp(value: number | null, durationMs = 650): number | null {
    const reduce = useReducedMotion();
    const [display, setDisplay] = useState<number | null>(value);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        if (value === null) {
            setDisplay(null);
            return;
        }
        if (reduce) {
            setDisplay(value);
            return;
        }
        const from = 0;
        const start = performance.now();
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / durationMs);
            // easeOutCubic, alinhado à curva do projeto
            const eased = 1 - Math.pow(1 - t, 3);
            setDisplay(Math.round(from + (value - from) * eased));
            if (t < 1) rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        };
    }, [value, durationMs, reduce]);

    return display;
}

// ─── Tradução de enums ──────────────────────────────────────────────────────

const FIT_META: Record<FitSugerido, { label: string; tone: ToneKey }> = {
    excelente: { label: "Excelente", tone: "green" },
    bom: { label: "Bom", tone: "green" },
    medio: { label: "Médio", tone: "amber" },
    baixo: { label: "Baixo", tone: "orange" },
};

const TEMPERATURA_META: Record<Temperatura, { label: string; tone: ToneKey; icon: typeof Flame }> = {
    quente: { label: "Quente", tone: "rose", icon: Flame },
    morno: { label: "Morno", tone: "amber", icon: ThermometerSun },
    frio: { label: "Frio", tone: "blue", icon: ThermometerSun },
};

const URGENCIA_META: Record<Urgencia, { label: string; tone: ToneKey }> = {
    alta: { label: "Alta", tone: "rose" },
    media: { label: "Média", tone: "amber" },
    baixa: { label: "Baixa", tone: "blue" },
    indefinida: { label: "Indefinida", tone: "neutral" },
};

const INTENCAO_LABELS: Record<string, string> = {
    preco: "Preço",
    demo: "Demo",
    duvida: "Dúvida",
    suporte: "Suporte",
    compra: "Compra",
    outro: "Outro",
};

const PROXIMA_ACAO_LABELS: Record<string, string> = {
    responder: "Responder agora",
    qualificar: "Coletar mais informação",
    criar_oportunidade: "Criar oportunidade no pipeline",
    marcar_demo: "Marcar demo",
    handoff_humano: "Passar pra um humano",
    aguardar: "Aguardar resposta",
};

// ─── Tipo principal ─────────────────────────────────────────────────────────

interface EvaPanelProps {
    chat: Chat | null;
    messages: MessageLine[];
    /** V1.1 — chamado após criar+vincular oportunidade, pra Inbox refetchar
     *  channel_conversations e refletir o novo deal_id. */
    onDealLinked?: (dealId: string) => void;
    /** PROSPECT.1 — quando presente, a resposta sugerida ganha "Enviar"
     *  (aprovar-e-enviar com 1 toque), além de Copiar. Usado na prospecção. */
    onSendReply?: (text: string) => Promise<void>;
    /** PROSPECT.1 — objetivo da conversa repassado à EVA (ex.: marcar demo). */
    objective?: string;
    /** Coloca a resposta sugerida no campo de digitação (assistido: humano revisa
     *  e envia). No mobile também fecha o bottom sheet. */
    onUseReply?: (text: string) => void;
    /** Mobile (bottom sheet): fecha a sheet. Ausente no desktop (coluna fixa) —
     *  aí não há X (a coluna não se fecha). */
    onClose?: () => void;
}

export function EvaPanel({ chat, messages, onDealLinked, onSendReply, objective, onUseReply, onClose }: EvaPanelProps) {
    if (!chat) return <EmptyPanel reason="no-chat" onClose={onClose} />;
    // key={chat.id} — remonta por conversa pra não vazar estado local
    // (createOpen / localLinkedDealId) entre chats diferentes.
    return <PanelContent key={chat.id} chat={chat} messages={messages} onDealLinked={onDealLinked} onSendReply={onSendReply} objective={objective} onUseReply={onUseReply} onClose={onClose} />;
}

// Botão de fechar a sheet (só mobile). X discreto no canto; o grabber do Drawer
// cobre o "arrastar", mas muita gente não descobre o gesto — o X é o explícito.
function SheetCloseButton({ onClose, absolute }: { onClose: () => void; absolute?: boolean }) {
    return (
        <button
            type="button"
            onClick={onClose}
            aria-label="Fechar análise da EVA"
            className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-colors",
                absolute && "absolute top-3 right-3 z-10",
            )}
            style={{ background: "var(--ibx-sunken)", color: "#64748B" }}
        >
            <X className="h-4 w-4" />
        </button>
    );
}

// ─── Empty / loading / error states ─────────────────────────────────────────

function EmptyPanel({ reason, onClose }: { reason: "no-chat" | "no-messages"; onClose?: () => void }) {
    const messageMap = {
        "no-chat": "Selecione uma conversa para a EVA analisar.",
        "no-messages":
            "Selecione uma conversa com mensagens para a EVA analisar.",
    };
    return (
        <div className="relative flex-1 flex flex-col items-center justify-center px-5 text-center">
            {onClose && <SheetCloseButton onClose={onClose} absolute />}
            <EvaOrb variant="blue" state="idle" size={60} showVoice={false} className="mb-4" />
            <p className="text-[13px] font-semibold mb-1" style={{ color: "#0B1220" }}>
                Aguardando contexto
            </p>
            <p
                className="text-[11.5px]"
                style={{ color: "#64748B", lineHeight: 1.55, maxWidth: "240px" }}
            >
                {messageMap[reason]}
            </p>
        </div>
    );
}

function LoadingState({ message }: { message?: string }) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center px-5 text-center">
            <EvaOrb variant="blue" state="analyzing" size={64} className="mb-4" />
            <p className="text-[13px] font-semibold mb-1" style={{ color: "#0B1220" }}>
                {message || "EVA analisando conversa…"}
            </p>
            <p
                className="text-[11.5px]"
                style={{ color: "#64748B", lineHeight: 1.55, maxWidth: "240px" }}
            >
                Buscando contexto da agência, mensagens e pipeline.
            </p>
        </div>
    );
}

function ErrorState({
    error,
    onRetry,
    resetAt,
}: {
    error: Error;
    onRetry: () => void;
    resetAt?: string | null;
}) {
    // FIO 4 — distingue limite diário (esperado, recupera sozinho) de falha real.
    const code = (error as { code?: string }).code;
    const msg = error.message || "Não foi possível analisar agora.";
    const isRateLimit =
        code === "RATE_LIMITED" ||
        msg.toLowerCase().includes("limite") ||
        msg.toLowerCase().includes("rate");
    const resetLabel = isRateLimit ? formatResetAt(resetAt ?? null) : null;

    return (
        <div className="flex-1 flex flex-col items-center justify-center px-5 text-center gap-3">
            <div
                className="h-10 w-10 rounded-full flex items-center justify-center"
                style={{
                    background: isRateLimit
                        ? "rgba(245,158,11,0.10)"
                        : "rgba(220,38,38,0.10)",
                }}
            >
                {isRateLimit ? (
                    <Clock className="h-5 w-5" style={{ color: "#B45309" }} />
                ) : (
                    <AlertCircle className="h-5 w-5" style={{ color: "#DC2626" }} />
                )}
            </div>
            <div>
                <p className="text-[13px] font-semibold mb-1" style={{ color: "#0B1220" }}>
                    {isRateLimit ? "Limite diário de análises atingido" : "Não foi possível analisar agora"}
                </p>
                <p
                    className="text-[11.5px]"
                    style={{ color: "#64748B", lineHeight: 1.55, maxWidth: "260px" }}
                >
                    {isRateLimit
                        ? resetLabel
                            ? `A EVA volta a analisar ${resetLabel}. As análises já salvas continuam visíveis.`
                            : "A EVA volta a analisar amanhã. As análises já salvas continuam visíveis."
                        : msg}
                </p>
            </div>
            {/* Retry só faz sentido em falha real; no rate limit ele falharia de novo. */}
            {!isRateLimit && (
                <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[11.5px] font-semibold transition-colors"
                    style={{
                        background: "rgba(37,99,235,0.08)",
                        color: "#1D4ED8",
                        border: "1px solid rgba(37,99,235,0.20)",
                    }}
                >
                    <RefreshCw className="h-3 w-3" />
                    Tentar novamente
                </button>
            )}
        </div>
    );
}

// ─── Conteúdo principal ─────────────────────────────────────────────────────

function PanelContent({
    chat,
    messages,
    onDealLinked,
    onSendReply,
    objective,
    onUseReply,
    onClose,
}: {
    chat: Chat;
    messages: MessageLine[];
    onDealLinked?: (dealId: string) => void;
    onSendReply?: (text: string) => Promise<void>;
    objective?: string;
    onUseReply?: (text: string) => void;
    onClose?: () => void;
}) {
    const navigate = useNavigate();
    const chatPhone = chat.phone || chat.id;
    const insight = useEvaInsight({
        chatPhone,
        contactName: chat.name,
        messages,
        enabled: messages.length > 0,
        objective,
    });

    // V1.1 — vínculo conversa→deal. Só dá pra vincular no modo channel-first
    // (chat.conversationId = channel_conversations.id). Em legacy, undefined.
    const conversationId = chat.conversationId;
    const [createOpen, setCreateOpen] = useState(false);
    const [linkOpen, setLinkOpen] = useState(false);
    const [localLinkedDealId, setLocalLinkedDealId] = useState<string | null>(null);
    const linkedDealId = chat.dealId ?? localLinkedDealId;

    // V1.1.2 — FONTE DE VERDADE ÚNICA do estado de oportunidade.
    // Vínculo OFICIAL = channel_conversations.deal_id (chat.dealId) ou o deal
    // recém-criado (localLinkedDealId). matchedDealByPhone é só um POSSÍVEL
    // duplicado por telefone — NUNCA conta como vínculo oficial.
    const crm = useCrmLookup(chat.phone);
    const matchedDealByPhone = crm.deal;
    const crmLoading = crm.loading || !crm.searched;
    const hasLinkedOpportunity = Boolean(linkedDealId);
    const effectiveDealId = linkedDealId ?? matchedDealByPhone?.id ?? null;
    const matchedNotLinked = !hasLinkedOpportunity && !!matchedDealByPhone;

    // Prefill da oportunidade a partir da conversa + EVA (sem inventar dado).
    const qual = insight.data?.qualification;
    const prefill = useMemo(() => {
        const safeName = sanitizeDisplayName(chat.name);
        const servico = qual?.servico_interesse?.trim();
        const titulo = servico
            ? `${servico} - ${safeName ?? "Novo lead WhatsApp"}`
            : safeName
            ? `Atendimento - ${safeName}`
            : "Novo lead WhatsApp";
        const proxima = qual?.proxima_acao
            ? PROXIMA_ACAO_LABELS[qual.proxima_acao] ?? qual.proxima_acao
            : null;
        const observacoes = [
            "Origem: WhatsApp (conversa vinculada pela Inbox).",
            proxima ? `Próxima ação sugerida pela EVA: ${proxima}.` : "",
        ]
            .filter(Boolean)
            .join(" ");
        return {
            clienteNome: safeName ?? "Novo lead WhatsApp",
            clienteTelefone: chat.phone || "",
            titulo,
            observacoes,
            // EVA sugere valor (ancorado no preço do serviço) + o serviço, pra o
            // modal casar o produto cadastrado e pré-preencher o valor. Editável.
            valorEstimado: qual?.valor_estimado ?? null,
            servicoInteresse: servico ?? null,
        };
    }, [chat.name, chat.phone, qual?.servico_interesse, qual?.proxima_acao, qual?.valor_estimado]);

    // ── VYZON.AGENTS.2 (híbrido) — auto-criação de oportunidade ──────────────
    // Quando a empresa optou pelo modo híbrido (auto_create_opportunity) E a EVA
    // (aprovada) recomenda criar oportunidade (deve_criar_oportunidade), criamos
    // o card no pipeline AUTOMATICAMENTE, com os campos qualificados, e
    // registramos em agent_suggestions. Mensagens de saída NUNCA passam por aqui
    // (seguem em aprovar-e-enviar). Gate defensivo: só com conversationId, sem
    // vínculo e sem duplicado por telefone; dispara uma única vez por conversa.
    const hybrid = useHybridAutoCreate();
    const { createOpportunity } = useCreateOpportunityFromConversation();
    const agentLog = useAgentSuggestionLog();
    const autoCreateFiredRef = useRef(false);
    const [quickCreating, setQuickCreating] = useState(false);

    // ── Analytics da EVA — taxa de aprovação (agent_suggestions) ─────────────
    // Quando a EVA produz uma leitura desta conversa (qualificação com próxima
    // ação / resposta sugerida), registramos 1 sugestão pendente em
    // agent_suggestions. Dedup: no máx 1 por (conversa + analyzed_at). O
    // desfecho (accepted/adjusted) é gravado quando o humano USA a resposta
    // sugerida (Copiar/Enviar) — feito no SuggestedReply via resolveSuggestion.
    // Isso popula approval.rate no painel SEM mudar a UI redesenhada.
    const analyzedAt = insight.lastAnalyzedAt ? insight.lastAnalyzedAt.toISOString() : null;
    const pendingSuggestionIdRef = useRef<string | null>(null);
    const pendingSuggestionResolvedRef = useRef(false);
    const recordedKeyRef = useRef<string | null>(null);

    useEffect(() => {
        if (!conversationId || !analyzedAt) return;
        const q = insight.data?.qualification;
        if (!q) return;
        // Só registra quando há de fato uma sugestão acionável (próxima ação ou
        // resposta sugerida) — uma análise vazia não é uma sugestão.
        const hasActionable = Boolean(q.proxima_acao || q.resposta_sugerida);
        if (!hasActionable) return;

        const dedupKey = `${conversationId}::${analyzedAt}`;
        if (recordedKeyRef.current === dedupKey) return;
        recordedKeyRef.current = dedupKey;
        // Nova análise → novo desfecho a registrar.
        pendingSuggestionIdRef.current = null;
        pendingSuggestionResolvedRef.current = false;

        (async () => {
            try {
                const id = await agentLog.record({
                    kind: "qualification",
                    conversationId,
                    inputSummary: { source: "inbox", trigger: "eva_reading", analyzedAt },
                    suggestion: {
                        proxima_acao: q.proxima_acao ?? null,
                        resposta_sugerida: q.resposta_sugerida ?? null,
                        score: q.score_sugerido ?? null,
                        temperatura: q.temperatura ?? null,
                    },
                    status: "pending",
                });
                pendingSuggestionIdRef.current = id;
            } catch { /* auditoria nunca quebra o fluxo */ }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationId, analyzedAt]);

    // Resolve a sugestão pendente desta análise (1x) quando o humano usa a
    // resposta. accepted = copiou/enviou SEM editar; adjusted = editou antes.
    const resolveSuggestion = async (status: "accepted" | "adjusted", finalText: string) => {
        const id = pendingSuggestionIdRef.current;
        if (!id || pendingSuggestionResolvedRef.current) return;
        pendingSuggestionResolvedRef.current = true;
        try {
            await agentLog.resolve({ id, status, appliedPayload: { text: finalText } });
            // Analytics: a sugestão da EVA foi usada (aceita sem editar ou ajustada).
            trackBehavior(
                status === "accepted" ? DEMO_EVENTS.EVA_SUGGESTION_ACCEPTED : DEMO_EVENTS.EVA_SUGGESTION_ADJUSTED,
                { outcome: status }
            );
        } catch {
            // permite nova tentativa se a gravação do desfecho falhou
            pendingSuggestionResolvedRef.current = false;
        }
    };

    useEffect(() => {
        if (autoCreateFiredRef.current) return;
        if (!hybrid.ready || !hybrid.approved || !hybrid.autoCreate) return;
        if (!conversationId) return;
        if (hasLinkedOpportunity || matchedDealByPhone || crmLoading) return;
        if (!qual?.deve_criar_oportunidade) return;

        autoCreateFiredRef.current = true; // trava antes do await (sem corrida)
        (async () => {
            try {
                const dealId = await createOpportunity({
                    customerName: prefill.clienteNome,
                    title: prefill.titulo,
                    stage: "qualification",
                    phone: prefill.clienteTelefone || null,
                    value: prefill.valorEstimado ?? undefined,
                    leadSource: "whatsapp",
                    notes: `${prefill.observacoes} (Card criado automaticamente pela EVA — modo híbrido.)`,
                    conversationId,
                });
                setLocalLinkedDealId(dealId);
                onDealLinked?.(dealId);
                try {
                    await agentLog.record({
                        kind: "qualification",
                        conversationId,
                        dealId,
                        inputSummary: { source: "whatsapp", trigger: "deve_criar_oportunidade" },
                        suggestion: { score: qual?.score_sugerido ?? null, servico: qual?.servico_interesse ?? null },
                        status: "accepted",
                        appliedPayload: { dealId, title: prefill.titulo, stage: "qualification" },
                    });
                } catch { /* auditoria nunca quebra o fluxo */ }
                toast.success("EVA adicionou ao pipeline", {
                    description: prefill.titulo,
                    action: { label: "Abrir", onClick: () => navigate(`/deals/${dealId}`) },
                });
            } catch (e) {
                autoCreateFiredRef.current = false; // permite retry se falhou
                console.error("[hybrid] auto-create falhou:", e);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hybrid.ready, hybrid.approved, hybrid.autoCreate, conversationId, hasLinkedOpportunity, matchedDealByPhone, crmLoading, qual?.deve_criar_oportunidade]);

    // V1.1: criar abre modal local (com vínculo); se já vinculado, vai pro deal
    // (anti-duplicidade da mesma conversa); em legacy, mantém evento global.
    const handleCreateOpp = () => {
        if (linkedDealId) {
            navigate(`/deals/${linkedDealId}`);
            return;
        }
        if (conversationId) {
            setCreateOpen(true);
            return;
        }
        window.dispatchEvent(new CustomEvent("vyzon:open-nova-oportunidade"));
    };

    // Nível 2 do upgrade de confiança: a EVA cria o card com 1 clique
    // (mini-confirma), reusando a mesma criação do modo híbrido, mas disparada
    // pelo humano. Registra como sugestão aceita (alimenta o score do Studio).
    const handleQuickCreate = async () => {
        if (!conversationId || quickCreating) return;
        setQuickCreating(true);
        try {
            const dealId = await createOpportunity({
                customerName: prefill.clienteNome,
                title: prefill.titulo,
                stage: "qualification",
                phone: prefill.clienteTelefone || null,
                value: prefill.valorEstimado ?? undefined,
                leadSource: "whatsapp",
                notes: `${prefill.observacoes} (Adicionado ao pipeline pela EVA, confirmado por você.)`,
                conversationId,
            });
            setLocalLinkedDealId(dealId);
            onDealLinked?.(dealId);
            try {
                await agentLog.record({
                    kind: "qualification",
                    conversationId,
                    dealId,
                    inputSummary: { source: "whatsapp", trigger: "nudge_confirmed" },
                    suggestion: { score: qual?.score_sugerido ?? null, servico: qual?.servico_interesse ?? null },
                    status: "accepted",
                    appliedPayload: { dealId, title: prefill.titulo, stage: "qualification" },
                });
            } catch { /* auditoria nunca quebra o fluxo */ }
            toast.success("Adicionado ao pipeline", {
                description: prefill.titulo,
                action: { label: "Abrir", onClick: () => navigate(`/deals/${dealId}`) },
            });
        } catch (e) {
            console.error("[nudge] criação falhou:", e);
            toast.error("Não foi possível criar a oportunidade. Tente de novo.");
        } finally {
            setQuickCreating(false);
        }
    };

    // Card do nível 2 montado aqui (onde vivem qual/prefill/handlers) e passado
    // como slot pro RealContent renderizar abaixo do herói.
    const createNudge: JSX.Element | null =
        qual?.deve_criar_oportunidade &&
        !hasLinkedOpportunity && !matchedDealByPhone && !crmLoading && conversationId &&
        !(hybrid.ready && hybrid.approved && hybrid.autoCreate) ? (
            <EvaCreateDealNudge
                customerName={prefill.clienteNome}
                phone={prefill.clienteTelefone}
                servico={qual?.servico_interesse}
                score={qual?.score_sugerido}
                orcamento={qual?.orcamento}
                creating={quickCreating}
                onConfirm={handleQuickCreate}
                onAdjust={handleCreateOpp}
            />
        ) : null;

    if (messages.length === 0) return <EmptyPanel reason="no-messages" onClose={onClose} />;

    const headerSubtitle = insight.analyzing
        ? "Analisando…"
        : insight.error
        ? "Análise indisponível"
        : !insight.hasAnalysis
        ? "Aguardando análise manual"
        : insight.isStaleByContext
        ? "O contexto da EVA mudou"
        : insight.isStaleByMessages
        ? "Pode estar desatualizada"
        : insight.lastAnalyzedAt
        ? `Atualizada ${formatTimeAgo(insight.lastAnalyzedAt)}`
        : "Análise da conversa selecionada";

    // CTA do botão de reanálise (apenas quando já tem análise)
    const reanalyzeLabel = insight.isStaleByContext
        ? "Atualizar análise"
        : insight.isStaleByMessages
        ? "Reanalisar agora"
        : "Reanalisar";

    // Estado da leitura num único ponto (cor do dot + texto do status). De-dup:
    // o "desatualizada" deixa de ser pill solta e vira o tom desta linha.
    const isStale = Boolean(
        insight.hasAnalysis && !insight.analyzing &&
        (insight.isStaleByMessages || insight.isStaleByContext),
    );
    const statusDot = insight.analyzing
        ? "#2563EB"
        : insight.error
        ? "#DC2626"
        : isStale
        ? "#F59E0B"
        : insight.hasAnalysis
        ? "#10B981"
        : "#94A3B8";
    const statusColor = insight.analyzing
        ? "#2563EB"
        : insight.error
        ? "#B91C1C"
        : isStale
        ? "#B45309"
        : insight.hasAnalysis
        ? "#475569"
        : "#64748B";
    // No header, o stale vira só "Desatualizada" (o banner abaixo dá o detalhe +
    // o CTA de reanalisar) — evita repetir a mesma frase em dois lugares.
    const statusText = isStale ? "Desatualizada" : headerSubtitle;

    return (
        <>
            {/* Header — sticky. 2 linhas: identidade+ações (cima) / status (baixo),
                pra o status não competir por espaço e quebrar feio. */}
            <div
                className="px-5 pt-3.5 pb-3 shrink-0"
                style={{
                    borderBottom: "1px solid var(--ibx-line)",
                    background: "#FFFFFF",
                }}
            >
                {/* Linha 1 — identidade + ações */}
                <div className="flex items-center gap-3">
                    <EvaOrb
                        variant="blue"
                        size={36}
                        className="shrink-0"
                        state={insight.analyzing ? "analyzing" : "idle"}
                        showVoice={false}
                    />
                    <p
                        className="flex-1 min-w-0 truncate text-[14px] font-semibold leading-tight"
                        style={{ color: "#0B1220" }}
                    >
                        EVA Comercial
                    </p>
                    {insight.hasAnalysis && !insight.analyzing && (
                        <button
                            type="button"
                            onClick={() => insight.reanalyze()}
                            title={reanalyzeLabel}
                            aria-label={reanalyzeLabel}
                            className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 cursor-pointer transition-[filter] hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/40"
                            style={{ background: "rgba(37,99,235,0.07)", color: "#2563EB" }}
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                    )}
                    <span
                        className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full shrink-0"
                        title="A EVA sugere. Seu time aprova antes de qualquer ação."
                        style={{
                            background: "rgba(124,58,237,0.10)",
                            color: "#6D28D9",
                            fontWeight: 600,
                            letterSpacing: "0.01em",
                        }}
                    >
                        <EvaNode size={9} color="#6D28D9" />
                        Assistida
                    </span>
                    {/* Mobile: fecha a bottom sheet (no desktop a coluna é fixa). */}
                    {onClose && <SheetCloseButton onClose={onClose} />}
                </div>

                {/* Linha 2 — status num lugar só (dot + texto), alinhado ao título.
                    O tom do dot carrega o "desatualizada" (não precisa de pill). */}
                <div className="flex items-center justify-between gap-2 mt-2 pl-[48px]">
                    <span
                        className="inline-flex items-center gap-1.5 min-w-0 text-[11px]"
                        style={{ color: statusColor }}
                    >
                        <span
                            className={`h-1.5 w-1.5 rounded-full shrink-0 ${insight.analyzing || isStale ? "vz-eva-stale-dot" : ""}`}
                            style={{ background: statusDot }}
                        />
                        <span className="truncate">{statusText}</span>
                    </span>
                    {/* FIO 4 — avisa quando o limite diário está acabando. */}
                    {insight.remaining !== null && insight.remaining <= 10 && (
                        <span
                            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded shrink-0 tabular-nums"
                            title={`Restam ${insight.remaining} de ${insight.dailyLimit ?? "—"} análises da EVA hoje`}
                            style={{
                                background: insight.remaining <= 3 ? "rgba(220,38,38,0.10)" : "rgba(245,158,11,0.12)",
                                color: insight.remaining <= 3 ? "#DC2626" : "#B45309",
                                fontWeight: 700,
                            }}
                        >
                            <Clock className="h-2.5 w-2.5" />
                            {insight.remaining} {insight.remaining === 1 ? "análise" : "análises"}
                        </span>
                    )}
                </div>
            </div>

            {/* V1.1.2 — banner: 3 estados a partir da fonte de verdade única */}
            <DealLinkBanner
                hasLinkedOpportunity={hasLinkedOpportunity}
                matchedNotLinked={matchedNotLinked}
                effectiveDealId={effectiveDealId}
                canLinkExisting={!!conversationId}
                onCreate={handleCreateOpp}
                onLinkExisting={() => setLinkOpen(true)}
                onOpenDeal={(id) => navigate(`/deals/${id}`)}
            />

            {/* Micro-interações: pulso do "desatualizada" + hover dos cards/botões.
                Curva custom do projeto; tudo desliga sob prefers-reduced-motion. */}
            <style>{`
                @keyframes vzEvaStalePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.45;transform:scale(.82)} }
                .vz-eva-stale-dot { animation: vzEvaStalePulse 2.2s ease-in-out infinite; }
                .vz-eva-hero { transition: box-shadow .2s cubic-bezier(0.22,1,0.36,1), transform .2s cubic-bezier(0.22,1,0.36,1); }
                .vz-eva-hero:hover { box-shadow: 0 2px 4px rgba(15,23,42,0.05), 0 18px 40px -18px rgba(37,99,235,0.26); }
                .vz-eva-cta { transition: transform .18s cubic-bezier(0.22,1,0.36,1), box-shadow .18s cubic-bezier(0.22,1,0.36,1), filter .18s cubic-bezier(0.22,1,0.36,1); }
                .vz-eva-cta:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.05); }
                .vz-eva-cta:active:not(:disabled) { transform: translateY(0); }
                .vz-eva-ghost { transition: background .18s cubic-bezier(0.22,1,0.36,1), border-color .18s cubic-bezier(0.22,1,0.36,1), transform .18s cubic-bezier(0.22,1,0.36,1); }
                .vz-eva-ghost:hover { background: rgba(37,99,235,0.05); transform: translateY(-1px); }
                .vz-eva-ghost:active { transform: translateY(0); }
                @media (prefers-reduced-motion: reduce) {
                    .vz-eva-stale-dot { animation: none !important; }
                    .vz-eva-hero, .vz-eva-cta, .vz-eva-ghost { transition: none !important; }
                    .vz-eva-cta:hover:not(:disabled), .vz-eva-ghost:hover { transform: none !important; }
                }
            `}</style>

            {/* Conteúdo — LP-INBOX.1: fundo levemente rebaixado pra dar
                profundidade ao cartão-herói; ritmo vertical mais curto. */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ background: "var(--ibx-paper)" }}>
                {/* Loading inicial do SELECT (sem custo de IA) */}
                {insight.loading && !insight.hasAnalysis && (
                    <LoadingState message="Buscando análise salva…" />
                )}

                {/* Erro da mutation — só aparece se user clicou e falhou */}
                {insight.error && !insight.analyzing && (
                    <ErrorState
                        error={insight.error}
                        resetAt={insight.rateLimitResetAt}
                        onRetry={() => {
                            insight.clearAnalyzeError();
                            insight.analyze();
                        }}
                    />
                )}

                {/* Sem análise — F4E.4.5: NÃO chama IA automaticamente */}
                {!insight.loading &&
                 !insight.hasAnalysis &&
                 !insight.error &&
                 !insight.analyzing && (
                    <NoAnalysisState
                        onAnalyze={() => insight.analyze()}
                    />
                )}

                {/* Analisando (mutation rodando) — animação por etapas da leitura */}
                {insight.analyzing && <EvaAnalyzingState />}

                {/* Análise renderizada — sempre que tem data, mesmo se stale */}
                {insight.data && !insight.analyzing && !insight.error && (
                    <>
                        {/* Stale badge — mostra quando há mensagens novas ou contexto novo */}
                        {(insight.isStaleByMessages || insight.isStaleByContext) && (
                            <StaleBadge
                                stale={
                                    insight.isStaleByContext
                                        ? "context"
                                        : "messages"
                                }
                                newMessagesCount={insight.newMessagesCount}
                                onReanalyze={() => insight.reanalyze()}
                                label={reanalyzeLabel}
                            />
                        )}
                        <RealContent
                            chat={chat}
                            insight={insight.data}
                            dealState={{
                                matchedDeal: matchedDealByPhone,
                                hasLinkedOpportunity,
                                effectiveDealId,
                                loading: crmLoading,
                            }}
                            onSendReply={onSendReply}
                            createNudge={createNudge}
                            onResolveSuggestion={resolveSuggestion}
                            onUseReply={onUseReply}
                        />
                    </>
                )}
            </div>

            {/* V1.1 — modal de criação com vínculo (só no modo channel-first) */}
            {conversationId && (
                <NovaOportunidadeModal
                    open={createOpen}
                    onClose={() => setCreateOpen(false)}
                    conversationId={conversationId}
                    prefillData={prefill}
                    onSuccess={(dealId) => {
                        setLocalLinkedDealId(dealId);
                        onDealLinked?.(dealId);
                    }}
                />
            )}

            {/* V1.1.1 — modal de vínculo a oportunidade existente */}
            {conversationId && (
                <VincularDealModal
                    open={linkOpen}
                    onClose={() => setLinkOpen(false)}
                    conversationId={conversationId}
                    prefillSearch={chat.phone || sanitizeDisplayName(chat.name) || ""}
                    onLinked={(dealId) => {
                        setLocalLinkedDealId(dealId);
                        onDealLinked?.(dealId);
                    }}
                />
            )}
        </>
    );
}

// ─── V1.1 — Banner de vínculo conversa↔oportunidade ─────────────────────────

function DealLinkBanner({
    hasLinkedOpportunity,
    matchedNotLinked,
    effectiveDealId,
    canLinkExisting,
    onCreate,
    onLinkExisting,
    onOpenDeal,
}: {
    hasLinkedOpportunity: boolean;
    matchedNotLinked: boolean;
    effectiveDealId: string | null;
    canLinkExisting: boolean;
    onCreate: () => void;
    onLinkExisting: () => void;
    onOpenDeal: (dealId: string) => void;
}) {
    // LP-INBOX.1 2026-06-09: banner → régua fina de status. Um estado por
    // linha, ações como links compactos. Mesmos handlers e estados.

    // Estado 1 — vínculo OFICIAL (channel_conversations.deal_id)
    if (hasLinkedOpportunity && effectiveDealId) {
        return (
            <div
                className="px-4 py-2 shrink-0 flex items-center gap-2"
                style={{ borderBottom: "1px solid var(--ibx-line-soft)", background: "#FFFFFF" }}
            >
                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "#10B981" }} />
                <p className="text-[11.5px] font-semibold flex-1 min-w-0 truncate" style={{ color: "#0B1220" }}>
                    No pipeline
                </p>
                <button
                    type="button"
                    onClick={() => onOpenDeal(effectiveDealId)}
                    className="inline-flex items-center gap-1 text-[11.5px] font-semibold shrink-0 transition-colors hover:underline"
                    style={{ color: "#1D4ED8" }}
                >
                    Abrir oportunidade
                    <ArrowRight className="h-3 w-3" />
                </button>
            </div>
        );
    }

    // Estado 2 — POSSÍVEL duplicado por telefone (não vinculado oficialmente)
    if (matchedNotLinked && effectiveDealId) {
        return (
            <div
                className="px-4 py-2 shrink-0 flex items-center gap-2 flex-wrap"
                style={{ borderBottom: "1px solid var(--ibx-line-soft)", background: "rgba(245,158,11,0.05)" }}
            >
                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "#F59E0B" }} />
                <p
                    className="text-[11.5px] font-semibold flex-1 min-w-0 truncate"
                    style={{ color: "#0B1220" }}
                    title="Encontramos uma oportunidade com este contato, mas ela ainda não está vinculada a esta conversa."
                >
                    Possível oportunidade existente
                </p>
                {canLinkExisting && (
                    <button
                        type="button"
                        onClick={onLinkExisting}
                        className="inline-flex items-center gap-1 text-[11.5px] font-semibold shrink-0 transition-colors hover:underline"
                        style={{ color: "#B45309" }}
                    >
                        <Link2 className="h-3 w-3" />
                        Vincular
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => onOpenDeal(effectiveDealId)}
                    className="inline-flex items-center gap-1 text-[11.5px] font-semibold shrink-0 transition-colors hover:underline"
                    style={{ color: "#1D4ED8" }}
                >
                    Abrir
                    <ArrowRight className="h-3 w-3" />
                </button>
            </div>
        );
    }

    // Estado 3 — sem oportunidade
    return (
        <div
            className="px-4 py-2 shrink-0 flex items-center gap-2 flex-wrap"
            style={{ borderBottom: "1px solid var(--ibx-line-soft)", background: "#FFFFFF" }}
        >
            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "#CBD5E1" }} />
            <p className="text-[11.5px] font-semibold flex-1 min-w-0 truncate" style={{ color: "#64748B" }}>
                Fora do pipeline
            </p>
            <button
                type="button"
                onClick={onCreate}
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold shrink-0 transition-colors hover:underline"
                style={{ color: "#1D4ED8" }}
            >
                <Plus className="h-3 w-3" />
                Criar oportunidade
            </button>
            {canLinkExisting && (
                <button
                    type="button"
                    onClick={onLinkExisting}
                    className="inline-flex items-center gap-1 text-[11.5px] font-semibold shrink-0 transition-colors hover:underline"
                    style={{ color: "#64748B" }}
                >
                    <Link2 className="h-3 w-3" />
                    Vincular
                </button>
            )}
        </div>
    );
}

// ─── Auxiliares F4E.4.5 ─────────────────────────────────────────────────────

function formatTimeAgo(date: Date): string {
    const diff = Date.now() - date.getTime();
    if (diff < 0) return "agora";
    const min = Math.floor(diff / 60_000);
    if (min < 1) return "agora";
    if (min < 60) return `há ${min}min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `há ${h}h`;
    const d = Math.floor(h / 24);
    return `há ${d}d`;
}

// FIO 4 — quando o limite diário renova, em linguagem humana.
function formatResetAt(iso: string | null): string | null {
    if (!iso) return null;
    const reset = new Date(iso);
    if (Number.isNaN(reset.getTime())) return null;
    const hhmm = reset.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const now = new Date();
    const sameDay = reset.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const isTomorrow = reset.toDateString() === tomorrow.toDateString();
    if (sameDay) return `às ${hhmm}`;
    if (isTomorrow) return `amanhã às ${hhmm}`;
    return reset.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) + ` às ${hhmm}`;
}

function NoAnalysisState({ onAnalyze }: { onAnalyze: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center text-center py-8 px-2">
            <EvaOrb variant="blue" state="idle" size={64} showVoice={false} className="mb-4" />
            <p className="text-[13.5px] font-semibold mb-2" style={{ color: "#0B1220" }}>
                A EVA ainda não analisou esta conversa.
            </p>
            <p
                className="text-[11.5px] mb-5"
                style={{ color: "#64748B", lineHeight: 1.55, maxWidth: "280px" }}
            >
                Analise a conversa para gerar resumo, temperatura, intenção e próxima ação.
            </p>
            <button
                type="button"
                onClick={onAnalyze}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[12.5px] font-semibold text-white transition-all hover:brightness-110"
                style={{
                    background: "linear-gradient(135deg, #2563EB, #4A8CE8)",
                    boxShadow: "0 6px 16px -4px rgba(37,99,235,0.40), 0 1px 0 rgba(255,255,255,0.20) inset",
                }}
            >
                <EvaNode size={13} color="#FFFFFF" />
                Analisar conversa
            </button>
            {/* FIO 3 — a análise é manual por escolha de produto (EVA assistida).
                Deixar explícito responde a expectativa de "automático" sem abrir
                mão do controle do time. */}
            <p className="text-[10.5px] mt-3" style={{ color: "#94A3B8", lineHeight: 1.5, maxWidth: "260px" }}>
                Nada roda sozinho: você decide quando a EVA analisa.
            </p>
        </div>
    );
}

function StaleBadge({
    stale,
    newMessagesCount,
    onReanalyze,
    label,
}: {
    stale: "messages" | "context";
    newMessagesCount: number;
    onReanalyze: () => void;
    label: string;
}) {
    const title =
        stale === "context" ? "O contexto da EVA mudou" : "Pode estar desatualizada";
    const description =
        stale === "context"
            ? "Reanalise para usar as informações mais recentes da operação."
            : newMessagesCount > 0
            ? `${newMessagesCount} ${newMessagesCount === 1 ? "mensagem nova chegou" : "mensagens novas chegaram"} depois da última análise.`
            : "Novas mensagens chegaram depois da última análise.";
    const reduce = useReducedMotion();
    const Wrap = reduce ? "div" : motion.div;
    const wrapProps = reduce
        ? {}
        : ({ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, ease: EVA_EASE } } as const);
    return (
        <Wrap
            className="rounded-xl px-4 py-3 flex items-start gap-3"
            style={{
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.22)",
            }}
            {...(wrapProps as object)}
        >
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 vz-eva-stale-dot" style={{ color: "#B45309" }} />
            <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold mb-0.5" style={{ color: "#0B1220" }}>
                    {title}
                </p>
                <p className="text-[11.5px]" style={{ color: "#64748B", lineHeight: 1.5 }}>
                    {description}
                </p>
            </div>
            <button
                type="button"
                onClick={onReanalyze}
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold shrink-0 mt-0.5 transition-colors hover:brightness-105"
                style={{ color: "#1D4ED8" }}
            >
                <RefreshCw className="h-3 w-3" />
                {label}
            </button>
        </Wrap>
    );
}

// ─── Conteúdo com dados reais ───────────────────────────────────────────────

interface CrmDealState {
    matchedDeal: CrmDeal | null;
    hasLinkedOpportunity: boolean;
    effectiveDealId: string | null;
    loading: boolean;
}

function RealContent({
    chat,
    insight,
    dealState,
    onSendReply,
    createNudge,
    onResolveSuggestion,
    onUseReply,
}: {
    chat: Chat;
    insight: EvaInsightResult;
    dealState: CrmDealState;
    onSendReply?: (text: string) => Promise<void>;
    createNudge?: JSX.Element | null;
    /** Analytics da EVA — registra o desfecho (accepted/adjusted) da sugestão
     *  quando o humano usa a resposta. Best-effort, nunca quebra a UI. */
    onResolveSuggestion?: (status: "accepted" | "adjusted", finalText: string) => void | Promise<void>;
    onUseReply?: (text: string) => void;
}) {
    const { analysis, qualification, legacy } = insight;
    const summary = analysis.sentiment || "Análise da EVA disponível.";
    // EVA.AUTO.1 — leitura feita automaticamente no 1º contato (carimbo do
    // modo serviço). Some quando o humano reanalisa manualmente.
    const autoQualified = Boolean((analysis as { auto_qualified?: boolean }).auto_qualified);
    const proximaAcaoLabel = qualification.proxima_acao
        ? PROXIMA_ACAO_LABELS[qualification.proxima_acao] ?? qualification.proxima_acao
        : null;

    // Checa se há knowledge_gap de agency_context → mostra aviso leve
    const hasAgencyGap = qualification.knowledge_gaps.some(
        (g) => g.type === "agency_context",
    );

    const gaps = qualification.knowledge_gaps.filter((g) => g.type !== "agency_context");
    const hasInfo = qualification.info_coletada.length > 0 || qualification.info_faltante.length > 0;

    const reduce = useReducedMotion();
    const hasHero = Boolean(
        proximaAcaoLabel || analysis.nextAction || qualification.resposta_sugerida || analysis.draft,
    );
    const hasDiagnosis = Boolean(
        qualification.score_sugerido !== null ||
        qualification.temperatura ||
        qualification.fit_sugerido,
    );

    // LP-INBOX.2 2026-06-21: a apresentação vira uma decision stack ENCENADA.
    // Diagnóstico rápido (1 olhada) → herói (o que fazer agora) → nudge →
    // handoff → leitura completa → dossiê em seções separadas. As seções
    // entram em stagger (rise+fade); a LÓGICA e as condições são as mesmas.
    const Stack = reduce ? "div" : motion.div;
    const stackProps = reduce
        ? {}
        : ({ variants: staggerGroup, initial: "hidden", animate: "show" } as const);

    return (
        <Stack className="space-y-4" {...(stackProps as object)}>
            {/* EVA.AUTO.1 — atribuição: a EVA leu sozinha quando o lead chegou */}
            {autoQualified && (
                <RevealItem
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ background: "rgba(109,40,217,0.06)", border: "1px solid rgba(109,40,217,0.16)" }}
                >
                    <EvaNode size={11} color="#6D28D9" />
                    <p className="text-[11.5px] font-medium" style={{ color: "#6D28D9", lineHeight: 1.4 }}>
                        A EVA leu esta conversa sozinha quando o lead chegou.
                    </p>
                </RevealItem>
            )}
            {/* Avisos finos */}
            {hasAgencyGap && (
                <RevealItem>
                    <ContextGapBanner />
                </RevealItem>
            )}
            {legacy && (
                <RevealItem
                    className="px-3 py-2 flex items-start gap-2 rounded-md"
                    style={{
                        background: "rgba(245,158,11,0.06)",
                        borderLeft: "2px solid rgba(245,158,11,0.5)",
                    }}
                >
                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "#B45309" }} />
                    <p className="text-[11.5px]" style={{ color: "#92400E", lineHeight: 1.4 }}>
                        Esta conversa ainda usa análise no formato antigo. A próxima
                        reanálise traz qualificação completa.
                    </p>
                </RevealItem>
            )}

            {/* ── DIAGNÓSTICO RÁPIDO: a leitura em 1 olhada ── */}
            {hasDiagnosis && (
                <RevealItem>
                    <QuickDiagnosis qualification={qualification} />
                </RevealItem>
            )}

            {/* ── HERÓI: o que fazer agora (próxima ação + resposta sugerida) ── */}
            {hasHero && (
                <RevealItem
                    className="rounded-xl overflow-hidden vz-eva-hero"
                    style={{
                        background: "#FFFFFF",
                        border: "1px solid var(--ibx-line)",
                        boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 12px 32px -16px rgba(37,99,235,0.18)",
                    }}
                >
                    <div className="px-4 pt-3 pb-1.5">
                        <p
                            className="text-[10px] uppercase inline-flex items-center gap-1.5"
                            style={{ color: "#6D28D9", fontWeight: 700, letterSpacing: "0.08em" }}
                        >
                            <EvaNode size={10} color="#6D28D9" />
                            O que fazer agora
                        </p>
                    </div>
                    {(proximaAcaoLabel || analysis.nextAction) && (
                        <div className="px-4 pb-0.5">
                            <p
                                className="text-[14px] font-semibold"
                                style={{ color: "#0B1220", lineHeight: 1.35 }}
                            >
                                {proximaAcaoLabel || analysis.nextAction}
                            </p>
                            {proximaAcaoLabel && analysis.nextAction && analysis.nextAction !== proximaAcaoLabel && (
                                <p className="text-[11.5px] mt-1" style={{ color: "#64748B", lineHeight: 1.45 }}>
                                    {analysis.nextAction}
                                </p>
                            )}
                        </div>
                    )}
                    {(qualification.resposta_sugerida || analysis.draft) && (
                        <SuggestedReply
                            text={qualification.resposta_sugerida || analysis.draft || ""}
                            onSend={onSendReply}
                            onUseReply={onUseReply}
                            hasAction={Boolean(proximaAcaoLabel || analysis.nextAction)}
                            onResolveSuggestion={onResolveSuggestion}
                        />
                    )}
                </RevealItem>
            )}

            {/* Nível 2 do upgrade de confiança: card "novo lead pronto pro pipeline",
                montado no PanelContent e passado como slot. */}
            {createNudge && <RevealItem>{createNudge}</RevealItem>}

            {/* Handoff — alerta importante, logo abaixo do herói */}
            {qualification.deve_fazer_handoff && (
                <RevealItem>
                    <RecommendationCallout
                        icon={UserCog}
                        tone="amber"
                        title="A EVA recomenda handoff humano"
                        body="Esta conversa bate em regras de handoff cadastradas. Considere passar para um vendedor."
                    />
                </RevealItem>
            )}

            {/* ── LEITURA COMPLETA: justificativa + sinais agrupados ── */}
            <RevealItem>
                <QualificationBlock qualification={qualification} />
            </RevealItem>

            {/* ── DOSSIÊ: seções SEPARADAS com respiro (não 1 caixa monolítica) ── */}
            <RevealItem className="space-y-2.5">
                <DossierCard>
                    <DossierRow title="Resumo da conversa" defaultOpen>
                        <p className="text-[12.5px]" style={{ color: "#334155", lineHeight: 1.6 }}>
                            {summary}
                        </p>
                        {analysis.stage && (
                            <p className="text-[11px] mt-1.5" style={{ color: "#64748B" }}>
                                Estágio sugerido: <strong style={{ color: "#0B1220" }}>{analysis.stage}</strong>
                            </p>
                        )}
                    </DossierRow>
                </DossierCard>

                {hasInfo && (
                    <DossierCard>
                        <DossierRow
                            title="Informações do lead"
                            count={qualification.info_coletada.length + qualification.info_faltante.length}
                        >
                            <InfoLists
                                coletada={qualification.info_coletada}
                                faltante={qualification.info_faltante}
                            />
                        </DossierRow>
                    </DossierCard>
                )}

                {gaps.length > 0 && (
                    <DossierCard>
                        <DossierRow title="O que deixa a EVA mais afiada" count={gaps.length}>
                            <KnowledgeGapsList gaps={gaps} />
                        </DossierRow>
                    </DossierCard>
                )}

                {/* F6T.3 — Marcadores comerciais (tags da conversa/deal vinculado) */}
                <EvaTagsSection
                    conversationId={chat.conversationId}
                    dealId={dealState.effectiveDealId}
                />

                <DossierCard>
                    <DossierRow title="Oportunidade no CRM">
                        <CrmBlock
                            matchedDeal={dealState.matchedDeal}
                            hasLinkedOpportunity={dealState.hasLinkedOpportunity}
                            effectiveDealId={dealState.effectiveDealId}
                            loading={dealState.loading}
                        />
                    </DossierRow>
                </DossierCard>
            </RevealItem>

            {/* EVA.STUDIO.7 — regras aplicadas no EVA Studio (só leitura) */}
            <RevealItem>
                <EvaStudioRules />
            </RevealItem>
        </Stack>
    );
}

// ─── Dossiê: cartão por seção (respiro entre, não border monolítico) ────────

function DossierCard({ children }: { children: React.ReactNode }) {
    return (
        <div
            className="rounded-xl px-4 transition-shadow duration-200"
            style={{
                background: "#FFFFFF",
                border: "1px solid var(--ibx-line-soft)",
                boxShadow: "0 1px 2px rgba(15,23,42,0.03)",
            }}
        >
            {children}
        </div>
    );
}

// ─── Dossiê: linha expansível (progressive disclosure) ──────────────────────

function DossierRow({
    title,
    count,
    defaultOpen = false,
    children,
}: {
    title: string;
    count?: number;
    defaultOpen?: boolean;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);
    const reduce = useReducedMotion();
    return (
        <div className="border-b last:border-b-0" style={{ borderColor: "var(--ibx-line-soft)" }}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className="w-full flex items-center gap-2 py-3 text-left group"
            >
                <ChevronRight
                    className="h-3.5 w-3.5 shrink-0 transition-transform duration-200"
                    style={{
                        color: open ? "#2563EB" : "#94A3B8",
                        transform: open ? "rotate(90deg)" : "none",
                        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                    }}
                />
                <span
                    className="text-[11px] uppercase flex-1 transition-colors duration-200"
                    style={{
                        color: open ? "#0B1220" : "#475569",
                        fontWeight: 700,
                        letterSpacing: "0.07em",
                    }}
                >
                    {title}
                </span>
                {typeof count === "number" && count > 0 && (
                    <span
                        className="text-[10px] tabular-nums px-1.5 py-0.5 rounded-full shrink-0"
                        style={{
                            background: "rgba(37,99,235,0.08)",
                            color: "#1D4ED8",
                            fontWeight: 700,
                        }}
                    >
                        {count}
                    </span>
                )}
            </button>
            {/* LP-INBOX.2 — anima a altura no expand/collapse (com reduced-motion fallback). */}
            {reduce ? (
                open && <div className="pb-3.5 pl-[22px]">{children}</div>
            ) : (
                <AnimatePresence initial={false}>
                    {open && (
                        <motion.div
                            key="content"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.24, ease: EVA_EASE }}
                            style={{ overflow: "hidden" }}
                        >
                            <div className="pb-3.5 pl-[22px]">{children}</div>
                        </motion.div>
                    )}
                </AnimatePresence>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componentes
// ─────────────────────────────────────────────────────────────────────────────

function ContextGapBanner() {
    return (
        <div
            className="rounded-md px-3 py-2.5 flex items-start gap-2"
            style={{
                background: "rgba(245,158,11,0.06)",
                borderLeft: "2px solid rgba(245,158,11,0.5)",
            }}
        >
            <AlertTriangle
                className="h-3.5 w-3.5 mt-0.5 shrink-0"
                style={{ color: "#B45309" }}
            />
            <p
                className="text-[11.5px]"
                style={{ color: "#92400E", lineHeight: 1.4 }}
            >
                Contexto da agência incompleto. Sugestões da EVA ficam genéricas até
                cadastrar serviços, ICP e regras.{" "}
                <a
                    href="/configuracoes/eva"
                    className="font-semibold underline"
                    style={{ color: "#92400E" }}
                >
                    Configurar agora
                </a>
            </p>
        </div>
    );
}

type ToneKey = "blue" | "green" | "amber" | "orange" | "rose" | "purple" | "neutral";

const TONE_STYLES: Record<ToneKey, { bg: string; border: string; text: string }> = {
    blue: { bg: "rgba(37,99,235,0.10)", border: "rgba(37,99,235,0.30)", text: "#1D4ED8" },
    green: { bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.30)", text: "#047857" },
    amber: { bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.30)", text: "#B45309" },
    orange: { bg: "rgba(249,115,22,0.10)", border: "rgba(249,115,22,0.30)", text: "#C2410C" },
    rose: { bg: "rgba(244,63,94,0.10)", border: "rgba(244,63,94,0.30)", text: "#BE123C" },
    purple: { bg: "rgba(124,58,237,0.10)", border: "rgba(124,58,237,0.30)", text: "#6D28D9" },
    neutral: { bg: "rgba(148,163,184,0.10)", border: "rgba(148,163,184,0.30)", text: "#475569" },
};

// ─── Diagnóstico rápido — a leitura em 1 olhada (faixa compacta) ────────────

function QuickDiagnosis({ qualification }: { qualification: Qualification }) {
    const reduce = useReducedMotion();
    const score = qualification.score_sugerido;
    const animatedScore = useCountUp(score);
    const fit = qualification.fit_sugerido ? FIT_META[qualification.fit_sugerido] : null;
    const temp = qualification.temperatura ? TEMPERATURA_META[qualification.temperatura] : null;
    const TempIcon = temp?.icon;
    const tempStyle = temp ? TONE_STYLES[temp.tone] : null;
    const fitStyle = fit ? TONE_STYLES[fit.tone] : null;
    const barTarget = `${score ?? 0}%`;

    return (
        <div
            className="rounded-xl px-3.5 py-3"
            style={{
                background: "#FFFFFF",
                border: "1px solid var(--ibx-line)",
                boxShadow: "0 1px 2px rgba(15,23,42,0.03)",
            }}
        >
            <div className="flex items-center gap-3">
                {/* Temperatura — cor + ícone */}
                {temp && tempStyle && (
                    <div
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg shrink-0"
                        style={{ background: tempStyle.bg, border: `1px solid ${tempStyle.border}` }}
                        title={`Temperatura: ${temp.label}`}
                    >
                        {TempIcon && <TempIcon className="h-3.5 w-3.5" strokeWidth={2.4} style={{ color: tempStyle.text }} />}
                        <span className="text-[11.5px]" style={{ color: tempStyle.text, fontWeight: 700 }}>
                            {temp.label}
                        </span>
                    </div>
                )}

                {/* Score grande tabular (count-up) */}
                <div className="flex items-baseline gap-0.5 shrink-0">
                    <span
                        className="text-[24px] leading-none tabular-nums"
                        style={{ color: score !== null ? "#1D4ED8" : "#94A3B8", fontWeight: 800, letterSpacing: "-0.03em" }}
                    >
                        {animatedScore !== null ? animatedScore : "—"}
                    </span>
                    <span className="text-[10.5px]" style={{ color: "#94A3B8", fontWeight: 600 }}>
                        /100
                    </span>
                </div>

                {/* Fit */}
                {fit && fitStyle && (
                    <span
                        className="ml-auto text-[11px] px-2 py-0.5 rounded-md shrink-0"
                        style={{ background: fitStyle.bg, color: fitStyle.text, fontWeight: 700 }}
                        title={`Fit ${fit.label}`}
                    >
                        Fit {fit.label}
                    </span>
                )}
            </div>

            {/* Barra de fit fina (width animada) */}
            <div
                className="h-[5px] rounded-full overflow-hidden mt-2.5"
                style={{ background: "rgba(13,20,33,0.07)" }}
            >
                {reduce ? (
                    <div
                        className="h-full rounded-full"
                        style={{ width: barTarget, background: "linear-gradient(90deg, #2563EB, #4A8CE8)" }}
                    />
                ) : (
                    <motion.div
                        className="h-full rounded-full"
                        style={{ background: "linear-gradient(90deg, #2563EB, #4A8CE8)" }}
                        initial={{ width: "0%" }}
                        animate={{ width: barTarget }}
                        transition={{ duration: 0.6, ease: EVA_EASE, delay: 0.1 }}
                    />
                )}
            </div>
        </div>
    );
}

function QualificationBlock({ qualification }: { qualification: Qualification }) {
    const reduce = useReducedMotion();
    const temp = qualification.temperatura ? TEMPERATURA_META[qualification.temperatura] : null;
    const urg = qualification.urgencia ? URGENCIA_META[qualification.urgencia] : null;

    // LP-INBOX.2: sinais AGRUPADOS por categoria, cada um com micro-label.
    // O score/fit/temperatura já apareceram no diagnóstico rápido acima; aqui
    // entra a justificativa + os sinais qualificados, organizados.
    const signals: { category: string; tone: ToneKey; value: string; icon?: typeof Flame }[] = [];
    if (temp) signals.push({ category: "Temperatura", tone: temp.tone, value: temp.label, icon: temp.icon });
    if (urg) signals.push({ category: "Urgência", tone: urg.tone, value: urg.label });
    if (qualification.intencao)
        signals.push({
            category: "Intenção",
            tone: "purple",
            value: INTENCAO_LABELS[qualification.intencao] ?? qualification.intencao,
        });
    if (qualification.servico_interesse)
        signals.push({ category: "Serviço", tone: "blue", value: qualification.servico_interesse });
    if (qualification.objecao)
        signals.push({ category: "Objeção", tone: "rose", value: qualification.objecao });

    const hasContent = Boolean(qualification.score_justificativa) || signals.length > 0;
    if (!hasContent) return null;

    const PillsWrap = reduce ? "div" : motion.div;
    const pillsProps = reduce
        ? {}
        : ({ variants: staggerGroup, initial: "hidden", animate: "show" } as const);

    return (
        <div className="px-0.5">
            <p
                className="text-[10px] uppercase mb-2.5"
                style={{ color: "#64748B", fontWeight: 700, letterSpacing: "0.08em" }}
            >
                Por que a EVA leu assim
            </p>
            {qualification.score_justificativa && (
                <p className="text-[11.5px] mb-3" style={{ color: "#475569", lineHeight: 1.55 }}>
                    {qualification.score_justificativa}
                </p>
            )}
            {signals.length > 0 && (
                <PillsWrap className="flex flex-wrap gap-1.5" {...(pillsProps as object)}>
                    {signals.map((sig) => (
                        <CategoryPill
                            key={sig.category}
                            category={sig.category}
                            value={sig.value}
                            tone={sig.tone}
                            icon={sig.icon}
                        />
                    ))}
                </PillsWrap>
            )}
        </div>
    );
}

/** Pill com micro-label de categoria (esquerda) + valor (direita), agrupados. */
function CategoryPill({
    category,
    value,
    tone,
    icon: Icon,
}: {
    category: string;
    value: string;
    tone: ToneKey;
    icon?: typeof Flame;
}) {
    const reduce = useReducedMotion();
    const s = TONE_STYLES[tone];
    const inner = (
        <span
            className="inline-flex items-stretch rounded-md overflow-hidden text-[11px]"
            style={{ border: `1px solid ${s.border}` }}
            title={`${category}: ${value}`}
        >
            <span
                className="inline-flex items-center px-1.5 uppercase"
                style={{ background: "rgba(15,23,42,0.035)", color: "#64748B", fontWeight: 700, letterSpacing: "0.04em", fontSize: "9px" }}
            >
                {category}
            </span>
            <span
                className="inline-flex items-center gap-1 px-2 py-0.5"
                style={{ background: s.bg, color: s.text, fontWeight: 600 }}
            >
                {Icon && <Icon className="h-3 w-3" strokeWidth={2.4} />}
                {value}
            </span>
        </span>
    );
    if (reduce) return inner;
    return <motion.div variants={riseItem}>{inner}</motion.div>;
}

function InfoLists({
    coletada,
    faltante,
}: {
    coletada: string[];
    faltante: string[];
}) {
    // LP-INBOX.2: dois grupos VISUALMENTE separados — "Já sabemos" (verde) e
    // "Falta descobrir" (âmbar), cada um com fundo tinto próprio.
    return (
        <div className="grid grid-cols-1 gap-2.5">
            {coletada.length > 0 && (
                <div
                    className="rounded-lg px-3 py-2.5"
                    style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.20)" }}
                >
                    <p
                        className="text-[10.5px] uppercase mb-1.5 inline-flex items-center gap-1"
                        style={{
                            color: "#047857",
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                        }}
                    >
                        <CheckCircle2 className="h-3 w-3" style={{ color: "#10B981" }} />
                        Já sabemos
                    </p>
                    <ul className="space-y-1">
                        {coletada.map((item, i) => (
                            <li
                                key={i}
                                className="flex items-start gap-1.5 text-[11.5px]"
                                style={{ color: "#0B1220" }}
                            >
                                <CheckCircle2
                                    className="h-3 w-3 mt-0.5 shrink-0"
                                    style={{ color: "#10B981" }}
                                />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {faltante.length > 0 && (
                <div
                    className="rounded-lg px-3 py-2.5"
                    style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.20)" }}
                >
                    <p
                        className="text-[10.5px] uppercase mb-1.5 inline-flex items-center gap-1"
                        style={{
                            color: "#B45309",
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                        }}
                    >
                        <AlertTriangle className="h-3 w-3" style={{ color: "#F59E0B" }} />
                        Falta descobrir
                    </p>
                    <ul className="space-y-1">
                        {faltante.map((item, i) => (
                            <li
                                key={i}
                                className="flex items-start gap-1.5 text-[11.5px]"
                                style={{ color: "#0B1220" }}
                            >
                                <AlertCircle
                                    className="h-3 w-3 mt-0.5 shrink-0"
                                    style={{ color: "#F59E0B" }}
                                />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

function SuggestedReply({
    text,
    onSend,
    onUseReply,
    hasAction = false,
    onResolveSuggestion,
}: {
    text: string;
    onSend?: (text: string) => Promise<void>;
    onUseReply?: (text: string) => void;
    hasAction?: boolean;
    /** Analytics da EVA — registra accepted (copiou/enviou sem editar) ou
     *  adjusted (editou o texto antes). Best-effort, nunca quebra o fluxo. */
    onResolveSuggestion?: (status: "accepted" | "adjusted", finalText: string) => void | Promise<void>;
}) {
    const [edited, setEdited] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const display = edited ?? text;

    // Analytics: a EVA apresentou uma resposta sugerida. Marca o evento e prioriza
    // a gravação da sessão (momento de valor da EVA).
    useEffect(() => {
        if (!text) return;
        trackBehavior(DEMO_EVENTS.EVA_SUGGESTION_SHOWN, {});
        clarityUpgrade("eva_suggestion");
    }, [text]);

    // Desfecho da sugestão: se o texto enviado/copiado difere do original (o
    // humano editou antes de usar), conta como "adjusted"; senão "accepted".
    const outcomeFor = (finalText: string): "accepted" | "adjusted" =>
        finalText.trim() !== text.trim() ? "adjusted" : "accepted";

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(display);
            toast.success("Resposta copiada");
            void onResolveSuggestion?.(outcomeFor(display), display);
        } catch {
            toast.error("Não foi possível copiar");
        }
    };

    // Coloca a resposta no campo de digitação pro humano revisar e enviar
    // (assistido). No mobile, o EvaPanel ainda fecha o bottom sheet por cima disto.
    const handleUse = () => {
        const msg = display.trim();
        if (!msg) return;
        onUseReply?.(msg);
        void onResolveSuggestion?.(outcomeFor(msg), msg);
        setEdited(null);
    };

    // PROSPECT.1 — aprovar-e-enviar com 1 toque (envia o texto, já editado se for o caso).
    const handleSend = async () => {
        if (!onSend || sending) return;
        const msg = display.trim();
        if (!msg) return;
        setSending(true);
        try {
            await onSend(msg);
            toast.success("Resposta enviada");
            void onResolveSuggestion?.(outcomeFor(msg), msg);
            setEdited(null);
        } catch {
            toast.error("Não foi possível enviar");
        } finally {
            setSending(false);
        }
    };

    // LP-INBOX.2: a resposta vive DENTRO do cartão-herói como a EXECUÇÃO da
    // próxima ação — rascunho de mensagem (bolha de chat), não campo de form.
    return (
        <div className="px-4 pb-4 pt-2.5">
            {/* Conector visual: deixa claro que a resposta executa a ação acima. */}
            {hasAction && (
                <p
                    className="text-[10px] uppercase mb-1.5"
                    style={{ color: "#94A3B8", fontWeight: 700, letterSpacing: "0.07em" }}
                >
                    Resposta sugerida
                </p>
            )}
            {edited === null ? (
                <div
                    className="px-3.5 py-3 text-[12.5px]"
                    style={{
                        background: "#F7F5FE",
                        border: "1px solid rgba(124,58,237,0.16)",
                        borderRadius: "12px 12px 12px 4px",
                        color: "#1E1B2E",
                        lineHeight: 1.55,
                    }}
                >
                    {text}
                </div>
            ) : (
                <textarea
                    value={edited}
                    onChange={(e) => setEdited(e.target.value)}
                    autoFocus
                    className="w-full text-[12.5px] px-3.5 py-3 outline-none resize-y min-h-[88px]"
                    style={{
                        background: "#FFFFFF",
                        border: "1px solid rgba(124,58,237,0.35)",
                        borderRadius: "12px 12px 12px 4px",
                        color: "#1E1B2E",
                        lineHeight: 1.55,
                        boxShadow: "0 0 0 3px rgba(124,58,237,0.08)",
                    }}
                />
            )}
            {/* Hierarquia: ação primária maior e sólida; secundárias compactas. */}
            <div className="flex items-center gap-2 mt-3">
                {onSend ? (
                    <button
                        type="button"
                        onClick={handleSend}
                        disabled={sending}
                        className="vz-eva-cta inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg text-[12.5px] font-semibold text-white flex-1 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{
                            background: "linear-gradient(135deg, #10B981, #34D399)",
                            boxShadow: "0 6px 16px -6px rgba(16,185,129,0.45), 0 1px 0 rgba(255,255,255,0.20) inset",
                        }}
                    >
                        <ArrowUp className="h-3.5 w-3.5" />
                        {sending ? "Enviando..." : "Enviar resposta"}
                    </button>
                ) : onUseReply ? (
                    <button
                        type="button"
                        onClick={handleUse}
                        className="vz-eva-cta inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg text-[12.5px] font-semibold text-white flex-1 transition-all"
                        style={{
                            background: "linear-gradient(135deg, #2563EB, #4A8CE8)",
                            boxShadow: "0 6px 16px -6px rgba(37,99,235,0.40), 0 1px 0 rgba(255,255,255,0.20) inset",
                        }}
                    >
                        <ArrowRight className="h-3.5 w-3.5" />
                        Usar resposta
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="vz-eva-cta inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg text-[12.5px] font-semibold text-white flex-1 transition-all"
                        style={{
                            background: "linear-gradient(135deg, #2563EB, #4A8CE8)",
                            boxShadow: "0 6px 16px -6px rgba(37,99,235,0.40), 0 1px 0 rgba(255,255,255,0.20) inset",
                        }}
                    >
                        <Copy className="h-3.5 w-3.5" />
                        Copiar resposta
                    </button>
                )}
                {/* Com ação primária (Enviar/Usar), Copiar vira secundário compacto. */}
                {(onSend || onUseReply) && (
                    <button
                        type="button"
                        onClick={handleCopy}
                        title="Copiar resposta"
                        aria-label="Copiar resposta"
                        className="vz-eva-ghost inline-flex items-center justify-center h-9 w-9 rounded-lg transition-all shrink-0"
                        style={{ color: "#1D4ED8", border: "1px solid rgba(37,99,235,0.22)" }}
                    >
                        <Copy className="h-3.5 w-3.5" />
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => setEdited(edited === null ? text : null)}
                    title={edited === null ? "Editar resposta" : "Cancelar edição"}
                    aria-label={edited === null ? "Editar resposta" : "Cancelar edição"}
                    className="vz-eva-ghost inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-[11.5px] font-semibold transition-all shrink-0"
                    style={{ color: "#6D28D9", border: "1px solid rgba(124,58,237,0.22)" }}
                >
                    <Edit3 className="h-3.5 w-3.5" />
                    {edited === null ? "Editar" : "Cancelar"}
                </button>
            </div>
            {/* Legenda do bloco inteiro: o controle continua humano. */}
            <p className="text-[10px] mt-2" style={{ color: "#94A3B8" }}>
                Você aprova antes de enviar.
            </p>
        </div>
    );
}

function RecommendationCallout({
    icon: Icon,
    tone,
    title,
    body,
    cta,
}: {
    icon: typeof Plus;
    tone: ToneKey;
    title: string;
    body: string;
    cta?: { label: string; onClick: () => void };
}) {
    const s = TONE_STYLES[tone];
    return (
        <div
            className="rounded-lg px-3 py-2.5 flex items-start gap-2.5"
            style={{
                background: s.bg,
                border: `1px solid ${s.border}`,
            }}
        >
            <Icon
                className="h-3.5 w-3.5 mt-0.5 shrink-0"
                style={{ color: s.text }}
                strokeWidth={2.2}
            />
            <div className="flex-1 min-w-0">
                <p
                    className="text-[12px] font-semibold mb-0.5"
                    style={{ color: s.text }}
                >
                    {title}
                </p>
                <p
                    className="text-[11px] mb-2"
                    style={{ color: "#475569", lineHeight: 1.4 }}
                >
                    {body}
                </p>
                {cta && (
                    <button
                        type="button"
                        onClick={cta.onClick}
                        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-semibold transition-all hover:brightness-110"
                        style={{
                            background: "linear-gradient(135deg, #2563EB, #4A8CE8)",
                            color: "#FFFFFF",
                        }}
                    >
                        <Plus className="h-3 w-3" />
                        {cta.label}
                    </button>
                )}
            </div>
        </div>
    );
}

function KnowledgeGapsList({ gaps }: { gaps: KnowledgeGap[] }) {
    const TYPE_LABELS: Record<string, string> = {
        service: "Serviço",
        pricing: "Preço",
        icp: "ICP",
        handoff_rule: "Regra de handoff",
        tone: "Tom de voz",
        other: "Outro",
    };
    return (
        <div>
            {/* Enquadramento: insumo pra afinar a EVA, não erro. */}
            <p className="text-[11px] mb-2.5" style={{ color: "#64748B", lineHeight: 1.5 }}>
                Cadastrar estes pontos no contexto deixa as próximas leituras da EVA mais precisas.
            </p>
            <ul className="space-y-2">
                {gaps.map((g, i) => (
                    <li
                        key={i}
                        className="rounded-lg px-3 py-2.5"
                        style={{
                            background: "var(--ibx-sunken)",
                            border: "1px solid var(--ibx-line)",
                        }}
                    >
                        <div className="flex items-center gap-1.5 mb-1">
                            <span
                                className="text-[9.5px] uppercase px-1.5 py-0.5 rounded"
                                style={{
                                    background: "rgba(124,58,237,0.10)",
                                    color: "#6D28D9",
                                    fontWeight: 700,
                                    letterSpacing: "0.06em",
                                }}
                            >
                                {TYPE_LABELS[g.type] ?? g.type}
                            </span>
                        </div>
                        <p
                            className="text-[11.5px] mb-1"
                            style={{ color: "#0B1220", fontWeight: 500 }}
                        >
                            {g.description}
                        </p>
                        <p className="text-[11px] flex items-start gap-1" style={{ color: "#64748B", lineHeight: 1.4 }}>
                            <ArrowRight className="h-3 w-3 mt-0.5 shrink-0" style={{ color: "#6D28D9" }} />
                            <span>{g.suggested_fix}</span>
                        </p>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ─── Section wrapper ────────────────────────────────────────────────────────

/**
 * F6T.3 — Marcadores comerciais (tags F6T.1) associados à conversa e/ou ao
 * deal vinculado. Read-only, dedupe por id. Deixa explícito que são marcadores
 * do time, não aplicados pela EVA (critério: EVA não aplica tags sozinha).
 */
function EvaTagsSection({
    conversationId,
    dealId,
}: {
    conversationId?: string | null;
    dealId?: string | null;
}) {
    const { tags: convTags } = useEntityTags("conversation", conversationId);
    const { tags: dealTags } = useEntityTags("deal", dealId);

    const tags = useMemo(() => {
        const map = new Map<string, Tag>();
        for (const t of [...convTags, ...dealTags]) map.set(t.id, t);
        return [...map.values()];
    }, [convTags, dealTags]);

    if (tags.length === 0) return null;

    return (
        <DossierCard>
        <DossierRow title="Marcadores comerciais" count={tags.length}>
            <div className="flex items-center gap-1.5 flex-wrap">
                {tags.map((tag) => {
                    const useHex = isHexColor(tag.color);
                    return (
                        <span
                            key={tag.id}
                            title={tag.description ?? tag.name}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ring-1 ring-inset ${useHex ? "" : getTagColorClass(tag.color)}`}
                            style={
                                useHex
                                    ? {
                                          backgroundColor: `${tag.color}1a`,
                                          color: tag.color as string,
                                          boxShadow: `inset 0 0 0 1px ${tag.color}55`,
                                      }
                                    : undefined
                            }
                        >
                            {tag.name}
                        </span>
                    );
                })}
            </div>
            <p
                className="text-[10.5px] mt-2"
                style={{ color: "#94A3B8", lineHeight: 1.4 }}
            >
                Marcadores aplicados pelo time. A EVA não aplica tags sozinha.
            </p>
        </DossierRow>
        </DossierCard>
    );
}

// ─── PrimaryAction (CTA destacado) ──────────────────────────────────────────

// ─── CRM Block ──────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    lead: { label: "Novo lead", color: "#64748B", bg: "rgba(148,163,184,0.14)" },
    qualification: { label: "Qualificação", color: "#1D4ED8", bg: "rgba(37,99,235,0.10)" },
    proposal: { label: "Proposta", color: "#6D28D9", bg: "rgba(124,58,237,0.10)" },
    negotiation: { label: "Negociação", color: "#B45309", bg: "rgba(245,158,11,0.10)" },
    closed_won: { label: "Ganho", color: "#047857", bg: "rgba(16,185,129,0.10)" },
    closed_lost: { label: "Perdido", color: "#DC2626", bg: "rgba(220,38,38,0.08)" },
};

function CrmBlock({
    matchedDeal,
    hasLinkedOpportunity,
    effectiveDealId,
    loading,
}: {
    matchedDeal: CrmDeal | null;
    hasLinkedOpportunity: boolean;
    effectiveDealId: string | null;
    loading: boolean;
}) {
    if (loading) {
        return (
            <div
                className="rounded-lg px-3 py-4 flex items-center justify-center"
                style={{ background: "var(--ibx-sunken)", border: "1px solid var(--ibx-line)" }}
            >
                <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "#94A3B8" }} />
            </div>
        );
    }

    // Estado 3 — sem vínculo oficial e sem deal por telefone
    if (!hasLinkedOpportunity && !matchedDeal) {
        return (
            <div
                className="rounded-lg px-3 py-4 text-center"
                style={{ background: "var(--ibx-sunken)", border: "1px solid var(--ibx-line)" }}
            >
                <Workflow className="h-5 w-5 mx-auto mb-1.5" style={{ color: "#94A3B8" }} />
                <p className="text-[12px]" style={{ color: "#0B1220", fontWeight: 600 }}>
                    Ainda não está no pipeline
                </p>
                <p className="text-[11px] mt-1" style={{ color: "#64748B" }}>
                    Use "Criar oportunidade no pipeline" acima pra adicionar este lead.
                </p>
            </div>
        );
    }

    // Nota coerente com o banner (mesma fonte de verdade)
    const noteText = hasLinkedOpportunity
        ? "Esta conversa já está no pipeline."
        : "Possível oportunidade existente — ainda não vinculada a esta conversa.";
    const noteColor = hasLinkedOpportunity ? "#047857" : "#B45309";

    // Só mostra detalhes do deal certo:
    //  - vinculado: apenas se o deal achado por telefone for o MESMO do vínculo
    //  - não vinculado (estado 2): o deal achado por telefone
    const detailDeal = hasLinkedOpportunity
        ? matchedDeal && matchedDeal.id === effectiveDealId
            ? matchedDeal
            : null
        : matchedDeal;
    const href = effectiveDealId
        ? `/deals/${effectiveDealId}`
        : matchedDeal
        ? `/deals/${matchedDeal.id}`
        : null;

    // Estado 1 vinculado mas sem detalhes (telefone do deal não casou)
    if (!detailDeal) {
        return (
            <div
                className="rounded-lg px-3 py-3"
                style={{ background: "#FFFFFF", border: "1px solid var(--ibx-line)", boxShadow: "0 1px 2px rgba(15,23,42,0.03)" }}
            >
                <p className="text-[12px] font-semibold" style={{ color: noteColor }}>
                    {noteText}
                </p>
                {href && (
                    <a
                        href={href}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold mt-2 transition-colors hover:text-[#1D4ED8]"
                        style={{ color: "#2563EB" }}
                    >
                        Abrir no CRM
                        <ArrowRight className="h-3 w-3" />
                    </a>
                )}
            </div>
        );
    }

    const stage = STAGE_LABELS[detailDeal.stage as string] || STAGE_LABELS.lead;
    const value = typeof detailDeal.value === "number" ? detailDeal.value : Number(detailDeal.value) || 0;
    const valueStr =
        value > 0
            ? new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                  maximumFractionDigits: 0,
              }).format(value)
            : "R$ 0";
    const updated = detailDeal.updated_at
        ? new Date(detailDeal.updated_at as string).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
          })
        : null;

    return (
        <div
            className="rounded-lg px-3 py-3"
            style={{
                background: "#FFFFFF",
                border: "1px solid var(--ibx-line)",
                boxShadow: "0 1px 2px rgba(15,23,42,0.03)",
            }}
        >
            <p className="text-[11px] font-semibold mb-2" style={{ color: noteColor }}>
                {noteText}
            </p>
            <div className="flex items-start justify-between gap-2 mb-2">
                <p
                    className="text-[12.5px] font-semibold flex-1 min-w-0 truncate"
                    style={{ color: "#0B1220" }}
                    title={detailDeal.title as string}
                >
                    {detailDeal.title}
                </p>
                <span
                    className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded shrink-0"
                    style={{ background: stage.bg, color: stage.color, fontWeight: 600 }}
                >
                    {stage.label}
                </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
                <Stat icon={BarChart3} label="Valor" value={valueStr} color="#1D4ED8" />
                {updated && <Stat icon={Clock} label="Atualizado" value={updated} color="#64748B" />}
                {typeof detailDeal.probability === "number" && (
                    <Stat
                        icon={CheckCircle2}
                        label="Probabilidade"
                        value={`${detailDeal.probability}%`}
                        color={detailDeal.probability >= 70 ? "#047857" : "#64748B"}
                    />
                )}
            </div>
            {href && (
                <a
                    href={href}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold mt-2.5 transition-colors hover:text-[#1D4ED8]"
                    style={{ color: "#2563EB" }}
                >
                    Abrir no CRM
                    <ArrowRight className="h-3 w-3" />
                </a>
            )}
        </div>
    );
}

function Stat({
    icon: Icon,
    label,
    value,
    color,
}: {
    icon: typeof BarChart3;
    label: string;
    value: string;
    color: string;
}) {
    return (
        <div>
            <div className="flex items-center gap-1 mb-0.5">
                <Icon className="h-3 w-3" style={{ color }} />
                <span style={{ color: "#94A3B8", fontWeight: 600 }}>{label}</span>
            </div>
            <p className="tabular-nums" style={{ color: "#0B1220", fontWeight: 600 }}>
                {value}
            </p>
        </div>
    );
}
