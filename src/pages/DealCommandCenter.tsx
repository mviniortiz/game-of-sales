import { useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    ArrowLeft,
    Phone,
    MessageSquare,
    Mail,
    Trophy,
    XCircle,
    Archive,
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
    User,
    Building2,
    Tag,
    PhoneCall,
    StickyNote,
    Rocket,
    AlertTriangle,
    MoreHorizontal,
    Pencil,
    Save,
    X,
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

// Pipeline stages with colors
const PIPELINE_STAGES = [
    { id: "lead", label: "Lead", shortLabel: "L", color: "bg-slate-500" },
    { id: "qualification", label: "Qualificação", shortLabel: "Q", color: "bg-blue-500" },
    { id: "proposal", label: "Proposta", shortLabel: "P", color: "bg-indigo-500" },
    { id: "negotiation", label: "Negociação", shortLabel: "N", color: "bg-amber-500" },
    { id: "closed_won", label: "Ganho", shortLabel: "W", color: "bg-emerald-500" },
];

// Timeline event types with icons
const EVENT_ICONS: Record<string, { icon: typeof StickyNote; color: string; bg: string }> = {
    note: { icon: StickyNote, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-500/20" },
    call: { icon: PhoneCall, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-500/20" },
    stage_change: { icon: Rocket, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-500/20" },
    email: { icon: Mail, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-500/20" },
    task_completed: { icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-500/20" },
};

// Health status based on days since last update
const getHealthStatus = (days: number) => {
    if (days > 7) return { icon: ShieldOff, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-100 dark:bg-rose-500/20", label: "Crítico", subtitle: `${days} dias sem contato` };
    if (days > 3) return { icon: ShieldAlert, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-500/20", label: "Atenção", subtitle: `${days} dias sem contato` };
    return { icon: Shield, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-500/20", label: "Saudável", subtitle: "Engajamento ativo" };
};

// Format currency
const formatCurrency = (value: number) => {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
    }).format(value);
};

// Pipeline Progress Bar Component
const PipelineProgressBar = ({ currentStage }: { currentStage: string }) => {
    const currentIndex = PIPELINE_STAGES.findIndex(s => s.id === currentStage);

    return (
        <div className="flex items-center gap-1">
            {PIPELINE_STAGES.map((stage, index) => {
                const isCompleted = index < currentIndex;
                const isCurrent = index === currentIndex;
                const isPending = index > currentIndex;

                return (
                    <div key={stage.id} className="flex items-center">
                        <motion.div
                            className={`
                relative flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold
                transition-all duration-300
                ${isCompleted ? `${stage.color} text-white` : ""}
                ${isCurrent ? `${stage.color} text-white ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ring-indigo-500/50` : ""}
                ${isPending ? "bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-slate-500" : ""}
              `}
                            animate={isCurrent ? { scale: [1, 1.05, 1] } : {}}
                            transition={isCurrent ? { repeat: Infinity, duration: 2 } : {}}
                        >
                            {stage.shortLabel}
                            {isCurrent && (
                                <motion.div
                                    className="absolute inset-0 rounded-lg bg-white/20"
                                    animate={{ opacity: [0.2, 0.5, 0.2] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                />
                            )}
                        </motion.div>
                        {index < PIPELINE_STAGES.length - 1 && (
                            <div className={`w-4 h-0.5 mx-0.5 ${index < currentIndex ? "bg-emerald-500" : "bg-gray-200 dark:bg-slate-700"}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// Circular Progress Component
const CircularProgress = ({ value, size = 48 }: { value: number; size?: number }) => {
    const strokeWidth = 4;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const progress = ((100 - value) / 100) * circumference;

    const color = value >= 70 ? "stroke-emerald-500" : value >= 40 ? "stroke-amber-500" : "stroke-rose-500";

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    className="stroke-gray-200 dark:stroke-slate-700 fill-none"
                />
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    className={`${color} fill-none`}
                    strokeLinecap="round"
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: progress }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    strokeDasharray={circumference}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-gray-900 dark:text-white tabular-nums">{value}%</span>
            </div>
        </div>
    );
};

// Quick Action Button Component with Tooltip
const QuickActionButton = ({ icon: Icon, label, onClick, color }: { icon: typeof Phone; label: string; onClick?: () => void; color: string }) => (
    <Tooltip>
        <TooltipTrigger asChild>
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClick}
                className={`
                    p-3 rounded-full transition-all duration-200
                    bg-gray-100 dark:bg-slate-800 hover:${color} ring-1 ring-gray-200 dark:ring-slate-700 hover:ring-transparent
                    group
                `}
            >
                <Icon className="h-4 w-4 text-gray-500 dark:text-slate-400 group-hover:text-white transition-colors" />
            </motion.button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-slate-800 text-white text-xs px-2 py-1 rounded-md">
            {label}
        </TooltipContent>
    </Tooltip>
);

// Timeline Event Component - RD Station Style
const TimelineEvent = ({ event, isLast, isFirst }: { event: any; isLast: boolean; isFirst?: boolean }) => {
    const config = EVENT_ICONS[event.type] || EVENT_ICONS.note;
    const Icon = config.icon;
    const isCreation = event.type === "creation" || event.title?.includes("criada");

    return (
        <div className="relative flex gap-4">
            {/* Vertical Line */}
            <div className="flex flex-col items-center">
                {/* Top line segment */}
                {!isFirst && (
                    <div className="w-0.5 h-3 bg-indigo-400 dark:bg-indigo-500" />
                )}

                {/* Bullet/Icon */}
                {isCreation ? (
                    <div className="w-8 h-8 rounded-full bg-indigo-500 dark:bg-indigo-600 flex items-center justify-center ring-4 ring-indigo-100 dark:ring-indigo-500/20 z-10">
                        <Icon className="h-4 w-4 text-white" />
                    </div>
                ) : (
                    <div className="w-3 h-3 rounded-full bg-gray-400 dark:bg-slate-500 ring-4 ring-gray-100 dark:ring-slate-800 z-10 flex-shrink-0 mt-1.5" />
                )}

                {/* Bottom line segment */}
                {!isLast && (
                    <div className="w-0.5 flex-1 bg-indigo-400 dark:bg-indigo-500 min-h-[20px]" />
                )}
            </div>

            {/* Content */}
            <div className={`flex-1 ${isLast ? 'pb-2' : 'pb-5'} ${isCreation ? '-mt-1' : ''}`}>
                {isCreation ? (
                    // Special styling for creation events
                    <>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {event.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-500 mt-0.5">
                            {format(new Date(event.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                        </p>
                    </>
                ) : (
                    // Regular event styling
                    <>
                        <p className="text-sm text-gray-700 dark:text-slate-300">
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                {event.user_name || "Você"}
                            </span>
                            {" "}{event.title || event.content}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                            {format(new Date(event.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                    </>
                )}

                {/* Content box for notes */}
                {event.content && !isCreation && event.type === "note" && (
                    <div className="mt-2 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700/50">
                        <p className="text-sm text-gray-600 dark:text-slate-400">
                            {event.content}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Active Quest Card Component
const ActiveQuestCard = ({ task, onComplete }: { task: any; onComplete: () => void }) => {
    const [isCompleted, setIsCompleted] = useState(false);

    const handleComplete = () => {
        setIsCompleted(true);
        setTimeout(() => {
            onComplete();
        }, 1000);
    };

    return (
        <motion.div
            className={`
        relative p-4 rounded-xl border-2 transition-all duration-300
        ${isCompleted
                    ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/50"
                    : "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-amber-300 dark:border-amber-500/30"
                }
      `}
            animate={isCompleted ? {} : { borderColor: ["rgba(245, 158, 11, 0.3)", "rgba(245, 158, 11, 0.5)", "rgba(245, 158, 11, 0.3)"] }}
            transition={{ repeat: Infinity, duration: 2 }}
        >
            <div className="flex items-start gap-4">
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleComplete}
                    className={`
            mt-0.5 p-1 rounded-lg transition-all
            ${isCompleted
                            ? "bg-emerald-500 text-white"
                            : "bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400 hover:bg-amber-500 hover:text-white"
                        }
          `}
                >
                    {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5" />
                    ) : (
                        <Circle className="h-5 w-5" />
                    )}
                </motion.button>

                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <Zap className="h-4 w-4 text-amber-500" />
                        <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Próxima Missão</span>
                    </div>
                    <p className={`text-lg font-semibold transition-all ${isCompleted ? "text-emerald-600 dark:text-emerald-400 line-through" : "text-gray-900 dark:text-white"}`}>
                        {task.title}
                    </p>
                    {task.due_date && (
                        <div className="flex items-center gap-1.5 mt-2 text-gray-500 dark:text-slate-400">
                            <Clock className="h-3.5 w-3.5" />
                            <span className="text-xs">
                                {format(new Date(task.due_date), "dd MMM, HH:mm", { locale: ptBR })}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {isCompleted && (
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute top-2 right-2"
                >
                    <Sparkles className="h-6 w-6 text-emerald-500" />
                </motion.div>
            )}
        </motion.div>
    );
};

// Main Component
export default function DealCommandCenter() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const [isEditing, setIsEditing] = useState(false);
    const [showLostModal, setShowLostModal] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [newNote, setNewNote] = useState("");
    const [editedDeal, setEditedDeal] = useState<any>(null);
    const [activeTab, setActiveTab] = useState("historico");
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch deal details
    const { data: deal, isLoading } = useQuery({
        queryKey: ["deal", id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("deals")
                .select("*")
                .eq("id", id)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!id,
    });

    // Fetch deal notes/timeline
    const { data: timeline = [] } = useQuery({
        queryKey: ["deal-timeline", id],
        queryFn: async () => {
            const { data: notes, error } = await supabase
                .from("deal_notes" as any)
                .select("*")
                .eq("deal_id", id)
                .order("created_at", { ascending: false });

            if (error) throw error;

            // Transform to timeline events
            return (notes || []).map((note: any) => ({
                id: note.id,
                type: "note",
                title: "Nota adicionada",
                content: note.content,
                created_at: note.created_at,
            }));
        },
        enabled: !!id,
    });

    // Days since last update for health
    const daysSinceUpdate = deal?.updated_at
        ? Math.floor((new Date().getTime() - new Date(deal.updated_at).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    const healthStatus = getHealthStatus(daysSinceUpdate);
    const HealthIcon = healthStatus.icon;

    // Update deal mutation
    const updateDealMutation = useMutation({
        mutationFn: async (updates: any) => {
            const { error } = await supabase
                .from("deals")
                .update(updates)
                .eq("id", id);

            if (error) throw error;

            if (updates.stage === "closed_won" && deal) {
                await syncWonDealToSale(deal, queryClient);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["deal", id] });
            queryClient.invalidateQueries({ queryKey: ["deals"] });
            toast.success("Deal atualizado!");
            setIsEditing(false);
        },
        onError: () => {
            toast.error("Erro ao atualizar deal");
        },
    });

    // Add note mutation
    const addNoteMutation = useMutation({
        mutationFn: async (content: string) => {
            const { error } = await supabase.from("deal_notes" as any).insert({
                deal_id: id,
                user_id: user?.id,
                content,
            });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["deal-timeline", id] });
            setNewNote("");
            toast.success("Nota adicionada!");
        },
        onError: () => {
            toast.error("Erro ao adicionar nota");
        },
    });

    // Handle won
    const handleWon = async () => {
        await updateDealMutation.mutateAsync({ stage: "closed_won", probability: 100 });
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
    };

    // Handle lost
    const handleLost = async (reason: string) => {
        await updateDealMutation.mutateAsync({ stage: "closed_lost", loss_reason: reason, probability: 0 });
        setShowLostModal(false);
    };

    // Mock active task
    const activeTask = {
        id: "1",
        title: "Ligar para o decisor sobre a proposta",
        due_date: new Date(Date.now() + 86400000).toISOString(),
    };

    if (isLoading) {
        return (
            <>
                <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-gray-50 dark:bg-slate-900">
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                        <Target className="h-8 w-8 text-indigo-500" />
                    </motion.div>
                </div>
            </>
        );
    }

    if (!deal) {
        return (
            <>
                <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] gap-4 bg-gray-50 dark:bg-slate-900">
                    <AlertTriangle className="h-12 w-12 text-amber-500" />
                    <p className="text-gray-500 dark:text-slate-400">Deal não encontrado</p>
                    <Button onClick={() => navigate("/crm")} variant="outline">Voltar ao Pipeline</Button>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="min-h-[calc(100vh-64px)] bg-gray-50 dark:bg-slate-950">
                {/* Confetti Effect */}
                {showConfetti && <Confetti show={showConfetti} />}

                {/* HUD Header - Sticky */}
                <div className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-b border-gray-200 dark:border-slate-800">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
                        <div className="flex items-center justify-between gap-6">
                            {/* Left: Back + Title */}
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate("/crm")}
                                    className="text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>

                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 ring-1 ring-indigo-200 dark:ring-indigo-500/30">
                                        <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div>
                                        <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate max-w-[200px] sm:max-w-none">
                                            {deal.title}
                                        </h1>
                                        <p className="text-xs text-gray-500 dark:text-slate-500">{deal.customer_name}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Center: Pipeline Progress */}
                            <div className="hidden md:block">
                                <PipelineProgressBar currentStage={deal.stage} />
                            </div>

                            {/* Right: Metrics + Actions */}
                            <div className="flex items-center gap-4 sm:gap-6">
                                {/* Value */}
                                <div className="text-right">
                                    <p className="text-xs text-gray-500 dark:text-slate-500 uppercase tracking-wider">Valor</p>
                                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                        {formatCurrency(deal.value || 0)}
                                    </p>
                                </div>

                                {/* Probability */}
                                <div className="hidden sm:block">
                                    <CircularProgress value={deal.probability || 50} />
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        onClick={handleWon}
                                        disabled={deal.stage === "closed_won"}
                                        className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold shadow-lg shadow-emerald-500/25"
                                    >
                                        <Trophy className="h-4 w-4 mr-1" />
                                        Ganho
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => setShowLostModal(true)}
                                        disabled={deal.stage === "closed_lost"}
                                        className="shadow-lg shadow-rose-500/25"
                                    >
                                        <XCircle className="h-4 w-4 mr-1" />
                                        Perdido
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                    <div className="grid grid-cols-12 gap-6">

                        {/* Left Panel - The Dossier */}
                        <div className="col-span-12 lg:col-span-3 space-y-5">

                            {/* Quick Actions */}
                            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-gray-200 dark:border-slate-800 shadow-sm">
                                <p className="text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wider mb-3">Ações Rápidas</p>
                                <TooltipProvider delayDuration={100}>
                                    <div className="flex items-center justify-around">
                                        <QuickActionButton icon={Phone} label="Ligar" color="bg-emerald-500" onClick={() => {
                                            if (deal.customer_phone) window.open(`tel:${deal.customer_phone}`, "_self");
                                        }} />
                                        <QuickActionButton icon={MessageSquare} label="WhatsApp" color="bg-green-500" onClick={() => {
                                            if (deal.customer_phone) window.open(`https://wa.me/${deal.customer_phone.replace(/\D/g, "")}`, "_blank");
                                        }} />
                                        <QuickActionButton icon={Mail} label="Email" color="bg-blue-500" onClick={() => {
                                            if (deal.customer_email) window.open(`mailto:${deal.customer_email}`, "_blank");
                                        }} />
                                    </div>
                                </TooltipProvider>
                            </div>

                            {/* Deal Health */}
                            <div className={`rounded-xl p-4 border ${healthStatus.bg} border-gray-200 dark:border-slate-800`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${healthStatus.bg}`}>
                                        <HealthIcon className={`h-5 w-5 ${healthStatus.color}`} />
                                    </div>
                                    <div>
                                        <p className={`text-sm font-semibold ${healthStatus.color}`}>{healthStatus.label}</p>
                                        <p className="text-xs text-gray-500 dark:text-slate-500">{healthStatus.subtitle}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Card */}
                            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-gray-200 dark:border-slate-800 shadow-sm">
                                <p className="text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wider mb-3">Contato</p>
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-12 w-12 ring-2 ring-gray-200 dark:ring-slate-700">
                                        <AvatarFallback className="bg-indigo-500 text-white font-bold">
                                            {deal.customer_name?.substring(0, 2).toUpperCase() || "?"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white">{deal.customer_name}</p>
                                        <p className="text-xs text-gray-500 dark:text-slate-400">{deal.customer_email || "Sem email"}</p>
                                    </div>
                                </div>
                                {deal.customer_phone && (
                                    <div className="mt-3 flex items-center gap-2 text-gray-500 dark:text-slate-400">
                                        <Phone className="h-3.5 w-3.5" />
                                        <span className="text-sm">{deal.customer_phone}</span>
                                    </div>
                                )}
                            </div>

                            {/* Details Widget */}
                            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-gray-200 dark:border-slate-800 shadow-sm">
                                <p className="text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wider mb-3">Detalhes</p>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500 dark:text-slate-500 flex items-center gap-1.5">
                                            <Target className="h-3.5 w-3.5" />
                                            Fonte
                                        </span>
                                        <span className="text-sm text-gray-900 dark:text-white">{(deal as any).source || "Manual"}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500 dark:text-slate-500 flex items-center gap-1.5">
                                            <Calendar className="h-3.5 w-3.5" />
                                            Criado
                                        </span>
                                        <span className="text-sm text-gray-900 dark:text-white">
                                            {format(new Date(deal.created_at), "dd MMM yyyy", { locale: ptBR })}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500 dark:text-slate-500 flex items-center gap-1.5">
                                            <TrendingUp className="h-3.5 w-3.5" />
                                            Probabilidade
                                        </span>
                                        <span className="text-sm text-gray-900 dark:text-white">{deal.probability}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Panel - Mission Control */}
                        <div className="col-span-12 lg:col-span-9 space-y-5">

                            {/* Active Quest */}
                            <ActiveQuestCard
                                task={activeTask}
                                onComplete={() => {
                                    setShowConfetti(true);
                                    setTimeout(() => setShowConfetti(false), 2000);
                                    toast.success("Missão completa! 🎉");
                                }}
                            />

                            {/* Tabs Section */}
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                {/* Tab Navigation */}
                                <div className="border-b border-gray-200 dark:border-slate-800">
                                    <nav className="flex gap-1 px-4 pt-3" aria-label="Tabs">
                                        {[
                                            { id: "historico", label: "Histórico", icon: Clock },
                                            { id: "tarefas", label: "Tarefas", icon: CheckCircle2 },
                                            { id: "arquivos", label: "Arquivos", icon: Paperclip },
                                            { id: "propostas", label: "Produtos/Proposta", icon: FileText },
                                        ].map((tab) => {
                                            const TabIcon = tab.icon;
                                            const isActive = activeTab === tab.id;
                                            return (
                                                <button
                                                    key={tab.id}
                                                    onClick={() => setActiveTab(tab.id)}
                                                    className={`
                                                        px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all flex items-center gap-2
                                                        ${isActive
                                                            ? "bg-gray-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500 -mb-px"
                                                            : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/50"
                                                        }
                                                    `}
                                                >
                                                    <TabIcon className="h-4 w-4" />
                                                    {tab.label}
                                                </button>
                                            );
                                        })}
                                    </nav>
                                </div>

                                {/* Tab Content: Histórico */}
                                {activeTab === "historico" && (
                                    <>
                                        <ScrollArea className="h-[350px]">
                                            <div className="p-4">
                                                {timeline.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-800/30 rounded-lg">
                                                        <StickyNote className="h-8 w-8 mb-2 opacity-50" />
                                                        <p className="text-sm">Nenhuma atividade registrada</p>
                                                        <p className="text-xs">Adicione a primeira nota abaixo</p>
                                                    </div>
                                                ) : (
                                                    timeline.map((event: any, index: number) => (
                                                        <TimelineEvent
                                                            key={event.id}
                                                            event={event}
                                                            isFirst={index === 0}
                                                            isLast={index === timeline.length - 1}
                                                        />
                                                    ))
                                                )}
                                            </div>
                                        </ScrollArea>

                                        {/* Chat Input */}
                                        <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    value={newNote}
                                                    onChange={(e) => setNewNote(e.target.value)}
                                                    placeholder="Digite uma nota ou comando..."
                                                    className="flex-1 bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700"
                                                    onKeyPress={(e) => {
                                                        if (e.key === "Enter" && newNote.trim()) {
                                                            addNoteMutation.mutate(newNote.trim());
                                                        }
                                                    }}
                                                />
                                                <Button variant="ghost" size="sm" className="text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white">
                                                    <Smile className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => newNote.trim() && addNoteMutation.mutate(newNote.trim())}
                                                    disabled={!newNote.trim() || addNoteMutation.isPending}
                                                    className="bg-indigo-500 hover:bg-indigo-400 text-white"
                                                >
                                                    <Send className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Tab Content: Tarefas */}
                                {activeTab === "tarefas" && (
                                    <div className="p-6">
                                        <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-slate-500">
                                            <CheckCircle2 className="h-10 w-10 mb-3 opacity-50" />
                                            <p className="text-sm font-medium">Nenhuma tarefa pendente</p>
                                            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Tarefas criadas aparecerão aqui</p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="mt-4 gap-2"
                                                onClick={() => setShowTaskModal(true)}
                                            >
                                                <Zap className="h-4 w-4" />
                                                Nova Tarefa
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Tab Content: Arquivos */}
                                {activeTab === "arquivos" && (
                                    <div className="p-6">
                                        {/* Hidden file input */}
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            multiple
                                            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                            className="hidden"
                                            onChange={(e) => {
                                                const files = Array.from(e.target.files || []);
                                                if (files.length > 0) {
                                                    setUploadedFiles(prev => [...prev, ...files]);
                                                    toast.success(`${files.length} arquivo(s) selecionado(s)`);
                                                }
                                            }}
                                        />

                                        {uploadedFiles.length === 0 ? (
                                            <div
                                                className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-slate-500 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors"
                                                onClick={() => fileInputRef.current?.click()}
                                                onDragOver={(e) => {
                                                    e.preventDefault();
                                                    e.currentTarget.classList.add('border-indigo-400', 'bg-indigo-50/50', 'dark:bg-indigo-500/5');
                                                }}
                                                onDragLeave={(e) => {
                                                    e.currentTarget.classList.remove('border-indigo-400', 'bg-indigo-50/50', 'dark:bg-indigo-500/5');
                                                }}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    e.currentTarget.classList.remove('border-indigo-400', 'bg-indigo-50/50', 'dark:bg-indigo-500/5');
                                                    const files = Array.from(e.dataTransfer.files || []);
                                                    if (files.length > 0) {
                                                        setUploadedFiles(prev => [...prev, ...files]);
                                                        toast.success(`${files.length} arquivo(s) adicionado(s)`);
                                                    }
                                                }}
                                            >
                                                <Paperclip className="h-10 w-10 mb-3 opacity-50" />
                                                <p className="text-sm font-medium">Nenhum arquivo anexado</p>
                                                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Arraste arquivos ou clique para anexar</p>
                                                <p className="text-xs text-gray-300 dark:text-slate-600 mt-2">Fotos, vídeos, áudios, PDFs, documentos</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {/* File list */}
                                                <div className="space-y-2">
                                                    {uploadedFiles.map((file, index) => (
                                                        <div
                                                            key={index}
                                                            className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700"
                                                        >
                                                            {file.type.startsWith('image/') && (
                                                                <img
                                                                    src={URL.createObjectURL(file)}
                                                                    alt={file.name}
                                                                    className="w-10 h-10 rounded object-cover"
                                                                />
                                                            )}
                                                            {file.type.startsWith('video/') && (
                                                                <div className="w-10 h-10 rounded bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                                                                    <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                                                </div>
                                                            )}
                                                            {file.type.startsWith('audio/') && (
                                                                <div className="w-10 h-10 rounded bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                                                                    <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                                                </div>
                                                            )}
                                                            {!file.type.startsWith('image/') && !file.type.startsWith('video/') && !file.type.startsWith('audio/') && (
                                                                <div className="w-10 h-10 rounded bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                                                                    <FileText className="h-5 w-5 text-gray-500 dark:text-slate-400" />
                                                                </div>
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                                                                <p className="text-xs text-gray-500 dark:text-slate-400">
                                                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                                                </p>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                                                                className="text-gray-400 hover:text-rose-500"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Add more button */}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full gap-2"
                                                    onClick={() => fileInputRef.current?.click()}
                                                >
                                                    <Paperclip className="h-4 w-4" />
                                                    Anexar Mais Arquivos
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Tab Content: Propostas/Produtos */}
                                {activeTab === "propostas" && (
                                    <div className="p-5">
                                        {deal?.company_id ? (
                                            <DealProducts
                                                dealId={id!}
                                                companyId={deal.company_id}
                                                deal={{
                                                    id: deal.id,
                                                    title: deal.title,
                                                    customer_name: deal.customer_name,
                                                    customer_email: deal.customer_email,
                                                    customer_phone: deal.customer_phone,
                                                }}
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-slate-500">
                                                <FileText className="h-10 w-10 mb-3 opacity-50" />
                                                <p className="text-sm font-medium">Carregando...</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Notes Section */}
                            {deal.notes && (
                                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-gray-200 dark:border-slate-800 shadow-sm">
                                    <p className="text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wider mb-2">Observações do Deal</p>
                                    <p className="text-sm text-gray-700 dark:text-slate-300">{deal.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Lost Deal Modal */}
                <LostDealModal
                    open={showLostModal}
                    onClose={() => setShowLostModal(false)}
                    onConfirm={handleLost}
                    dealTitle={deal.title || "Deal"}
                />

                {/* Task Modal */}
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
