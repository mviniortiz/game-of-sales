import { useState, useMemo, useEffect } from "react";
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
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
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
  LucideIcon
} from "lucide-react";
import { KanbanColumn } from "@/components/crm/KanbanColumn";
import { DealCard } from "@/components/crm/DealCard";
import { NewDealModal } from "@/components/crm/NewDealModal";
import { KanbanSkeleton } from "@/components/crm/KanbanSkeleton";
import { PipelineConfigModal, StageConfig } from "@/components/crm/PipelineConfigModal";
import { LostDealModal } from "@/components/crm/LostDealModal";

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

// Valid database stage IDs - these MUST match the deal_stage enum in Supabase
export const VALID_DB_STAGES = ["lead", "qualification", "proposal", "negotiation", "closed_won", "closed_lost"] as const;
export type ValidDbStage = typeof VALID_DB_STAGES[number];

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
const PIPELINE_CONFIG_KEY = "vyzon_pipeline_config_v2";

// Validate that loaded stages have valid IDs
const validateStages = (stages: StageConfig[]): StageConfig[] => {
  const validIds = new Set(VALID_DB_STAGES);
  const validStages = stages.filter(s => validIds.has(s.id as ValidDbStage));
  
  // If no valid stages, return defaults
  if (validStages.length === 0) {
    return DEFAULT_STAGES;
  }
  
  // Ensure all default stages exist (in case some are missing)
  const existingIds = new Set(validStages.map(s => s.id));
  DEFAULT_STAGES.forEach(defaultStage => {
    if (!existingIds.has(defaultStage.id)) {
      validStages.push(defaultStage);
    }
  });
  
  return validStages;
};

export default function CRM() {
  const { user, isSuperAdmin, companyId } = useAuth();
  const { activeCompanyId } = useTenant();
  const queryClient = useQueryClient();
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [dealToLose, setDealToLose] = useState<Deal | null>(null);
  
  // Load stages from localStorage or use defaults
  const [stageConfigs, setStageConfigs] = useState<StageConfig[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(PIPELINE_CONFIG_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return validateStages(parsed);
        } catch {
          return DEFAULT_STAGES;
        }
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
    refetchInterval: 30000,
  });

  // Update deal mutation
  const updateDealMutation = useMutation({
    mutationFn: async ({ id, stage, position }: { id: string; stage: string; position: number }) => {
      const { error } = await supabase
        .from("deals")
        .update({ stage: stage as any, position })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
    onError: () => {
      toast.error("Erro ao mover deal");
    },
  });

  // Group deals by stage
  const dealsByStage = useMemo(() => {
    const grouped: Record<string, Deal[]> = {};
    
    // Initialize all stages
    STAGES.forEach(stage => {
      grouped[stage.id] = [];
    });

    // Group deals
    deals.forEach((deal) => {
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
  }, [deals, STAGES]);

  // Calculate totals per stage
  const stageTotals = useMemo(() => {
    const totals: Record<string, { count: number; value: number }> = {};
    
    STAGES.forEach(stage => {
      totals[stage.id] = { count: 0, value: 0 };
    });

    deals.forEach((deal) => {
      if (totals[deal.stage]) {
        totals[deal.stage].count++;
        totals[deal.stage].value += Number(deal.value) || 0;
      }
    });

    return totals;
  }, [deals, STAGES]);

  // Get the active deal for drag overlay
  const activeDeal = activeId ? deals.find((d) => d.id === activeId) : null;

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
    const draggedDeal = deals.find((d) => d.id === draggedId);
    if (!draggedDeal) return;

    // Determine target stage
    let targetStage: StageId;
    let targetPosition: number;

    // Check if dropped on a column
    const isColumn = STAGES.some((s) => s.id === overId);
    
    if (isColumn) {
      targetStage = overId;
      targetPosition = dealsByStage[targetStage]?.length || 0;
    } else {
      // Dropped on another deal
      const overDeal = deals.find((d) => d.id === overId);
      if (!overDeal) return;
      
      targetStage = overDeal.stage;
      targetPosition = overDeal.position;
    }

    // Only update if stage changed (optimistic update)
    if (draggedDeal.stage !== targetStage) {
      updateDealMutation.mutate({
        id: draggedId,
        stage: targetStage,
        position: targetPosition,
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

  // Calculate pipeline total
  const pipelineTotal = deals.reduce((acc, deal) => acc + (Number(deal.value) || 0), 0);

  return (
    <AppLayout>
      <div className="h-[calc(100vh-64px)] flex flex-col bg-slate-950">
        {/* Header - Premium Style */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-indigo-500/10 ring-1 ring-indigo-500/20">
              <Target className="h-4 sm:h-5 w-4 sm:w-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span className="hidden sm:inline">Pipeline de Vendas</span>
                <span className="sm:hidden">Pipeline</span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-indigo-500/20">
                  <Sparkles className="h-3 w-3" />
                  Live
                </span>
              </h1>
              <p className="text-xs sm:text-[13px] text-slate-500 font-medium mt-0.5">
                {isLoading ? "Carregando..." : (
                  <>{deals.length} deals • <span className="text-emerald-400">{formatCurrency(pipelineTotal)}</span></>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Config Button */}
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setShowConfig(true)}
              className="border-slate-700 hover:bg-slate-800 text-slate-300 h-9"
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

        {/* Kanban Board - Full Height with Custom Scrollbar */}
        <div className="flex-1 overflow-x-auto overflow-y-auto sm:overflow-y-hidden scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700 hover:scrollbar-thumb-slate-600">
          {isLoading ? (
            <KanbanSkeleton />
          ) : (
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
                  duration: 150,
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
    </AppLayout>
  );
}
