import { lazy, Suspense, useEffect, useState, useRef, useCallback } from "react";
import { logger } from "@/utils/logger";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDealContextData } from "@/hooks/useDealContextData";
import {
    getQualificationScore,
    getQualificationTemperature,
    getQualificationIntent,
    getQualificationObjection,
    getQualificationService,
} from "@/hooks/useCommandCenterData";
import { motion, AnimatePresence } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EvaStudioRules } from "@/components/eva/EvaStudioRules";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    ArrowLeft,
    Phone,
    MessageSquare,
    Mail,
    Trophy,
    XCircle,
    Lightbulb,
    ArrowUp,
    Paperclip,
    FileText,
    CheckCircle2,
    Check,
    CircleDashed,
    Clock,
    Calendar,
    PhoneCall,
    StickyNote,
    Rocket,
    AlertTriangle,
    X,
    ChevronRight,
    ChevronDown,
    Loader2,
    Plus,
    Lock,
    Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import { proximaAcaoLabel } from "@/lib/eva/qualificationSchema";
import { syncWonDealToSale, unsyncDealSale } from "@/utils/salesSync";
import { usePipelineStages, DEFAULT_STAGE_CONFIGS } from "@/hooks/usePipelines";
import { deriveLegacyStage, type StageConfig } from "@/lib/pipelineStyles";
import { useQuoteBoard } from "@/hooks/useQuoteBoard";
import { OPEN_QUOTE_STATES, brl as brlQuote, evaLine, stateLine } from "@/lib/quoteText";
import type { QuoteItem } from "@/hooks/useQuoteBoard";

// Lazy: modais e widgets que só renderizam quando o user clica em algo específico
const InBrowserDialer = lazy(() => import("@/components/crm/InBrowserDialer"));
const LostDealModal = lazy(() => import("@/components/crm/LostDealModal").then((m) => ({ default: m.LostDealModal })));
const Confetti = lazy(() => import("@/components/crm/Confetti").then((m) => ({ default: m.Confetti })));
const NovaTarefaModal = lazy(() => import("@/components/crm/NovaTarefaModal").then((m) => ({ default: m.NovaTarefaModal })));
import { DealProducts } from "@/components/crm/DealProducts";
import { NovaPropostaModal } from "@/components/crm/NovaPropostaModal";
import { generateProposalPDF } from "@/components/crm/ProposalPDFGenerator";
import { useProposals } from "@/hooks/useProposals";
import { FileText as FileTextIcon, Download as DownloadIcon, Trash2 as Trash2Icon } from "lucide-react";
import { CustomFieldsSection } from "@/components/crm/CustomFieldsSection";
import { usePlan } from "@/hooks/usePlan";
// F6T.2 — tags transversais (sistema F6T.1)
import { useDealTagsSingle } from "@/hooks/useDealsTags";
import { getTagColorClass, isHexColor } from "@/lib/tags";
import type { Tag } from "@/types/tags";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { DealDetailSkeleton } from "@/components/ui/skeletons";
import { DecisionMapCard, getDecisionMap } from "@/components/deals/DecisionMapCard";
import { EvaBot } from "@/components/eva/EvaBot";
import { formatPhone } from "@/lib/formatPhone";

// â"€â"€â"€ Constants â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€


// Ícone numa cor só: o tipo já está no título, cor por tipo virava confete.
const EVENT_ICONS: Record<string, { icon: typeof StickyNote; title: string }> = {
    note:           { icon: StickyNote,    title: "Nota adicionada" },
    call:           { icon: PhoneCall,     title: "Ligação realizada" },
    message:        { icon: MessageSquare, title: "Mensagem no WhatsApp" },
    stage_change:   { icon: Rocket,        title: "Mudança de etapa" },
    email:          { icon: Mail,          title: "E-mail enviado" },
    task_completed: { icon: CheckCircle2,  title: "Ação concluída" },
};

// Superfícies da tela: a mesma paleta quente do Inbox (--ibx-*).
const CARD = "bg-[var(--ibx-card)] rounded-[14px] border border-[var(--ibx-line)] shadow-[0_1px_2px_rgba(28,25,23,0.04),0_10px_28px_-18px_rgba(28,25,23,0.18)]";
const CARD_TITLE = "text-[13px] font-semibold text-[var(--vyz-text-primary)]";
const EYEBROW = "text-[11px] font-medium text-[var(--vyz-text-muted)]";
const QUICK = "flex flex-col items-center justify-center gap-1 h-[58px] rounded-xl border border-[var(--ibx-line)] bg-[var(--ibx-card)] text-[11.5px] font-medium text-[var(--vyz-text-strong)] [&>svg]:text-[var(--vyz-text-primary)] hover:bg-[var(--ibx-paper)] hover:border-[var(--ibx-line-strong)] transition-[background-color,border-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)]";
const PRESS = "transition-[opacity,background-color,border-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)] focus-visible:ring-offset-2";

// Deriva o tipo de uma nota (deal_notes é só texto) pelo conteúdo, pra a
// timeline ganhar ícones/cores por tipo como no design.
const inferNoteType = (content: string): string => {
    const c = (content || "").toLowerCase();
    if (c.startsWith("ação concluída") || c.startsWith("acao concluida")) return "task_completed";
    if (c.includes("ligação") || c.includes("ligacao") || c.includes("liguei") || c.includes("chamada")) return "call";
    if (c.includes("whatsapp") || c.includes("mensagem")) return "message";
    if (c.includes("e-mail") || c.includes("email")) return "email";
    return "note";
};

// â"€â"€â"€ Helpers â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

// Quem falou por último e há quanto tempo. É o que diz se o card anda: um
// selo "Saudável" contado só em dias chamava de saudável cliente esperando resposta.
type ConvStatus = { text: string; tone: "wait" | "quiet" | "idle" };
const conversationStatus = (
    conv: { last_message_at?: string | null; last_inbound_at?: string | null; last_outbound_at?: string | null } | null | undefined,
    updatedAt: string | null | undefined,
): ConvStatus => {
    if (!conv?.last_message_at) {
        return { text: `Sem conversa ligada a este card. Atualizado ${safeFormatDistance(updatedAt)}.`, tone: "idle" };
    }
    const quando = safeFormatDistance(conv.last_message_at);
    const doCliente = (conv.last_inbound_at ?? "") > (conv.last_outbound_at ?? "");
    if (doCliente) return { text: `O cliente falou por último ${quando}. A vez de responder é sua.`, tone: "wait" };
    const dias = Math.floor((Date.now() - new Date(conv.last_message_at).getTime()) / 86_400_000);
    return { text: `Você falou por último ${quando}. Esperando o cliente.`, tone: dias >= 2 ? "quiet" : "idle" };
};

const STATUS_DOT: Record<ConvStatus["tone"], string> = {
    wait: "bg-[var(--vyz-accent)]",
    quiet: "bg-[var(--vyz-warning)]",
    idle: "bg-[var(--ibx-line-strong)]",
};

