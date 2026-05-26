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
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    AlertCircle,
    AlertTriangle,
    ArrowRight,
    BarChart3,
    CheckCircle2,
    Clock,
    Copy,
    Edit3,
    Flame,
    Info,
    Link2,
    Loader2,
    Plus,
    RefreshCw,
    Sparkles,
    ThermometerSun,
    UserCog,
    Workflow,
} from "lucide-react";
import { toast } from "sonner";
import { EvaPhotoAvatar } from "@/components/eva/EvaPhotoAvatar";
import { NovaOportunidadeModal } from "@/components/deals/NovaOportunidadeModal";
import { VincularDealModal } from "@/components/deals/VincularDealModal";
import { sanitizeDisplayName } from "@/lib/displayName";
import { useCrmLookup } from "@/components/whatsapp/useCrmLookup";
import type { CrmDeal } from "@/components/whatsapp/helpers";
import type { Chat, MessageLine } from "@/hooks/useEvolutionAPI";
import { useEvaInsight, type EvaInsightResult } from "@/hooks/useEvaInsight";
import type {
    FitSugerido,
    KnowledgeGap,
    Qualification,
    Temperatura,
    Urgencia,
} from "@/lib/eva/qualificationSchema";

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
}

export function EvaPanel({ chat, messages, onDealLinked }: EvaPanelProps) {
    if (!chat) return <EmptyPanel reason="no-chat" />;
    // key={chat.id} — remonta por conversa pra não vazar estado local
    // (createOpen / localLinkedDealId) entre chats diferentes.
    return <PanelContent key={chat.id} chat={chat} messages={messages} onDealLinked={onDealLinked} />;
}

// ─── Empty / loading / error states ─────────────────────────────────────────

function EmptyPanel({ reason }: { reason: "no-chat" | "no-messages" }) {
    const messageMap = {
        "no-chat": "Selecione uma conversa para a EVA analisar.",
        "no-messages":
            "Selecione uma conversa com mensagens para a EVA analisar.",
    };
    return (
        <div className="flex-1 flex flex-col items-center justify-center px-5 text-center">
            <EvaPhotoAvatar size="md" ring="glow" className="mb-4" />
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
            <EvaPhotoAvatar size="md" ring="glow" className="mb-4" />
            <Loader2
                className="h-4 w-4 animate-spin mb-2"
                style={{ color: "#2563EB" }}
            />
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
}: {
    error: Error;
    onRetry: () => void;
}) {
    const msg = error.message || "Não foi possível analisar agora.";
    const isRateLimit = msg.toLowerCase().includes("limite") || msg.toLowerCase().includes("rate");
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
                <AlertCircle
                    className="h-5 w-5"
                    style={{ color: isRateLimit ? "#B45309" : "#DC2626" }}
                />
            </div>
            <div>
                <p className="text-[13px] font-semibold mb-1" style={{ color: "#0B1220" }}>
                    Não foi possível analisar agora
                </p>
                <p
                    className="text-[11.5px]"
                    style={{ color: "#64748B", lineHeight: 1.55, maxWidth: "260px" }}
                >
                    {msg}
                </p>
            </div>
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
        </div>
    );
}

// ─── Conteúdo principal ─────────────────────────────────────────────────────

