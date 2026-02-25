import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    Circle,
    Zap,
    Clock,
    Calendar,
    DollarSign,
    Target,
    TrendingUp,
    Building2,
    PhoneCall,
    StickyNote,
    Rocket,
    AlertTriangle,
    X,
    ChevronRight,
    Loader2,
    MoreHorizontal,
    Plus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { syncWonDealToSale } from "@/utils/salesSync";
import { LostDealModal } from "@/components/crm/LostDealModal";
import { Confetti } from "@/components/crm/Confetti";
import { NovaTarefaModal } from "@/components/crm/NovaTarefaModal";
import { DealProducts } from "@/components/crm/DealProducts";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Constants ─────────────────────────────────────────────────────────────────

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

// ─── Helpers ───────────────────────────────────────────────────────────────────

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
            return <Badge variant="outline" className="border-slate-700 text-slate-400">{status || "Desconhecido"}</Badge>;
    }
};

// ─── Sub-components ────────────────────────────────────────────────────────────

/** Circular probability ring */
const CircularProgress = ({ value, size = 52 }: { value: number; size?: number }) => {
    const sw = 4;
    const r = (size - sw) / 2;
    const c = r * 2 * Math.PI;
    const offset = ((100 - value) / 100) * c;
    const stroke = value >= 70 ? "stroke-emerald-500" : value >= 40 ? "stroke-amber-500" : "stroke-rose-500";
    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={sw} className="stroke-slate-700 fill-none" />
                <motion.circle cx={size / 2} cy={size / 2} r={r} strokeWidth={sw}
                    className={`${stroke} fill-none`} strokeLinecap="round"
                    initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 0.9, ease: "easeOut" }} strokeDasharray={c}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-white tabular-nums">{value}%</span>
            </div>
        </div>
    );
};

