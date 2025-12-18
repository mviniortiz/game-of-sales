import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  MeasuringStrategy,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import {
  Plus,
  Target,
  TrendingUp,
  DollarSign,
  Users,
  CheckCircle,
  Sparkles,
  Settings2,
  AlertCircle,
  Zap,
  Star,
  XCircle,
  Search,
  Trash2,
  User,
  LucideIcon
} from "lucide-react";
import { syncWonDealToSale } from "@/utils/salesSync";
import { KanbanColumn } from "@/components/crm/KanbanColumn";
import { DealCard } from "@/components/crm/DealCard";
import { NewDealModal } from "@/components/crm/NewDealModal";
import { KanbanSkeleton } from "@/components/crm/KanbanSkeleton";
import { PipelineConfigModal, StageConfig } from "@/components/crm/PipelineConfigModal";
import { LostDealModal } from "@/components/crm/LostDealModal";
import { Confetti, CelebrationOverlay } from "@/components/crm/Confetti";

// Icon mapping
const ICON_MAP: Record<string, LucideIcon> = {
  target: Target,
  users: Users,
  dollar: DollarSign,
  trending: TrendingUp,
  check: CheckCircle,
  alert: AlertCircle,
  sparkles: Sparkles,
  zap: Zap,
  star: Star,
  x: XCircle,
};

