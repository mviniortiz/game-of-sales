import { useEffect, useState, useRef, useCallback } from "react";
import { logger } from "@/utils/logger";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
    Sparkles,
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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import InBrowserDialer from "@/components/crm/InBrowserDialer";
import { toast } from "sonner";
import { syncWonDealToSale } from "@/utils/salesSync";
import { LostDealModal } from "@/components/crm/LostDealModal";
import { Confetti } from "@/components/crm/Confetti";
import { NovaTarefaModal } from "@/components/crm/NovaTarefaModal";
import { DealProducts } from "@/components/crm/DealProducts";
import { CustomFieldsSection } from "@/components/crm/CustomFieldsSection";
import { usePlan } from "@/hooks/usePlan";
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

const EVENT_ICONS: Record<string, { icon: typeof StickyNote; color: string; bg: string }> = {
    note: { icon: StickyNote, color: "text-blue-400", bg: "bg-blue-500/15" },
    call: { icon: PhoneCall, color: "text-emerald-400", bg: "bg-emerald-500/15" },
    stage_change: { icon: Rocket, color: "text-violet-400", bg: "bg-violet-500/15" },
    email: { icon: Mail, color: "text-amber-400", bg: "bg-amber-500/15" },
    task_completed: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/15" },
};

// â"€â"€â"€ Helpers â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