/** Pipeline chevron stepper */
const PipelineStepper = ({ currentStage, onStageChange }: { currentStage: string; onStageChange: (id: string) => void }) => {
    const idx = PIPELINE_STAGES.findIndex(s => s.id === currentStage);
    return (
        <div className="flex items-center gap-0">
            {PIPELINE_STAGES.map((stage, i) => {
                const done = i < idx;
                const active = i === idx;
                const pending = i > idx;
                return (
                    <div key={stage.id} className="flex items-center">
                        <button
                            onClick={() => onStageChange(stage.id)}
                            className={`
                                relative px-4 py-1.5 text-xs font-semibold transition-all duration-200
                                ${i === 0 ? "rounded-l-full" : ""}
                                ${i === PIPELINE_STAGES.length - 1 ? "rounded-r-full" : ""}
                                ${active ? `${stage.color} text-white shadow-md` : ""}
                                ${done ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30" : ""}
                                ${pending ? "bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300" : ""}
                            `}
                        >
                            <span className="flex items-center gap-1">
                                {done && <CheckCircle2 className="h-3 w-3" />}
                                <span className="hidden sm:inline">{stage.label}</span>
                                <span className="sm:hidden">{stage.shortLabel}</span>
                            </span>
                            {active && (
                                <motion.div
                                    className={`absolute inset-0 ${i === 0 ? "rounded-l-full" : ""} ${i === PIPELINE_STAGES.length - 1 ? "rounded-r-full" : ""} bg-white/10`}
                                    animate={{ opacity: [0.1, 0.25, 0.1] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                />
                            )}
                        </button>
                        {i < PIPELINE_STAGES.length - 1 && (
                            <ChevronRight className={`h-4 w-4 flex-shrink-0 -mx-0.5 z-10 ${i < idx ? "text-emerald-400" : "text-slate-600"}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
};

/** Quick action FAB */
const QuickBtn = ({ icon: Icon, label, color, onClick }: { icon: typeof Phone; label: string; color: string; onClick?: () => void }) => (
    <Tooltip>
        <TooltipTrigger asChild>
            <motion.button whileHover={{ scale: 1.12, y: -2 }} whileTap={{ scale: 0.93 }} onClick={onClick}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl ${color} transition-all duration-200 group`}>
                <Icon className="h-5 w-5 text-white/90 group-hover:text-white" />
            </motion.button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-slate-800 text-white text-xs">{label}</TooltipContent>
    </Tooltip>
);

/** Timeline entry */
const TimelineEntry = ({ event, isLast }: { event: any; isLast: boolean }) => {
    const cfg = EVENT_ICONS[event.type] || EVENT_ICONS.note;
    const Icon = cfg.icon;
    return (
        <div className="flex gap-3">
            <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0 ring-1 ring-white/5`}>
                    <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                </div>
                {!isLast && <div className="w-0.5 flex-1 bg-slate-800 my-1 min-h-[16px]" />}
            </div>
            <div className={`flex-1 ${isLast ? "pb-0" : "pb-4"}`}>
                <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/40 hover:border-slate-600/40 transition-colors">
                    <p className="text-xs text-slate-400 mb-1">
                        <span className="text-emerald-400 font-medium">{event.user_name || "Você"}</span>
                        {" · "}
                        {format(new Date(event.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </p>
                    <p className="text-sm text-slate-200 leading-relaxed">{event.content || event.title}</p>
                </div>
            </div>
        </div>
    );
};

/** Active quest card */
const QuestCard = ({ task, onComplete }: { task: any; onComplete: () => void }) => {
    const [done, setDone] = useState(false);
    const handle = () => { setDone(true); setTimeout(onComplete, 800); };
    return (
        <motion.div
            className={`relative overflow-hidden rounded-2xl border p-4 transition-all duration-500 ${done
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/25"
                }`}
            animate={done ? {} : { borderColor: ["rgba(245,158,11,.25)", "rgba(245,158,11,.45)", "rgba(245,158,11,.25)"] }}
            transition={{ repeat: Infinity, duration: 2.5 }}
        >
            {/* Glow */}
            {!done && (
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
            )}
            <div className="flex items-start gap-3 relative">
                <motion.button whileTap={{ scale: 0.88 }} onClick={handle}
                    className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 transition-all ${done ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-400 hover:bg-amber-500 hover:text-white"}`}>
                    {done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                </motion.button>
                <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                        <Zap className="h-3.5 w-3.5 text-amber-400" />
                        <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Próxima Missão</span>
                    </div>
                    <p className={`text-base font-semibold transition-all ${done ? "text-emerald-400 line-through opacity-60" : "text-white"}`}>
                        {task.title}
                    </p>
                    {task.due_date && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-slate-400">
                            <Clock className="h-3 w-3" />
                            <span className="text-xs">{format(new Date(task.due_date), "dd MMM, HH:mm", { locale: ptBR })}</span>
                        </div>
                    )}
                </div>
                {done && (
                    <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                        <Sparkles className="h-5 w-5 text-emerald-400" />
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
};

// ─── Main Component ────────────────────────────────────────────────────────────

export default function DealCommandCenter() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [showLostModal, setShowLostModal] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [newNote, setNewNote] = useState("");
    const [activeTab, setActiveTab] = useState("historico");
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [showCallModal, setShowCallModal] = useState(false);
    const [sellerPhone, setSellerPhone] = useState("");
    const [callMode, setCallMode] = useState<"demo" | "twilio">("demo");

    useEffect(() => {
        const saved = localStorage.getItem("deal_call_seller_phone");
        if (saved) setSellerPhone(saved);
    }, []);

    // ── Queries ─────────────────────────────────────────────────────────────────

    const { data: deal, isLoading } = useQuery({
        queryKey: ["deal", id],
        queryFn: async () => {
            const { data, error } = await supabase.from("deals").select("*").eq("id", id).single();
            if (error) throw error;
            return data;
        },
        enabled: !!id,
    });

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
        enabled: !!id,
    });

    // ── Mutations ────────────────────────────────────────────────────────────────

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
        mutationFn: async (payload: { mode: "demo" | "twilio"; sellerPhone?: string | null }) => {
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

            toast.success(data?.message || "Chamada registrada");
            setActiveTab("ligacoes");
        },
        onError: (error: any) => {
            console.error("Erro ao iniciar chamada:", error);
            toast.error(error?.message || "Erro ao iniciar chamada");
        },
    });

    const generateCallInsights = useMutation({
        mutationFn: async (callId: string) => {
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
            console.error("Erro ao gerar insights:", error);
            toast.error(error?.message || "Erro ao gerar insights");
        },
    });

    // ── Derived ─────────────────────────────────────────────────────────────────

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
        { id: "ligacoes", label: "Ligações", icon: PhoneCall },
        { id: "tarefas", label: "Tarefas", icon: CheckCircle2 },
        { id: "arquivos", label: "Arquivos", icon: Paperclip },
        { id: "propostas", label: "Produtos/Proposta", icon: FileText },
    ];

    // ── Loading / Not found ──────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-slate-950">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                    <Target className="h-8 w-8 text-emerald-500" />
                </motion.div>
            </div>
        );
    }

    if (!deal) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] gap-4 bg-slate-950">
                <AlertTriangle className="h-12 w-12 text-amber-500" />
                <p className="text-slate-400">Deal não encontrado</p>
                <Button onClick={() => navigate("/crm")} variant="outline">Voltar ao Pipeline</Button>
            </div>
        );
    }

    // ── Render ───────────────────────────────────────────────────────────────────

    return (
        <>
            <div className="min-h-[calc(100vh-64px)] bg-slate-950">
                {showConfetti && <Confetti show={showConfetti} />}

                {/* ── HEADER ─────────────────────────────────────────────────── */}
                <div className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/60">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6">

                        {/* Row 1: Back + Title + Actions */}
                        <div className="flex items-center justify-between gap-4 py-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <Button variant="ghost" size="sm" onClick={() => navigate("/crm")}
                                    className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 w-8 p-0 rounded-lg flex-shrink-0">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>

                                <div className="p-2 rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/25 flex-shrink-0">
                                    <Building2 className="h-4 w-4 text-emerald-400" />
                                </div>

                                <div className="min-w-0">
                                    <h1 className="text-sm sm:text-base font-bold text-white truncate leading-tight">{deal.title}</h1>
                                    <p className="text-xs text-slate-500 truncate">{deal.customer_name}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 flex-shrink-0">
                                {/* Value */}
                                <div className="text-right hidden sm:block">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Valor</p>
                                    <p className="text-lg font-bold text-emerald-400 tabular-nums leading-tight">
                                        {formatCurrency(deal.value || 0)}
                                    </p>
                                </div>

                                {/* Probability ring */}
                                <div className="hidden sm:block">
                                    <CircularProgress value={deal.probability || 50} />
                                </div>

                                {/* CTA buttons */}
                                {deal.stage !== "closed_won" && deal.stage !== "closed_lost" && (
                                    <div className="flex gap-2">
                                        <Button size="sm"
                                            className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold shadow-lg shadow-emerald-500/20 h-8 px-3 gap-1.5"
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
                                        <Button size="sm" variant="destructive"
                                            className="shadow-lg shadow-rose-500/20 h-8 px-3 gap-1.5"
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
                                    <div className="flex items-center gap-1.5 bg-emerald-500/15 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-semibold ring-1 ring-emerald-500/25">
                                        <Trophy className="h-3.5 w-3.5" /> Ganho!
                                    </div>
                                )}
                                {deal.stage === "closed_lost" && (
                                    <div className="flex items-center gap-1.5 bg-rose-500/15 text-rose-400 px-3 py-1.5 rounded-lg text-xs font-semibold ring-1 ring-rose-500/25">
                                        <XCircle className="h-3.5 w-3.5" /> Perdido
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Row 2: Pipeline stepper (full width) */}
                        <div className="pb-3 overflow-x-auto">
                            <PipelineStepper
                                currentStage={deal.stage}
                                onStageChange={(s) => {
                                    if (s === "closed_lost") { setShowLostModal(true); return; }
                                    updateDeal.mutate({ stage: s });
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* ── MAIN GRID ──────────────────────────────────────────────── */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
                    <div className="grid grid-cols-12 gap-4 sm:gap-5">

                        {/* ── LEFT PANEL ───────────────────────────────────── */}
                        <div className="col-span-12 lg:col-span-3 space-y-4">

                            {/* Quick actions */}
                            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800/60">
                                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Ações Rápidas</p>
                                <TooltipProvider delayDuration={80}>
                                    <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-around">
                                        <QuickBtn icon={Phone} label="Ligar" color="bg-emerald-600 hover:bg-emerald-500"
                                            onClick={() => setShowCallModal(true)} />
                                        <QuickBtn icon={MessageSquare} label="WhatsApp" color="bg-green-600 hover:bg-green-500"
                                            onClick={() => deal.customer_phone && window.open(`https://wa.me/${deal.customer_phone.replace(/\D/g, "")}`, "_blank")} />
                                        <QuickBtn icon={Mail} label="Email" color="bg-blue-600 hover:bg-blue-500"
                                            onClick={() => deal.customer_email && window.open(`mailto:${deal.customer_email}`, "_blank")} />
                                        <QuickBtn icon={Plus} label="Nova Tarefa" color="bg-violet-600 hover:bg-violet-500"
                                            onClick={() => setShowTaskModal(true)} />
                                    </div>
                                </TooltipProvider>
                            </div>

                            {/* Deal health */}
                            <div className={`rounded-2xl p-4 border ${health.bg} ${health.border}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${health.bg} ring-1 ${health.border}`}>
                                        <HealthIcon className={`h-4 w-4 ${health.color}`} />
                                    </div>
                                    <div>
                                        <p className={`text-sm font-semibold ${health.color}`}>{health.label}</p>
                                        <p className="text-xs text-slate-500">{health.subtitle}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Contact card */}
                            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800/60 space-y-3">
                                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Contato</p>
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-11 w-11 ring-2 ring-slate-700">
                                        <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-cyan-500 text-white font-bold text-sm">
                                            {deal.customer_name?.substring(0, 2).toUpperCase() || "?"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-white text-sm truncate">{deal.customer_name}</p>
                                        <p className="text-xs text-slate-400 truncate">{deal.customer_email || "Sem email"}</p>
                                    </div>
                                </div>
                                {deal.customer_phone && (
                                    <div className="flex items-center gap-2 bg-slate-800/50 rounded-xl px-3 py-2">
                                        <Phone className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                                        <span className="text-sm text-slate-300">{deal.customer_phone}</span>
                                    </div>
                                )}
                            </div>

                            {/* Details widget */}
                            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800/60 space-y-3">
                                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Detalhes</p>
                                {[
                                    { icon: Target, label: "Fonte", value: (deal as any).source || "Manual" },
                                    { icon: Calendar, label: "Criado", value: format(new Date(deal.created_at), "dd MMM yyyy", { locale: ptBR }) },
                                    { icon: TrendingUp, label: "Probabilidade", value: `${deal.probability}%` },
                                ].map(({ icon: Icon, label, value }) => (
                                    <div key={label} className="flex items-center justify-between">
                                        <span className="text-xs text-slate-500 flex items-center gap-1.5">
                                            <Icon className="h-3.5 w-3.5" />{label}
                                        </span>
                                        <span className="text-sm text-white font-medium">{value}</span>
                                    </div>
                                ))}

                                {/* Probability bar */}
                                <div className="pt-1">
                                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${deal.probability}%` }}
                                            transition={{ duration: 0.8, ease: "easeOut" }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Mobile Value / Probability */}
                            <div className="sm:hidden bg-slate-900 rounded-2xl p-4 border border-slate-800/60 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Valor</p>
                                    <p className="text-xl font-bold text-emerald-400">{formatCurrency(deal.value || 0)}</p>
                                </div>
                                <CircularProgress value={deal.probability || 50} />
                            </div>
                        </div>

                        {/* ── RIGHT PANEL ──────────────────────────────────── */}
                        <div className="col-span-12 lg:col-span-9 space-y-4">

                            {/* Active Quest */}
                            <QuestCard
                                task={activeTask}
                                onComplete={() => {
                                    setShowConfetti(true);
                                    setTimeout(() => setShowConfetti(false), 2000);
                                    toast.success("Missão completa! 🎉");
                                }}
                            />

                            {/* Main panel */}
                            <div className="bg-slate-900 rounded-2xl border border-slate-800/60 overflow-hidden">

                                {/* Tab bar */}
                                <div className="flex gap-0 border-b border-slate-800/60 px-2 pt-2 overflow-x-auto scrollbar-none">
                                    {TABS.map((tab) => {
                                        const TabIcon = tab.icon;
                                        const active = activeTab === tab.id;
                                        return (
                                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                                className={`
                                                    flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs font-medium rounded-t-xl transition-all duration-150 whitespace-nowrap shrink-0
                                                    ${active
                                                        ? "bg-slate-800 text-emerald-400 border-b-2 border-emerald-500 -mb-px"
                                                        : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"}
                                                `}
                                            >
                                                <TabIcon className="h-3.5 w-3.5" />
                                                <span className="hidden sm:inline">{tab.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <AnimatePresence mode="wait">
                                    <motion.div key={activeTab}
                                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}
                                    >
                                        {/* ── Histórico ─────────────────── */}
                                        {activeTab === "historico" && (
                                            <>
                                                <ScrollArea className="h-[360px]">
                                                    <div className="p-4 space-y-1">
                                                        {timeline.length === 0 ? (
                                                            <div className="flex flex-col items-center justify-center py-14 text-slate-600">
                                                                <StickyNote className="h-9 w-9 mb-3 opacity-40" />
                                                                <p className="text-sm font-medium text-slate-500">Nenhuma atividade ainda</p>
                                                                <p className="text-xs mt-1">Adicione a primeira nota abaixo</p>
                                                            </div>
                                                        ) : (
                                                            timeline.map((ev: any, i: number) => (
                                                                <TimelineEntry key={ev.id} event={ev} isLast={i === timeline.length - 1} />
                                                            ))
                                                        )}
                                                    </div>
                                                </ScrollArea>

                                                {/* Note input */}
                                                <div className="p-3 border-t border-slate-800/60 bg-slate-900/80">
                                                    <div className="flex items-center gap-2 bg-slate-800/60 rounded-xl px-3 py-2 ring-1 ring-slate-700/50 focus-within:ring-emerald-500/40 transition-all">
                                                        <Input
                                                            value={newNote}
                                                            onChange={(e) => setNewNote(e.target.value)}
                                                            placeholder="Digite uma nota ou comando..."
                                                            className="flex-1 bg-transparent border-0 text-sm text-slate-200 placeholder:text-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
                                                            onKeyDown={(e) => { if (e.key === "Enter" && newNote.trim()) addNote.mutate(newNote.trim()); }}
                                                        />
                                                        <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-300 h-7 w-7 p-0">
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
                                            </>
                                        )}

                                        {/* ── Ligações ───────────────────────── */}
                                        {activeTab === "ligacoes" && (
                                            <div className="p-4 sm:p-5 space-y-4">
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-white">Ligações</p>
                                                        <p className="text-xs text-slate-500">
                                                            MVP: registre chamadas, salve transcrição no deal e gere insights sob demanda
                                                        </p>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        className="bg-emerald-500 hover:bg-emerald-400 text-white gap-2"
                                                        onClick={() => setShowCallModal(true)}
                                                    >
                                                        <PhoneCall className="h-4 w-4" />
                                                        Nova ligação
                                                    </Button>
                                                </div>

                                                {loadingCalls ? (
                                                    <div className="flex items-center justify-center py-10 text-slate-500">
                                                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                                        Carregando chamadas...
                                                    </div>
                                                ) : dealCalls.length === 0 ? (
                                                    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-800/20 p-8 text-center">
                                                        <PhoneCall className="h-10 w-10 mx-auto mb-3 text-slate-600" />
                                                        <p className="text-sm font-medium text-slate-400">Nenhuma ligação registrada</p>
                                                        <p className="text-xs text-slate-600 mt-1 mb-4">
                                                            Use "Nova ligação" para testar o fluxo em modo demo e validar a experiência no deal
                                                        </p>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="border-slate-700 text-slate-300 hover:text-white"
                                                            onClick={() => setShowCallModal(true)}
                                                        >
                                                            Criar chamada demo
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {dealCalls.map((call: any) => (
                                                            <div key={call.id} className="rounded-2xl border border-slate-800/70 bg-slate-800/30 p-4 space-y-4">
                                                                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                                                                    <div className="space-y-2">
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            {getCallStatusBadge(call.status)}
                                                                            <Badge variant="outline" className="border-slate-700 text-slate-400">
                                                                                {call.provider === "demo" ? "Demo" : (call.provider || "Telefone")}
                                                                            </Badge>
                                                                            {call.transcript_status && (
                                                                                <Badge variant="outline" className="border-slate-700 text-slate-400">
                                                                                    Transcrição: {call.transcript_status}
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-sm text-slate-300">
                                                                            <span className="text-slate-500">Cliente:</span> {formatPhone(call.customer_phone)}
                                                                        </div>
                                                                        <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
                                                                            <span>{format(new Date(call.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                                                                            {typeof call.duration_seconds === "number" && <span>Duração: {call.duration_seconds}s</span>}
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="border-slate-700 text-slate-300 hover:text-white w-full sm:w-auto"
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
                                                                    <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-3">
                                                                        <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Preview da transcrição</p>
                                                                        <p className="text-sm text-slate-300 leading-relaxed">{call.transcript_preview}</p>
                                                                    </div>
                                                                )}

                                                                {call.transcript_text && (
                                                                    <details className="rounded-xl border border-slate-700/60 bg-slate-900/40">
                                                                        <summary className="cursor-pointer list-none px-3 py-2.5 flex items-center justify-between">
                                                                            <span className="text-sm font-medium text-slate-200">Transcrição completa</span>
                                                                            <ChevronRight className="h-4 w-4 text-slate-500" />
                                                                        </summary>
                                                                        <div className="px-3 pb-3">
                                                                            <Textarea
                                                                                readOnly
                                                                                value={call.transcript_text}
                                                                                className="min-h-[180px] bg-slate-950 border-slate-700 text-slate-200 text-sm leading-relaxed"
                                                                            />
                                                                        </div>
                                                                    </details>
                                                                )}

                                                                {call.insight && (
                                                                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
                                                                        <div className="flex items-center gap-2">
                                                                            <Sparkles className="h-4 w-4 text-emerald-400" />
                                                                            <p className="text-sm font-semibold text-emerald-300">Insights da ligação</p>
                                                                            <Badge variant="outline" className="border-emerald-500/20 text-emerald-300">
                                                                                {call.insight.model || "mvp"}
                                                                            </Badge>
                                                                        </div>

                                                                        {call.insight.summary && (
                                                                            <div>
                                                                                <p className="text-[11px] uppercase tracking-wider text-emerald-300/70 mb-1">Resumo</p>
                                                                                <p className="text-sm text-slate-200 leading-relaxed">{call.insight.summary}</p>
                                                                            </div>
                                                                        )}

                                                                        <div className="grid md:grid-cols-2 gap-3">
                                                                            <div>
                                                                                <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Objeções</p>
                                                                                <div className="flex flex-wrap gap-1.5">
                                                                                    {(call.insight.objections || []).length > 0 ? (
                                                                                        (call.insight.objections || []).map((obj: string, idx: number) => (
                                                                                            <Badge key={`${call.id}-obj-${idx}`} variant="outline" className="border-amber-500/20 text-amber-300">
                                                                                                {obj}
                                                                                            </Badge>
                                                                                        ))
                                                                                    ) : (
                                                                                        <span className="text-xs text-slate-500">Nenhuma objeção detectada</span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Próximos passos</p>
                                                                                <ul className="space-y-1">
                                                                                    {(call.insight.next_steps || []).map((step: string, idx: number) => (
                                                                                        <li key={`${call.id}-step-${idx}`} className="text-sm text-slate-300 flex items-start gap-2">
                                                                                            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-emerald-400 flex-shrink-0" />
                                                                                            <span>{step}</span>
                                                                                        </li>
                                                                                    ))}
                                                                                </ul>
                                                                            </div>
                                                                        </div>

                                                                        {call.insight.suggested_message && (
                                                                            <div>
                                                                                <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Mensagem sugerida</p>
                                                                                <Textarea
                                                                                    readOnly
                                                                                    value={call.insight.suggested_message}
                                                                                    className="min-h-[88px] bg-slate-950 border-slate-700 text-slate-200 text-sm"
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

                                        {/* ── Tarefas ───────────────────── */}
                                        {activeTab === "tarefas" && (
                                            <div className="flex flex-col items-center justify-center py-14 text-slate-600">
                                                <CheckCircle2 className="h-10 w-10 mb-3 opacity-40" />
                                                <p className="text-sm font-medium text-slate-500">Nenhuma tarefa pendente</p>
                                                <p className="text-xs mt-1 mb-4">Tarefas criadas aparecerão aqui</p>
                                                <Button variant="outline" size="sm" className="gap-2 border-slate-700 text-slate-400 hover:text-white"
                                                    onClick={() => setShowTaskModal(true)}>
                                                    <Zap className="h-4 w-4" /> Nova Tarefa
                                                </Button>
                                            </div>
                                        )}

                                        {/* ── Arquivos ──────────────────── */}
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
                                                        className="flex flex-col items-center justify-center py-14 border-2 border-dashed border-slate-700 rounded-2xl cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all"
                                                        onClick={() => fileInputRef.current?.click()}
                                                    >
                                                        <Paperclip className="h-9 w-9 mb-3 text-slate-600" />
                                                        <p className="text-sm font-medium text-slate-400">Nenhum arquivo anexado</p>
                                                        <p className="text-xs text-slate-600 mt-1">Arraste ou clique para anexar</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {uploadedFiles.map((file, i) => (
                                                            <div key={i} className="flex items-center gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/40">
                                                                <div className="w-9 h-9 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                                                                    {file.type.startsWith("image/")
                                                                        ? <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover rounded-lg" />
                                                                        : <FileText className="h-4 w-4 text-slate-400" />}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-white truncate">{file.name}</p>
                                                                    <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                                                </div>
                                                                <Button variant="ghost" size="sm" onClick={() => setUploadedFiles(p => p.filter((_, j) => j !== i))}
                                                                    className="text-slate-500 hover:text-rose-400 h-7 w-7 p-0">
                                                                    <X className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                        <Button variant="outline" size="sm" className="w-full gap-2 border-slate-700 text-slate-400 hover:text-white mt-2"
                                                            onClick={() => fileInputRef.current?.click()}>
                                                            <Paperclip className="h-4 w-4" /> Anexar Mais
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* ── Produtos/Proposta ─────────── */}
                                        {activeTab === "propostas" && (
                                            <div className="p-5">
                                                {deal?.company_id ? (
                                                    <DealProducts
                                                        dealId={id!}
                                                        companyId={deal.company_id}
                                                        deal={{ id: deal.id, title: deal.title, customer_name: deal.customer_name, customer_email: deal.customer_email, customer_phone: deal.customer_phone }}
                                                    />
                                                ) : (
                                                    <div className="flex items-center justify-center py-12 text-slate-500">
                                                        <Loader2 className="h-6 w-6 animate-spin" />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* Deal observations chip */}
                            {deal.notes && (
                                <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800/40">
                                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Observações do Deal</p>
                                    <p className="text-sm text-slate-300 leading-relaxed">{deal.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── MODALS ─────────────────────────────────────────────────── */}
                <Dialog open={showCallModal} onOpenChange={setShowCallModal}>
                <DialogContent className="bg-slate-900 border-slate-800 text-white w-[calc(100vw-1rem)] max-w-lg p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <PhoneCall className="h-5 w-5 text-emerald-400" />
                                Iniciar ligação no Deal
                            </DialogTitle>
                            <DialogDescription className="text-slate-400">
                                MVP: registre a chamada e salve a transcrição no deal. Para validação imediata, use o modo demo.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3 space-y-2">
                                <p className="text-xs uppercase tracking-wider text-slate-500">Contato do deal</p>
                                <p className="text-sm text-slate-200">{deal.customer_name}</p>
                                <p className="text-sm text-slate-400">{formatPhone(deal.customer_phone)}</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs uppercase tracking-wider text-slate-500">Seu telefone (opcional no demo)</label>
                                <Input
                                    value={sellerPhone}
                                    onChange={(e) => setSellerPhone(e.target.value)}
                                    placeholder="(11) 99999-9999"
                                    className="bg-slate-950 border-slate-700 text-white"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs uppercase tracking-wider text-slate-500">Modo de teste</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setCallMode("demo")}
                                        className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                                            callMode === "demo"
                                                ? "border-emerald-500/40 bg-emerald-500/10"
                                                : "border-slate-700 bg-slate-950"
                                        }`}
                                    >
                                        <p className="text-sm font-medium text-white">Demo (agora)</p>
                                        <p className="text-xs text-slate-400">Cria chamada com transcrição simulada para validar UX</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCallMode("twilio")}
                                        className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                                            callMode === "twilio"
                                                ? "border-blue-500/40 bg-blue-500/10"
                                                : "border-slate-700 bg-slate-950"
                                        }`}
                                    >
                                        <p className="text-sm font-medium text-white">Telefonia (beta)</p>
                                        <p className="text-xs text-slate-400">Fila para integração Twilio/WebRTC</p>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                variant="outline"
                                className="border-slate-700 text-slate-300 hover:text-white"
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
                                {callMode === "demo" ? "Criar chamada demo" : "Enviar para fila"}
                            </Button>
                        </DialogFooter>
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