// Color mapping
const COLOR_MAP: Record<string, { color: string; bgColor: string; borderColor: string }> = {
  gray: { color: "text-gray-400", bgColor: "bg-gray-500/10", borderColor: "border-gray-500/30" },
  blue: { color: "text-blue-400", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30" },
  indigo: { color: "text-indigo-400", bgColor: "bg-indigo-500/10", borderColor: "border-indigo-500/30" },
  purple: { color: "text-purple-400", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/30" },
  amber: { color: "text-amber-400", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/30" },
  emerald: { color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/30" },
  rose: { color: "text-rose-400", bgColor: "bg-rose-500/10", borderColor: "border-rose-500/30" },
  cyan: { color: "text-cyan-400", bgColor: "bg-cyan-500/10", borderColor: "border-cyan-500/30" },
};

// Valid database stage IDs - must match deal_stage enum in Supabase
const VALID_DB_STAGES = ["lead", "qualification", "proposal", "negotiation", "closed_won", "closed_lost"] as const;
type ValidDbStage = typeof VALID_DB_STAGES[number];

// Default stages configuration - IDs must match database enum
const DEFAULT_STAGES: StageConfig[] = [
  { id: "lead", title: "Lead", iconId: "target", colorId: "gray" },
  { id: "qualification", title: "Qualificação", iconId: "users", colorId: "blue" },
  { id: "proposal", title: "Proposta", iconId: "dollar", colorId: "indigo" },
  { id: "negotiation", title: "Negociação", iconId: "trending", colorId: "amber" },
  { id: "closed_won", title: "Ganho", iconId: "check", colorId: "emerald" },
];

// Convert StageConfig to Stage with icon and colors
const configToStage = (config: StageConfig) => {
  const colors = COLOR_MAP[config.colorId] || COLOR_MAP.gray;
  return {
    id: config.id,
    title: config.title,
    icon: ICON_MAP[config.iconId] || Target,
    ...colors,
  };
};

export type StageId = string;

export interface Stage {
  id: string;
  title: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
}

export interface Deal {
  id: string;
  title: string;
  value: number;
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  stage: StageId;
  position: number;
  user_id: string;
  company_id?: string | null;
  product_id?: string | null;
  notes?: string | null;
  expected_close_date?: string | null;
  probability: number;
  created_at: string;
  updated_at: string;
  profiles?: {
    nome: string;
    avatar_url?: string | null;
  } | null;
}

// LocalStorage key for pipeline config
const PIPELINE_CONFIG_KEY = "gamesales_pipeline_config_v2";
const LEGACY_PIPELINE_KEYS = ["vyzon_pipeline_config_v2"];

// Validate that loaded stages have valid structure (no longer filtering by enum)
const validateStages = (stages: StageConfig[]): StageConfig[] => {
  // Filter stages that have valid structure (id, title, iconId, colorId)
  const validStages = stages.filter(s => s.id && s.title && s.iconId && s.colorId);

  // If no valid stages, return defaults
  if (validStages.length === 0) {
    return DEFAULT_STAGES;
  }

  return validStages;
};

export default function CRM() {
  const { user, isSuperAdmin, companyId } = useAuth();
  const { activeCompanyId } = useTenant();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [localDeals, setLocalDeals] = useState<Deal[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [dealToLose, setDealToLose] = useState<Deal | null>(null);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState("");
  const [selectedSeller, setSelectedSeller] = useState<string>("all");
  const [dealToDelete, setDealToDelete] = useState<Deal | null>(null);

  // Load stages from localStorage or use defaults
  const [stageConfigs, setStageConfigs] = useState<StageConfig[]>(() => {
    if (typeof window === "undefined") return DEFAULT_STAGES;

    const saved =
      localStorage.getItem(PIPELINE_CONFIG_KEY) ??
      LEGACY_PIPELINE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const validated = validateStages(parsed);
        localStorage.setItem(PIPELINE_CONFIG_KEY, JSON.stringify(validated));
        LEGACY_PIPELINE_KEYS.forEach((key) => localStorage.removeItem(key));
        return validated;
      } catch {
        return DEFAULT_STAGES;
      }
    }

    return DEFAULT_STAGES;
  });

  // Convert configs to full stage objects
  const STAGES = useMemo(() => stageConfigs.map(configToStage), [stageConfigs]);

  const effectiveCompanyId = isSuperAdmin ? activeCompanyId : companyId;

  // Optimized sensors for fast, responsive drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // Start drag after 3px movement (faster activation)
        tolerance: 5,
      },
    })
  );

  // Save stages to localStorage when they change
  const handleSaveStages = (newConfigs: StageConfig[]) => {
    setStageConfigs(newConfigs);
    localStorage.setItem(PIPELINE_CONFIG_KEY, JSON.stringify(newConfigs));
    LEGACY_PIPELINE_KEYS.forEach((key) => localStorage.removeItem(key));
  };

  // Fetch deals
  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["deals", effectiveCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("deals")
        .select("*")
        .order("position", { ascending: true });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching deals:", error);
        throw error;
      }

      // Fetch profiles separately for each unique user_id
      const userIds = [...new Set((data || []).map(d => d.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nome, avatar_url")
        .in("id", userIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Map to our Deal interface
      return (data || []).map((d: any) => ({
        id: d.id,
        title: d.title || "Sem título",
        value: d.value || 0,
        customer_name: d.customer_name || "Cliente",
        customer_email: d.customer_email,
        customer_phone: d.customer_phone,
        stage: d.stage,
        position: d.position || 0,
        user_id: d.user_id,
        company_id: d.company_id,
        product_id: d.product_id,
        notes: d.notes,
        expected_close_date: d.expected_close_date,
        probability: d.probability || 50,
        created_at: d.created_at,
        updated_at: d.updated_at,
        profiles: profilesMap.get(d.user_id) || null,
      })) as Deal[];
    },
    refetchInterval: 15000,
    staleTime: 0,
  });

  useEffect(() => {
    setLocalDeals(deals);
    queryClient.setQueryData(["deals", effectiveCompanyId], deals);
  }, [deals, queryClient, effectiveCompanyId]);

  // Fetch vendors for filter
  const { data: vendors = [] } = useQuery({
    queryKey: ["crm-vendors", effectiveCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, nome, avatar_url")
        .order("nome");

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveCompanyId || isSuperAdmin,
  });

  // Delete deal mutation
  const deleteDealMutation = useMutation({
    mutationFn: async (dealId: string) => {
      const { error } = await supabase
        .from("deals")
        .delete()
        .eq("id", dealId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals", effectiveCompanyId] });
      toast.success("Negociação excluída com sucesso!");
      setDealToDelete(null);
    },
    onError: (error: any) => {
      console.error("Error deleting deal:", error);
      toast.error("Erro ao excluir negociação");
    },
  });

  const reorderDealsOptimistic = (
    currentDeals: Deal[],
    draggedId: string,
    targetStage: StageId,
    targetPosition: number
  ): Deal[] => {
    if (!currentDeals.length) return currentDeals;

    const working = currentDeals.map((d) => ({ ...d }));
    const draggedIndex = working.findIndex((d) => d.id === draggedId);
    if (draggedIndex === -1) return currentDeals;

    const dragged = { ...working[draggedIndex], stage: targetStage };
    working.splice(draggedIndex, 1);

    const grouped: Record<string, Deal[]> = {};
    working.forEach((d) => {
      if (!grouped[d.stage]) grouped[d.stage] = [];
      grouped[d.stage].push(d);
    });

    const stageList = grouped[targetStage] || [];
    const insertPos = Math.max(0, Math.min(targetPosition, stageList.length));
    stageList.splice(insertPos, 0, dragged);
    grouped[targetStage] = stageList;

    const ordered: Deal[] = [];
    STAGES.forEach((s) => {
      const list = grouped[s.id] || [];
      list.forEach((d, idx) => {
        ordered.push({ ...d, position: idx });
      });
    });

    Object.keys(grouped).forEach((sid) => {
      if (!STAGES.find((s) => s.id === sid)) {
        grouped[sid].forEach((d, idx) => ordered.push({ ...d, position: idx }));
      }
    });

    return ordered;
  };

  const applyOptimisticMove = (
    draggedId: string,
    targetStage: StageId,
    targetPosition: number
  ) => {
    const previousDeals = localDeals;
    const reordered = reorderDealsOptimistic(previousDeals, draggedId, targetStage, targetPosition);
    setLocalDeals(reordered);
    queryClient.setQueryData(["deals", effectiveCompanyId], reordered);
    return previousDeals;
  };

  // Update deal mutation
  const updateDealMutation = useMutation({
    mutationFn: async ({ id, stage, position, deal }: { id: string; stage: string; position: number; deal?: Deal; previousDeals?: Deal[] }) => {
      const { error } = await supabase
        .from("deals")
        .update({ stage: stage as any, position })
        .eq("id", id);

      if (error) throw error;

      if (stage === "closed_won" && deal) {
        // Trigger celebration
        setCelebrationMessage(`🎉 ${deal.title} Ganho!`);
        setShowConfetti(true);

        try {
          await syncWonDealToSale(deal, queryClient);
          toast.success("Deal ganho e venda sincronizada!");
        } catch (syncError) {
          console.error("Erro ao sincronizar venda do deal:", syncError);
          toast.error("Deal ganho, mas a venda não foi sincronizada.");
        }
      }
    },
    onMutate: async ({ previousDeals }) => {
      return { previousDeals };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousDeals) {
        setLocalDeals(context.previousDeals);
        queryClient.setQueryData(["deals", effectiveCompanyId], context.previousDeals);
      }
      toast.error("Erro ao mover deal");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["deals", effectiveCompanyId] });
    },
  });

  // Group deals by stage
  const dealsByStage = useMemo(() => {
    const grouped: Record<string, Deal[]> = {};

    // Initialize all stages
    STAGES.forEach(stage => {
      grouped[stage.id] = [];
    });

    // First filter by seller
    let dealsToFilter = selectedSeller === "all"
      ? localDeals
      : localDeals.filter(deal => deal.user_id === selectedSeller);

    // Then filter by search query
    if (searchQuery.trim()) {
      dealsToFilter = dealsToFilter.filter(deal =>
        deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Group deals
    dealsToFilter.forEach((deal) => {
      if (grouped[deal.stage]) {
        grouped[deal.stage].push(deal);
      } else {
        // If deal has unknown stage, put in first stage
        if (STAGES.length > 0) {
          grouped[STAGES[0].id].push(deal);
        }
      }
    });

    // Sort each stage by position
    Object.keys(grouped).forEach((stage) => {
      grouped[stage].sort((a, b) => a.position - b.position);
    });

    return grouped;
  }, [localDeals, STAGES, searchQuery, selectedSeller]);

  // Calculate totals per stage (from filtered deals)
  const stageTotals = useMemo(() => {
    const totals: Record<string, { count: number; value: number }> = {};

    STAGES.forEach(stage => {
      totals[stage.id] = { count: 0, value: 0 };
    });

    // Use the same filtering as dealsByStage
    let dealsToCount = selectedSeller === "all"
      ? localDeals
      : localDeals.filter(deal => deal.user_id === selectedSeller);

    if (searchQuery.trim()) {
      dealsToCount = dealsToCount.filter(deal =>
        deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    dealsToCount.forEach((deal) => {
      if (totals[deal.stage]) {
        totals[deal.stage].count++;
        totals[deal.stage].value += Number(deal.value) || 0;
      }
    });

    return totals;
  }, [localDeals, STAGES, selectedSeller, searchQuery]);

  // Get the active deal for drag overlay
  const activeDeal = activeId ? localDeals.find((d) => d.id === activeId) : null;

  // DnD handlers - optimized for speed
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);

    // Add grabbing cursor to body during drag
    document.body.style.cursor = 'grabbing';
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // Reset cursor
    document.body.style.cursor = '';
    setActiveId(null);

    if (!over) return;

    const draggedId = active.id as string;
    const overId = over.id as string;

    // Find the deal being dragged
    const draggedDeal = localDeals.find((d) => d.id === draggedId);
    if (!draggedDeal) return;

    // Determine target stage
    let targetStage: StageId;
    let targetIndex: number;

    // Check if dropped on a column
    const isColumn = STAGES.some((s) => s.id === overId);

    if (isColumn) {
      targetStage = overId;
      targetIndex = dealsByStage[targetStage]?.length || 0;
    } else {
      // Dropped on another deal
      const overDeal = localDeals.find((d) => d.id === overId);
      if (!overDeal) return;

      targetStage = overDeal.stage;
      const targetList = dealsByStage[targetStage] || [];
      const idx = targetList.findIndex(d => d.id === overId);
      targetIndex = idx >= 0 ? idx : targetList.length;
    }

    // Only update if stage changed (optimistic update)
    if (draggedDeal.stage !== targetStage) {
      const previousDeals = applyOptimisticMove(draggedId, targetStage, targetIndex);
      updateDealMutation.mutate({
        id: draggedId,
        stage: targetStage,
        position: targetIndex,
        deal: draggedDeal,
        previousDeals,
      });
    }
  };

  const handleDragCancel = () => {
    document.body.style.cursor = '';
    setActiveId(null);
  };

  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}k`;
    }
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Filter deals by selected seller
  const filteredDeals = useMemo(() => {
    if (selectedSeller === "all") return localDeals;
    return localDeals.filter(deal => deal.user_id === selectedSeller);
  }, [localDeals, selectedSeller]);

  // Calculate pipeline total (from filtered deals)
  const pipelineTotal = filteredDeals.reduce((acc, deal) => acc + (Number(deal.value) || 0), 0);

  const sortedDealsForList = useMemo(() => {
    return [...filteredDeals].sort((a, b) => {
      const aDate = new Date(a.updated_at || a.created_at || 0).getTime();
      const bDate = new Date(b.updated_at || b.created_at || 0).getTime();
      return bDate - aDate;
    });
  }, [filteredDeals]);

  const renderStageBadge = (stageId: string) => {
    const stage = STAGES.find((s) => s.id === stageId);
    if (!stage) return null;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${stage.bgColor} ${stage.borderColor} ${stage.color.replace("text-", "ring-")} ring-1`}>
        <stage.icon className="h-3 w-3" />
        {stage.title}
      </span>
    );
  };

  return (
    <AppLayout>
      <div className="h-[calc(100vh-64px)] flex flex-col bg-background text-foreground">
        {/* Header - Premium Style */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:py-5 border-b border-border bg-card backdrop-blur-sm shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 ring-1 ring-indigo-100 dark:ring-indigo-500/20">
              <Target className="h-4 sm:h-5 w-4 sm:w-5 text-indigo-600 dark:text-indigo-200" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                <span className="hidden sm:inline">Pipeline de Vendas</span>
                <span className="sm:hidden">Pipeline</span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-200 dark:ring-indigo-500/20">
                  <Sparkles className="h-3 w-3" />
                  Live
                </span>
              </h1>
              <p className="text-xs sm:text-[13px] text-muted-foreground font-medium mt-0.5">
                {isLoading ? "Carregando..." : (
                  <>{deals.length} deals • <span className="text-emerald-600 dark:text-emerald-300">{formatCurrency(pipelineTotal)}</span></>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-1 bg-muted px-1 py-1 rounded-lg border border-border">
              <Button
                variant={viewMode === "kanban" ? "default" : "ghost"}
                size="sm"
                className="h-8"
                onClick={() => setViewMode("kanban")}
              >
                Kanban
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                className="h-8"
                onClick={() => setViewMode("list")}
              >
                Lista
              </Button>
            </div>

            {/* Seller Filter */}
            <Select value={selectedSeller} onValueChange={setSelectedSeller}>
              <SelectTrigger className="w-40 h-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                <User className="h-4 w-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Vendedor" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <SelectItem value="all">Todos</SelectItem>
                {vendors.map((vendor: any) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search Input */}
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <Input
                type="text"
                placeholder="Buscar deals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 pl-9 h-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-indigo-500"
              />
            </div>

            {/* Config Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfig(true)}
              className="border-border hover:bg-muted text-foreground h-9"
            >
              <Settings2 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Configurar</span>
            </Button>

            {/* New Deal Button */}
            <Button
              size="sm"
              onClick={() => setShowNewDeal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-200 h-9"
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Novo Deal</span>
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-x-auto overflow-y-auto sm:overflow-y-hidden scrollbar-thin">
          {isLoading ? (
            <KanbanSkeleton />
          ) : viewMode === "kanban" ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
              measuring={{
                droppable: {
                  strategy: MeasuringStrategy.Always,
                },
              }}
            >
              <div className="flex gap-3 sm:gap-5 p-4 sm:p-6 h-full min-w-max">
                {STAGES.map((stage) => (
                  <KanbanColumn
                    key={stage.id}
                    stage={stage}
                    deals={dealsByStage[stage.id] || []}
                    total={stageTotals[stage.id] || { count: 0, value: 0 }}
                    formatCurrency={formatCurrency}
                  />
                ))}
              </div>

              {/* Drag Overlay - Fast animation */}
              <DragOverlay
                dropAnimation={{
                  duration: 70,
                  easing: 'ease-out',
                }}
                modifiers={[]}
              >
                {activeDeal ? (
                  <DealCard
                    deal={activeDeal}
                    isDragging
                    formatCurrency={formatCurrency}
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : (
            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 max-w-6xl">
              {sortedDealsForList.length === 0 && (
                <div className="text-muted-foreground text-sm">Nenhum deal cadastrado.</div>
              )}
              {sortedDealsForList.map((deal) => (
                <div
                  key={deal.id}
                  className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-sm hover:border-indigo-500/30 hover:shadow-md transition-all"
                >
                  <div className="flex flex-col gap-3 sm:gap-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="text-base sm:text-lg font-semibold text-foreground">
                        {deal.title || "Sem título"}
                      </div>
                      {renderStageBadge(deal.stage)}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm text-foreground">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Cliente</span>
                        <span>{deal.customer_name || "Cliente"}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Valor</span>
                        <span className="text-emerald-600 dark:text-emerald-300 font-semibold">{formatCurrency(Number(deal.value) || 0)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Probabilidade</span>
                        <span>{deal.probability || 0}%</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Atualizado</span>
                        <span>{deal.updated_at ? new Date(deal.updated_at).toLocaleString("pt-BR") : "-"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                        onClick={() => {
                          if (confirm(`Tem certeza que deseja excluir a negociação "${deal.title}"?`)) {
                            deleteDealMutation.mutate(deal.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/deals/${deal.id}`)}>
                        Ver detalhes
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Deal Modal */}
      <NewDealModal
        open={showNewDeal}
        onClose={() => setShowNewDeal(false)}
        onSuccess={() => {
          setShowNewDeal(false);
          queryClient.invalidateQueries({ queryKey: ["deals"] });
        }}
        stages={STAGES}
      />

      {/* Pipeline Config Modal */}
      <PipelineConfigModal
        open={showConfig}
        onClose={() => setShowConfig(false)}
        stages={stageConfigs}
        onSave={handleSaveStages}
      />

      {/* Lost Deal Modal */}
      <LostDealModal
        open={showLostModal}
        onClose={() => {
          setShowLostModal(false);
          setDealToLose(null);
        }}
        onConfirm={async (reason) => {
          if (!dealToLose) return;
          await supabase
            .from("deals")
            .update({
              stage: "closed_lost" as any,
              loss_reason: reason
            })
            .eq("id", dealToLose.id);
          queryClient.invalidateQueries({ queryKey: ["deals"] });
          setShowLostModal(false);
          setDealToLose(null);
          toast.success("Deal marcado como perdido");
        }}
        dealTitle={dealToLose?.title || ""}
      />

      {/* Confetti Celebration */}
      <Confetti
        show={showConfetti}
        onComplete={() => setShowConfetti(false)}
      />
      <CelebrationOverlay
        show={showConfetti}
        message={celebrationMessage}
      />
    </AppLayout>
  );
}