const getHealthStatus = (days: number) => {
    if (days > 7) return { icon: ShieldOff, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", label: "Crítico", subtitle: `${days}d sem contato` };
    if (days > 3) return { icon: ShieldAlert, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", label: "Atenção", subtitle: `${days}d sem contato` };
    return { icon: Shield, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "Saudável", subtitle: "Engajamento ativo" };
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
const StageChips = ({ currentStage, onStageChange }: { currentStage: string; onStageChange: (id: string) => void }) => {
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
                        <span>{stage.label}</span>
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
    return (
        <div className="flex gap-3 group">
            <div className="flex flex-col items-center pt-0.5">
                <div className={`w-6 h-6 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`h-3 w-3 ${cfg.color}`} />
                </div>
                {!isLast && <div className="w-px flex-1 bg-border mt-1.5 min-h-[20px]" />}
            </div>
            <div className={`flex-1 min-w-0 ${isLast ? "pb-0" : "pb-5"}`}>
                <div className="flex items-center gap-2 text-[11px] mb-1">
                    <span className="font-medium text-foreground">{event.user_name || "Você"}</span>
                    <span className="text-muted-foreground">
                        {safeFormatDate(event.created_at, "dd MMM 'às' HH:mm")}
                    </span>
                </div>
                <p className="text-sm text-foreground leading-relaxed break-words">{event.content || event.title}</p>
            </div>
        </div>
    );
};

/** Focus card — next-action prompt. Clean, no glow, no gradient */
const FocusCard = ({ task, onComplete }: { task: any; onComplete: () => void }) => {
    const [done, setDone] = useState(false);
    const handle = () => { setDone(true); setTimeout(onComplete, 600); };
    return (
        <div className={`
            flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors
            ${done ? "bg-emerald-500/5 border-emerald-500/20" : "bg-card border-border hover:border-border/80"}
        `}>
            <button
                onClick={handle}
                className={`
                    w-5 h-5 rounded-full flex items-center justify-center transition-colors flex-shrink-0
                    ${done
                        ? "bg-emerald-500 text-white"
                        : "border border-muted-foreground/40 hover:border-emerald-500 hover:bg-emerald-500/10"}
                `}
            >
                {done && <CheckCircle2 className="h-3.5 w-3.5" />}
            </button>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Próxima ação</p>
                <p className={`text-sm font-medium truncate ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {task.title}
                </p>
            </div>
            {task.due_date && !done && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
                    <Clock className="h-3 w-3" />
                    <span>{safeFormatDate(task.due_date, "dd MMM, HH:mm")}</span>
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

// â"€â"€â"€ Main Component â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

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
            return (notes || []).map((n: any) => ({
                id: n.id, type: "note", title: "Nota adicionada",
                content: n.content, created_at: n.created_at,
            }));
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

    const activeTask = {
        id: "1",
        title: "Ligar para o decisor sobre a proposta",
        due_date: new Date(Date.now() + 86_400_000).toISOString(),
    };

    const TABS = [
        { id: "historico", label: "Histórico", icon: Clock },
        { id: "ligacoes", label: "Ligações", icon: PhoneCall, locked: !canUseCalls },
        { id: "tarefas", label: "Tarefas", icon: CheckCircle2 },
        { id: "arquivos", label: "Arquivos", icon: Paperclip },
        { id: "propostas", label: "Produtos/Proposta", icon: FileText },
    ];

    // â"€â"€ Loading / Not found â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-background">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                    <Target className="h-8 w-8 text-emerald-500" />
                </motion.div>
            </div>
        );
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
            <div className="min-h-[calc(100vh-64px)] bg-background">
                {showConfetti && <Confetti show={showConfetti} />}

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
                                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-cyan-500 text-white font-bold text-xs">
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
                                task={activeTask}
                                onComplete={() => {
                                    setShowConfetti(true);
                                    setTimeout(() => setShowConfetti(false), 2000);
                                    toast.success("Ação concluída");
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
                                                                                : <Sparkles className="h-4 w-4" />}
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
                                                                            <Sparkles className="h-4 w-4 text-emerald-400" />
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
                                                    className="flex flex-col items-center justify-center gap-1 h-14 rounded-xl bg-card border border-border hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                                                    className="flex flex-col items-center justify-center gap-1 h-14 rounded-xl bg-card border border-border hover:border-green-500/40 hover:bg-green-500/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    <MessageSquare className="h-4 w-4 text-green-400" />
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
                                                    className="flex flex-col items-center justify-center gap-1 h-14 rounded-xl bg-card border border-border hover:border-blue-500/40 hover:bg-blue-500/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                                                    className="flex flex-col items-center justify-center gap-1 h-14 rounded-xl bg-card border border-border hover:border-violet-500/40 hover:bg-violet-500/5 transition-colors"
                                                >
                                                    <Plus className="h-4 w-4 text-violet-400" />
                                                    <span className="text-[10px] font-medium text-muted-foreground">Tarefa</span>
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" className="bg-card text-foreground text-xs border border-border">Nova tarefa</TooltipContent>
                                        </Tooltip>
                                    </div>
                                </TooltipProvider>

                                {/* Health inline */}
                                <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${health.bg} ${health.border}`}>
                                    <HealthIcon className={`h-3.5 w-3.5 ${health.color} flex-shrink-0`} />
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-semibold ${health.color} leading-tight`}>{health.label}</p>
                                        <p className="text-[11px] text-muted-foreground leading-tight">{health.subtitle}</p>
                                    </div>
                                </div>

                                {/* Properties panel */}
                                <div className="bg-card/50 rounded-2xl border border-border px-4">

                                    <PropertiesSection title="Contato">
                                        <PropertyRow label="Nome" icon={User}>
                                            <span className="font-medium">{deal.customer_name || "—"}</span>
                                        </PropertyRow>
                                        <PropertyRow label="Email" icon={Mail}>
                                            {deal.customer_email
                                                ? <a href={`mailto:${deal.customer_email}`} className="text-emerald-400 hover:text-emerald-300 hover:underline truncate block">{deal.customer_email}</a>
                                                : <span className="text-muted-foreground">—</span>}
                                        </PropertyRow>
                                        <PropertyRow label="Telefone" icon={Phone}>
                                            {deal.customer_phone
                                                ? <span className="font-medium tabular-nums">{formatPhone(deal.customer_phone)}</span>
                                                : <span className="text-muted-foreground">—</span>}
                                        </PropertyRow>
                                    </PropertiesSection>

                                    <PropertiesSection title="Detalhes">
                                        <PropertyRow label="Valor" icon={DollarSign}>
                                            <span className="font-semibold text-emerald-400 tabular-nums">{formatCurrency(deal.value || 0)}</span>
                                        </PropertyRow>
                                        <PropertyRow label="Fonte" icon={Target}>
                                            <span className="font-medium">{(deal as any).source || "Manual"}</span>
                                        </PropertyRow>
                                        <PropertyRow label="Criado" icon={Calendar}>
                                            <span className="font-medium">{safeFormatDate(deal.created_at, "dd MMM yyyy")}</span>
                                        </PropertyRow>
                                        <PropertyRow label="Atualizado" icon={Clock}>
                                            <span className="font-medium">{safeFormatDistance(deal.updated_at)}</span>
                                        </PropertyRow>

                                        {/* Probability with inline bar */}
                                        <div className="pt-1.5 space-y-1.5">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-muted-foreground flex items-center gap-1.5">
                                                    <TrendingUp className="h-3.5 w-3.5" />
                                                    Probabilidade
                                                </span>
                                                <span className="text-foreground font-semibold tabular-nums">{deal.probability ?? 0}%</span>
                                            </div>
                                            <div className="h-1 bg-muted rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${deal.probability ?? 0}%` }}
                                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                                />
                                            </div>
                                        </div>
                                    </PropertiesSection>

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
                    </DialogContent>
                </Dialog>

                <LostDealModal
                    open={showLostModal}
                    onClose={() => setShowLostModal(false)}
                    onConfirm={async (reason) => {
                        await updateDeal.mutateAsync({ stage: "closed_lost", loss_reason: reason, probability: 0 });
                        setShowLostModal(false);
                    }}
                    dealTitle={deal.title || "Deal"}
                />
                <NovaTarefaModal
                    open={showTaskModal}
                    onClose={() => setShowTaskModal(false)}
                    dealId={id || ""}
                    dealTitle={deal.title}
                />
            </div>
        </>
    );
}