function PanelContent({
    chat,
    messages,
    onDealLinked,
}: {
    chat: Chat;
    messages: MessageLine[];
    onDealLinked?: (dealId: string) => void;
}) {
    const navigate = useNavigate();
    const chatPhone = chat.phone || chat.id;
    const insight = useEvaInsight({
        chatPhone,
        contactName: chat.name,
        messages,
        enabled: messages.length > 0,
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
        };
    }, [chat.name, chat.phone, qual?.servico_interesse, qual?.proxima_acao]);

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

    if (messages.length === 0) return <EmptyPanel reason="no-messages" />;

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

    return (
        <>
            {/* Header — sticky */}
            <div
                className="px-5 py-3.5 flex items-center gap-3 shrink-0"
                style={{
                    borderBottom: "1px solid #D9E2EC",
                    background: "#FFFFFF",
                }}
            >
                <EvaPhotoAvatar size="sm" ring="subtle" />
                <div className="flex-1 min-w-0">
                    <p
                        className="text-[13px] font-semibold leading-tight"
                        style={{ color: "#0B1220" }}
                    >
                        EVA Comercial
                    </p>
                    <p className="text-[10.5px] mt-0.5" style={{ color: "#64748B" }}>
                        {headerSubtitle}
                    </p>
                </div>
                {insight.hasAnalysis && !insight.analyzing && (
                    <button
                        type="button"
                        onClick={() => insight.reanalyze()}
                        title={reanalyzeLabel}
                        className="h-6 w-6 rounded-md flex items-center justify-center transition-colors"
                        style={{
                            background: "rgba(37,99,235,0.06)",
                            color: "#2563EB",
                        }}
                    >
                        <RefreshCw className="h-3 w-3" />
                    </button>
                )}
                <span
                    className="inline-flex items-center gap-1 text-[9.5px] px-1.5 py-0.5 rounded uppercase shrink-0"
                    style={{
                        background: "rgba(124,58,237,0.10)",
                        color: "#6D28D9",
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                    }}
                >
                    <Sparkles className="h-2.5 w-2.5" />
                    Preview
                </span>
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

            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">
                {/* Loading inicial do SELECT (sem custo de IA) */}
                {insight.loading && !insight.hasAnalysis && (
                    <LoadingState message="Buscando análise salva…" />
                )}

                {/* Erro da mutation — só aparece se user clicou e falhou */}
                {insight.error && !insight.analyzing && (
                    <ErrorState
                        error={insight.error}
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

                {/* Analisando (mutation rodando) */}
                {insight.analyzing && <LoadingState message="EVA analisando conversa…" />}

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
    // Estado 1 — vínculo OFICIAL (channel_conversations.deal_id)
    if (hasLinkedOpportunity && effectiveDealId) {
        return (
            <div
                className="px-5 py-3 shrink-0 flex items-center gap-2.5"
                style={{ borderBottom: "1px solid #D9E2EC", background: "rgba(16,185,129,0.05)" }}
            >
                <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "#047857" }} />
                <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-semibold leading-tight" style={{ color: "#0B1220" }}>
                        Oportunidade vinculada
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: "#64748B" }}>
                        Esta conversa já está no pipeline.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => onOpenDeal(effectiveDealId)}
                    className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-[11.5px] font-semibold shrink-0 transition-colors hover:brightness-105"
                    style={{ background: "rgba(37,99,235,0.08)", color: "#1D4ED8", border: "1px solid rgba(37,99,235,0.20)" }}
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
                className="px-5 py-3 shrink-0"
                style={{ borderBottom: "1px solid #D9E2EC", background: "rgba(245,158,11,0.06)" }}
            >
                <div className="flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#B45309" }} />
                    <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-semibold leading-tight" style={{ color: "#0B1220" }}>
                            Possível oportunidade existente
                        </p>
                        <p className="text-[11px] mt-0.5" style={{ color: "#64748B" }}>
                            Encontramos uma oportunidade com este contato, mas ela ainda não está vinculada a esta conversa.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    {canLinkExisting && (
                        <button
                            type="button"
                            onClick={onLinkExisting}
                            className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-[11.5px] font-semibold text-white transition-all hover:brightness-110"
                            style={{ background: "linear-gradient(135deg, #2563EB, #4A8CE8)" }}
                        >
                            <Link2 className="h-3 w-3" />
                            Vincular existente
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => onOpenDeal(effectiveDealId)}
                        className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-[11.5px] font-semibold transition-colors hover:bg-white"
                        style={{ background: "transparent", color: "#1D4ED8", border: "1px solid rgba(37,99,235,0.20)" }}
                    >
                        Abrir oportunidade
                        <ArrowRight className="h-3 w-3" />
                    </button>
                </div>
            </div>
        );
    }

    // Estado 3 — sem oportunidade
    return (
        <div
            className="px-5 py-3 shrink-0"
            style={{ borderBottom: "1px solid #D9E2EC", background: "#F8FAFC" }}
        >
            <div className="flex items-start gap-2.5">
                <Workflow className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#64748B" }} />
                <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-semibold leading-tight" style={{ color: "#0B1220" }}>
                        Ainda não está no pipeline
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: "#64748B" }}>
                        Crie uma oportunidade ou vincule a uma que já existe.
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                <button
                    type="button"
                    onClick={onCreate}
                    className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-[11.5px] font-semibold text-white transition-all hover:brightness-110"
                    style={{ background: "linear-gradient(135deg, #2563EB, #4A8CE8)" }}
                >
                    <Plus className="h-3 w-3" />
                    Criar oportunidade no pipeline
                </button>
                {canLinkExisting && (
                    <button
                        type="button"
                        onClick={onLinkExisting}
                        className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-[11.5px] font-semibold transition-colors hover:bg-white"
                        style={{ background: "transparent", color: "#475569", border: "1px solid #D9E2EC" }}
                    >
                        <Link2 className="h-3 w-3" />
                        Vincular existente
                    </button>
                )}
            </div>
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

