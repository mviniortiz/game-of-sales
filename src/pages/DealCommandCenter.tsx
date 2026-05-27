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
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
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
    Shield,
    ShieldAlert,
    ShieldOff,
    Lightbulb,
    Send,
    Paperclip,
    FileText,
    Smile,
    CheckCircle2,
    Zap,
    Clock,
    Calendar,
    DollarSign,
    Target,
    TrendingUp,
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
    User,
    ExternalLink,
    Building2,
    Tag as TagIcon,
    Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import { syncWonDealToSale } from "@/utils/salesSync";

// Lazy: modais e widgets que só renderizam quando o user clica em algo específico
const InBrowserDialer = lazy(() => import("@/components/crm/InBrowserDialer"));
const LostDealModal = lazy(() => import("@/components/crm/LostDealModal").then((m) => ({ default: m.LostDealModal })));
const Confetti = lazy(() => import("@/components/crm/Confetti").then((m) => ({ default: m.Confetti })));
const NovaTarefaModal = lazy(() => import("@/components/crm/NovaTarefaModal").then((m) => ({ default: m.NovaTarefaModal })));
import { DealProducts } from "@/components/crm/DealProducts";
import { CustomFieldsSection } from "@/components/crm/CustomFieldsSection";
import { usePlan } from "@/hooks/usePlan";
// F6T.2 — tags transversais (sistema F6T.1)
import { useDealTagsSingle } from "@/hooks/useDealsTags";
import { getTagColorClass, isHexColor } from "@/lib/tags";
import type { Tag } from "@/types/tags";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { stageLabelFor } from "@/lib/demoPipeline";
import { DealDetailSkeleton } from "@/components/ui/skeletons";
import { DecisionMapCard, getDecisionMap } from "@/components/deals/DecisionMapCard";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// â"€â"€â"€ Constants â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

const PIPELINE_STAGES = [
    { id: "lead", label: "Lead", shortLabel: "L", color: "bg-slate-500", ring: "ring-slate-400" },
    { id: "qualification", label: "Qualificação", shortLabel: "Q", color: "bg-blue-500", ring: "ring-blue-400" },
    { id: "proposal", label: "Proposta", shortLabel: "P", color: "bg-violet-500", ring: "ring-violet-400" },
    { id: "negotiation", label: "Negociação", shortLabel: "N", color: "bg-amber-500", ring: "ring-amber-400" },
    { id: "closed_won", label: "Ganho", shortLabel: "✓", color: "bg-emerald-500", ring: "ring-emerald-400" },
];

const EVENT_ICONS: Record<string, { icon: typeof StickyNote; color: string; bg: string; title: string }> = {
    note:           { icon: StickyNote,    color: "text-[#7C3AED]", bg: "bg-[#7C3AED]/10", title: "Nota adicionada" },
    call:           { icon: PhoneCall,     color: "text-[#10B981]", bg: "bg-[#10B981]/10", title: "Ligação realizada" },
    message:        { icon: MessageSquare, color: "text-[#10B981]", bg: "bg-[#10B981]/10", title: "Mensagem no WhatsApp" },
    stage_change:   { icon: Rocket,        color: "text-[#1556C0]", bg: "bg-[#1556C0]/10", title: "Mudança de etapa" },
    email:          { icon: Mail,          color: "text-[#1556C0]", bg: "bg-[#1556C0]/10", title: "E-mail enviado" },
    task_completed: { icon: CheckCircle2,  color: "text-[#10B981]", bg: "bg-[#10B981]/10", title: "Ação concluída" },
};

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

