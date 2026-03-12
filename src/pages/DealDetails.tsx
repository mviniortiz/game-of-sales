import { useState, useEffect, useMemo } from "react";
import { logger } from "@/utils/logger";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, formatDistanceToNow, differenceInDays, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Save,
  Trophy,
  XCircle,
  Check,
  DollarSign,
  User,
  Mail,
  Phone,
  Calendar,
  Send,
  Clock,
  ArrowRight,
  Sparkles,
  FileText,
  History,
  Loader2,
  ChevronRight,
  MessageSquare,
  Package,
  Flame,
  TrendingUp,
  Target,
  BarChart3,
  Zap,
  AlertTriangle,
  Copy,
  ExternalLink,
  Hash,
  Timer,
  Activity,
  Eye,
  Percent,
  CalendarClock,
  Briefcase,
  Star,
} from "lucide-react";
import { LostDealModal } from "@/components/crm/LostDealModal";
import { syncWonDealToSale } from "@/utils/salesSync";
import { DealProducts } from "@/components/crm/DealProducts";
import { CustomFieldsSection } from "@/components/crm/CustomFieldsSection";
import { ProposalPDFButton } from "@/components/crm/ProposalPDFGenerator";
import { motion, AnimatePresence } from "framer-motion";

// Pipeline stages configuration
const PIPELINE_STAGES = [
  { id: "lead", title: "Lead", shortTitle: "Lead", color: "text-slate-400", bgColor: "bg-slate-500/10", borderColor: "border-slate-500/30", dotColor: "bg-slate-400" },
  { id: "qualification", title: "Qualificação", shortTitle: "Qualif.", color: "text-blue-400", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30", dotColor: "bg-blue-400" },
  { id: "proposal", title: "Proposta", shortTitle: "Prop.", color: "text-violet-400", bgColor: "bg-violet-500/10", borderColor: "border-violet-500/30", dotColor: "bg-violet-400" },
  { id: "negotiation", title: "Negociação", shortTitle: "Negoc.", color: "text-amber-400", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/30", dotColor: "bg-amber-400" },
  { id: "closed_won", title: "Ganho", shortTitle: "Ganho", color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/30", dotColor: "bg-emerald-400" },
  { id: "closed_lost", title: "Perdido", shortTitle: "Perdido", color: "text-rose-400", bgColor: "bg-rose-500/10", borderColor: "border-rose-500/30", dotColor: "bg-rose-400" },
];

interface DealActivity {
  id: string;
  activity_type: string;
  description: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  user_id: string;
  profiles?: {
    nome: string;
    avatar_url: string | null;
  };
}

interface DealNote {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: {
    nome: string;
    avatar_url: string | null;
  };
}

export default function DealDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [editedDeal, setEditedDeal] = useState<any>(null);

  // Fetch deal details
  const { data: deal, isLoading } = useQuery({
    queryKey: ["deal", id],
    queryFn: async () => {
      if (!id) throw new Error("Deal ID is required");
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

  // Fetch seller profile
  const { data: sellerProfile } = useQuery({
    queryKey: ["profile", deal?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, avatar_url, email")
        .eq("id", deal!.user_id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!deal?.user_id,
  });

  // Fetch deal activities
  const { data: activities = [] } = useQuery({
    queryKey: ["deal-activities", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("deal_activities")
        .select("*")
        .eq("deal_id", id)
        .order("created_at", { ascending: false });

      if (error) {
        logger.error("Error fetching activities:", error);
        return [];
      }

      if (!data || data.length === 0) return [];

      const userIds = [...new Set(data.map((a: any) => a.user_id))] as string[];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nome, avatar_url")
        .in("id", userIds);

      const profilesMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);

      return data.map((activity: any) => ({
        ...activity,
        profiles: profilesMap.get(activity.user_id),
      })) as DealActivity[];
    },
    enabled: !!id,
  });

  // Fetch deal notes
  const { data: notes = [] } = useQuery({
    queryKey: ["deal-notes", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("deal_notes")
        .select("*")
        .eq("deal_id", id)
        .order("created_at", { ascending: false });

      if (error) {
        logger.error("Error fetching notes:", error);
        return [];
      }

      if (!data || data.length === 0) return [];

      const userIds = [...new Set(data.map((n: any) => n.user_id))] as string[];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nome, avatar_url")
        .in("id", userIds);

      const profilesMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);

      return data.map((note: any) => ({
        ...note,
        profiles: profilesMap.get(note.user_id),
      })) as DealNote[];
    },
    enabled: !!id,
  });

  // Fetch deal products count
  const { data: productsCount = 0 } = useQuery({
    queryKey: ["deal-products-count", id],
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from("deal_products")
        .select("id", { count: "exact", head: true })
        .eq("deal_id", id);

      if (error) return 0;
      return count || 0;
    },
    enabled: !!id,
  });

  // Initialize edited deal when data loads
  useEffect(() => {
    if (deal && !editedDeal) {
      setEditedDeal(deal);
    }
  }, [deal, editedDeal]);

  // Computed metrics
  const dealMetrics = useMemo(() => {
    if (!deal) return null;

    const createdDate = new Date(deal.created_at);
    const now = new Date();
    const daysInPipeline = differenceInDays(now, createdDate);
    const updatedDate = new Date(deal.updated_at);
    const daysSinceUpdate = differenceInDays(now, updatedDate);
    const weightedValue = (deal.value || 0) * ((deal.probability || 0) / 100);

    let daysUntilClose: number | null = null;
    let isOverdue = false;
    if (deal.expected_close_date) {
      daysUntilClose = differenceInCalendarDays(new Date(deal.expected_close_date), now);
      isOverdue = daysUntilClose < 0;
    }

    const isRotting = daysSinceUpdate >= 7;
    const isStale = daysSinceUpdate >= 3 && daysSinceUpdate < 7;

    return {
      daysInPipeline,
      daysSinceUpdate,
      weightedValue,
      daysUntilClose,
      isOverdue,
      isRotting,
      isStale,
    };
  }, [deal]);

  // Update deal mutation
  const updateDealMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { syncDeal, ...payload } = updates || {};
      const { error } = await supabase
        .from("deals")
        .update(payload)
        .eq("id", id);

      if (error) throw error;

      if (payload.stage === "closed_won" && syncDeal) {
        try {
          await syncWonDealToSale(syncDeal, queryClient);
        } catch (syncError) {
          logger.error("Erro ao sincronizar venda do deal:", syncError);
          toast.error("Deal ganho, mas a venda não foi sincronizada.");
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal", id] });
      queryClient.invalidateQueries({ queryKey: ["deal-activities", id] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Deal atualizado!");
      setIsEditing(false);
    },
    onError: () => {
      toast.error("Erro ao atualizar deal");
    },
  });

  // Toggle hot mutation
  const toggleHotMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("deals")
        .update({ is_hot: !deal?.is_hot })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal", id] });
      toast.success(deal?.is_hot ? "Deal desmarcado como quente" : "Deal marcado como quente!");
    },
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!deal?.company_id) throw new Error("Company ID não encontrado");

      const { error } = await supabase.from("deal_notes" as any).insert({
        deal_id: id,
        user_id: user?.id,
        company_id: deal.company_id,
        content,
      });

      if (error) throw error;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-notes", id] });
      setNewNote("");
      toast.success("Nota adicionada!");
    },
    onError: () => {
      toast.error("Erro ao adicionar nota");
    },
  });

  // Handle stage change
  const handleStageChange = async (newStage: string) => {
    if (newStage === "closed_lost") {
      setShowLostModal(true);
      return;
    }
    if (!id) return;
    const { data: freshDeal } = await supabase
      .from("deals")
      .select("*")
      .eq("id", id)
      .single();
    if (!freshDeal) return;
    updateDealMutation.mutate({ stage: newStage, syncDeal: freshDeal });
  };

  // Handle lost deal
  const handleLostDeal = async (reason: string) => {
    await updateDealMutation.mutateAsync({
      stage: "closed_lost",
      loss_reason: reason,
    });
    setShowLostModal(false);
  };

  // Handle won deal
  const handleWonDeal = async () => {
    if (!id) return;
    const { data: freshDeal } = await supabase
      .from("deals")
      .select("*")
      .eq("id", id)
      .single();
    if (!freshDeal) return;
    updateDealMutation.mutate({ stage: "closed_won", syncDeal: freshDeal });
  };

  // Handle save
  const handleSave = () => {
    if (!editedDeal) return;
    updateDealMutation.mutate({
      title: editedDeal.title,
      value: editedDeal.value,
      customer_name: editedDeal.customer_name,
      customer_email: editedDeal.customer_email,
      customer_phone: editedDeal.customer_phone,
      probability: editedDeal.probability,
      expected_close_date: editedDeal.expected_close_date,
      notes: editedDeal.notes,
    });
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  // Get stage config
  const getStageConfig = (stageId: string) => {
    return PIPELINE_STAGES.find(s => s.id === stageId) || PIPELINE_STAGES[0];
  };

  // Get activity icon
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "created":
        return <Sparkles className="h-4 w-4 text-emerald-400" />;
      case "stage_changed":
        return <ArrowRight className="h-4 w-4 text-blue-400" />;
      case "won":
        return <Trophy className="h-4 w-4 text-emerald-400" />;
      case "lost":
        return <XCircle className="h-4 w-4 text-rose-400" />;
      case "field_updated":
        return <FileText className="h-4 w-4 text-amber-400" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-4 space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="col-span-8 space-y-4">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-rose-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Deal não encontrado</h2>
          <Button onClick={() => navigate("/crm")} variant="outline">
            Voltar ao CRM
          </Button>
        </div>
      </div>
    );
  }

  const currentStageIndex = PIPELINE_STAGES.findIndex((s) => s.id === deal.stage);
  const stageConfig = getStageConfig(deal.stage);
  const isClosed = deal.stage === "closed_won" || deal.stage === "closed_lost";

  return (
    <>
      <div className="min-h-screen bg-background text-foreground">
        {/* ── Hero Header ─────────────────────────────────────────── */}
        <div className="border-b border-border bg-gradient-to-b from-card to-background sticky top-0 z-10">
          <div className="px-4 sm:px-6 py-3 sm:py-4">
            {/* Row 1: Back + Title + Actions */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/crm")}
                  className="text-muted-foreground hover:text-foreground mt-0.5 h-8 px-2 flex-shrink-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">
                      {deal.title}
                    </h1>
                    {deal.is_hot && (
                      <Badge variant="destructive" className="bg-orange-500/15 text-orange-400 border-orange-500/30 gap-1 text-[10px] px-1.5 py-0">
                        <Flame className="h-3 w-3" />
                        Hot
                      </Badge>
                    )}
                    <Badge
                      className={`${stageConfig.bgColor} ${stageConfig.color} border ${stageConfig.borderColor} text-[10px] px-1.5 py-0`}
                    >
                      {stageConfig.title}
                    </Badge>
                    {dealMetrics?.isRotting && (
                      <Badge variant="destructive" className="bg-rose-500/15 text-rose-400 border-rose-500/30 gap-1 text-[10px] px-1.5 py-0 animate-pulse">
                        <AlertTriangle className="h-3 w-3" />
                        Sem atividade
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {deal.customer_name}
                    </span>
                    <span className="hidden sm:inline">|</span>
                    <span className="hidden sm:flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {formatCurrency(deal.value)}
                    </span>
                    {sellerProfile && (
                      <>
                        <span className="hidden sm:inline">|</span>
                        <span className="hidden sm:flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {sellerProfile.nome}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleHotMutation.mutate()}
                      className={`h-8 w-8 p-0 ${deal.is_hot ? "text-orange-400 hover:text-orange-300" : "text-muted-foreground hover:text-orange-400"}`}
                    >
                      <Flame className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{deal.is_hot ? "Desmarcar Hot" : "Marcar Hot"}</TooltipContent>
                </Tooltip>

                {!isClosed && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowLostModal(true)}
                      className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 h-8 px-2 sm:px-3"
                    >
                      <XCircle className="h-4 w-4 sm:mr-1.5" />
                      <span className="hidden sm:inline text-xs">Perdido</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleWonDeal}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white h-8 px-2 sm:px-3 shadow-sm shadow-emerald-500/20"
                    >
                      <Trophy className="h-4 w-4 sm:mr-1.5" />
                      <span className="hidden sm:inline text-xs">Ganho</span>
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Row 2: Pipeline Stepper */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
              {PIPELINE_STAGES.map((stage, index) => {
                const isActive = stage.id === deal.stage;
                const isPast = index < currentStageIndex;
                const isStageClosed = stage.id === "closed_won" || stage.id === "closed_lost";

                return (
                  <div key={stage.id} className="flex items-center flex-1 min-w-[50px]">
                    <button
                      onClick={() => !isStageClosed && handleStageChange(stage.id)}
                      disabled={isStageClosed && !isActive}
                      className={`
                        relative flex-1 py-1.5 sm:py-2 px-2 sm:px-3 text-[10px] sm:text-xs font-semibold transition-all rounded-md
                        ${isActive
                          ? `${stage.bgColor} ${stage.color} ring-1 ring-current/20 shadow-sm`
                          : isPast
                            ? "bg-emerald-500/10 text-emerald-500/70"
                            : "bg-muted/50 text-muted-foreground/60 hover:bg-muted"
                        }
                        ${isStageClosed && !isActive ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
                      `}
                    >
                      <span className="flex items-center justify-center gap-1">
                        {isPast && !isActive && <Check className="h-3 w-3 hidden sm:block" />}
                        <span className="sm:hidden">{stage.shortTitle}</span>
                        <span className="hidden sm:inline">{stage.title}</span>
                      </span>
                    </button>
                    {index < PIPELINE_STAGES.length - 1 && (
                      <ChevronRight className={`h-3.5 w-3.5 mx-0.5 flex-shrink-0 ${
                        isPast || isActive ? "text-emerald-500/50" : "text-muted-foreground/30"
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── KPI Strip ──────────────────────────────────────────── */}
        {dealMetrics && (
          <div className="border-b border-border bg-card/50">
            <div className="px-4 sm:px-6 py-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {/* Deal Value */}
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                  <div className="p-1.5 rounded-md bg-emerald-500/10">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Valor</p>
                    <p className="text-sm font-bold text-emerald-400 tabular-nums">{formatCurrency(deal.value)}</p>
                  </div>
                </div>

                {/* Weighted Value */}
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
                  <div className="p-1.5 rounded-md bg-blue-500/10">
                    <TrendingUp className="h-3.5 w-3.5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Valor Ponderado</p>
                    <p className="text-sm font-bold text-blue-400 tabular-nums">{formatCurrency(dealMetrics.weightedValue)}</p>
                  </div>
                </div>

                {/* Probability */}
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                  <div className="p-1.5 rounded-md bg-amber-500/10">
                    <Target className="h-3.5 w-3.5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Probabilidade</p>
                    <p className={`text-sm font-bold tabular-nums ${
                      (deal.probability || 0) >= 70 ? "text-emerald-400" : (deal.probability || 0) >= 40 ? "text-amber-400" : "text-rose-400"
                    }`}>{deal.probability || 0}%</p>
                  </div>
                </div>

                {/* Days in Pipeline */}
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-violet-500/5 border border-violet-500/10">
                  <div className="p-1.5 rounded-md bg-violet-500/10">
                    <Timer className="h-3.5 w-3.5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">No Pipeline</p>
                    <p className="text-sm font-bold text-violet-400 tabular-nums">{dealMetrics.daysInPipeline}d</p>
                  </div>
                </div>

                {/* Days Until Close */}
                <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${
                  dealMetrics.isOverdue
                    ? "bg-rose-500/5 border-rose-500/10"
                    : "bg-cyan-500/5 border-cyan-500/10"
                }`}>
                  <div className={`p-1.5 rounded-md ${dealMetrics.isOverdue ? "bg-rose-500/10" : "bg-cyan-500/10"}`}>
                    <CalendarClock className={`h-3.5 w-3.5 ${dealMetrics.isOverdue ? "text-rose-400" : "text-cyan-400"}`} />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Fechamento</p>
                    <p className={`text-sm font-bold tabular-nums ${
                      dealMetrics.isOverdue ? "text-rose-400" : "text-cyan-400"
                    }`}>
                      {dealMetrics.daysUntilClose !== null
                        ? dealMetrics.isOverdue
                          ? `${Math.abs(dealMetrics.daysUntilClose)}d atrasado`
                          : `${dealMetrics.daysUntilClose}d`
                        : "N/D"
                      }
                    </p>
                  </div>
                </div>

                {/* Last Activity */}
                <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${
                  dealMetrics.isRotting
                    ? "bg-rose-500/5 border-rose-500/10"
                    : dealMetrics.isStale
                      ? "bg-amber-500/5 border-amber-500/10"
                      : "bg-slate-500/5 border-slate-500/10"
                }`}>
                  <div className={`p-1.5 rounded-md ${
                    dealMetrics.isRotting ? "bg-rose-500/10" : dealMetrics.isStale ? "bg-amber-500/10" : "bg-slate-500/10"
                  }`}>
                    <Activity className={`h-3.5 w-3.5 ${
                      dealMetrics.isRotting ? "text-rose-400" : dealMetrics.isStale ? "text-amber-400" : "text-slate-400"
                    }`} />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ultima Ativ.</p>
                    <p className={`text-sm font-bold tabular-nums ${
                      dealMetrics.isRotting ? "text-rose-400" : dealMetrics.isStale ? "text-amber-400" : "text-slate-400"
                    }`}>{dealMetrics.daysSinceUpdate}d</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Main Content ──────────────────────────────────────── */}
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            {/* ── Left Sidebar ────────────────────────────────── */}
            <div className="lg:col-span-4 space-y-4">

              {/* Contact Card */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <User className="h-3.5 w-3.5" />
                    Contato
                  </h3>
                  {!isEditing ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="text-emerald-500 hover:text-emerald-400 h-6 px-2 text-[10px]"
                    >
                      Editar
                    </Button>
                  ) : (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setIsEditing(false); setEditedDeal(deal); }}
                        className="text-muted-foreground h-6 px-2 text-[10px]"
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={updateDealMutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-500 h-6 px-2 text-white text-[10px]"
                      >
                        {updateDealMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  {/* Customer Name */}
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Nome do Cliente</Label>
                    {isEditing ? (
                      <Input
                        value={editedDeal?.customer_name || ""}
                        onChange={(e) => setEditedDeal({ ...editedDeal, customer_name: e.target.value })}
                        className="mt-1 h-8 text-sm"
                      />
                    ) : (
                      <p className="text-foreground font-medium text-sm mt-0.5">{deal.customer_name}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      Email
                    </Label>
                    {isEditing ? (
                      <Input
                        type="email"
                        value={editedDeal?.customer_email || ""}
                        onChange={(e) => setEditedDeal({ ...editedDeal, customer_email: e.target.value })}
                        placeholder="email@exemplo.com"
                        className="mt-1 h-8 text-sm"
                      />
                    ) : (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-sm text-foreground/80 truncate">
                          {deal.customer_email || <span className="text-muted-foreground italic">Não informado</span>}
                        </p>
                        {deal.customer_email && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(deal.customer_email!, "Email")}
                            className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      Telefone
                    </Label>
                    {isEditing ? (
                      <Input
                        value={editedDeal?.customer_phone || ""}
                        onChange={(e) => setEditedDeal({ ...editedDeal, customer_phone: e.target.value })}
                        placeholder="(00) 00000-0000"
                        className="mt-1 h-8 text-sm"
                      />
                    ) : (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-sm text-foreground/80">
                          {deal.customer_phone || <span className="text-muted-foreground italic">Não informado</span>}
                        </p>
                        {deal.customer_phone && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(deal.customer_phone!, "Telefone")}
                            className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Deal Details Card */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Briefcase className="h-3.5 w-3.5" />
                    Detalhes do Deal
                  </h3>
                </div>

                <div className="p-4 space-y-3">
                  {/* Title */}
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Título</Label>
                    {isEditing ? (
                      <Input
                        value={editedDeal?.title || ""}
                        onChange={(e) => setEditedDeal({ ...editedDeal, title: e.target.value })}
                        className="mt-1 h-8 text-sm"
                      />
                    ) : (
                      <p className="text-foreground font-medium text-sm mt-0.5">{deal.title}</p>
                    )}
                  </div>

                  {/* Value */}
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Valor
                    </Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editedDeal?.value || 0}
                        onChange={(e) => setEditedDeal({ ...editedDeal, value: parseFloat(e.target.value) })}
                        className="mt-1 h-8 text-sm"
                      />
                    ) : (
                      <p className="text-lg font-bold text-emerald-400 mt-0.5 tabular-nums">{formatCurrency(deal.value)}</p>
                    )}
                  </div>

                  {/* Probability */}
                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        Probabilidade
                      </Label>
                      <span className={`text-xs font-bold tabular-nums ${
                        (deal.probability || 0) >= 70 ? "text-emerald-400" : (deal.probability || 0) >= 40 ? "text-amber-400" : "text-rose-400"
                      }`}>{deal.probability || 0}%</span>
                    </div>
                    {isEditing ? (
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={editedDeal?.probability || 50}
                        onChange={(e) => setEditedDeal({ ...editedDeal, probability: parseInt(e.target.value) })}
                        className="mt-1 h-8 text-sm"
                      />
                    ) : (
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1.5">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            (deal.probability || 0) >= 70
                              ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                              : (deal.probability || 0) >= 40
                                ? "bg-gradient-to-r from-amber-500 to-amber-400"
                                : "bg-gradient-to-r from-rose-500 to-rose-400"
                          }`}
                          style={{ width: `${deal.probability || 0}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Expected Close Date */}
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Previsão de Fechamento
                    </Label>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={editedDeal?.expected_close_date || ""}
                        onChange={(e) => setEditedDeal({ ...editedDeal, expected_close_date: e.target.value })}
                        className="mt-1 h-8 text-sm"
                      />
                    ) : (
                      <p className={`text-sm mt-0.5 ${dealMetrics?.isOverdue ? "text-rose-400 font-semibold" : "text-foreground/80"}`}>
                        {deal.expected_close_date
                          ? format(new Date(deal.expected_close_date), "dd 'de' MMMM, yyyy", { locale: ptBR })
                          : <span className="text-muted-foreground italic">Não definida</span>
                        }
                        {dealMetrics?.isOverdue && (
                          <span className="ml-1 text-[10px] text-rose-400">({Math.abs(dealMetrics.daysUntilClose!)}d atrasado)</span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      Observações Gerais
                    </Label>
                    {isEditing ? (
                      <Textarea
                        value={editedDeal?.notes || ""}
                        onChange={(e) => setEditedDeal({ ...editedDeal, notes: e.target.value })}
                        className="mt-1 min-h-[80px] text-sm"
                        placeholder="Anotações gerais sobre o deal..."
                      />
                    ) : (
                      <p className="text-sm text-foreground/70 mt-0.5 whitespace-pre-wrap leading-relaxed">
                        {deal.notes || <span className="text-muted-foreground italic">Sem observações</span>}
                      </p>
                    )}
                  </div>

                  {/* Loss Reason (if closed_lost) */}
                  {deal.stage === "closed_lost" && deal.loss_reason && (
                    <div className="bg-rose-500/5 border border-rose-500/10 rounded-lg p-3">
                      <Label className="text-[10px] text-rose-400 uppercase tracking-wider flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        Motivo da Perda
                      </Label>
                      <p className="text-sm text-rose-300 mt-0.5">{deal.loss_reason}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Custom Fields */}
              <CustomFieldsSection dealId={id!} />

              {/* Seller Card */}
              {sellerProfile && (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-border">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Briefcase className="h-3.5 w-3.5" />
                      Responsável
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={sellerProfile.avatar_url || undefined} />
                        <AvatarFallback className="bg-emerald-500/20 text-emerald-300 text-sm font-bold">
                          {sellerProfile.nome?.substring(0, 2).toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{sellerProfile.nome}</p>
                        <p className="text-xs text-muted-foreground">{sellerProfile.email}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground mb-0.5">Criado em</p>
                    <p className="text-foreground/80 font-medium">
                      {format(new Date(deal.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                    <p className="text-muted-foreground/60 text-[10px]">
                      {format(new Date(deal.created_at), "HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Atualizado</p>
                    <p className="text-foreground/80 font-medium">
                      {formatDistanceToNow(new Date(deal.updated_at), { addSuffix: true, locale: ptBR })}
                    </p>
                    <p className="text-muted-foreground/60 text-[10px]">
                      {format(new Date(deal.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">ID do Deal</p>
                    <p className="text-foreground/60 font-mono text-[10px] truncate">{deal.id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Atividades</p>
                    <div className="flex items-center gap-2">
                      <span className="text-foreground/80 font-medium">{activities.length} registros</span>
                      <span className="text-muted-foreground">|</span>
                      <span className="text-foreground/80 font-medium">{notes.length} notas</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right Column — Tabs ────────────────────────── */}
            <div className="lg:col-span-8">
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <Tabs defaultValue="notes" className="w-full">
                  <TabsList className="w-full justify-start border-b border-border bg-transparent rounded-none p-0 h-auto">
                    <TabsTrigger
                      value="notes"
                      className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:text-foreground rounded-none px-4 sm:px-5 py-3 text-xs sm:text-sm gap-1.5"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Notas
                      {notes.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold tabular-nums">
                          {notes.length}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger
                      value="products"
                      className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:text-foreground rounded-none px-4 sm:px-5 py-3 text-xs sm:text-sm gap-1.5"
                    >
                      <Package className="h-3.5 w-3.5" />
                      Produtos
                      {productsCount > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 text-[10px] font-bold tabular-nums">
                          {productsCount}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger
                      value="history"
                      className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:text-foreground rounded-none px-4 sm:px-5 py-3 text-xs sm:text-sm gap-1.5"
                    >
                      <History className="h-3.5 w-3.5" />
                      Histórico
                      {activities.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold tabular-nums">
                          {activities.length}
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  {/* ── Notes Tab ──────────────────────────────── */}
                  <TabsContent value="notes" className="p-4 sm:p-5 space-y-4">
                    {/* Add Note */}
                    <div className="relative bg-muted/30 rounded-xl border border-border overflow-hidden">
                      <Textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Adicionar uma nota sobre esta negociação..."
                        className="min-h-[90px] bg-transparent border-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm placeholder:text-muted-foreground/50"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && newNote.trim()) {
                            addNoteMutation.mutate(newNote);
                          }
                        }}
                      />
                      <div className="flex items-center justify-between px-3 py-2 border-t border-border/50 bg-muted/20">
                        <span className="text-[10px] text-muted-foreground/50">Ctrl+Enter para enviar</span>
                        <Button
                          onClick={() => newNote.trim() && addNoteMutation.mutate(newNote)}
                          disabled={!newNote.trim() || addNoteMutation.isPending}
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-500 h-7 px-3 gap-1.5 text-xs"
                        >
                          {addNoteMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Send className="h-3 w-3" />
                              Enviar
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Notes List */}
                    <div className="space-y-3">
                      {notes.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
                          <p className="text-sm font-medium">Nenhuma nota ainda</p>
                          <p className="text-xs text-muted-foreground/60 mt-1">Registre o progresso desta negociação</p>
                        </div>
                      ) : (
                        notes.map((note, idx) => (
                          <motion.div
                            key={note.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className="bg-muted/20 rounded-lg p-3 border border-border/50 hover:border-border transition-colors group"
                          >
                            <div className="flex items-start gap-3">
                              <Avatar className="h-7 w-7 flex-shrink-0">
                                <AvatarImage src={note.profiles?.avatar_url || undefined} />
                                <AvatarFallback className="bg-emerald-500/20 text-emerald-300 text-[10px]">
                                  {note.profiles?.nome?.substring(0, 2).toUpperCase() || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-xs font-semibold text-foreground">
                                    {note.profiles?.nome || "Usuário"}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale: ptBR })}
                                  </span>
                                </div>
                                <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                                  {note.content}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </TabsContent>

                  {/* ── Products Tab ───────────────────────────── */}
                  <TabsContent value="products" className="p-4 sm:p-5">
                    {deal?.company_id && (
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
                    )}
                  </TabsContent>

                  {/* ── History Tab ────────────────────────────── */}
                  <TabsContent value="history" className="p-4 sm:p-5">
                    {activities.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <History className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        <p className="text-sm font-medium">Nenhuma atividade registrada</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">O histórico será preenchido conforme o deal evolui</p>
                      </div>
                    ) : (
                      <div className="relative">
                        {/* Timeline Line */}
                        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-emerald-500/30 via-border to-transparent" />

                        <div className="space-y-1">
                          {activities.map((activity, index) => (
                            <motion.div
                              key={activity.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.04 }}
                              className="relative flex gap-3 py-2.5 group"
                            >
                              {/* Timeline Node */}
                              <div className="relative z-10 flex-shrink-0">
                                <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center border-2 transition-all ${
                                  activity.activity_type === "won"
                                    ? "bg-emerald-500/20 border-emerald-500/50"
                                    : activity.activity_type === "lost"
                                      ? "bg-rose-500/20 border-rose-500/50"
                                      : activity.activity_type === "stage_changed"
                                        ? "bg-blue-500/20 border-blue-500/50"
                                        : activity.activity_type === "created"
                                          ? "bg-emerald-500/20 border-emerald-500/50"
                                          : "bg-muted border-border"
                                }`}>
                                  {getActivityIcon(activity.activity_type)}
                                </div>
                              </div>

                              {/* Content */}
                              <div className="flex-1 bg-muted/20 rounded-lg p-3 border border-border/30 group-hover:border-border/60 transition-colors -mt-0.5">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-sm text-foreground/90 leading-relaxed">{activity.description}</p>
                                  {activity.activity_type === "stage_changed" && activity.new_value && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/30 text-blue-400 whitespace-nowrap flex-shrink-0">
                                      {activity.new_value}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className="text-[10px] text-muted-foreground">
                                    {format(new Date(activity.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  </span>
                                  {activity.profiles && (
                                    <>
                                      <span className="text-muted-foreground/30">|</span>
                                      <span className="text-[10px] text-muted-foreground">
                                        {activity.profiles.nome}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lost Deal Modal */}
      <LostDealModal
        open={showLostModal}
        onClose={() => setShowLostModal(false)}
        onConfirm={handleLostDeal}
        dealTitle={deal.title}
      />
    </>
  );
}