// O orçamento aberto deste card no placar: valor, situação e o que a EVA já
// fez. Substitui o "Status e saúde", que dizia "Saudável" com cliente há dias
// sem responder ao orçamento.
const QUOTE_TOM: Partial<Record<QuoteItem["state"], { dot: string; bg: string; border: string; text: string }>> = {
    no_reply: { dot: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A", text: "#92400E" },
    went_quiet: { dot: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A", text: "#92400E" },
    your_turn: { dot: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF" },
    talking: { dot: "#10B981", bg: "#ECFDF5", border: "#A7F3D0", text: "#065F46" },
};

const QuoteCard = ({ q }: { q: QuoteItem }) => {
    const tom = QUOTE_TOM[q.state] ?? QUOTE_TOM.talking!;
    const eva = evaLine(q);
    return (
        <section className={`${CARD} p-4`} aria-label="Orçamento">
            <div className="flex items-center justify-between gap-2">
                <p className={EYEBROW}>Orçamento</p>
                <span className="text-[11px] text-[var(--vyz-text-muted)]">enviado {safeFormatDate(q.sent_at, "dd MMM")}{q.detected_by === "pdf" ? " · PDF" : ""}</span>
            </div>
            <p className="mt-1.5 text-[26px] font-semibold tabular-nums leading-none tracking-[-0.025em] text-[var(--vyz-text-primary)]">
                {q.amount ? brlQuote(q.amount) : <span className="text-[15px] font-medium text-[var(--vyz-text-muted)]">Valor não lido no arquivo</span>}
            </p>
            <div className="mt-3 flex items-start gap-2 rounded-[10px] border px-3 py-2.5" style={{ background: tom.bg, borderColor: tom.border }}>
                <span className="mt-[5px] h-2 w-2 shrink-0 rounded-full" style={{ background: tom.dot }} aria-hidden />
                <p className="text-[13px] font-medium leading-snug" style={{ color: tom.text }}>{stateLine(q)}</p>
            </div>
            {eva && (
                <p className="mt-2.5 flex items-center gap-2 text-[12.5px] text-[var(--vyz-text-muted)]">
                    <EvaBot size={18} still />
                    {eva}
                </p>
            )}
        </section>
    );
};

// Valor exato nos dados do negócio: o "R$ 25k" arredondado brigava com o
// "R$ 24.900" do card do orçamento logo acima.
const formatBRL = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

const iniciais = (nome: string) => {
    const partes = nome.replace(/[^\p{L}\p{N} ]/gu, " ").trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return "?";
    return (partes[0][0] + (partes[1]?.[0] ?? "")).toUpperCase();
};

const ORIGEM_LABEL: Record<string, string> = {
    whatsapp: "WhatsApp", manual: "Cadastro manual", webhook: "Integração",
    instagram: "Instagram", site: "Site", indicacao: "Indicação", raio_x: "Raio-X", prospeccao: "Prospecção",
};
const origemLabel = (v?: string | null) =>
    !v ? "—" : ORIGEM_LABEL[v.toLowerCase()] ?? v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, " ");

const safeFormatDate = (input: unknown, pattern: string): string => {
    if (!input) return "—";
    const d = new Date(input as string);
    if (Number.isNaN(d.getTime())) return "—";
    try { return format(d, pattern, { locale: ptBR }); } catch { return "—"; }
};

const safeFormatDistance = (input: unknown): string => {
    if (!input) return "—";
    const d = new Date(input as string);
    if (Number.isNaN(d.getTime())) return "—";
    try { return formatDistanceToNow(d, { locale: ptBR, addSuffix: true }); } catch { return "—"; }
};


const getCallStatusBadge = (status?: string) => {
    switch (status) {
        case "completed":
        case "demo":
            return <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/25">Concluída</Badge>;
        case "in_progress":
            return <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/25">Em andamento</Badge>;
        case "queued":
        case "dialing":
            return <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/25">Na fila</Badge>;
        case "failed":
            return <Badge className="bg-rose-500/15 text-rose-300 border-rose-500/25">Falhou</Badge>;
        default:
            return <Badge variant="outline" className="border-border text-muted-foreground">{status || "Desconhecido"}</Badge>;
    }
};

// â"€â"€â"€ Sub-components â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

/** Etapas do funil do próprio card (pipeline_stages), como uma trilha: o que já
 *  passou fica escuro, a etapa atual em azul. Perdido fica de fora: tem botão
 *  próprio, que pede o motivo. */
const StageChips = ({ stages, currentId, onStageChange, disabled }: { stages: StageConfig[]; currentId: string | null; onStageChange: (stage: StageConfig) => void; disabled?: boolean }) => {
    const visible = stages.filter((st) => st.kind !== "lost");
    const idx = visible.findIndex((st) => st.id === currentId);
    // No celular a trilha rola: a etapa atual fica à vista, não cortada na borda.
    const barRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const bar = barRef.current;
        const el = bar?.querySelector<HTMLElement>('[aria-current="step"]');
        if (bar && el) bar.scrollLeft += el.getBoundingClientRect().left - bar.getBoundingClientRect().left - (bar.clientWidth - el.offsetWidth) / 2;
    }, [currentId]);
    return (
        <div ref={barRef} className="flex gap-1.5 overflow-x-auto no-scrollbar" role="group" aria-label="Etapa da oportunidade">
            {visible.map((stage, i) => {
                const done = idx >= 0 && i < idx;
                const active = i === idx;
                return (
                    <button
                        key={stage.id}
                        type="button"
                        disabled={disabled || active}
                        aria-current={active ? "step" : undefined}
                        onClick={() => onStageChange(stage)}
                        title={active ? undefined : `Mover para ${stage.title}`}
                        className="group flex-1 min-w-[92px] pt-1 pb-2 text-left rounded-md disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ibx-paper)]"
                    >
                        <span
                            aria-hidden
                            className={`block h-[3px] rounded-full transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                active ? "bg-[var(--vyz-accent)]"
                                : done ? "bg-[var(--vyz-text-primary)]/75"
                                : "bg-[var(--ibx-line)] group-hover:bg-[var(--ibx-line-strong)]"
                            }`}
                        />
                        <span className={`mt-2 flex items-center gap-1 text-[12px] whitespace-nowrap transition-colors duration-150 ${
                            active ? "font-semibold text-[var(--vyz-text-primary)]"
                            : done ? "font-medium text-[var(--vyz-text-strong)]"
                            : "font-medium text-[var(--vyz-text-muted)] group-hover:text-[var(--vyz-text-primary)]"
                        }`}>
                            {done && <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />}
                            {stage.title}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};

type TimelineEvent = { id: string; type: string; title?: string; content?: string; created_at: string; direction?: string; user_name?: string };

const Rail = ({ isLast, children }: { isLast: boolean; children: React.ReactNode }) => (
    <div className="flex flex-col items-center pt-0.5">
        <div className="w-7 h-7 rounded-full bg-[var(--ibx-sunken)] flex items-center justify-center flex-shrink-0 text-[var(--vyz-text-muted)]">
            {children}
        </div>
        {!isLast && <div className="w-px flex-1 bg-[var(--ibx-line)] mt-1.5 min-h-[20px]" />}
    </div>
);

/** Nota ou evento do card: trilho vertical com o ícone do tipo, sem caixa. */
const TimelineEntry = ({ event, isLast }: { event: TimelineEvent; isLast: boolean }) => {
    const cfg = EVENT_ICONS[event.type] || EVENT_ICONS.note;
    const Icon = cfg.icon;
    return (
        <div className="flex gap-3">
            <Rail isLast={isLast}><Icon className="h-3.5 w-3.5" aria-hidden /></Rail>
            <div className={`flex-1 min-w-0 ${isLast ? "pb-0" : "pb-5"}`}>
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[var(--vyz-text-primary)] leading-tight">{event.title || cfg.title}</p>
                        {event.content && (
                            <p className="text-[12.5px] text-[var(--vyz-text-muted)] leading-relaxed break-words whitespace-pre-line mt-0.5">{event.content}</p>
                        )}
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-[11px] text-[var(--vyz-text-muted)] tabular-nums whitespace-nowrap">{safeFormatDate(event.created_at, "dd MMM, HH:mm")}</p>
                        {event.user_name && <p className="text-[11px] text-[var(--vyz-text-muted)]/80 whitespace-nowrap">{event.user_name}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

/** Mensagens seguidas do WhatsApp viram uma linha só. O texto delas fica no
 *  Inbox (conversa crua não aparece fora dele), então aqui vai a contagem. */
const MessageRunEntry = ({ items, isLast, href, onOpen }: { items: TimelineEvent[]; isLast: boolean; href: string | null; onOpen: (href: string) => void }) => {
    const deles = items.filter((m) => m.direction !== "outbound").length;
    const suas = items.length - deles;
    const fim = items[0]?.created_at;
    const inicio = items[items.length - 1]?.created_at;
    const mesmoDia = safeFormatDate(inicio, "dd MMM") === safeFormatDate(fim, "dd MMM");
    const quando = items.length === 1
        ? safeFormatDate(fim, "dd MMM, HH:mm")
        : mesmoDia
        ? `${safeFormatDate(inicio, "dd MMM, HH:mm")} a ${safeFormatDate(fim, "HH:mm")}`
        : `${safeFormatDate(inicio, "dd MMM")} a ${safeFormatDate(fim, "dd MMM")}`;
    const partes = [deles && `${deles} do cliente`, suas && `${suas} ${suas === 1 ? "sua" : "suas"}`].filter(Boolean).join(", ");
    return (
        <div className="flex gap-3">
            <Rail isLast={isLast}><WhatsAppIcon className="h-3.5 w-3.5" /></Rail>
            <div className={`flex-1 min-w-0 ${isLast ? "pb-0" : "pb-5"}`}>
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[var(--vyz-text-primary)] leading-tight">
                            {items.length === 1 ? (deles ? "Mensagem do cliente no WhatsApp" : "Sua mensagem no WhatsApp") : `${items.length} mensagens no WhatsApp`}
                        </p>
                        <p className="text-[12.5px] text-[var(--vyz-text-muted)] leading-relaxed mt-0.5">
                            {items.length > 1 && <>{partes}. </>}
                            {href && (
                                <button type="button" onClick={() => onOpen(href)} className="font-medium text-[var(--vyz-accent)] hover:underline focus-visible:outline-none focus-visible:underline">
                                    Ler no Inbox
                                </button>
                            )}
                        </p>
                    </div>
                    <p className="text-[11px] text-[var(--vyz-text-muted)] tabular-nums whitespace-nowrap shrink-0">{quando}</p>
                </div>
            </div>
        </div>
    );
};

/** Junta as mensagens seguidas (a lista vem da mais nova para a mais velha). */
type TimelineLine = { kind: "event"; ev: TimelineEvent } | { kind: "msgs"; items: TimelineEvent[] };
const groupTimeline = (events: TimelineEvent[]): TimelineLine[] => {
    const out: TimelineLine[] = [];
    for (const ev of events) {
        const last = out[out.length - 1];
        if (ev.type === "message" && last?.kind === "msgs") last.items.push(ev);
        else if (ev.type === "message") out.push({ kind: "msgs", items: [ev] });
        else out.push({ kind: "event", ev });
    }
    return out;
};

// Ações recomendadas: a EVA sugere (proxima_acao da análise); o time executa,
// edita ou conclui. Origem fica explícita no card.
type NextAction = {
    title: string;
    source: "eva" | "deal" | "manual";
    dueDate?: string | null;
    suggestedReply?: string | null;
    canWhatsApp?: boolean;
};

// Ao concluir uma ação, o time registra o RESULTADO; cada resultado mapeia o
// próximo passo sugerido (regra determinística, sem custo de IA).
const ACTION_RESULTS: ReadonlyArray<{ key: string; label: string; next: string }> = [
    { key: "pediu_proposta", label: "Pediu proposta",            next: "Enviar a proposta" },
    { key: "interessado",    label: "Demonstrou interesse",       next: "Enviar proposta ou agendar o próximo passo" },
    { key: "pediu_retorno",  label: "Pediu pra retornar depois",  next: "Retornar no horário combinado" },
    { key: "sem_resposta",   label: "Sem resposta / não atendeu", next: "Fazer follow-up" },
    { key: "objecao",        label: "Levantou objeção",           next: "Responder à objeção levantada" },
    { key: "avancou",        label: "Avançou (agendou/fechou)",   next: "Confirmar os próximos passos" },
    { key: "sem_fit",        label: "Sem fit agora",              next: "Nutrir ou arquivar o lead" },
];

/** Focus card: a próxima ação (da EVA, do cadastro ou do time) e, embaixo, quem
 *  falou por último. Ao concluir, o time registra o RESULTADO, que define o
 *  próximo passo sugerido. */
const FocusCard = ({ action, status, conversationHref, onOpenConversation, onComplete, onExecute }: {
    action: NextAction;
    status: ConvStatus;
    conversationHref: string | null;
    onOpenConversation: (href: string) => void;
    onComplete: (resultKey: string) => void;
    onExecute?: () => void;
}) => {
    const [picking, setPicking] = useState(false);
    const [done, setDone] = useState(false);
    const isEva = action.source === "eva";
    const pick = (key: string) => {
        setDone(true);
        setPicking(false);
        setTimeout(() => onComplete(key), 400);
    };
    const dueChip = (() => {
        if (!action.dueDate) return null;
        const due = new Date(action.dueDate);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const dd = new Date(due); dd.setHours(0, 0, 0, 0);
        const diff = Math.round((dd.getTime() - today.getTime()) / 86400000);
        if (diff < 0) return { label: "Atrasado", cls: "bg-[var(--vyz-danger-bg)] text-[var(--vyz-danger)]" };
        if (diff === 0) return { label: "Hoje", cls: "bg-[var(--ibx-sel)] text-[var(--vyz-accent)]" };
        if (diff === 1) return { label: "Amanhã", cls: "bg-[var(--vyz-warning-bg)] text-[var(--vyz-warning)]" };
        return { label: safeFormatDate(action.dueDate, "dd MMM"), cls: "bg-[var(--ibx-sunken)] text-[var(--vyz-text-muted)]" };
    })();

    return (
        <section className={`${CARD} overflow-hidden`} aria-label="Próxima ação">
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3.5 px-4 sm:px-5 py-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl flex-shrink-0 bg-[var(--ibx-sunken)]">
                    {isEva
                        ? <EvaBot size={27} />
                        : <Calendar className="h-5 w-5 text-[var(--vyz-text-muted)]" aria-hidden />}
                </div>
                <div className="flex-1 min-w-0">
                    <p className={EYEBROW}>
                        Próxima ação
                        <span className="mx-1.5 text-[var(--ibx-line-strong)]" aria-hidden>·</span>
                        <span className={isEva ? "text-[var(--vyz-eva)]" : undefined}>
                            {isEva ? "sugerida pela EVA" : action.source === "deal" ? "do cadastro" : "passo do time"}
                        </span>
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                        <p className={`text-[16px] font-semibold leading-snug tracking-[-0.01em] sm:truncate ${done ? "line-through text-[var(--vyz-text-muted)]" : "text-[var(--vyz-text-primary)]"}`}>
                            {action.title}
                        </p>
                        {dueChip && !done && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${dueChip.cls}`}>
                                {dueChip.label}
                            </span>
                        )}
                    </div>
                </div>
                {!done ? (
                    <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-shrink-0 [&>button]:flex-1 sm:[&>button]:flex-none [&>button]:justify-center">
                        {onExecute && action.canWhatsApp && !picking && (
                            <button
                                onClick={onExecute}
                                className={`inline-flex items-center gap-1.5 h-10 sm:h-9 px-4 rounded-full text-[13px] font-semibold bg-[var(--vyz-btn-solid)] text-[var(--vyz-btn-on)] hover:opacity-90 ${PRESS}`}
                                title={action.suggestedReply ? "Abre a conversa com a resposta sugerida pela EVA" : "Abrir a conversa"}
                            >
                                <WhatsAppIcon className="h-3.5 w-3.5" />
                                Responder
                            </button>
                        )}
                        <button
                            onClick={() => setPicking((v) => !v)}
                            aria-expanded={picking}
                            className={`inline-flex items-center gap-1.5 h-10 sm:h-9 px-4 rounded-full text-[13px] font-semibold border border-[var(--ibx-line)] ${picking ? "bg-[var(--ibx-sunken)] text-[var(--vyz-text-muted)]" : "bg-[var(--ibx-card)] text-[var(--vyz-text-primary)] hover:bg-[var(--ibx-paper)]"} ${PRESS}`}
                        >
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                            {picking ? "Cancelar" : "Concluir"}
                        </button>
                    </div>
                ) : (
                    <span className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[12px] font-semibold bg-[var(--vyz-success-bg)] text-[var(--vyz-success)] flex-shrink-0">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Concluída
                    </span>
                )}
            </div>

            {/* Seletor de resultado: define o próximo passo sugerido */}
            {picking && !done && (
                <div className="px-4 sm:px-5 pb-4">
                    <p className="text-[12px] font-medium text-[var(--vyz-text-muted)] mb-2">O que rolou? Isso define o próximo passo.</p>
                    <div className="flex flex-wrap gap-1.5">
                        {ACTION_RESULTS.map((r) => (
                            <button
                                key={r.key}
                                onClick={() => pick(r.key)}
                                className={`inline-flex items-center h-8 px-3 rounded-full text-[12px] font-medium border border-[var(--ibx-line)] bg-[var(--ibx-card)] text-[var(--vyz-text-primary)] hover:border-[var(--ibx-line-strong)] hover:bg-[var(--ibx-paper)] ${PRESS}`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--ibx-line-soft)] bg-[var(--ibx-paper)]/60 px-4 sm:px-5 py-2.5">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[status.tone]}`} aria-hidden />
                <p className="flex-1 min-w-0 text-[12.5px] text-[var(--vyz-text-strong)]">{status.text}</p>
                {conversationHref && (
                    <button
                        type="button"
                        onClick={() => onOpenConversation(conversationHref)}
                        className="inline-flex items-center gap-0.5 text-[12.5px] font-medium text-[var(--vyz-accent)] hover:underline focus-visible:outline-none focus-visible:underline"
                    >
                        Abrir conversa <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                    </button>
                )}
            </div>
        </section>
    );
};

/** Collapsible property accordion section */
const PropertiesSection = ({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div>
            <button
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                className="w-full flex items-center justify-between pt-3.5 pb-0.5 text-left group focus-visible:outline-none focus-visible:underline"
            >
                <span className="text-[12.5px] font-medium text-[var(--vyz-text-strong)] group-hover:text-[var(--vyz-text-primary)] transition-colors">
                    {title}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 text-[var(--vyz-text-muted)] transition-transform duration-200 ${open ? "" : "-rotate-90"}`} aria-hidden />
            </button>
            {open && <div className="pb-4 space-y-2.5">{children}</div>}
        </div>
    );
};

/** Linha rótulo/valor do card de detalhes. */
const SidebarRow = ({ label, value, strong = false }: { label: string; value: React.ReactNode; strong?: boolean }) => (
    <div className="flex items-start justify-between gap-3 py-[3px]">
        <span className="text-[12.5px] text-[var(--vyz-text-muted)] shrink-0">{label}</span>
        <span className={`text-[12.5px] text-right min-w-0 truncate text-[var(--vyz-text-primary)] ${strong ? "font-semibold" : "font-medium"}`}>{value}</span>
    </div>
);

/**
 * F6T.2 — Tags comerciais do deal (sistema F6T.1).
 * Renderiza até 8 chips + "+N". Sem edição nesta fase.
 * Quando lista vazia, mostra empty discreto.
 */
const DealTagsBlock = ({ dealId }: { dealId: string }) => {
    const { tags, loading } = useDealTagsSingle(dealId);
    if (loading) {
        return <p className="text-[12px] text-muted-foreground/70 italic">Carregando tags...</p>;
    }
    if (tags.length === 0) {
        return <p className="text-[12px] text-muted-foreground/70">Nenhuma tag aplicada.</p>;
    }
    const visible = tags.slice(0, 8);
    const rest = tags.length - visible.length;
    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            {visible.map((tag: Tag) => {
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
            {rest > 0 && (
                <span className="text-[11px] text-muted-foreground font-medium">+{rest}</span>
            )}
        </div>
    );
};

// â"€â"€â"€ Main Component â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

/**
 * F6T.3 — Dados do interesse imobiliário (demo incorporadora).
 * Lê deal.source_data.interesse_imobiliario (jsonb) e renderiza os campos
 * preenchidos. Read-only, estruturado — sem editor de schema genérico.
 */
const REAL_ESTATE_INTEREST_FIELDS: ReadonlyArray<{ key: string; label: string }> = [
    { key: "empreendimento_interesse", label: "Empreendimento" },
    { key: "tipo_imovel", label: "Tipo de imóvel" },
    { key: "faixa_orcamento", label: "Faixa de orçamento" },
    { key: "entrada_disponivel", label: "Entrada disponível" },
    { key: "financiamento", label: "Financiamento" },
    { key: "fgts", label: "Usa FGTS" },
    { key: "prazo_compra", label: "Prazo de compra" },
    { key: "corretor_responsavel", label: "Corretor responsável" },
    { key: "proxima_acao", label: "Próxima ação" },
];

function formatRealEstateValue(v: unknown): string {
    if (v === true) return "Sim";
    if (v === false) return "Não";
    if (v === null || v === undefined) return "";
    return String(v).trim();
}

/** Extrai o objeto interesse_imobiliario de source_data, se existir. */
function getRealEstateInterest(sourceData: unknown): Record<string, unknown> | null {
    if (!sourceData || typeof sourceData !== "object") return null;
    const interesse = (sourceData as Record<string, unknown>).interesse_imobiliario;
    if (!interesse || typeof interesse !== "object") return null;
    return interesse as Record<string, unknown>;
}

const RealEstateInterestBlock = ({ sourceData }: { sourceData: unknown }) => {
    const interesse = getRealEstateInterest(sourceData);
    if (!interesse) return null;
    const rows = REAL_ESTATE_INTEREST_FIELDS
        .map((f) => ({ label: f.label, value: formatRealEstateValue(interesse[f.key]) }))
        .filter((r) => r.value !== "");
    if (rows.length === 0) return null;
    return (
        <div className="flex flex-col gap-1.5">
            {rows.map((r) => (
                <div key={r.label} className="flex items-start justify-between gap-3">
                    <span className="text-[11px] text-muted-foreground shrink-0">{r.label}</span>
                    <span className="text-[11.5px] text-foreground font-medium text-right">{r.value}</span>
                </div>
            ))}
        </div>
    );
};

export default function DealCommandCenter() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { activeCompanyId } = useTenant();
    const { hasFeature, currentPlan, isSuperAdmin } = usePlan();
    const hasCallsPlanAccess = hasFeature("calls");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [showLostModal, setShowLostModal] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [newNote, setNewNote] = useState("");
    const [activeTab, setActiveTab] = useState("historico");
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [showCallModal, setShowCallModal] = useState(false);
    const [sellerPhone, setSellerPhone] = useState("");
    const [callMode, setCallMode] = useState<"demo" | "twilio" | "webrtc">("demo");
    const [webrtcCallId, setWebrtcCallId] = useState<string | null>(null);
    const [showWebrtcDialer, setShowWebrtcDialer] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("deal_call_seller_phone");
        if (saved) setSellerPhone(saved);
    }, []);

    // â"€â"€ Queries â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

    const { data: deal, isLoading, error: dealError, refetch: refetchDeal } = useQuery({
        queryKey: ["deal", id],
        queryFn: async () => {
            const { data, error } = await supabase.from("deals").select("*").eq("id", id).single();
            if (error) throw error;
            return data;
        },
        enabled: !!id,
    });

    // Etapas do funil deste card. Card sem funil (dado antigo) cai nas etapas
    // padrão e grava só o `stage` legado, porque os ids padrão não existem no banco.
    const { data: pipelineStages = [] } = usePipelineStages((deal as any)?.pipeline_id);
    const hasRealStages = pipelineStages.length > 0;
    const stageList: StageConfig[] = hasRealStages ? pipelineStages : DEFAULT_STAGE_CONFIGS;
    const currentStage =
        stageList.find((st) => st.id === (deal as any)?.stage_id) ??
        stageList.find((st) => deriveLegacyStage(st) === deal?.stage) ??
        null;
    const isWon = currentStage ? currentStage.kind === "won" : deal?.stage === "closed_won";
    const isLost = currentStage ? currentStage.kind === "lost" : deal?.stage === "closed_lost";
    const stagePatch = (target: StageConfig) =>
        hasRealStages ? { stage_id: target.id, stage: deriveLegacyStage(target) } : { stage: deriveLegacyStage(target) };

    // Propostas + marca da empresa (logo/nome p/ o PDF)
    const [showProposta, setShowProposta] = useState(false);
    const { proposals, deleteProposal } = useProposals(id);
    const { data: companyBrand } = useQuery({
        queryKey: ["company-brand", deal?.company_id],
        enabled: !!deal?.company_id,
        queryFn: async () => {
            const { data } = await supabase.from("companies").select("name, logo_url").eq("id", deal!.company_id).single();
            return { name: (data?.name as string) || undefined, logoUrl: (data?.logo_url as string) || null };
        },
    });

    const { data: companyCallsAddon } = useQuery({
        queryKey: ["company-calls-addon", activeCompanyId],
        queryFn: async () => {
            if (!activeCompanyId) return { calls_enabled: false };
            const { data, error } = await (supabase as any)
                .from("company_addons")
                .select("calls_enabled")
                .eq("company_id", activeCompanyId)
                .maybeSingle();

            if (error) {
                if (String(error.message || "").toLowerCase().includes("relation")) {
                    return { calls_enabled: false };
                }
                throw error;
            }

            return { calls_enabled: data?.calls_enabled === true };
        },
        enabled: !!activeCompanyId,
    });

    const hasCallsAddonEnabled = isSuperAdmin || companyCallsAddon?.calls_enabled === true;
    const canUseCalls = hasCallsPlanAccess && hasCallsAddonEnabled;

    const { data: timeline = [] } = useQuery({
        queryKey: ["deal-timeline", id],
        queryFn: async () => {
            const { data: notes, error } = await supabase
                .from("deal_notes" as any)
                .select("*")
                .eq("deal_id", id)
                .order("created_at", { ascending: false });
            if (error) throw error;
            const noteEvents = (notes || []).map((n: any) => {
                const type = inferNoteType(n.content || "");
                return { id: n.id, type, title: EVENT_ICONS[type]?.title ?? "Nota adicionada", content: n.content, created_at: n.created_at };
            });
            // Agrega as últimas mensagens da conversa vinculada (WhatsApp), pra
            // a timeline ter atividades de tipos diferentes (ícones por cor).
            let msgEvents: any[] = [];
            try {
                const { data: conv } = await supabase
                    .from("channel_conversations").select("id")
                    .eq("deal_id", id).order("last_message_at", { ascending: false }).limit(1).maybeSingle();
                if (conv?.id) {
                    const { data: msgs } = await supabase
                        .from("channel_messages").select("id, direction, body, media_ref, message_timestamp")
                        .eq("conversation_id", conv.id).order("message_timestamp", { ascending: false }).limit(40);
                    msgEvents = (msgs || []).map((m: any) => ({
                        id: "msg-" + m.id,
                        type: "message",
                        direction: m.direction,
                        content: "",
                        created_at: m.message_timestamp,
                    }));
                }
            } catch { /* timeline funciona só com notas se a conversa falhar */ }
            return [...noteEvents, ...msgEvents].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
        },
        enabled: !!id,
    });

    const { data: dealCalls = [], isLoading: loadingCalls } = useQuery({
        queryKey: ["deal-calls", id],
        queryFn: async () => {
            const { data: calls, error: callsError } = await (supabase as any)
                .from("deal_calls")
                .select("*")
                .eq("deal_id", id)
                .order("created_at", { ascending: false });

            if (callsError) {
                // Graceful fallback before migration is applied
                if (String(callsError.message || "").toLowerCase().includes("relation")) return [];
                throw callsError;
            }

            if (!calls || calls.length === 0) return [];

            const callIds = calls.map((c: any) => c.id);
            const { data: insights } = await (supabase as any)
                .from("deal_call_insights")
                .select("*")
                .in("call_id", callIds);

            const insightsMap = new Map((insights || []).map((i: any) => [i.call_id, i]));

            return calls.map((call: any) => ({
                ...call,
                insight: insightsMap.get(call.id) || null,
            }));
        },
        enabled: !!id && canUseCalls,
    });

    // â"€â"€ Mutations â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

    const updateDeal = useMutation({
        mutationFn: async (updates: any) => {
            const { error } = await supabase.from("deals").update(updates).eq("id", id);
            if (error) throw error;
            if (updates.stage === "closed_won" && deal) await syncWonDealToSale(deal, queryClient);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["deal", id] });
            queryClient.invalidateQueries({ queryKey: ["deals"] });
        },
        onError: () => toast.error("Não consegui atualizar a oportunidade. Tente de novo."),
    });

    // Volta etapa e probabilidade ao que eram e desfaz a venda sincronizada.
    const restoreStage = async (prev: Record<string, unknown>, undoSale: boolean) => {
        await updateDeal.mutateAsync(prev);
        if (undoSale && deal) await unsyncDealSale(deal.id, deal.user_id, queryClient).catch(() => {});
    };
    const snapshot = () => ({
        ...(hasRealStages ? { stage_id: (deal as any)?.stage_id ?? null } : {}),
        stage: deal?.stage,
        probability: deal?.probability,
    });

    const handleWon = async () => {
        const won = stageList.find((st) => st.kind === "won");
        if (!won) {
            toast.error("Este funil não tem etapa de ganho. Crie uma em Configurar, no Pipeline.");
            return;
        }
        const prev = snapshot();
        await updateDeal.mutateAsync({ ...stagePatch(won), probability: 100 });
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
        toast.success("Oportunidade marcada como fechada.", {
            action: { label: "Desfazer", onClick: () => { void restoreStage(prev, true); } },
        });
    };

    const handleStageChange = async (target: StageConfig) => {
        if (target.kind === "lost") { setShowLostModal(true); return; }
        if (target.kind === "won") { await handleWon(); return; }
        const prev = snapshot();
        const wasWon = isWon;
        await updateDeal.mutateAsync(stagePatch(target));
        if (wasWon && deal) await unsyncDealSale(deal.id, deal.user_id, queryClient).catch(() => {});
        toast.success(`Movida para ${target.title}.`, {
            action: { label: "Desfazer", onClick: () => { void restoreStage(prev, false); } },
        });
    };

    const addNote = useMutation({
        mutationFn: async (content: string) => {
            const { error } = await supabase.from("deal_notes" as any).insert({ deal_id: id, user_id: user?.id, content });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["deal-timeline", id] });
            setNewNote("");
            toast.success("Nota adicionada!");
        },
        onError: () => toast.error("Erro ao adicionar nota"),
    });

    const initiateDealCall = useMutation({
        mutationFn: async (payload: { mode: "demo" | "twilio" | "webrtc"; sellerPhone?: string | null }) => {
            if (!canUseCalls) {
                throw new Error("Ligações exigem assinatura e o add-on ativo");
            }
            const response = await supabase.functions.invoke("deal-call-initiate", {
                body: {
                    dealId: id,
                    mode: payload.mode,
                    sellerPhone: payload.sellerPhone || null,
                    customerPhone: deal?.customer_phone || null,
                },
            });

            if (response.error) throw response.error;
            return response.data;
        },
        onSuccess: (data) => {
            logger.log("[initiateDealCall] response data:", JSON.stringify(data, null, 2));
            queryClient.invalidateQueries({ queryKey: ["deal-calls", id] });
            queryClient.invalidateQueries({ queryKey: ["deal-timeline", id] });
            if (sellerPhone.trim()) {
                localStorage.setItem("deal_call_seller_phone", sellerPhone.trim());
            }
            setShowCallModal(false);

            if (data?.requiresSetup) {
                toast.warning(data?.message || "Telefonia ainda não configurada");
                setActiveTab("ligacoes");
                return;
            }

            // WebRTC mode: open the in-browser dialer
            if (data?.mode === "webrtc" && data?.call?.id) {
                setWebrtcCallId(data.call.id);
                setShowWebrtcDialer(true);
                setActiveTab("ligacoes");
                return;
            }

            toast.success(data?.message || "Chamada registrada");
            setActiveTab("ligacoes");
        },
        onError: (error: any) => {
            logger.error("Erro ao iniciar chamada:", error);
            toast.error(error?.message || "Erro ao iniciar chamada");
        },
    });

    const generateCallInsights = useMutation({
        mutationFn: async (callId: string) => {
            if (!canUseCalls) {
                throw new Error("Ligações exigem assinatura e o add-on ativo");
            }
            const response = await supabase.functions.invoke("deal-call-generate-insights", {
                body: { callId },
            });
            if (response.error) throw response.error;
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["deal-calls", id] });
            queryClient.invalidateQueries({ queryKey: ["deal-timeline", id] });
            toast.success("Insights gerados com sucesso");
        },
        onError: (error: any) => {
            logger.error("Erro ao gerar insights:", error);
            toast.error(error?.message || "Erro ao gerar insights");
        },
    });

    // -- Realtime: subscribe to deal_calls changes for live status updates --
    const [liveCallStatus, setLiveCallStatus] = useState<string | null>(null);

    useEffect(() => {
        if (!id || !canUseCalls) return;

        const channel = (supabase as any)
            .channel(`deal-calls-realtime-${id}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "deal_calls",
                    filter: `deal_id=eq.${id}`,
                },
                (payload: any) => {
                    const newRecord = payload.new;
                    const oldRecord = payload.old;

                    if (!newRecord) return;

                    logger.log(
                        `[DealCommandCenter] Realtime deal_call update: ${oldRecord?.status || "?"} -> ${newRecord.status}`,
                    );

                    // Update live call status indicator
                    if (["dialing", "queued", "in_progress", "ringing"].includes(newRecord.status)) {
                        setLiveCallStatus(newRecord.status);
                    } else {
                        setLiveCallStatus(null);
                    }

                    // Refresh call list on any status change
                    if (oldRecord?.status !== newRecord.status) {
                        queryClient.invalidateQueries({ queryKey: ["deal-calls", id] });
                    }

                    // Auto-refresh insights when transcript completes
                    if (
                        newRecord.transcript_status === "completed" &&
                        oldRecord?.transcript_status !== "completed"
                    ) {
                        queryClient.invalidateQueries({ queryKey: ["deal-calls", id] });
                        toast.success("Transcrição concluída!");
                    }

                    // Notify on transcription failure
                    if (
                        newRecord.transcript_status === "failed" &&
                        oldRecord?.transcript_status !== "failed"
                    ) {
                        toast.error("Falha na transcrição da ligação");
                    }
                },
            )
            .subscribe();

        return () => {
            (supabase as any).removeChannel(channel);
        };
    }, [id, canUseCalls, queryClient]);

    // â"€â"€ Derived â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

    // Próxima ação recomendada pela EVA (proxima_acao da análise da conversa).
    // Fallback: ação registrada no deal (imobiliário) e depois genérica.
    // useDealContextData compartilha cache com o bloco de contexto (sem fetch duplo).
    const dealCtx = useDealContextData(id, (deal as any)?.company_id);
    const convStatus = conversationStatus(dealCtx.conversation, deal?.updated_at);
    // Linha embaixo do título: o que o título ainda não diz. O valor só entra no
    // celular, onde o bloco Valor do topo não cabe; a origem sai dele (está nos detalhes).
    const origemCard = origemLabel((deal as any)?.lead_source || (deal as any)?.source);
    const subtitulo: Array<{ texto: string; soCelular?: boolean; soComputador?: boolean }> = [
        ...(deal?.customer_name && !(deal.title || "").startsWith(deal.customer_name) ? [{ texto: deal.customer_name }] : []),
        ...(deal?.customer_phone ? [{ texto: formatPhone(deal.customer_phone) }] : []),
        ...(origemCard !== "—" ? [{ texto: origemCard, soComputador: true }] : []),
        ...(deal?.value ? [{ texto: formatBRL(deal.value), soCelular: true }] : []),
    ];
    const evaProxAcao = dealCtx.qualification?.proxima_acao;
    const evaSuggestedReply = dealCtx.qualification?.resposta_sugerida ?? null;
    const realEstateNextAction = getRealEstateInterest((deal as any)?.source_data)?.proxima_acao;
    // Próximo passo definido pela última conclusão+resultado (prioridade máxima).
    const persistedNext = (deal as any)?.source_data?.next_action;
    const hasPersistedNext = persistedNext && typeof persistedNext.title === "string" && persistedNext.title.trim();
    // Orçamento aberto deste card no placar: dá o passo e o prazo reais (a
    // retomada vale 2 dias sem o cliente escrever, a mesma regra do placar).
    const { query: quoteQuery } = useQuoteBoard(30);
    const openQuote = (quoteQuery.data?.items ?? [])
        .filter((q) => q.deal_id === id && OPEN_QUOTE_STATES.includes(q.state))
        .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0];
    const quoteNext: NextAction | null = !openQuote
        ? null
        : openQuote.state === "your_turn"
        ? { title: "Responder o cliente sobre o orçamento", source: "eva", dueDate: new Date().toISOString(), suggestedReply: evaSuggestedReply, canWhatsApp: !!(deal as any)?.customer_phone }
        : openQuote.state === "no_reply" || openQuote.state === "went_quiet"
        ? {
              title: "Retomar o orçamento",
              source: "eva",
              dueDate: new Date(Date.now() - openQuote.days * 86_400_000 + 2 * 86_400_000).toISOString(),
              suggestedReply: evaSuggestedReply,
              canWhatsApp: !!(deal as any)?.customer_phone,
          }
        : null;
    const evaNext = evaProxAcao && evaProxAcao !== "criar_oportunidade" ? evaProxAcao : null;
    // Cliente mandou a última mensagem: a vez é do time, hoje.
    const conv = dealCtx.conversation;
    const clientWaiting = !!conv?.last_inbound_at && (conv.last_inbound_at ?? "") > (conv.last_outbound_at ?? "");
    const nextAction: NextAction = hasPersistedNext
        ? { title: persistedNext.title, source: "manual", dueDate: null, canWhatsApp: !!(deal as any)?.customer_phone }
        : quoteNext
            ? quoteNext
            : clientWaiting
            ? {
                  title: "Responder o cliente",
                  source: evaSuggestedReply ? "eva" : "manual",
                  dueDate: new Date().toISOString(),
                  suggestedReply: evaSuggestedReply,
                  canWhatsApp: !!(deal as any)?.customer_phone,
              }
            : evaNext
            ? {
                  title: proximaAcaoLabel(evaNext),
                  source: "eva",
                  dueDate: null,
                  suggestedReply: evaSuggestedReply,
                  canWhatsApp: !!(deal as any)?.customer_phone,
              }
            : (typeof realEstateNextAction === "string" && realEstateNextAction.trim())
                ? { title: realEstateNextAction, source: "deal", dueDate: null, canWhatsApp: !!(deal as any)?.customer_phone }
                : { title: "Definir o próximo passo com o lead", source: "manual", canWhatsApp: false };

    const TABS = [
        { id: "historico", label: "Histórico", icon: Clock },
        { id: "ligacoes", label: "Ligações", icon: PhoneCall, locked: !canUseCalls },
        { id: "tarefas", label: "Tarefas", icon: CheckCircle2 },
        { id: "arquivos", label: "Arquivos", icon: Paperclip },
        { id: "propostas", label: "Produtos/Proposta", icon: FileText },
    ];

    // â"€â"€ Loading / Not found â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

    if (isLoading) {
        return <DealDetailSkeleton />;
    }

    if (!deal) {
        // PGRST116 = o card não existe (ou não é desta empresa). O resto é falha de rede/servidor.
        const notFound = !dealError || (dealError as { code?: string }).code === "PGRST116";
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] gap-4 bg-background" role="alert">
                <AlertTriangle className="h-10 w-10 text-amber-500" aria-hidden />
                <p className="text-[var(--vyz-text-strong)]">
                    {notFound ? "Esta oportunidade não existe mais ou é de outra empresa." : "Não deu para carregar esta oportunidade."}
                </p>
                <div className="flex gap-2">
                    {!notFound && (
                        <Button onClick={() => { void refetchDeal(); }} className="rounded-full bg-[var(--vyz-btn-solid)] text-[var(--vyz-btn-on)] hover:bg-[var(--vyz-btn-solid)] hover:opacity-90">
                            Tentar de novo
                        </Button>
                    )}
                    <Button onClick={() => navigate("/pipeline")} variant="outline" className="rounded-full">Voltar ao Pipeline</Button>
                </div>
            </div>
        );
    }

    // â"€â"€ Render â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

    return (
        <>
            <div className="min-h-[calc(100vh-64px)] bg-[var(--ibx-paper)]">
                {showConfetti && (
                    <Suspense fallback={null}>
                        <Confetti show={showConfetti} />
                    </Suspense>
                )}

                <header className="sticky top-0 z-40 bg-[var(--ibx-paper)]/90 backdrop-blur-xl border-b border-[var(--ibx-line)]">
                    <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
                        <nav aria-label="Caminho" className="pt-3">
                            <button
                                onClick={() => navigate("/pipeline")}
                                className="inline-flex items-center gap-1 -ml-1 px-1 py-1 rounded-md text-[12px] font-medium text-[var(--vyz-text-muted)] hover:text-[var(--vyz-text-primary)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)]"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                                Pipeline
                            </button>
                        </nav>

                        <div className="flex items-start justify-between gap-4 pt-2 pb-4">
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                <div
                                    aria-hidden
                                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--ibx-card)] border border-[var(--ibx-line)] text-[13px] font-semibold tracking-[-0.01em] text-[var(--vyz-text-primary)]"
                                >
                                    {iniciais(deal.customer_name || deal.title)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h1 className="text-[18px] sm:text-[21px] font-semibold text-[var(--vyz-text-primary)] line-clamp-2 sm:line-clamp-none sm:truncate leading-tight tracking-[-0.02em]">
                                        {deal.title}
                                    </h1>
                                    <p className="mt-1 flex items-center gap-x-2 gap-y-0.5 flex-wrap text-[12.5px] text-[var(--vyz-text-muted)]">
                                        {subtitulo.map((parte, i) => (
                                            <span key={i} className={`items-center gap-2 min-w-0 ${parte.soCelular ? "inline-flex sm:hidden font-semibold text-[var(--vyz-text-primary)] tabular-nums" : parte.soComputador ? "hidden sm:inline-flex" : "inline-flex"}`}>
                                                {i > 0 && <span className="text-[var(--ibx-line-strong)] font-normal" aria-hidden>·</span>}
                                                <span className="truncate">{parte.texto}</span>
                                            </span>
                                        ))}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 flex-shrink-0">
                                <div className="text-right hidden sm:block">
                                    <p className={EYEBROW}>Valor</p>
                                    {deal.value ? (
                                        <p className="text-[20px] font-semibold text-[var(--vyz-text-primary)] tabular-nums leading-tight tracking-[-0.02em]">
                                            {formatBRL(deal.value)}
                                        </p>
                                    ) : (
                                        <p className="text-[14px] font-medium text-[var(--vyz-text-muted)] leading-tight mt-0.5">Sem valor</p>
                                    )}
                                </div>

                                {!isWon && !isLost && (
                                    <div className="flex gap-2">
                                        <Button size="sm"
                                            aria-label="Marcar como fechada"
                                            className={`rounded-full bg-[var(--vyz-btn-solid)] text-[var(--vyz-btn-on)] hover:bg-[var(--vyz-btn-solid)] hover:opacity-90 font-semibold h-10 w-10 p-0 sm:h-9 sm:w-auto sm:px-4 gap-1.5 ${PRESS}`}
                                            onClick={() => { void handleWon(); }}
                                            disabled={updateDeal.isPending}
                                        >
                                            <Trophy className="h-3.5 w-3.5" aria-hidden />
                                            <span className="hidden sm:inline">Fechou</span>
                                        </Button>
                                        <Button size="sm" variant="outline"
                                            aria-label="Marcar como perdida"
                                            className={`rounded-full border-[var(--ibx-line)] bg-[var(--ibx-card)] text-[var(--vyz-text-strong)] hover:bg-[var(--ibx-card)] hover:text-[var(--vyz-danger)] hover:border-[var(--vyz-danger)]/40 h-10 w-10 p-0 sm:h-9 sm:w-auto sm:px-4 gap-1.5 ${PRESS}`}
                                            onClick={() => setShowLostModal(true)}
                                            disabled={updateDeal.isPending}
                                        >
                                            <XCircle className="h-3.5 w-3.5" aria-hidden />
                                            <span className="hidden sm:inline">Perdeu</span>
                                        </Button>
                                    </div>
                                )}

                                {isWon && (
                                    <div className="flex items-center gap-1.5 bg-[var(--vyz-success-bg)] text-[var(--vyz-success)] px-3.5 h-9 rounded-full text-[12.5px] font-semibold">
                                        <Trophy className="h-3.5 w-3.5" aria-hidden /> Fechou
                                    </div>
                                )}
                                {isLost && (
                                    <div className="flex items-center gap-1.5 bg-[var(--vyz-danger-bg)] text-[var(--vyz-danger)] px-3.5 h-9 rounded-full text-[12.5px] font-semibold">
                                        <XCircle className="h-3.5 w-3.5" aria-hidden /> Perdeu
                                    </div>
                                )}
                            </div>
                        </div>

                        <StageChips
                            stages={stageList}
                            currentId={currentStage?.id ?? null}
                            disabled={updateDeal.isPending}
                            onStageChange={(st) => { void handleStageChange(st); }}
                        />
                    </div>
                </header>

                {/* â"€â"€ MAIN GRID â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5">
                    <div className="grid grid-cols-12 gap-4 sm:gap-6">

                        {/* â"€â"€ LEFT MAIN (activity) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
                        <div className="col-span-12 lg:col-span-8 space-y-4 min-w-0 order-1">

                            {/* Focus / next action */}
                            {openQuote && <div className="lg:hidden"><QuoteCard q={openQuote} /></div>}
                            <FocusCard
                                key={nextAction.title}
                                action={nextAction}
                                status={convStatus}
                                conversationHref={dealCtx.openConversationHref ?? null}
                                onOpenConversation={(href) => navigate(href)}
                                onComplete={async (resultKey) => {
                                    const r = ACTION_RESULTS.find((x) => x.key === resultKey);
                                    const resultLabel = r?.label ?? resultKey;
                                    const nextTitle = r?.next ?? "Definir o próximo passo com o lead";
                                    try {
                                        await supabase.from("deal_notes" as any).insert({
                                            deal_id: id, user_id: user?.id,
                                            content: `Ação concluída: ${nextAction.title} · Resultado: ${resultLabel}`,
                                        });
                                        const prev = (deal as any)?.source_data && typeof (deal as any).source_data === "object" ? (deal as any).source_data : {};
                                        await supabase.from("deals").update({
                                            source_data: { ...prev, next_action: { title: nextTitle, from_result: resultKey, set_at: new Date().toISOString() } },
                                        }).eq("id", id);
                                        queryClient.invalidateQueries({ queryKey: ["deal", id] });
                                        queryClient.invalidateQueries({ queryKey: ["deal-timeline", id] });
                                        toast.success(`Registrado. Próximo passo: ${nextTitle}`);
                                    } catch {
                                        toast.error("Não consegui registrar a conclusão");
                                    }
                                }}
                                onExecute={() => {
                                    const convId = dealCtx.conversation?.id;
                                    if (convId) {
                                        const texto = nextAction.suggestedReply ? `&texto=${encodeURIComponent(nextAction.suggestedReply)}` : "";
                                        navigate(`/inbox?conversationId=${convId}${texto}`);
                                        return;
                                    }
                                    const raw = ((deal as any)?.customer_phone || "").replace(/\D/g, "");
                                    if (!raw) { toast.error("Sem telefone de WhatsApp neste deal"); return; }
                                    const wa = raw.startsWith("55") ? raw : "55" + raw;
                                    const text = nextAction.suggestedReply ? `?text=${encodeURIComponent(nextAction.suggestedReply)}` : "";
                                    window.open(`https://wa.me/${wa}${text}`, "_blank", "noopener,noreferrer");
                                }}
                            />

                            <EvaReadingCard
                                ctx={dealCtx}
                                probability={deal.probability ?? null}
                                decisionHint={getDecisionMap((deal as any).source_data).some((p) => p.papel === "Decisor financeiro" && (p.origem || "").toLowerCase().includes("mencionad"))
                                    ? "A EVA identificou possível decisor financeiro mencionado na conversa. Revise antes de adicionar ao mapa de decisão."
                                    : null}
                            />

                            {/* EVA.STUDIO.7.1 — regras do EVA Studio orientando a recomendação (só leitura) */}
                            <EvaStudioRules />

                            {/* Atividade */}
                            <section className={`${CARD} overflow-hidden`} aria-label="Atividade">
                                <div role="tablist" className="flex items-center gap-1 border-b border-[var(--ibx-line-soft)] px-3 overflow-x-auto no-scrollbar">
                                    {TABS.map((tab) => {
                                        const active = activeTab === tab.id;
                                        return (
                                            <button
                                                key={tab.id}
                                                role="tab"
                                                aria-selected={active}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`relative flex items-center gap-1.5 px-2.5 py-3 text-[13px] whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-none focus-visible:text-[var(--vyz-text-primary)] ${active ? "font-semibold text-[var(--vyz-text-primary)]" : "font-medium text-[var(--vyz-text-muted)] hover:text-[var(--vyz-text-primary)]"}`}
                                            >
                                                <span>{tab.label}</span>
                                                {tab.locked && <Lock className="h-3 w-3 text-[var(--vyz-text-muted)]" aria-label="Recurso do plano" />}
                                                {active && (
                                                    <motion.div
                                                        layoutId="tab-underline"
                                                        transition={{ type: "spring", stiffness: 500, damping: 40 }}
                                                        className="absolute left-2.5 right-2.5 -bottom-px h-[2px] rounded-full bg-[var(--vyz-text-primary)]"
                                                    />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                <AnimatePresence mode="wait">
                                    <motion.div key={activeTab}
                                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}
                                    >
                                        {/* â"€â"€ Histórico â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
                                        {activeTab === "historico" && (
                                            <div className="flex flex-col">
                                                <div className="px-5 py-4 sm:py-5">
                                                    {timeline.length === 0 ? (
                                                        <div className="flex items-center gap-2.5 text-[var(--vyz-text-muted)] sm:flex-col sm:justify-center sm:gap-0 sm:py-8">
                                                            <StickyNote className="h-4 w-4 shrink-0 opacity-60 sm:h-7 sm:w-7 sm:mb-3" aria-hidden />
                                                            <p className="text-[13px]">Nenhuma nota ainda. Escreva a primeira abaixo.</p>
                                                        </div>
                                                    ) : (() => {
                                                        const linhas = groupTimeline(timeline);
                                                        return (
                                                            <div>
                                                                {linhas.map((l, i) => l.kind === "msgs"
                                                                    ? <MessageRunEntry key={l.items[0].id} items={l.items} isLast={i === linhas.length - 1} href={dealCtx.openConversationHref ?? null} onOpen={(h) => navigate(h)} />
                                                                    : <TimelineEntry key={l.ev.id} event={l.ev} isLast={i === linhas.length - 1} />)}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>

                                                {/* Composer - sticky to bottom of panel */}
                                                <div className="sticky bottom-0 p-3 border-t border-[var(--ibx-line-soft)] bg-[var(--ibx-card)]/95 backdrop-blur-sm">
                                                    <div className="flex items-center gap-2 bg-[var(--ibx-sunken)] rounded-full pl-4 pr-1.5 py-1.5 ring-1 ring-transparent focus-within:ring-[var(--vyz-accent)]/35 focus-within:bg-[var(--ibx-card)] transition-[background-color,box-shadow] duration-150">
                                                        <Input
                                                            value={newNote}
                                                            onChange={(e) => setNewNote(e.target.value)}
                                                            placeholder="Adicionar nota ou @mencionar..."
                                                            className="flex-1 bg-transparent border-0 text-base md:text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 h-10 sm:h-8 p-0"
                                                            onKeyDown={(e) => { if (e.key === "Enter" && newNote.trim()) addNote.mutate(newNote.trim()); }}
                                                        />
                                                        <Button size="sm"
                                                            onClick={() => newNote.trim() && addNote.mutate(newNote.trim())}
                                                            disabled={!newNote.trim() || addNote.isPending}
                                                            aria-label="Adicionar nota"
                                                            className={`bg-[var(--vyz-btn-solid)] hover:bg-[var(--vyz-btn-solid)] hover:opacity-90 text-[var(--vyz-btn-on)] h-9 w-9 sm:h-8 sm:w-8 p-0 rounded-full shrink-0 ${PRESS}`}
                                                        >
                                                            {addNote.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUp className="h-4 w-4" strokeWidth={2.4} />}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* â"€â"€ LigaçÃµes â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
                                        {activeTab === "ligacoes" && (
                                            <div className="p-4 sm:p-5 space-y-4">
                                                {/* Live call indicator */}
                                                {liveCallStatus && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -8 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 mb-3"
                                                    >
                                                        <span className="relative flex h-2.5 w-2.5">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                                                        </span>
                                                        <span className="text-sm font-medium text-emerald-300">
                                                            {liveCallStatus === "in_progress"
                                                                ? "Ligação em andamento..."
                                                                : liveCallStatus === "dialing"
                                                                    ? "Discando..."
                                                                    : liveCallStatus === "ringing"
                                                                        ? "Chamando..."
                                                                        : "Na fila..."}
                                                        </span>
                                                    </motion.div>
                                                )}

                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-foreground">Ligações</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Registre chamadas, transcreva e gere insights com IA
                                                        </p>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        className="bg-emerald-500 hover:bg-emerald-400 text-white gap-2"
                                                        disabled={!canUseCalls}
                                                        onClick={() => setShowCallModal(true)}
                                                    >
                                                        <PhoneCall className="h-4 w-4" />
                                                        {canUseCalls ? "Nova ligação" : (hasCallsPlanAccess ? "Ativar add-on" : "Assinar")}
                                                    </Button>
                                                </div>

                                                {!canUseCalls ? (
                                                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 sm:p-5">
                                                        <div className="flex items-start gap-3">
                                                            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                                                <Lock className="h-4 w-4 text-amber-300" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-semibold text-foreground">
                                                                    {hasCallsPlanAccess ? "Ative o add-on Ligações" : "Ligações disponível para assinantes"}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                                                    {hasCallsPlanAccess ? (
                                                                        <>
                                                                            Seu plano atual é <span className="text-amber-300 font-medium capitalize">{currentPlan}</span> e já é elegível.
                                                                            Falta ativar o add-on de Ligações para liberar chamadas, gravação e transcrição dentro do deal.
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            Seu plano atual é <span className="text-amber-300 font-medium capitalize">{currentPlan}</span>.
                                                                            Assine o Vyzon e depois ative o add-on de Ligações.
                                                                        </>
                                                                    )}
                                                                </p>
                                                                <div className="mt-3">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="border-amber-500/30 text-amber-200 hover:text-white hover:bg-amber-500/10"
                                                                        onClick={() => navigate("/upgrade")}
                                                                    >
                                                                        {hasCallsPlanAccess ? "Ver add-on / planos" : "Ver planos"}
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : loadingCalls ? (
                                                    <div className="flex items-center justify-center py-10 text-muted-foreground">
                                                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                                        Carregando chamadas...
                                                    </div>
                                                ) : dealCalls.length === 0 ? (
                                                    <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
                                                        <PhoneCall className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                                                        <p className="text-sm font-medium text-muted-foreground">Nenhuma ligação registrada</p>
                                                        <p className="text-xs text-muted-foreground/60 mt-1 mb-4">
                                                            Use "Nova ligação" para testar o fluxo em modo demo e validar a experiência no deal
                                                        </p>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="border-border text-muted-foreground hover:text-foreground"
                                                            onClick={() => setShowCallModal(true)}
                                                        >
                                                            Criar chamada demo
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {dealCalls.map((call: any) => (
                                                            <div key={call.id} className="rounded-2xl border border-border bg-muted/30 p-4 space-y-4">
                                                                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                                                                    <div className="space-y-2">
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            {getCallStatusBadge(call.status)}
                                                                            <Badge variant="outline" className="border-border text-muted-foreground">
                                                                                {call.provider === "demo" ? "Demo" : (call.provider || "Telefone")}
                                                                            </Badge>
                                                                            {call.transcript_status && (
                                                                                <Badge
                                                                                    variant="outline"
                                                                                    className={
                                                                                        call.transcript_status === "completed"
                                                                                            ? "border-emerald-500/25 text-emerald-300"
                                                                                            : call.transcript_status === "transcribing"
                                                                                                ? "border-blue-500/25 text-blue-300"
                                                                                                : call.transcript_status === "failed"
                                                                                                    ? "border-rose-500/25 text-rose-300"
                                                                                                    : "border-border text-muted-foreground"
                                                                                    }
                                                                                >
                                                                                    {call.transcript_status === "transcribing" && (
                                                                                        <Loader2 className="h-3 w-3 animate-spin mr-1 inline" />
                                                                                    )}
                                                                                    Transcrição: {call.transcript_status === "completed" ? "Pronta" : call.transcript_status === "transcribing" ? "Em andamento" : call.transcript_status === "failed" ? "Falhou" : call.transcript_status}
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-sm text-foreground">
                                                                            <span className="text-muted-foreground">Cliente:</span> {formatPhone(call.customer_phone)}
                                                                        </div>
                                                                        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                                                                            <span>{safeFormatDate(call.created_at, "dd/MM/yyyy 'às' HH:mm")}</span>
                                                                            {typeof call.duration_seconds === "number" && <span>Duração: {call.duration_seconds}s</span>}
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="border-border text-muted-foreground hover:text-foreground w-full sm:w-auto"
                                                                            disabled={!call.transcript_text || generateCallInsights.isPending}
                                                                            onClick={() => generateCallInsights.mutate(call.id)}
                                                                        >
                                                                            {generateCallInsights.isPending && (generateCallInsights.variables === call.id)
                                                                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                                                                : <Lightbulb className="h-4 w-4" />}
                                                                            <span className="ml-1">Gerar insights</span>
                                                                        </Button>
                                                                    </div>
                                                                </div>

                                                                {call.transcript_preview && (
                                                                    <div className="rounded-xl border border-border bg-muted/40 p-3">
                                                                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Preview da transcrição</p>
                                                                        <p className="text-sm text-foreground leading-relaxed">{call.transcript_preview}</p>
                                                                    </div>
                                                                )}

                                                                {call.transcript_text && (
                                                                    <details className="rounded-xl border border-border bg-muted/40">
                                                                        <summary className="cursor-pointer list-none px-3 py-2.5 flex items-center justify-between">
                                                                            <span className="text-sm font-medium text-foreground">Transcrição completa</span>
                                                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                                        </summary>
                                                                        <div className="px-3 pb-3">
                                                                            <Textarea
                                                                                readOnly
                                                                                value={call.transcript_text}
                                                                                className="min-h-[180px] bg-background border-border text-foreground text-sm leading-relaxed"
                                                                            />
                                                                        </div>
                                                                    </details>
                                                                )}

                                                                {call.insight && (
                                                                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <Lightbulb className="h-4 w-4 text-emerald-400" />
                                                                            <p className="text-sm font-semibold text-emerald-300">Insights da ligação</p>
                                                                            <Badge variant="outline" className="border-emerald-500/20 text-emerald-300">
                                                                                {call.insight.model || "mvp"}
                                                                            </Badge>
                                                                            {call.insight.raw_output?.sentiment && (
                                                                                <Badge
                                                                                    variant="outline"
                                                                                    className={
                                                                                        call.insight.raw_output.sentiment === "positive"
                                                                                            ? "border-emerald-500/20 text-emerald-300"
                                                                                            : call.insight.raw_output.sentiment === "negative"
                                                                                                ? "border-rose-500/20 text-rose-300"
                                                                                                : call.insight.raw_output.sentiment === "mixed"
                                                                                                    ? "border-amber-500/20 text-amber-300"
                                                                                                    : "border-border text-muted-foreground"
                                                                                    }
                                                                                >
                                                                                    {call.insight.raw_output.sentiment === "positive" ? "Positivo"
                                                                                        : call.insight.raw_output.sentiment === "negative" ? "Negativo"
                                                                                            : call.insight.raw_output.sentiment === "mixed" ? "Misto"
                                                                                                : "Neutro"}
                                                                                </Badge>
                                                                            )}
                                                                        </div>

                                                                        {call.insight.summary && (
                                                                            <div>
                                                                                <p className="text-[11px] uppercase tracking-wider text-emerald-300/70 mb-1">Resumo</p>
                                                                                <p className="text-sm text-foreground leading-relaxed">{call.insight.summary}</p>
                                                                            </div>
                                                                        )}

                                                                        <div className="grid md:grid-cols-2 gap-3">
                                                                            <div>
                                                                                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Objeções</p>
                                                                                <div className="flex flex-wrap gap-1.5">
                                                                                    {(call.insight.objections || []).length > 0 ? (
                                                                                        (call.insight.objections || []).map((obj: string, idx: number) => (
                                                                                            <Badge key={`${call.id}-obj-${idx}`} variant="outline" className="border-amber-500/20 text-amber-300">
                                                                                                {obj}
                                                                                            </Badge>
                                                                                        ))
                                                                                    ) : (
                                                                                        <span className="text-xs text-muted-foreground">Nenhuma objeção detectada</span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Próximos passos</p>
                                                                                <ul className="space-y-1">
                                                                                    {(call.insight.next_steps || []).map((step: string, idx: number) => (
                                                                                        <li key={`${call.id}-step-${idx}`} className="text-sm text-foreground flex items-start gap-2">
                                                                                            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-emerald-400 flex-shrink-0" />
                                                                                            <span>{step}</span>
                                                                                        </li>
                                                                                    ))}
                                                                                </ul>
                                                                            </div>
                                                                        </div>

                                                                        {call.insight.suggested_message && (
                                                                            <div>
                                                                                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Mensagem sugerida</p>
                                                                                <Textarea
                                                                                    readOnly
                                                                                    value={call.insight.suggested_message}
                                                                                    className="min-h-[88px] bg-background border-border text-foreground text-sm"
                                                                                />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* â"€â"€ Tarefas â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
                                        {activeTab === "tarefas" && (
                                            <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
                                                <CheckCircle2 className="h-10 w-10 mb-3 opacity-40" />
                                                <p className="text-sm font-medium text-muted-foreground">Nenhuma tarefa pendente</p>
                                                <p className="text-xs mt-1 mb-4">Tarefas criadas aparecerão aqui</p>
                                                <Button variant="outline" size="sm" className="gap-2 border-border text-muted-foreground hover:text-foreground"
                                                    onClick={() => setShowTaskModal(true)}>
                                                    <Plus className="h-4 w-4" aria-hidden /> Nova tarefa
                                                </Button>
                                            </div>
                                        )}

                                        {/* â"€â"€ Arquivos â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
                                        {activeTab === "arquivos" && (
                                            <div className="p-5">
                                                <input ref={fileInputRef} type="file" multiple
                                                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const files = Array.from(e.target.files || []);
                                                        if (files.length) { setUploadedFiles(p => [...p, ...files]); toast.success(`${files.length} arquivo(s) selecionado(s)`); }
                                                    }}
                                                />
                                                {uploadedFiles.length === 0 ? (
                                                    <div
                                                        className="flex flex-col items-center justify-center py-14 border-2 border-dashed border-border rounded-2xl cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all"
                                                        onClick={() => fileInputRef.current?.click()}
                                                    >
                                                        <Paperclip className="h-9 w-9 mb-3 text-muted-foreground/50" />
                                                        <p className="text-sm font-medium text-muted-foreground">Nenhum arquivo anexado</p>
                                                        <p className="text-xs text-muted-foreground/60 mt-1">Arraste ou clique para anexar</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {uploadedFiles.map((file, i) => (
                                                            <div key={i} className="flex items-center gap-3 p-3 bg-muted/60 rounded-xl border border-border">
                                                                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                                                    {file.type.startsWith("image/")
                                                                        ? <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover rounded-lg" />
                                                                        : <FileText className="h-4 w-4 text-muted-foreground" />}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                                                                    <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                                                </div>
                                                                <Button variant="ghost" size="sm" onClick={() => setUploadedFiles(p => p.filter((_, j) => j !== i))}
                                                                    className="text-muted-foreground hover:text-rose-400 h-7 w-7 p-0">
                                                                    <X className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                        <Button variant="outline" size="sm" className="w-full gap-2 border-border text-muted-foreground hover:text-foreground mt-2"
                                                            onClick={() => fileInputRef.current?.click()}>
                                                            <Paperclip className="h-4 w-4" /> Anexar Mais
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* â"€â"€ Produtos/Proposta â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
                                        {activeTab === "propostas" && (
                                            <div className="p-5 space-y-5">
                                                {/* Propostas (editor + lista) */}
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-sm font-semibold text-foreground">Propostas</p>
                                                        <Button onClick={() => setShowProposta(true)} size="sm" className={`gap-1.5 rounded-full bg-[var(--vyz-btn-solid)] hover:bg-[var(--vyz-btn-solid)] hover:opacity-90 text-[var(--vyz-btn-on)] ${PRESS}`}>
                                                            <FileTextIcon className="h-4 w-4" /> Nova proposta
                                                        </Button>
                                                    </div>
                                                    {proposals.length === 0 ? (
                                                        <div className="text-center py-8 text-muted-foreground rounded-xl border border-dashed border-border">
                                                            <FileTextIcon className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                                            <p className="text-sm font-medium">Nenhuma proposta ainda</p>
                                                            <p className="text-xs text-muted-foreground/60 mt-1">Monte os itens, personalize (logo/cor/seções) e gere o PDF</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {proposals.map((p) => {
                                                                const statusMeta: Record<string, { label: string; cls: string }> = {
                                                                    rascunho: { label: "Rascunho", cls: "bg-slate-500/10 text-slate-600" },
                                                                    enviada: { label: "Enviada", cls: "bg-blue-500/10 text-blue-600" },
                                                                    aceita: { label: "Aceita", cls: "bg-emerald-500/10 text-emerald-600" },
                                                                    recusada: { label: "Recusada", cls: "bg-rose-500/10 text-rose-600" },
                                                                };
                                                                const sm = statusMeta[p.status] || statusMeta.rascunho;
                                                                return (
                                                                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                                                                        <div className="p-2 rounded-lg bg-blue-500/10"><FileTextIcon className="h-4 w-4 text-blue-600" /></div>
                                                                        <div className="min-w-0 flex-1">
                                                                            <p className="text-sm font-semibold text-foreground truncate">{p.title}</p>
                                                                            <p className="text-[11px] text-muted-foreground">
                                                                                {(p.items?.length ?? 0)} {(p.items?.length ?? 0) === 1 ? "item" : "itens"} · {format(new Date(p.created_at), "dd MMM yyyy", { locale: ptBR })}
                                                                            </p>
                                                                        </div>
                                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sm.cls}`}>{sm.label}</span>
                                                                        <span className="text-sm font-bold text-blue-600 tabular-nums">
                                                                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p.total || 0)}
                                                                        </span>
                                                                        <Button size="icon" variant="ghost" title="Baixar PDF" className="text-muted-foreground hover:text-blue-600"
                                                                            onClick={() => { void generateProposalPDF({
                                                                                companyName: companyBrand?.name, logoUrl: companyBrand?.logoUrl, brandColor: p.brand_color || undefined,
                                                                                dealTitle: deal.title, customerName: p.customer_name || deal.customer_name || "Cliente",
                                                                                customerEmail: p.customer_email || undefined, customerPhone: p.customer_phone || undefined,
                                                                                items: p.items || [], discountPercent: p.discount_percent, conditions: p.conditions || undefined,
                                                                                validityDays: p.validity_days, intro: p.intro || undefined, about: p.about || undefined, sections: p.sections || undefined,
                                                                            }); }}>
                                                                            <DownloadIcon className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button size="icon" variant="ghost" title="Excluir" className="text-muted-foreground hover:text-rose-500" onClick={() => deleteProposal.mutate(p.id)}>
                                                                            <Trash2Icon className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Produtos do deal */}
                                                {deal?.company_id && (
                                                    <div className="pt-4 border-t border-border">
                                                        <DealProducts
                                                            dealId={id!}
                                                            companyId={deal.company_id}
                                                            deal={{ id: deal.id, title: deal.title, customer_name: deal.customer_name, customer_email: deal.customer_email, customer_phone: deal.customer_phone }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </section>
                        </div>

                        {/* Coluna da direita: orçamento e os dados do card */}
                        <aside className="col-span-12 lg:col-span-4 order-2 min-w-0" aria-label="Detalhes">
                            <div className="lg:sticky lg:top-[168px] space-y-4">
                                {openQuote && <div className="hidden lg:block"><QuoteCard q={openQuote} /></div>}

                                <section className={`${CARD} p-4 sm:p-5`} aria-label="Contato e negócio">
                                    <p className={EYEBROW}>Contato</p>
                                    <p className="mt-1 text-[15px] font-semibold leading-snug tracking-[-0.01em] text-[var(--vyz-text-primary)] break-words">
                                        {deal.customer_name || "Sem nome"}
                                    </p>
                                    {deal.customer_phone && (
                                        <p className="mt-0.5 text-[12.5px] text-[var(--vyz-text-muted)] tabular-nums">{formatPhone(deal.customer_phone)}</p>
                                    )}
                                    {deal.customer_email && (
                                        <a href={`mailto:${deal.customer_email}`} className="mt-0.5 block truncate text-[12.5px] text-[var(--vyz-accent)] hover:underline">
                                            {deal.customer_email}
                                        </a>
                                    )}

                                    <div className="mt-4 flex gap-2 [&>*]:flex-1">
                                        <button
                                            type="button"
                                            onClick={() => deal.customer_phone && window.open(`https://wa.me/${deal.customer_phone.replace(/\D/g, "")}`, "_blank", "noopener,noreferrer")}
                                            disabled={!deal.customer_phone}
                                            className={`${QUICK} disabled:opacity-40 disabled:cursor-not-allowed`}
                                        >
                                            <WhatsAppIcon className="h-4 w-4" />
                                            WhatsApp
                                        </button>
                                        {canUseCalls && (
                                            <button type="button" onClick={() => setShowCallModal(true)} className={QUICK}>
                                                <Phone className="h-4 w-4" aria-hidden />
                                                Ligar
                                            </button>
                                        )}
                                        {deal.customer_email && (
                                            <button type="button" onClick={() => window.open(`mailto:${deal.customer_email}`, "_blank")} className={QUICK}>
                                                <Mail className="h-4 w-4" aria-hidden />
                                                E-mail
                                            </button>
                                        )}
                                        <button type="button" onClick={() => setShowTaskModal(true)} className={QUICK}>
                                            <Plus className="h-4 w-4" aria-hidden />
                                            Tarefa
                                        </button>
                                    </div>

                                    <div className="mt-4 pt-3.5 border-t border-[var(--ibx-line-soft)]">
                                        <p className={`${EYEBROW} mb-1`}>Negócio</p>
                                        {getRealEstateInterest((deal as any).source_data) ? (
                                            <div className="space-y-2.5">
                                                <RealEstateInterestBlock sourceData={(deal as any).source_data} />
                                                <SidebarRow label="Valor da proposta" value={deal.value ? formatBRL(deal.value) : "Sem valor"} strong />
                                            </div>
                                        ) : (
                                            <div>
                                                <SidebarRow label="Origem" value={origemCard} />
                                                <SidebarRow label="Criado" value={safeFormatDate(deal.created_at, "dd MMM yyyy")} />
                                                <SidebarRow label="Atualizado" value={safeFormatDistance(deal.updated_at)} />
                                            </div>
                                        )}
                                    </div>

                                    {deal.notes && (
                                        <div className="mt-4 pt-3.5 border-t border-[var(--ibx-line-soft)]">
                                            <p className={EYEBROW}>Observações</p>
                                            <p className="mt-1 text-[12.5px] leading-relaxed whitespace-pre-line break-words text-[var(--vyz-text-strong)]">{deal.notes}</p>
                                        </div>
                                    )}

                                    <div className="mt-4 pt-3.5 border-t border-[var(--ibx-line-soft)]">
                                        <p className={`${EYEBROW} mb-2`}>Tags</p>
                                        <DealTagsBlock dealId={id!} />
                                    </div>

                                    <div className="mt-4 border-t border-[var(--ibx-line-soft)]">
                                        <PropertiesSection title="Campos personalizados" defaultOpen={false}>
                                            <CustomFieldsSection dealId={id!} compact />
                                        </PropertiesSection>
                                    </div>
                                </section>

                                {/* Mapa de decisão: editável em qualquer deal; a EVA sugere da conversa */}
                                <DecisionMapCard dealId={id!} companyId={(deal as any).company_id ?? null} sourceData={(deal as any).source_data} />
                            </div>
                        </aside>
                    </div>
                </div>

                {/* â"€â"€ MODALS â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
                <Dialog open={showCallModal} onOpenChange={setShowCallModal}>
                    <DialogContent className="bg-card border-border text-foreground w-[calc(100vw-1rem)] max-w-lg p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <PhoneCall className="h-5 w-5 text-emerald-400" />
                                Iniciar ligação no Deal
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                MVP: registre a chamada e salve a transcrição no deal. Para validação imediata, use o modo demo.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-2">
                                <p className="text-xs uppercase tracking-wider text-muted-foreground">Contato do deal</p>
                                <p className="text-sm text-foreground">{deal.customer_name}</p>
                                <p className="text-sm text-muted-foreground">{formatPhone(deal.customer_phone)}</p>
                            </div>

                            {callMode !== "webrtc" && (
                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-wider text-muted-foreground">Seu telefone (necessario no modo Twilio)</label>
                                    <Input
                                        value={sellerPhone}
                                        onChange={(e) => setSellerPhone(e.target.value)}
                                        placeholder="(11) 99999-9999"
                                        className="bg-background border-border text-foreground"
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-xs uppercase tracking-wider text-muted-foreground">Modo</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setCallMode("webrtc")}
                                        className={`rounded-xl border px-3 py-2 text-left transition-colors ${callMode === "webrtc"
                                            ? "border-emerald-500/40 bg-emerald-500/10"
                                            : "border-border bg-background"
                                            }`}
                                    >
                                        <p className="text-sm font-medium text-foreground">Ligar pelo browser</p>
                                        <p className="text-xs text-muted-foreground">Liga direto do navegador para o cliente</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCallMode("twilio")}
                                        className={`rounded-xl border px-3 py-2 text-left transition-colors ${callMode === "twilio"
                                            ? "border-blue-500/40 bg-blue-500/10"
                                            : "border-border bg-background"
                                            }`}
                                    >
                                        <p className="text-sm font-medium text-foreground">Click-to-call</p>
                                        <p className="text-xs text-muted-foreground">Liga pro seu telefone e conecta ao cliente</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCallMode("demo")}
                                        className={`rounded-xl border px-3 py-2 text-left transition-colors ${callMode === "demo"
                                            ? "border-amber-500/40 bg-amber-500/10"
                                            : "border-border bg-background"
                                            }`}
                                    >
                                        <p className="text-sm font-medium text-foreground">Demo</p>
                                        <p className="text-xs text-muted-foreground">Chamada simulada para testar o fluxo</p>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                variant="outline"
                                onClick={() => setShowCallModal(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                className="bg-emerald-500 hover:bg-emerald-400 text-white gap-2"
                                disabled={initiateDealCall.isPending}
                                onClick={() => initiateDealCall.mutate({ mode: callMode, sellerPhone: sellerPhone.trim() || null })}
                            >
                                {initiateDealCall.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <PhoneCall className="h-4 w-4" />
                                )}
                                {callMode === "webrtc" ? "Ligar agora" : callMode === "demo" ? "Criar chamada demo" : "Iniciar chamada"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* WebRTC In-Browser Dialer */}
                <Dialog open={showWebrtcDialer} onOpenChange={(open) => {
                    if (!open) {
                        setShowWebrtcDialer(false);
                        setWebrtcCallId(null);
                        queryClient.invalidateQueries({ queryKey: ["deal-calls", id] });
                    }
                }}>
                    <DialogContent className="bg-card border-border text-foreground w-[calc(100vw-1rem)] max-w-md p-4 sm:p-6">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <PhoneCall className="h-5 w-5 text-emerald-400" />
                                Chamada em andamento
                            </DialogTitle>
                        </DialogHeader>
                        <Suspense fallback={null}>
                            <InBrowserDialer
                                dealId={id!}
                                customerPhone={deal?.customer_phone || ""}
                                customerName={deal?.customer_name || "Cliente"}
                                callId={webrtcCallId}
                                onCallStarted={(newCallId) => {
                                    setWebrtcCallId(newCallId);
                                    queryClient.invalidateQueries({ queryKey: ["deal-calls", id] });
                                }}
                                onCallEnded={() => {
                                    queryClient.invalidateQueries({ queryKey: ["deal-calls", id] });
                                    toast.success("Chamada encerrada. Transcrição será processada automaticamente.");
                                }}
                                onError={(err) => {
                                    toast.error(err);
                                }}
                            />
                        </Suspense>
                    </DialogContent>
                </Dialog>

                {showLostModal && (
                    <Suspense fallback={null}>
                        <LostDealModal
                            open={showLostModal}
                            onClose={() => setShowLostModal(false)}
                            onConfirm={async (reason) => {
                                const lost = stageList.find((st) => st.kind === "lost");
                                const wasWon = isWon;
                                await updateDeal.mutateAsync({
                                    ...(lost ? stagePatch(lost) : { stage: "closed_lost" }),
                                    loss_reason: reason,
                                    probability: 0,
                                });
                                if (wasWon) await unsyncDealSale(deal.id, deal.user_id, queryClient).catch(() => {});
                                setShowLostModal(false);
                                toast.success("Oportunidade marcada como perdida.");
                            }}
                            dealTitle={deal.title || "Deal"}
                        />
                    </Suspense>
                )}
                {showTaskModal && (
                    <Suspense fallback={null}>
                        <NovaTarefaModal
                            open={showTaskModal}
                            onClose={() => setShowTaskModal(false)}
                            dealId={id || ""}
                            dealTitle={deal.title}
                        />
                    </Suspense>
                )}

                {deal && (
                    <NovaPropostaModal
                        open={showProposta}
                        onClose={() => setShowProposta(false)}
                        deal={{ id: deal.id, title: deal.title, customer_name: deal.customer_name, customer_email: deal.customer_email, customer_phone: deal.customer_phone }}
                        companyName={companyBrand?.name}
                        logoUrl={companyBrand?.logoUrl}
                    />
                )}
            </div>
        </>
    );
}

// ─── Leitura da EVA: chance de fechar, o que ela já sabe e o que falta saber ───

function EvaReadingCard({
    ctx,
    probability,
    decisionHint,
}: {
    ctx: ReturnType<typeof useDealContextData>;
    probability: number | null;
    decisionHint?: string | null;
}) {
    if (ctx.loading) {
        return (
            <div className={`${CARD} p-5 space-y-2.5`} aria-busy="true">
                <div className="h-3 w-28 rounded bg-[var(--ibx-sunken)]" />
                <div className="h-4 w-full rounded bg-[var(--ibx-paper)]" />
                <div className="h-4 w-2/3 rounded bg-[var(--ibx-paper)]" />
            </div>
        );
    }
    // Sem conversa ligada não há o que ler; a próxima ação já leva ao WhatsApp.
    if (!ctx.conversation) return null;

    const { summary, qualification, isStaleByMessages } = ctx;
    const hasAnalysis = !!summary && !!summary.analyzed_at;
    const analyzedAtLabel = summary?.analyzed_at
        ? formatDistanceToNow(new Date(summary.analyzed_at), { locale: ptBR, addSuffix: true })
        : null;
    const temperature = getQualificationTemperature(qualification);
    const objection = getQualificationObjection(qualification);
    // Chance de fechar: a do card; sem ela, o score da EVA.
    const score = getQualificationScore(qualification);
    const chance = Math.max(0, Math.min(100,
        Math.round(typeof probability === "number" ? probability : (typeof score === "number" ? score : 0))));
    const trend = temperature === "quente" ? "subindo" : temperature === "frio" ? "caindo" : temperature ? "estável" : null;
    const sabe = qualification?.info_coletada ?? [];
    const falta = [
        ...(qualification?.info_faltante ?? []),
        ...(objection ? [`Objeção: ${objection}`] : []),
    ];
    const proxima = qualification?.proxima_acao ? proximaAcaoLabel(qualification.proxima_acao) : null;

    return (
        <section className={`${CARD} p-4 sm:p-5`} aria-label="Leitura da EVA">
            <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <EvaBot size={20} still />
                    <p className={CARD_TITLE}>Leitura da EVA</p>
                </div>
                {hasAnalysis && (
                    <span className={`text-[11px] ${isStaleByMessages ? "text-[var(--vyz-warning)]" : "text-[var(--vyz-text-muted)]"}`}>
                        {isStaleByMessages ? "Pode estar desatualizada" : `Lida ${analyzedAtLabel}`}
                    </span>
                )}
            </div>

            {!hasAnalysis ? (
                <p className="text-[13px] text-[var(--vyz-text-muted)] leading-relaxed">
                    A EVA ainda não leu conversa suficiente para esta oportunidade.
                </p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-[minmax(150px,0.8fr)_1fr_1fr] gap-5 sm:gap-6">
                    <div>
                        <p className={EYEBROW}>Chance de fechar</p>
                        <p className="mt-1 text-[30px] font-semibold leading-none tabular-nums tracking-[-0.03em] text-[var(--vyz-text-primary)]">{chance}%</p>
                        <div
                            className="mt-2.5 h-1 rounded-full bg-[var(--ibx-sunken)] overflow-hidden"
                            role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={chance} aria-label="Chance de fechar"
                        >
                            <motion.div
                                className="h-full rounded-full bg-[var(--vyz-text-primary)]"
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: chance / 100 }}
                                style={{ transformOrigin: "left" }}
                                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                            />
                        </div>
                        {trend && <p className="mt-2 text-[12px] text-[var(--vyz-text-muted)]">Tendência {trend}</p>}
                    </div>

                    <div>
                        <p className={`${EYEBROW} mb-2`}>O que a EVA já sabe</p>
                        <ul className="space-y-1.5">
                            {sabe.length > 0 ? sabe.slice(0, 3).map((m, i) => (
                                <li key={i} className="flex gap-2 text-[12.5px] text-[var(--vyz-text-strong)] leading-snug">
                                    <Check className="h-3.5 w-3.5 mt-px shrink-0 text-[var(--vyz-success)]" strokeWidth={2.5} aria-hidden />
                                    <span>{m}</span>
                                </li>
                            )) : <li className="text-[12.5px] text-[var(--vyz-text-muted)]">Nada ainda.</li>}
                        </ul>
                    </div>

                    <div>
                        <p className={`${EYEBROW} mb-2`}>O que falta saber</p>
                        <ul className="space-y-1.5">
                            {falta.length > 0 ? falta.slice(0, 3).map((a, i) => (
                                <li key={i} className="flex gap-2 text-[12.5px] text-[var(--vyz-text-strong)] leading-snug">
                                    <CircleDashed className="h-3.5 w-3.5 mt-px shrink-0 text-[var(--vyz-warning)]" aria-hidden />
                                    <span>{a}</span>
                                </li>
                            )) : <li className="text-[12.5px] text-[var(--vyz-text-muted)]">Nada pendente.</li>}
                        </ul>
                    </div>
                </div>
            )}

            {(proxima || decisionHint) && (
                <div className="mt-4 pt-3.5 border-t border-[var(--ibx-line-soft)] space-y-2">
                    {proxima && (
                        <p className="text-[12.5px] text-[var(--vyz-text-muted)]">
                            Próxima sugestão da EVA: <span className="font-medium text-[var(--vyz-text-primary)]">{proxima}</span>
                        </p>
                    )}
                    {decisionHint && (
                        <p className="flex items-start gap-1.5 text-[12.5px] text-[var(--vyz-text-strong)] leading-snug">
                            <Users className="h-3.5 w-3.5 mt-px shrink-0 text-[var(--vyz-eva)]" aria-hidden />
                            {decisionHint}
                        </p>
                    )}
                </div>
            )}
            <p className="mt-3.5 text-[11px] text-[var(--vyz-text-muted)]">A EVA sugere e prioriza. Quem decide e aprova é o seu time.</p>
        </section>
    );
}