const getHealthStatus = (days: number) => {
    if (days > 7) return { icon: ShieldOff, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", hex: "#F43F5E", label: "Crítico", subtitle: `${days}d sem contato` };
    if (days > 3) return { icon: ShieldAlert, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", hex: "#F59E0B", label: "Atenção", subtitle: `${days}d sem contato` };
    return { icon: Shield, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", hex: "#10B981", label: "Saudável", subtitle: "Engajamento ativo" };
};

// DEAL.UI.1 — gauge tipo velocímetro (arco semicircular 180°). SVG inline.
const ProbabilityGauge = ({ value, hex }: { value: number; hex: string }) => {
    const v = Math.max(0, Math.min(100, Math.round(value)));
    const r = 30;
    const cx = 40;
    const cy = 38;
    const arcLen = Math.PI * r; // semicírculo
    const offset = arcLen * (1 - v / 100);
    const d = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
    return (
        <div className="relative w-[80px] h-[46px] flex items-end justify-center shrink-0">
            <svg viewBox="0 0 80 44" className="w-[80px] h-[44px] absolute top-0 left-0">
                <path d={d} fill="none" stroke="#E5E7EB" strokeWidth="6" strokeLinecap="round" />
                <motion.path
                    d={d} fill="none" stroke={hex} strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={arcLen}
                    initial={{ strokeDashoffset: arcLen }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                />
            </svg>
            <span className="relative z-10 text-[13px] font-bold text-[#0B1220] tabular-nums leading-none">{v}%</span>
        </div>
    );
};

const formatCurrency = (value: number) => {
    if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
};

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

const formatPhone = (phone?: string | null) => {
    if (!phone) return "Sem telefone";
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 13 && digits.startsWith("55")) {
        return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
    }
    if (digits.length === 11) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    return phone;
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

/** Linear-style stage chips */
const StageChips = ({ currentStage, onStageChange, companyId }: { currentStage: string; onStageChange: (id: string) => void; companyId?: string | null }) => {
    const idx = PIPELINE_STAGES.findIndex(s => s.id === currentStage);
    return (
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {PIPELINE_STAGES.map((stage, i) => {
                const done = i < idx;
                const active = i === idx;
                return (
                    <button
                        key={stage.id}
                        onClick={() => onStageChange(stage.id)}
                        className={`
                            flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium
                            transition-colors whitespace-nowrap
                            ${active ? "bg-foreground/10 text-foreground ring-1 ring-border" : ""}
                            ${done ? "text-emerald-400 hover:text-emerald-300" : ""}
                            ${!done && !active ? "text-muted-foreground hover:text-foreground" : ""}
                        `}
                    >
                        {done
                            ? <CheckCircle2 className="h-3 w-3" />
                            : <span className={`w-1.5 h-1.5 rounded-full ${active ? stage.color : "bg-muted-foreground/40"}`} />
                        }
                        <span>{stageLabelFor(companyId, stage.id, stage.label)}</span>
                    </button>
                );
            })}
        </div>
    );
};

/** Clean timeline entry — vertical rail with small dot, no card wrapper */
const TimelineEntry = ({ event, isLast }: { event: any; isLast: boolean }) => {
    const cfg = EVENT_ICONS[event.type] || EVENT_ICONS.note;
    const Icon = cfg.icon;
    const isMessage = event.type === "message";
    const title = event.title || cfg.title;
    return (
        <div className="flex gap-3 group">
            <div className="flex flex-col items-center pt-0.5">
                <div className={`w-7 h-7 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                    {isMessage
                        ? <WhatsAppIcon className={`h-3.5 w-3.5 ${cfg.color}`} />
                        : <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />}
                </div>
                {!isLast && <div className="w-px flex-1 bg-[#E5E7EB] mt-1.5 min-h-[20px]" />}
            </div>
            <div className={`flex-1 min-w-0 ${isLast ? "pb-0" : "pb-5"}`}>
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#0B1220] leading-tight">{title}</p>
                        {event.content && (
                            <p className="text-[12.5px] text-slate-500 leading-relaxed break-words mt-0.5">{event.content}</p>
                        )}
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-[11px] text-slate-500 tabular-nums whitespace-nowrap">{safeFormatDate(event.created_at, "dd MMM, HH:mm")}</p>
                        {event.user_name && <p className="text-[11px] text-slate-400 whitespace-nowrap">{event.user_name}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Ações recomendadas: a EVA sugere (proxima_acao da análise); o time executa,
// edita ou conclui. Origem fica explícita no card.
const PROXIMA_ACAO_LABELS: Record<string, string> = {
    responder: "Responder agora",
    qualificar: "Coletar mais informação",
    criar_oportunidade: "Criar oportunidade no pipeline",
    marcar_demo: "Marcar demo",
    handoff_humano: "Passar pra um humano",
    aguardar: "Aguardar resposta",
};

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

/** Focus card — próxima ação recomendada pela EVA; o time executa e, ao
    concluir, registra o RESULTADO, que define o próximo passo sugerido. */
const FocusCard = ({ action, onComplete, onExecute }: {
    action: NextAction;
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
        if (diff < 0) return { label: "Atrasado", cls: "bg-rose-50 text-rose-600 border-rose-200" };
        if (diff === 0) return { label: "Hoje", cls: "bg-[#1556C0]/10 text-[#1556C0] border-[#1556C0]/20" };
        if (diff === 1) return { label: "Amanhã", cls: "bg-amber-50 text-amber-700 border-amber-200" };
        return { label: safeFormatDate(action.dueDate, "dd MMM"), cls: "bg-slate-100 text-slate-600 border-slate-200" };
    })();

    return (
        <div className={`rounded-2xl border shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors ${done ? "bg-[#10B981]/5 border-[#10B981]/30" : "bg-white border-[#E5E7EB]"}`}>
            <div className="flex items-center gap-3 px-4 py-3.5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 ${isEva ? "bg-[#7C3AED]/10" : "bg-[#1556C0]/10"}`}>
                    {isEva
                        ? <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#7C3AED] text-white text-[9px] font-bold leading-none">E</span>
                        : <Calendar className="h-5 w-5 text-[#1556C0]" />}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-[11px] font-semibold text-slate-500">Próxima ação</p>
                        <span className={`inline-flex items-center px-1.5 py-px rounded text-[10px] font-semibold ${isEva ? "bg-[#7C3AED]/10 text-[#7C3AED]" : "bg-slate-100 text-slate-500"}`}>
                            {isEva ? "Sugerida pela EVA" : "Tarefa do time"}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-[14px] font-semibold truncate ${done ? "line-through text-slate-400" : "text-[#0B1220]"}`}>
                            {action.title}
                        </p>
                        {dueChip && !done && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${dueChip.cls}`}>
                                {dueChip.label}
                            </span>
                        )}
                    </div>
                </div>
                {!done ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {onExecute && action.canWhatsApp && !picking && (
                            <button
                                onClick={onExecute}
                                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold bg-[#1556C0] text-white hover:brightness-110 transition"
                                title={action.suggestedReply ? "Abre o WhatsApp com a resposta sugerida pela EVA" : "Abrir conversa no WhatsApp"}
                            >
                                <WhatsAppIcon className="h-3.5 w-3.5" />
                                Responder
                            </button>
                        )}
                        <button
                            onClick={() => setPicking((v) => !v)}
                            className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold border transition-colors ${picking ? "bg-slate-100 border-[#E5E7EB] text-slate-600" : "bg-white border-[#E5E7EB] text-[#0B1220] hover:bg-slate-50"}`}
                        >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {picking ? "Cancelar" : "Concluir"}
                        </button>
                    </div>
                ) : (
                    <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold bg-[#10B981] text-white flex-shrink-0">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Concluída
                    </span>
                )}
            </div>

            {/* Seletor de resultado: define o próximo passo sugerido */}
            {picking && !done && (
                <div className="px-4 pb-3.5 border-t border-[#F1F5F9]">
                    <p className="text-[11px] font-semibold text-slate-500 mb-2 mt-2.5">O que rolou? Isso define o próximo passo.</p>
                    <div className="flex flex-wrap gap-1.5">
                        {ACTION_RESULTS.map((r) => (
                            <button
                                key={r.key}
                                onClick={() => pick(r.key)}
                                className="inline-flex items-center px-2.5 py-1 rounded-lg text-[12px] font-medium border border-[#E5E7EB] bg-white text-[#0B1220] hover:bg-slate-50 hover:border-slate-300 transition-colors"
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

/** Collapsible property accordion section */
const PropertiesSection = ({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-border last:border-0">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between py-3 text-left group"
            >
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest group-hover:text-foreground transition-colors">
                    {title}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`} />
            </button>
            {open && <div className="pb-4 space-y-2.5">{children}</div>}
        </div>
    );
};

/** Property row: label on left, value on right */
const PropertyRow = ({ label, icon: Icon, children }: { label: string; icon?: typeof Phone; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-3 text-sm min-h-[24px]">
        <span className="text-muted-foreground flex items-center gap-1.5 flex-shrink-0">
            {Icon && <Icon className="h-3.5 w-3.5" />}
            <span className="text-xs">{label}</span>
        </span>
        <div className="text-foreground text-right min-w-0 truncate text-[13px]">{children}</div>
    </div>
);

// DEAL.UI.1 — linha label/valor premium light para os cards da sidebar.
const SidebarRow = ({ label, value, strong = false }: { label: string; value: React.ReactNode; strong?: boolean }) => (
    <div className="flex items-start justify-between gap-3">
        <span className="text-[12px] text-slate-500 shrink-0">{label}</span>
        <span className={`text-[12.5px] text-right min-w-0 truncate ${strong ? "font-semibold text-[#0B1220]" : "font-medium text-[#0B1220]"}`}>{value}</span>
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

    const { data: deal, isLoading } = useQuery({
        queryKey: ["deal", id],
        queryFn: async () => {
            const { data, error } = await supabase.from("deals").select("*").eq("id", id).single();
            if (error) throw error;
            return data;
        },
        enabled: !!id,
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
                        .eq("conversation_id", conv.id).order("message_timestamp", { ascending: false }).limit(6);
                    msgEvents = (msgs || []).map((m: any) => ({
                        id: "msg-" + m.id,
                        type: "message",
                        title: m.direction === "outbound" ? "Resposta enviada no WhatsApp" : "Mensagem recebida no WhatsApp",
                        content: m.body || (m.media_ref?.caption) || "[mídia]",
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
            toast.success("Deal atualizado!");
        },
        onError: () => toast.error("Erro ao atualizar deal"),
    });

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
                throw new Error("Ligações exigem add-on ativo (Plus/Pro)");
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
                throw new Error("Ligações exigem add-on ativo (Plus/Pro)");
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

    const daysSince = deal?.updated_at
        ? Math.floor((Date.now() - new Date(deal.updated_at).getTime()) / 86_400_000) : 0;
    const health = getHealthStatus(daysSince);
    const HealthIcon = health.icon;

    // Próxima ação recomendada pela EVA (proxima_acao da análise da conversa).
    // Fallback: ação registrada no deal (imobiliário) e depois genérica.
    // useDealContextData compartilha cache com o bloco de contexto (sem fetch duplo).
    const dealCtx = useDealContextData(id, (deal as any)?.company_id);
    const evaProxAcao = dealCtx.qualification?.proxima_acao;
    const evaSuggestedReply = dealCtx.qualification?.resposta_sugerida ?? null;
    const realEstateNextAction = getRealEstateInterest((deal as any)?.source_data)?.proxima_acao;
    const inOneDay = new Date(Date.now() + 86_400_000).toISOString();
    // Próximo passo definido pela última conclusão+resultado (prioridade máxima).
    const persistedNext = (deal as any)?.source_data?.next_action;
    const hasPersistedNext = persistedNext && typeof persistedNext.title === "string" && persistedNext.title.trim();
    const nextAction: NextAction = hasPersistedNext
        ? { title: persistedNext.title, source: "eva", dueDate: inOneDay, canWhatsApp: !!(deal as any)?.customer_phone }
        : evaProxAcao
            ? {
                  title: PROXIMA_ACAO_LABELS[evaProxAcao] ?? evaProxAcao,
                  source: "eva",
                  dueDate: inOneDay,
                  suggestedReply: evaSuggestedReply,
                  canWhatsApp: !!(deal as any)?.customer_phone,
              }
            : (typeof realEstateNextAction === "string" && realEstateNextAction.trim())
                ? { title: realEstateNextAction, source: "deal", dueDate: inOneDay, canWhatsApp: !!(deal as any)?.customer_phone }
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
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] gap-4 bg-background">
                <AlertTriangle className="h-12 w-12 text-amber-500" />
                <p className="text-muted-foreground">Deal não encontrado</p>
                <Button onClick={() => navigate("/crm")} variant="outline">Voltar ao Pipeline</Button>
            </div>
        );
    }

    // â"€â"€ Render â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

    return (
        <>
            <div className="min-h-[calc(100vh-64px)] bg-[#F8FAFC]">
                {showConfetti && (
                    <Suspense fallback={null}>
                        <Confetti show={showConfetti} />
                    </Suspense>
                )}

                {/* â"€â"€ HEADER â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
                <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
                    <div className="max-w-[1400px] mx-auto px-4 sm:px-6">

                        {/* Breadcrumb row */}
                        <div className="flex items-center gap-1.5 pt-3 text-[11px] text-muted-foreground">
                            <button
                                onClick={() => navigate("/crm")}
                                className="flex items-center gap-1 hover:text-foreground transition-colors"
                            >
                                <ArrowLeft className="h-3 w-3" />
                                Pipeline
                            </button>
                            <ChevronRight className="h-3 w-3" />
                            <span className="text-foreground/70 truncate">{deal.customer_name}</span>
                        </div>

                        {/* Main header row */}
                        <div className="flex items-start justify-between gap-4 py-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <Avatar className="h-10 w-10 ring-1 ring-border flex-shrink-0">
                                    <AvatarFallback className="bg-gradient-to-br from-[#1556C0] to-[#2E78E0] text-white font-bold text-xs">
                                        {deal.customer_name?.substring(0, 2).toUpperCase() || "?"}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="min-w-0 flex-1">
                                    <h1 className="text-base sm:text-lg font-semibold text-foreground truncate leading-tight tracking-tight">
                                        {deal.title}
                                    </h1>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs text-muted-foreground truncate">{deal.customer_name}</span>
                                        {deal.customer_email && (
                                            <>
                                                <span className="text-muted-foreground/40 text-xs">·</span>
                                                <span className="text-xs text-muted-foreground truncate hidden sm:inline">{deal.customer_email}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 flex-shrink-0">
                                {/* Value */}
                                <div className="text-right hidden sm:block">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Valor</p>
                                    <p className="text-lg font-semibold text-emerald-400 tabular-nums leading-tight">
                                        {formatCurrency(deal.value || 0)}
                                    </p>
                                </div>

                                {/* CTA buttons */}
                                {deal.stage !== "closed_won" && deal.stage !== "closed_lost" && (
                                    <div className="flex gap-1.5">
                                        <Button size="sm"
                                            className="bg-emerald-500 hover:bg-emerald-400 text-white font-medium h-8 px-3 gap-1.5"
                                            onClick={async () => {
                                                await updateDeal.mutateAsync({ stage: "closed_won", probability: 100 });
                                                setShowConfetti(true);
                                                setTimeout(() => setShowConfetti(false), 3000);
                                            }}
                                            disabled={updateDeal.isPending}
                                        >
                                            <Trophy className="h-3.5 w-3.5" />
                                            <span className="hidden sm:inline">Ganho</span>
                                        </Button>
                                        <Button size="sm" variant="outline"
                                            className="border-border text-muted-foreground hover:text-rose-400 hover:border-rose-500/40 h-8 px-3 gap-1.5"
                                            onClick={() => setShowLostModal(true)}
                                            disabled={updateDeal.isPending}
                                        >
                                            <XCircle className="h-3.5 w-3.5" />
                                            <span className="hidden sm:inline">Perdido</span>
                                        </Button>
                                    </div>
                                )}

                                {/* Closed badges */}
                                {deal.stage === "closed_won" && (
                                    <div className="flex items-center gap-1.5 bg-emerald-500/15 text-emerald-400 px-3 py-1.5 rounded-md text-xs font-medium ring-1 ring-emerald-500/25">
                                        <Trophy className="h-3.5 w-3.5" /> Ganho
                                    </div>
                                )}
                                {deal.stage === "closed_lost" && (
                                    <div className="flex items-center gap-1.5 bg-rose-500/15 text-rose-400 px-3 py-1.5 rounded-md text-xs font-medium ring-1 ring-rose-500/25">
                                        <XCircle className="h-3.5 w-3.5" /> Perdido
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Stage chips row */}
                        <div className="pb-3">
                            <StageChips
                                currentStage={deal.stage || "lead"}
                                companyId={deal.company_id}
                                onStageChange={(s) => {
                                    if (s === "closed_lost") { setShowLostModal(true); return; }
                                    updateDeal.mutate({ stage: s });
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* â"€â"€ MAIN GRID â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5">
                    <div className="grid grid-cols-12 gap-4 sm:gap-6">

                        {/* â"€â"€ LEFT MAIN (activity) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
                        <div className="col-span-12 lg:col-span-8 space-y-4 min-w-0 order-2 lg:order-1">

                            {/* Focus / next action */}
                            <FocusCard
                                key={nextAction.title}
                                action={nextAction}
                                onComplete={async (resultKey) => {
                                    const r = ACTION_RESULTS.find((x) => x.key === resultKey);
                                    const resultLabel = r?.label ?? resultKey;
                                    const nextTitle = r?.next ?? "Definir o próximo passo com o lead";
                                    setShowConfetti(true);
                                    setTimeout(() => setShowConfetti(false), 2000);
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
                                    const raw = ((deal as any)?.customer_phone || "").replace(/\D/g, "");
                                    if (!raw) { toast.error("Sem telefone de WhatsApp neste deal"); return; }
                                    const wa = raw.startsWith("55") ? raw : "55" + raw;
                                    const text = nextAction.suggestedReply ? `?text=${encodeURIComponent(nextAction.suggestedReply)}` : "";
                                    window.open(`https://wa.me/${wa}${text}`, "_blank", "noopener,noreferrer");
                                }}
                            />

                            {/* Activity panel */}
                            <div className="bg-card/50 rounded-2xl border border-border overflow-hidden">

                                {/* Tab bar - text-only, underline on active */}
                                <div className="flex items-center gap-0 border-b border-border px-3 overflow-x-auto scrollbar-none">
                                    {TABS.map((tab) => {
                                        const active = activeTab === tab.id;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`
                                                    relative flex items-center gap-1.5 px-3 py-3 text-[13px] font-medium transition-colors whitespace-nowrap shrink-0
                                                    ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}
                                                `}
                                            >
                                                <span>{tab.label}</span>
                                                {tab.locked && <Lock className="h-3 w-3 text-amber-400" />}
                                                {active && (
                                                    <motion.div
                                                        layoutId="tab-underline"
                                                        className="absolute left-0 right-0 -bottom-px h-[2px] bg-emerald-500"
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
                                                <div className="px-5 py-5 min-h-[300px]">
                                                    {timeline.length === 0 ? (
                                                        <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
                                                            <StickyNote className="h-8 w-8 mb-3 opacity-40" />
                                                            <p className="text-sm font-medium text-muted-foreground">Nenhuma atividade ainda</p>
                                                            <p className="text-xs mt-1">Adicione a primeira nota abaixo</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-0">
                                                            {timeline.map((ev: any, i: number) => (
                                                                <TimelineEntry key={ev.id} event={ev} isLast={i === timeline.length - 1} />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Composer - sticky to bottom of panel */}
                                                <div className="sticky bottom-0 p-3 border-t border-border bg-card/95 backdrop-blur-sm">
                                                    <div className="flex items-center gap-2 bg-background/60 rounded-xl px-3 py-2 ring-1 ring-border focus-within:ring-emerald-500/40 transition-all">
                                                        <Input
                                                            value={newNote}
                                                            onChange={(e) => setNewNote(e.target.value)}
                                                            placeholder="Adicionar nota ou @mencionar..."
                                                            className="flex-1 bg-transparent border-0 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
                                                            onKeyDown={(e) => { if (e.key === "Enter" && newNote.trim()) addNote.mutate(newNote.trim()); }}
                                                        />
                                                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground h-7 w-7 p-0">
                                                            <Smile className="h-4 w-4" />
                                                        </Button>
                                                        <Button size="sm"
                                                            onClick={() => newNote.trim() && addNote.mutate(newNote.trim())}
                                                            disabled={!newNote.trim() || addNote.isPending}
                                                            className="bg-emerald-500 hover:bg-emerald-400 text-white h-7 w-7 p-0 rounded-lg"
                                                        >
                                                            {addNote.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
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
                                                        {canUseCalls ? "Nova ligação" : (hasCallsPlanAccess ? "Ativar add-on" : "Plus/Pro")}
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
                                                                    {hasCallsPlanAccess ? "Ative o add-on Ligações" : "Ligações disponível no Plus e Pro"}
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
                                                                            Faça upgrade para o Plus ou Pro e depois ative o add-on de Ligações.
                                                                        </>
                                                                    )}
                                                                </p>
                                                                <div className="mt-3">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="border-amber-500/30 text-amber-200 hover:text-white hover:bg-amber-500/10"
                                                                        onClick={() => navigate("/planos")}
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
                                                    <Zap className="h-4 w-4" /> Nova Tarefa
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
                                            <div className="p-5">
                                                {deal?.company_id ? (
                                                    <DealProducts
                                                        dealId={id!}
                                                        companyId={deal.company_id}
                                                        deal={{ id: deal.id, title: deal.title, customer_name: deal.customer_name, customer_email: deal.customer_email, customer_phone: deal.customer_phone }}
                                                    />
                                                ) : (
                                                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                                                        <Loader2 className="h-6 w-6 animate-spin" />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* Deal observations */}
                            {deal.notes && (
                                <div className="bg-card/40 rounded-2xl p-4 border border-border">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Observações</p>
                                    <p className="text-sm text-foreground leading-relaxed">{deal.notes}</p>
                                </div>
                            )}

                            {/* F5P.1 — Contexto da conversa + Leitura EVA persistida */}
                            <DealConversationContextBlock
                                dealId={deal.id}
                                companyId={deal.company_id}
                                probability={deal.probability ?? null}
                                decisionHint={getDecisionMap((deal as any).source_data).some((p) => p.papel === "Decisor financeiro" && (p.origem || "").toLowerCase().includes("mencionad"))
                                    ? "A EVA identificou possível decisor financeiro mencionado na conversa. Revise antes de adicionar ao mapa de decisão."
                                    : null}
                                onOpenConversation={(href) => navigate(href)}
                            />
                        </div>

                        {/* â"€â"€ RIGHT SIDEBAR (properties) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
                        <div className="col-span-12 lg:col-span-4 order-1 lg:order-2 min-w-0">
                            <div className="lg:sticky lg:top-[148px] space-y-4">

                                {/* Quick actions */}
                                <TooltipProvider delayDuration={80}>
                                    <div className="grid grid-cols-4 gap-2">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button
                                                    onClick={() => setShowCallModal(true)}
                                                    disabled={!canUseCalls}
                                                    className="flex flex-col items-center justify-center gap-1 h-14 rounded-xl bg-white border border-[#E5E7EB] hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    <Phone className="h-4 w-4 text-emerald-400" />
                                                    <span className="text-[10px] font-medium text-muted-foreground">Ligar</span>
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" className="bg-card text-foreground text-xs border border-border">
                                                {canUseCalls ? "Iniciar chamada" : (hasCallsPlanAccess ? "Ativar add-on" : "Upgrade Plus/Pro")}
                                            </TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button
                                                    onClick={() => deal.customer_phone && window.open(`https://wa.me/${deal.customer_phone.replace(/\D/g, "")}`, "_blank")}
                                                    disabled={!deal.customer_phone}
                                                    className="flex flex-col items-center justify-center gap-1 h-14 rounded-xl bg-white border border-[#E5E7EB] hover:border-green-500/40 hover:bg-green-500/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
                                                    <span className="text-[10px] font-medium text-muted-foreground">WhatsApp</span>
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" className="bg-card text-foreground text-xs border border-border">WhatsApp</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button
                                                    onClick={() => deal.customer_email && window.open(`mailto:${deal.customer_email}`, "_blank")}
                                                    disabled={!deal.customer_email}
                                                    className="flex flex-col items-center justify-center gap-1 h-14 rounded-xl bg-white border border-[#E5E7EB] hover:border-blue-500/40 hover:bg-blue-500/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    <Mail className="h-4 w-4 text-blue-400" />
                                                    <span className="text-[10px] font-medium text-muted-foreground">Email</span>
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" className="bg-card text-foreground text-xs border border-border">Enviar email</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button
                                                    onClick={() => setShowTaskModal(true)}
                                                    className="flex flex-col items-center justify-center gap-1 h-14 rounded-xl bg-white border border-[#E5E7EB] hover:border-violet-500/40 hover:bg-violet-500/5 transition-colors"
                                                >
                                                    <Plus className="h-4 w-4 text-violet-400" />
                                                    <span className="text-[10px] font-medium text-muted-foreground">Tarefa</span>
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" className="bg-card text-foreground text-xs border border-border">Nova tarefa</TooltipContent>
                                        </Tooltip>
                                    </div>
                                </TooltipProvider>

                                {/* A) Status e saúde */}
                                <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                                    <div className="flex items-center gap-2 mb-3">
                                        <TrendingUp className="h-4 w-4 text-slate-400" />
                                        <p className="text-[13px] font-semibold text-[#0B1220]">Status e saúde</p>
                                    </div>
                                    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${health.bg} ${health.border}`}>
                                        <HealthIcon className={`h-4 w-4 ${health.color} flex-shrink-0`} />
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-[13px] font-semibold ${health.color} leading-tight`}>{health.label}</p>
                                            <p className="text-[11px] text-slate-500 leading-tight">{health.subtitle}</p>
                                        </div>
                                        <div className="flex flex-col items-center shrink-0">
                                            <ProbabilityGauge value={deal.probability ?? 0} hex={health.hex} />
                                            <p className="text-[10px] text-slate-500 mt-1">Probabilidade</p>
                                        </div>
                                    </div>
                                </div>

                                {/* B) Contato */}
                                <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                                    <div className="flex items-center gap-2 mb-3">
                                        <User className="h-4 w-4 text-slate-400" />
                                        <p className="text-[13px] font-semibold text-[#0B1220]">Contato</p>
                                    </div>
                                    <div className="space-y-2.5">
                                        <SidebarRow label="Nome" value={deal.customer_name || "—"} />
                                        <SidebarRow label="Telefone" value={deal.customer_phone
                                            ? <span className="inline-flex items-center gap-1.5 justify-end">{formatPhone(deal.customer_phone)}<WhatsAppIcon className="h-3.5 w-3.5 text-[#25D366] shrink-0" /></span>
                                            : "—"} />
                                        <SidebarRow label="E-mail" value={deal.customer_email
                                            ? <a href={`mailto:${deal.customer_email}`} className="text-[#1556C0] hover:underline">{deal.customer_email}</a>
                                            : "—"} />
                                        <SidebarRow label="Origem" value={(deal as any).lead_source || (deal as any).source || "—"} />
                                        <SidebarRow label="Último contato" value={deal.updated_at ? safeFormatDistance(deal.updated_at) : "—"} />
                                    </div>
                                </div>

                                {/* C) Dados do negócio */}
                                <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Building2 className="h-4 w-4 text-slate-400" />
                                        <p className="text-[13px] font-semibold text-[#0B1220]">Dados do negócio</p>
                                    </div>
                                    {getRealEstateInterest((deal as any).source_data) ? (
                                        <div className="space-y-2.5">
                                            <RealEstateInterestBlock sourceData={(deal as any).source_data} />
                                            <div className="pt-2.5 border-t border-[#F1F5F9]">
                                                <SidebarRow label="Valor da proposta" value={formatCurrency(deal.value || 0)} strong />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2.5">
                                            <SidebarRow label="Valor da proposta" value={formatCurrency(deal.value || 0)} strong />
                                            <SidebarRow label="Fonte" value={(deal as any).source || "Manual"} />
                                            <SidebarRow label="Criado" value={safeFormatDate(deal.created_at, "dd MMM yyyy")} />
                                            <SidebarRow label="Atualizado" value={safeFormatDistance(deal.updated_at)} />
                                        </div>
                                    )}
                                </div>

                                {/* C.2) Mapa de decisão — editável em qualquer deal; EVA sugere da conversa */}
                                <DecisionMapCard dealId={id!} companyId={(deal as any).company_id ?? null} sourceData={(deal as any).source_data} />

                                {/* D) Tags */}
                                <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                                    <div className="flex items-center gap-2 mb-3">
                                        <TagIcon className="h-4 w-4 text-slate-400" />
                                        <p className="text-[13px] font-semibold text-[#0B1220]">Tags</p>
                                    </div>
                                    <DealTagsBlock dealId={id!} />
                                </div>

                                {/* E) Campos customizados */}
                                <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                                    <PropertiesSection title="Campos customizados" defaultOpen={false}>
                                        <CustomFieldsSection dealId={id!} compact />
                                    </PropertiesSection>
                                </div>
                            </div>
                        </div>
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
                                await updateDeal.mutateAsync({ stage: "closed_lost", loss_reason: reason, probability: 0 });
                                setShowLostModal(false);
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
            </div>
        </>
    );
}

// ─── F5P.1 — Contexto da conversa + Leitura EVA persistida ──────────────────

function DealConversationContextBlock({
    dealId,
    companyId,
    probability,
    decisionHint,
    onOpenConversation,
}: {
    dealId: string;
    companyId: string | null;
    probability: number | null;
    decisionHint?: string | null;
    onOpenConversation: (href: string) => void;
}) {
    const ctx = useDealContextData(dealId, companyId);

    // Loading inicial — skeleton compacto
    if (ctx.loading) {
        return (
            <div className="bg-white rounded-2xl p-4 border border-[#E5E7EB] shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-2">
                <div className="h-3 w-32 rounded bg-slate-200/70" />
                <div className="h-4 w-full rounded bg-slate-100" />
                <div className="h-4 w-3/4 rounded bg-slate-100" />
            </div>
        );
    }

    // Sem conversa vinculada → empty state mas ainda exibe estrutura
    if (!ctx.conversation) {
        return (
            <div className="bg-white rounded-2xl p-4 border border-[#E5E7EB] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">
                    Contexto da conversa
                </p>
                <p className="text-sm text-slate-500 leading-relaxed">
                    Nenhuma conversa vinculada a esta oportunidade.
                </p>
            </div>
        );
    }

    const { conversation, contact, lastMessages, summary, qualification, isStaleByMessages, relatedGaps, openConversationHref } = ctx;

    const lastInteractionLabel = conversation.last_message_at
        ? formatDistanceToNow(new Date(conversation.last_message_at), { locale: ptBR, addSuffix: true })
        : "—";

    const temperature = getQualificationTemperature(qualification);
    const objection   = getQualificationObjection(qualification);

    const hasAnalysis = !!summary && !!summary.analyzed_at;
    const analyzedAtLabel = summary?.analyzed_at
        ? formatDistanceToNow(new Date(summary.analyzed_at), { locale: ptBR, addSuffix: true })
        : null;

    // Probabilidade de ganho: usa a do deal; cai pro score da EVA se ausente.
    const score = getQualificationScore(qualification);
    const probScore = Math.max(0, Math.min(100,
        Math.round(typeof probability === "number" ? probability : (typeof score === "number" ? score : 0))));
    // Tendência derivada da temperatura da EVA (sem inventar campo novo).
    const trend = temperature === "quente" ? "Subindo"
        : temperature === "frio" ? "Em queda"
        : temperature ? "Estável" : null;
    // Motivos = o que a EVA já coletou; Atenções = o que falta + objeção.
    const motivos = qualification?.info_coletada ?? [];
    const atencoes = [
        ...(qualification?.info_faltante ?? []),
        ...(objection ? [`Objeção: ${objection}`] : []),
    ];

    return (
        <div className="space-y-4">
            {/* ── Contexto da conversa (mini-chat) ─────────────────────── */}
            <div className="bg-white rounded-2xl p-4 border border-[#E5E7EB] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
                        <p className="text-[13px] font-semibold text-[#0B1220]">Contexto da conversa</p>
                    </div>
                    {openConversationHref && (
                        <button
                            type="button"
                            onClick={() => onOpenConversation(openConversationHref)}
                            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#10B981] hover:underline"
                        >
                            Abrir no WhatsApp
                            <ExternalLink className="h-3 w-3" />
                        </button>
                    )}
                </div>

                {/* aba canal */}
                <div className="mb-3 border-b border-[#F1F5F9]">
                    <span className="inline-flex items-center gap-1.5 pb-2 -mb-px text-[12px] font-medium text-[#0F8A63] border-b-2 border-[#10B981]">
                        <WhatsAppIcon className="h-3.5 w-3.5 text-[#25D366]" /> WhatsApp
                    </span>
                </div>

                {lastMessages.length > 0 ? (
                    <div className="space-y-2">
                        {lastMessages.map((m) => {
                            const text = m.body || m.media_caption || `[${m.message_type}]`;
                            const out = m.direction === "outbound";
                            const time = safeFormatDate(m.message_timestamp, "HH:mm");
                            return (
                                <div key={m.id} className={`flex ${out ? "justify-end" : "justify-start"}`}>
                                    <div
                                        className={`max-w-[82%] rounded-2xl px-3 py-2 text-[12.5px] leading-snug ${
                                            out
                                                ? "bg-[#E7F9EF] text-[#0B1220] rounded-br-sm"
                                                : "bg-[#F1F5F9] text-[#0B1220] rounded-bl-sm"
                                        }`}
                                    >
                                        <p>{text}</p>
                                        <p className="text-[10px] text-slate-400 text-right mt-0.5 tabular-nums">{time}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-sm text-slate-500">Sem mensagens recentes nesta conversa.</p>
                )}

                {openConversationHref && (
                    <button
                        type="button"
                        onClick={() => onOpenConversation(openConversationHref)}
                        className="w-full text-center text-[12px] font-medium text-[#1556C0] hover:underline mt-3 pt-3 border-t border-[#F1F5F9]"
                    >
                        Ver todas as mensagens
                    </button>
                )}
            </div>

            {/* ── Leitura da EVA (3 colunas) ──────────────────────────── */}
            <div className="bg-[#FAF5FF] rounded-2xl p-4 border border-[#E9D5FF] shadow-[0_1px_2px_rgba(124,58,237,0.05)]">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#7C3AED] text-white text-[8px] font-bold leading-none">E</span>
                        <p className="text-[13px] font-semibold text-[#7C3AED]">Leitura da EVA</p>
                    </div>
                    {hasAnalysis && (
                        <span className="text-[11px] text-slate-400">
                            {isStaleByMessages ? "Pode estar desatualizada" : `Análise atualizada ${analyzedAtLabel}`}
                        </span>
                    )}
                </div>

                {!hasAnalysis ? (
                    <p className="text-sm text-slate-500 leading-relaxed">
                        A EVA ainda não analisou conversas suficientes para esta oportunidade.
                    </p>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Probabilidade */}
                            <div>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-[28px] font-bold text-[#0B1220] leading-none tabular-nums">{probScore}%</span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1">Probabilidade de ganho</p>
                                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mt-2">
                                    <motion.div
                                        className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#A78BFA]"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${probScore}%` }}
                                        transition={{ duration: 0.8, ease: "easeOut" }}
                                    />
                                </div>
                                {trend && (
                                    <p className="text-[11px] text-slate-500 mt-2">
                                        Tendência: <span className="font-medium text-[#0B1220]">{trend}</span>
                                    </p>
                                )}
                            </div>

                            {/* Principais motivos */}
                            <div>
                                <p className="text-[12px] font-semibold text-[#0B1220] mb-1.5">Principais motivos</p>
                                <ul className="space-y-1">
                                    {motivos.length > 0 ? motivos.slice(0, 3).map((m, i) => (
                                        <li key={i} className="flex gap-1.5 text-[12px] text-slate-600 leading-snug">
                                            <span className="text-[#10B981] mt-px">•</span>
                                            <span>{m}</span>
                                        </li>
                                    )) : <li className="text-[12px] text-slate-400">—</li>}
                                </ul>
                            </div>

                            {/* Atenções */}
                            <div>
                                <p className="text-[12px] font-semibold text-[#0B1220] mb-1.5 flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3 text-amber-500" /> Atenções
                                </p>
                                <ul className="space-y-1">
                                    {atencoes.length > 0 ? atencoes.slice(0, 3).map((a, i) => (
                                        <li key={i} className="flex gap-1.5 text-[12px] text-slate-600 leading-snug">
                                            <span className="text-amber-500 mt-px">•</span>
                                            <span>{a}</span>
                                        </li>
                                    )) : <li className="text-[12px] text-slate-400">—</li>}
                                </ul>
                            </div>
                        </div>

                        {qualification?.proxima_acao && (
                            <div className="mt-3 pt-3 border-t border-[#E9D5FF]">
                                <p className="text-[11px] text-slate-500">
                                    Próxima sugestão da EVA: <span className="text-[#0B1220] font-medium">{qualification.proxima_acao}</span>
                                </p>
                            </div>
                        )}
                    </>
                )}
                {decisionHint && (
                    <div className="mt-3 pt-3 border-t border-[#E9D5FF] flex items-start gap-1.5">
                        <Users className="h-3.5 w-3.5 text-[#7C3AED] mt-px shrink-0" />
                        <p className="text-[11.5px] text-[#0B1220] leading-snug">{decisionHint}</p>
                    </div>
                )}
                <p className="text-[10px] text-[#7C3AED]/70 mt-3 pt-3 border-t border-[#E9D5FF] leading-relaxed">
                    A EVA é assistida: ela sugere e prioriza. Seu time decide e aprova.
                </p>
            </div>
        </div>
    );
}