function NoAnalysisState({ onAnalyze }: { onAnalyze: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center text-center py-8 px-2">
            <EvaPhotoAvatar size="md" ring="subtle" className="mb-4" />
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
                <Sparkles className="h-3.5 w-3.5" />
                Analisar conversa
            </button>
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
    return (
        <div
            className="rounded-xl px-4 py-3 flex items-start gap-3"
            style={{
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.22)",
            }}
        >
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#B45309" }} />
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
        </div>
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
}: {
    chat: Chat;
    insight: EvaInsightResult;
    dealState: CrmDealState;
}) {
    const { analysis, qualification, legacy } = insight;
    const summary = analysis.sentiment || "Análise da EVA disponível.";
    const proximaAcaoLabel = qualification.proxima_acao
        ? PROXIMA_ACAO_LABELS[qualification.proxima_acao] ?? qualification.proxima_acao
        : null;

    // Checa se há knowledge_gap de agency_context → mostra aviso leve
    const hasAgencyGap = qualification.knowledge_gaps.some(
        (g) => g.type === "agency_context",
    );

    return (
        <>
            {/* Aviso contexto incompleto */}
            {hasAgencyGap && <ContextGapBanner />}

            {/* Legacy fallback notice (cached_analysis antigo sem qualification) */}
            {legacy && (
                <div
                    className="rounded-lg px-3 py-2 flex items-start gap-2"
                    style={{
                        background: "rgba(245,158,11,0.06)",
                        border: "1px solid rgba(245,158,11,0.22)",
                    }}
                >
                    <Info
                        className="h-3.5 w-3.5 mt-0.5 shrink-0"
                        style={{ color: "#B45309" }}
                    />
                    <p
                        className="text-[11.5px]"
                        style={{ color: "#92400E", lineHeight: 1.4 }}
                    >
                        Esta conversa ainda usa análise no formato antigo. A próxima
                        reanálise traz qualificação completa.
                    </p>
                </div>
            )}

            {/* 1. Próxima ação */}
            {(proximaAcaoLabel || analysis.nextAction) && (
                <Section title="Próxima ação">
                    <div
                        className="rounded-lg px-3 py-3 flex items-start gap-2.5"
                        style={{
                            background: "rgba(37,99,235,0.05)",
                            border: "1px solid rgba(37,99,235,0.18)",
                        }}
                    >
                        <ArrowRight
                            className="h-3.5 w-3.5 mt-0.5 shrink-0"
                            style={{ color: "#2563EB" }}
                        />
                        <div className="flex-1 min-w-0">
                            <p
                                className="text-[12.5px]"
                                style={{ color: "#0B1220", lineHeight: 1.5, fontWeight: 500 }}
                            >
                                {proximaAcaoLabel || analysis.nextAction}
                            </p>
                            {proximaAcaoLabel && analysis.nextAction && analysis.nextAction !== proximaAcaoLabel && (
                                <p
                                    className="text-[11px] mt-1"
                                    style={{ color: "#64748B", lineHeight: 1.4 }}
                                >
                                    {analysis.nextAction}
                                </p>
                            )}
                        </div>
                    </div>
                </Section>
            )}

            {/* 2. Resposta sugerida */}
            {(qualification.resposta_sugerida || analysis.draft) && (
                <Section title="Resposta sugerida">
                    <SuggestedReply
                        text={qualification.resposta_sugerida || analysis.draft || ""}
                    />
                </Section>
            )}

            {/* 3. Qualificação — score, fit, temperatura, urgência, intenção */}
            <Section title="Qualificação">
                <QualificationBlock qualification={qualification} />
            </Section>

            {/* Resumo (secundário) */}
            <Section title="Resumo EVA">
                <p
                    className="text-[12.5px]"
                    style={{ color: "#0B1220", lineHeight: 1.55 }}
                >
                    {summary}
                </p>
                {analysis.stage && (
                    <p
                        className="text-[11px] mt-1.5"
                        style={{ color: "#64748B" }}
                    >
                        Estágio sugerido: <strong style={{ color: "#0B1220" }}>{analysis.stage}</strong>
                    </p>
                )}
            </Section>

            {/* Já sabemos / Falta descobrir (secundário) */}
            {(qualification.info_coletada.length > 0 || qualification.info_faltante.length > 0) && (
                <Section title="Informações">
                    <InfoLists
                        coletada={qualification.info_coletada}
                        faltante={qualification.info_faltante}
                    />
                </Section>
            )}

            {/* Recomendação de handoff — criar oportunidade já vive no banner do topo */}
            {qualification.deve_fazer_handoff && (
                <Section title="Recomendações da EVA">
                    <RecommendationCallout
                        icon={UserCog}
                        tone="amber"
                        title="A EVA recomenda handoff humano"
                        body="Esta conversa bate em regras de handoff cadastradas. Considere passar para um vendedor."
                    />
                </Section>
            )}

            {/* 4. Lacunas de contexto (exceto agency, que já mostramos em banner) */}
            {qualification.knowledge_gaps.filter((g) => g.type !== "agency_context").length > 0 && (
                <Section title="Lacunas de contexto">
                    <KnowledgeGapsList
                        gaps={qualification.knowledge_gaps.filter(
                            (g) => g.type !== "agency_context",
                        )}
                    />
                </Section>
            )}

            {/* 5. CRM block — mesma fonte de verdade do banner */}
            <Section title="CRM">
                <CrmBlock
                    matchedDeal={dealState.matchedDeal}
                    hasLinkedOpportunity={dealState.hasLinkedOpportunity}
                    effectiveDealId={dealState.effectiveDealId}
                    loading={dealState.loading}
                />
            </Section>
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componentes
// ─────────────────────────────────────────────────────────────────────────────

function ContextGapBanner() {
    return (
        <div
            className="rounded-lg px-3 py-2.5 flex items-start gap-2"
            style={{
                background: "rgba(245,158,11,0.06)",
                border: "1px solid rgba(245,158,11,0.22)",
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

function QualificationBlock({ qualification }: { qualification: Qualification }) {
    const score = qualification.score_sugerido;
    const fit = qualification.fit_sugerido ? FIT_META[qualification.fit_sugerido] : null;
    const temp = qualification.temperatura ? TEMPERATURA_META[qualification.temperatura] : null;
    const urg = qualification.urgencia ? URGENCIA_META[qualification.urgencia] : null;

    return (
        <div className="space-y-2.5">
            {/* Score grande */}
            <div
                className="rounded-lg px-3 py-3 flex items-center gap-3"
                style={{
                    background: "rgba(37,99,235,0.04)",
                    border: "1px solid rgba(37,99,235,0.16)",
                }}
            >
                <div
                    className="h-11 w-11 rounded-lg flex items-center justify-center text-[15px] tabular-nums font-bold"
                    style={{
                        background: "#FFFFFF",
                        color: score !== null ? "#1D4ED8" : "#94A3B8",
                        border: "1px solid rgba(37,99,235,0.22)",
                    }}
                >
                    {score !== null ? score : "—"}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-semibold" style={{ color: "#0B1220" }}>
                        {fit ? `Fit ${fit.label.toLowerCase()}` : "Score em análise"}
                    </p>
                    {qualification.score_justificativa && (
                        <p
                            className="text-[11px] mt-0.5"
                            style={{ color: "#64748B", lineHeight: 1.4 }}
                        >
                            {qualification.score_justificativa}
                        </p>
                    )}
                </div>
            </div>

            {/* Pills row */}
            <div className="flex flex-wrap gap-1.5">
                {temp && <TonePill tone={temp.tone} icon={temp.icon} label={`Temperatura: ${temp.label}`} />}
                {urg && <TonePill tone={urg.tone} label={`Urgência: ${urg.label}`} />}
                {qualification.intencao && (
                    <TonePill
                        tone="purple"
                        label={`Intenção: ${INTENCAO_LABELS[qualification.intencao] ?? qualification.intencao}`}
                    />
                )}
                {qualification.servico_interesse && (
                    <TonePill tone="blue" label={`Serviço: ${qualification.servico_interesse}`} />
                )}
                {qualification.objecao && (
                    <TonePill tone="rose" label={`Objeção: ${qualification.objecao}`} />
                )}
            </div>
        </div>
    );
}

function TonePill({
    tone,
    label,
    icon: Icon,
}: {
    tone: ToneKey;
    label: string;
    icon?: typeof Flame;
}) {
    const s = TONE_STYLES[tone];
    return (
        <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px]"
            style={{
                background: s.bg,
                border: `1px solid ${s.border}`,
                color: s.text,
                fontWeight: 600,
            }}
        >
            {Icon && <Icon className="h-3 w-3" strokeWidth={2.4} />}
            {label}
        </span>
    );
}

function InfoLists({
    coletada,
    faltante,
}: {
    coletada: string[];
    faltante: string[];
}) {
    return (
        <div className="grid grid-cols-1 gap-2.5">
            {coletada.length > 0 && (
                <div>
                    <p
                        className="text-[10.5px] uppercase mb-1.5"
                        style={{
                            color: "#047857",
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                        }}
                    >
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
                <div>
                    <p
                        className="text-[10.5px] uppercase mb-1.5"
                        style={{
                            color: "#B45309",
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                        }}
                    >
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

function SuggestedReply({ text }: { text: string }) {
    const [edited, setEdited] = useState<string | null>(null);
    const display = edited ?? text;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(display);
            toast.success("Resposta copiada");
        } catch {
            toast.error("Não foi possível copiar");
        }
    };

    return (
        <div
            className="rounded-lg p-3"
            style={{
                background: "rgba(124,58,237,0.04)",
                border: "1px solid rgba(124,58,237,0.18)",
            }}
        >
            {edited === null ? (
                <p
                    className="text-[12px] mb-3"
                    style={{ color: "#0B1220", lineHeight: 1.55 }}
                >
                    {text}
                </p>
            ) : (
                <textarea
                    value={edited}
                    onChange={(e) => setEdited(e.target.value)}
                    className="w-full text-[12px] mb-3 rounded-md px-2 py-1.5 outline-none resize-y min-h-[72px]"
                    style={{
                        background: "#FFFFFF",
                        border: "1px solid #D9E2EC",
                        color: "#0B1220",
                        lineHeight: 1.55,
                    }}
                />
            )}
            <div className="flex items-center gap-1.5 flex-wrap">
                <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-semibold transition-colors"
                    style={{
                        background: "linear-gradient(135deg, #2563EB, #4A8CE8)",
                        color: "#FFFFFF",
                    }}
                >
                    <Copy className="h-3 w-3" />
                    Copiar
                </button>
                <button
                    type="button"
                    onClick={() => setEdited(edited === null ? text : null)}
                    className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-semibold transition-colors"
                    style={{
                        background: "rgba(124,58,237,0.08)",
                        color: "#6D28D9",
                        border: "1px solid rgba(124,58,237,0.22)",
                    }}
                >
                    <Edit3 className="h-3 w-3" />
                    {edited === null ? "Editar" : "Cancelar edição"}
                </button>
            </div>
            <p
                className="text-[10px] mt-2"
                style={{ color: "#94A3B8", fontStyle: "italic" }}
            >
                A EVA sugere. Seu time aprova antes de enviar.
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
        <ul className="space-y-2">
            {gaps.map((g, i) => (
                <li
                    key={i}
                    className="rounded-lg px-3 py-2.5"
                    style={{
                        background: "#F8FAFC",
                        border: "1px solid #E2E8F0",
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
                    <p className="text-[11px]" style={{ color: "#64748B", lineHeight: 1.4 }}>
                        Sugestão: {g.suggested_fix}
                    </p>
                </li>
            ))}
        </ul>
    );
}

// ─── Section wrapper ────────────────────────────────────────────────────────

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section>
            <div className="flex items-center gap-1.5 mb-2">
                <p
                    className="text-[10.5px] uppercase"
                    style={{
                        color: "#64748B",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                    }}
                >
                    {title}
                </p>
            </div>
            {children}
        </section>
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
                style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}
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
                style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}
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
                style={{ background: "#FFFFFF", border: "1px solid #D9E2EC", boxShadow: "0 1px 2px rgba(15,23,42,0.03)" }}
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
                border: "1px solid #D9E2EC",
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
