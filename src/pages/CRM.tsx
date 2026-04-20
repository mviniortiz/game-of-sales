import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { logger } from "@/utils/logger";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  MeasuringStrategy,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useNavigate } from "react-router-dom";
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
  LucideIcon,
  Flame,
  Clock,
  Filter,
  X,
  CalendarDays,
  ChevronDown,
  CheckSquare,
  ArrowRightCircle,
  UserPlus,
  CheckCheck,
} from "lucide-react";
import { differenceInDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { syncWonDealToSale, unsyncDealSale } from "@/utils/salesSync";
import { KanbanColumn } from "@/components/crm/KanbanColumn";
import { DealCard } from "@/components/crm/DealCard";
import { NewDealModal } from "@/components/crm/NewDealModal";
import { KanbanSkeleton } from "@/components/crm/KanbanSkeleton";
import { PipelineConfigModal, StageConfig } from "@/components/crm/PipelineConfigModal";
import { LostDealModal } from "@/components/crm/LostDealModal";
import { WinCelebration } from "@/components/crm/WinCelebration";
import { useDealTags } from "@/hooks/useDealTags";

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
  indigo: { color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/30" },
  purple: { color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/30" },
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
  { id: "closed_lost", title: "Perdido", iconId: "target", colorId: "gray" },
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

export interface DealLastActivity {
  type: "note" | "call" | "stage_change" | "update";
  text: string;
  date: string;
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
  is_hot?: boolean | null;
  assignee_outside_company?: boolean;
  lastActivity?: DealLastActivity | null;
}

// LocalStorage key for pipeline config - now includes company ID
const PIPELINE_CONFIG_KEY_PREFIX = "vyzon_pipeline_config_v3_";
const LEGACY_PIPELINE_KEYS = ["vyzon_pipeline_config_v2", "vyzon_pipeline_config_v2"];

// Helper to get company-specific key
const getPipelineConfigKey = (companyId: string | null) =>
  companyId ? `${PIPELINE_CONFIG_KEY_PREFIX}${companyId}` : null;

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
  // Mobile-first: default to list on small screens
  const [viewMode, setViewMode] = useState<"kanban" | "list">(() =>
    typeof window !== "undefined" && window.innerWidth < 640 ? "list" : "kanban"
  );
  // Mobile kanban: track visible column
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const kanbanScrollRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState("");
  const [celebrationValue, setCelebrationValue] = useState(0);
  const [selectedSeller, setSelectedSeller] = useState<string>("all");
  const [dealToDelete, setDealToDelete] = useState<Deal | null>(null);

  // Advanced filter state
  const [filterHotDeals, setFilterHotDeals] = useState(false);
  const [filterRottingDeals, setFilterRottingDeals] = useState(false);
  const [filterProbability, setFilterProbability] = useState<"all" | "high" | "medium" | "low">("all");
  const [filterDateRange, setFilterDateRange] = useState<"all" | "this_week" | "this_month" | "overdue">("all");
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Rotting notifications state
  const [rottingBannerDismissed, setRottingBannerDismissed] = useState(false);

  // Bulk actions state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedDeals, setSelectedDeals] = useState<Set<string>>(new Set());
  const [showBulkMoveMenu, setShowBulkMoveMenu] = useState(false);
  const [showBulkAssignMenu, setShowBulkAssignMenu] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const bulkMoveRef = useRef<HTMLDivElement>(null);
  const bulkAssignRef = useRef<HTMLDivElement>(null);

  const effectiveCompanyId = isSuperAdmin ? activeCompanyId : companyId;

  // Tags for filtering
  const { data: companyTags = [] } = useDealTags(effectiveCompanyId);

  // Count active advanced filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterHotDeals) count++;
    if (filterRottingDeals) count++;
    if (filterProbability !== "all") count++;
    if (filterDateRange !== "all") count++;
    if (filterTagIds.length > 0) count++;
    return count;
  }, [filterHotDeals, filterRottingDeals, filterProbability, filterDateRange, filterTagIds]);

  const clearAllFilters = useCallback(() => {
    setFilterHotDeals(false);
    setFilterRottingDeals(false);
    setFilterProbability("all");
    setFilterDateRange("all");
    setFilterTagIds([]);
  }, []);

  // Fetch deal-tag assignments for filtering
  const { data: dealTagAssignments = [] } = useQuery({
    queryKey: ["deal-tag-assignments", effectiveCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_tag_assignments")
        .select("deal_id, tag_id");
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveCompanyId || isSuperAdmin,
    staleTime: 30000,
  });

  // Build a fast lookup: dealId → Set<tagId>
  const dealTagMap = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const a of dealTagAssignments) {
      if (!m.has(a.deal_id)) m.set(a.deal_id, new Set());
      m.get(a.deal_id)!.add(a.tag_id);
    }
    return m;
  }, [dealTagAssignments]);

  // Apply advanced filters to a deals array
  const applyAdvancedFilters = useCallback((dealsArr: Deal[]): Deal[] => {
    let result = dealsArr;

    if (filterHotDeals) {
      result = result.filter((d) => d.is_hot === true);
    }

    if (filterRottingDeals) {
      const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
      result = result.filter((d) => {
        const updatedAt = d.updated_at ? new Date(d.updated_at).getTime() : 0;
        return updatedAt < threeDaysAgo;
      });
    }

    if (filterProbability === "high") {
      result = result.filter((d) => d.probability >= 70);
    } else if (filterProbability === "medium") {
      result = result.filter((d) => d.probability >= 30 && d.probability < 70);
    } else if (filterProbability === "low") {
      result = result.filter((d) => d.probability < 30);
    }

    if (filterDateRange !== "all") {
      const now = new Date();
      if (filterDateRange === "this_week") {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        result = result.filter((d) => {
          const created = new Date(d.created_at);
          return created >= startOfWeek;
        });
      } else if (filterDateRange === "this_month") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        result = result.filter((d) => {
          const created = new Date(d.created_at);
          return created >= startOfMonth;
        });
      } else if (filterDateRange === "overdue") {
        result = result.filter((d) => {
          if (!d.expected_close_date) return false;
          return new Date(d.expected_close_date) < now;
        });
      }
    }

    // Tag filter
    if (filterTagIds.length > 0) {
      result = result.filter((d) => {
        const tags = dealTagMap.get(d.id);
        if (!tags) return false;
        return filterTagIds.every((tid) => tags.has(tid));
      });
    }

    return result;
  }, [filterHotDeals, filterRottingDeals, filterProbability, filterDateRange, filterTagIds, dealTagMap]);

  // Load stages from localStorage based on company - defaults if none found
  const [stageConfigs, setStageConfigs] = useState<StageConfig[]>(DEFAULT_STAGES);

  // Reload stages when company changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const configKey = getPipelineConfigKey(effectiveCompanyId);

    if (!configKey) {
      // No company context - use defaults
      setStageConfigs(DEFAULT_STAGES);
      return;
    }

    const saved = localStorage.getItem(configKey);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const validated = validateStages(parsed);
        setStageConfigs(validated);
      } catch {
        setStageConfigs(DEFAULT_STAGES);
      }
    } else {
      // No saved config for this company - use defaults
      setStageConfigs(DEFAULT_STAGES);
    }

    // Clean up legacy keys (one-time migration)
    LEGACY_PIPELINE_KEYS.forEach((key) => localStorage.removeItem(key));
  }, [effectiveCompanyId]);

  // Convert configs to full stage objects
  const STAGES = useMemo(() => stageConfigs.map(configToStage), [stageConfigs]);

  // Optimized sensors for fast, responsive drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6, // Slightly higher threshold reduces accidental/jittery drags
      },
    })
  );

  // Save stages to localStorage when they change - now company-specific
  const handleSaveStages = (newConfigs: StageConfig[]) => {
    setStageConfigs(newConfigs);
    const configKey = getPipelineConfigKey(effectiveCompanyId);
    if (configKey) {
      localStorage.setItem(configKey, JSON.stringify(newConfigs));
    }
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
        logger.error("Error fetching deals:", error);
        throw error;
      }

      // Fetch profiles separately for each unique user_id, scoped to the current
      // company to avoid leaking seller names/avatars from another org when a deal
      // is incorrectly assigned.
      const userIds = [...new Set((data || []).map((d) => d.user_id).filter(Boolean))];
      let profiles: Array<{ id: string; nome: string; avatar_url?: string | null }> = [];

      if (userIds.length > 0) {
        let profilesQuery = supabase
          .from("profiles")
          .select("id, nome, avatar_url")
          .in("id", userIds);

        if (effectiveCompanyId) {
          profilesQuery = profilesQuery.eq("company_id", effectiveCompanyId);
        }

        const { data: scopedProfiles, error: profilesError } = await profilesQuery;
        if (profilesError) {
          logger.error("Error fetching deal profiles:", profilesError);
        } else {
          profiles = scopedProfiles || [];
        }
      }

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Fetch latest activities and notes for all deals (batch, avoids N+1)
      const dealIds = (data || []).map((d: any) => d.id);
      const activitiesMap = new Map<string, DealLastActivity>();

      if (dealIds.length > 0) {
        // Activities e notes são enriquecimento opcional — se falhar, log pra
        // diagnóstico e segue a renderização do CRM sem travar a lista de deals.
        const { data: activitiesData, error: activitiesError } = await (supabase as any)
          .from("deal_activities")
          .select("deal_id, activity_type, description, old_value, new_value, created_at")
          .in("deal_id", dealIds)
          .order("created_at", { ascending: false });

        if (activitiesError) {
          console.warn("[CRM] deal_activities fetch failed:", activitiesError.message);
        } else if (activitiesData) {
          for (const a of activitiesData as any[]) {
            if (!activitiesMap.has(a.deal_id)) {
              const isStageChange = a.activity_type === "stage_change";
              activitiesMap.set(a.deal_id, {
                type: isStageChange ? "stage_change" : (a.activity_type === "call" ? "call" : "note"),
                text: a.description || (isStageChange ? `${a.old_value || "?"} → ${a.new_value || "?"}` : "Atividade"),
                date: a.created_at,
              });
            }
          }
        }

        const { data: notesData, error: notesError } = await (supabase as any)
          .from("deal_notes")
          .select("deal_id, content, created_at")
          .in("deal_id", dealIds)
          .order("created_at", { ascending: false });

        if (notesError) {
          console.warn("[CRM] deal_notes fetch failed:", notesError.message);
        } else if (notesData) {
          for (const n of notesData as any[]) {
            const existing = activitiesMap.get(n.deal_id);
            if (!existing || new Date(n.created_at) > new Date(existing.date)) {
              activitiesMap.set(n.deal_id, {
                type: "note",
                text: n.content || "Nota",
                date: n.created_at,
              });
            }
          }
        }
      }

      // Map to our Deal interface
      return (data || []).map((d: any) => {
        const sellerProfile = profilesMap.get(d.user_id) || null;
        return {
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
        is_hot: d.is_hot || false,
        profiles: sellerProfile,
        assignee_outside_company: !!effectiveCompanyId && !!d.user_id && !sellerProfile,
        lastActivity: activitiesMap.get(d.id) || null,
      };
      }) as Deal[];
    },
    refetchInterval: 30000,
    staleTime: 15000,
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
      const deal = localDeals.find((d) => d.id === dealId);

      // If this deal had generated an automatic sale, remove it first to keep
      // dashboard/goals consistent when deleting the deal entirely.
      if (deal) {
        await unsyncDealSale(deal.id, deal.user_id, queryClient);
      }

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
      logger.error("Error deleting deal:", error);
      toast.error(error?.message || "Erro ao excluir negociação");
    },
  });

  // ── Selection helpers ───────────────────────────────────
  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => {
      if (prev) {
        setSelectedDeals(new Set());
        setShowBulkMoveMenu(false);
        setShowBulkAssignMenu(false);
        setShowBulkDeleteConfirm(false);
      }
      return !prev;
    });
  }, []);

  const toggleSelectDeal = useCallback((dealId: string) => {
    setSelectedDeals((prev) => {
      const next = new Set(prev);
      if (next.has(dealId)) next.delete(dealId);
      else next.add(dealId);
      return next;
    });
  }, []);

  // All visible deals (after filters)
  const allVisibleDealIds = useMemo(() => {
    let dealsToShow = selectedSeller === "all" ? localDeals : localDeals.filter((d) => d.user_id === selectedSeller);
    if (searchQuery.trim()) {
      dealsToShow = dealsToShow.filter(
        (d) =>
          d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    dealsToShow = applyAdvancedFilters(dealsToShow);
    return dealsToShow.map((d) => d.id);
  }, [localDeals, selectedSeller, searchQuery, applyAdvancedFilters]);

  const selectAll = useCallback(() => {
    setSelectedDeals(new Set(allVisibleDealIds));
  }, [allVisibleDealIds]);

  const deselectAll = useCallback(() => {
    setSelectedDeals(new Set());
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    if (!showBulkMoveMenu && !showBulkAssignMenu) return;
    const handler = (e: MouseEvent) => {
      if (bulkMoveRef.current && !bulkMoveRef.current.contains(e.target as Node)) {
        setShowBulkMoveMenu(false);
      }
      if (bulkAssignRef.current && !bulkAssignRef.current.contains(e.target as Node)) {
        setShowBulkAssignMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showBulkMoveMenu, showBulkAssignMenu]);

  // ── Bulk mutations ─────────────────────────────────────
  const bulkMoveMutation = useMutation({
    mutationFn: async ({ dealIds, targetStage }: { dealIds: string[]; targetStage: string }) => {
      const { error } = await supabase
        .from("deals")
        .update({ stage: targetStage as any })
        .in("id", dealIds);
      if (error) throw error;
      return dealIds.length;
    },
    onSuccess: (count, { targetStage }) => {
      const stage = STAGES.find((s) => s.id === targetStage);
      queryClient.invalidateQueries({ queryKey: ["deals", effectiveCompanyId] });
      setSelectedDeals(new Set());
      setShowBulkMoveMenu(false);
      toast.success(`${count} negociações movidas para "${stage?.title || targetStage}"`);
    },
    onError: () => {
      toast.error("Erro ao mover negociações em lote");
    },
  });

  const bulkAssignMutation = useMutation({
    mutationFn: async ({ dealIds, userId }: { dealIds: string[]; userId: string }) => {
      const { error } = await supabase
        .from("deals")
        .update({ user_id: userId })
        .in("id", dealIds);
      if (error) throw error;
      return dealIds.length;
    },
    onSuccess: (count, { userId }) => {
      const vendor = vendors.find((v: any) => v.id === userId);
      queryClient.invalidateQueries({ queryKey: ["deals", effectiveCompanyId] });
      setSelectedDeals(new Set());
      setShowBulkAssignMenu(false);
      toast.success(`${count} negociações atribuídas a "${vendor?.nome || "vendedor"}"`);
    },
    onError: () => {
      toast.error("Erro ao atribuir negociações em lote");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (dealIds: string[]) => {
      // Unsync any won deals before deleting
      for (const dealId of dealIds) {
        const deal = localDeals.find((d) => d.id === dealId);
        if (deal) {
          await unsyncDealSale(deal.id, deal.user_id, queryClient);
        }
      }
      const { error } = await supabase.from("deals").delete().in("id", dealIds);
      if (error) throw error;
      return dealIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["deals", effectiveCompanyId] });
      setSelectedDeals(new Set());
      setShowBulkDeleteConfirm(false);
      toast.success(`${count} negociações excluídas com sucesso`);
    },
    onError: () => {
      toast.error("Erro ao excluir negociações em lote");
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
        setCelebrationMessage(deal.title);
        setCelebrationValue(deal.value || 0);
        setShowConfetti(true);

        try {
          await syncWonDealToSale(deal, queryClient, effectiveCompanyId);
          toast.success("Negociação ganha e venda sincronizada!");
        } catch (syncError) {
          logger.error("Erro ao sincronizar venda do deal:", syncError);
          toast.error("Negociação ganha, mas a venda não foi sincronizada.");
        }
      }

      if (deal?.stage === "closed_won" && stage !== "closed_won") {
        try {
          await unsyncDealSale(deal.id, deal.user_id, queryClient);
          toast.success("Negociação removida das vendas sincronizadas.");
        } catch (unsyncError) {
          logger.error("Erro ao remover venda sincronizada do deal:", unsyncError);
          toast.error("Negociação movida, mas não foi possível remover a venda sincronizada.");
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
      toast.error("Erro ao mover negociação");
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

    // Apply advanced filters
    dealsToFilter = applyAdvancedFilters(dealsToFilter);

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
  }, [localDeals, STAGES, searchQuery, selectedSeller, applyAdvancedFilters]);

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

    // Apply advanced filters
    dealsToCount = applyAdvancedFilters(dealsToCount);

    dealsToCount.forEach((deal) => {
      if (totals[deal.stage]) {
        totals[deal.stage].count++;
        totals[deal.stage].value += Number(deal.value) || 0;
      }
    });

    return totals;
  }, [localDeals, STAGES, selectedSeller, searchQuery, applyAdvancedFilters]);

  // Count rotting deals (3+ days without update, excluding closed stages)
  const rottingDealsCount = useMemo(() => {
    return localDeals.filter((deal) => {
      if (deal.stage === "closed_won" || deal.stage === "closed_lost") return false;
      const days = deal.updated_at ? differenceInDays(new Date(), new Date(deal.updated_at)) : 0;
      return days > 3;
    }).length;
  }, [localDeals]);

  // Get the active deal for drag overlay
  const activeDeal = activeId ? localDeals.find((d) => d.id === activeId) : null;

  // Stage neighbors map for swipe gestures (mobile)
  const stageNeighborsMap = useMemo(() => {
    const map: Record<string, { prev: { id: string; title: string; color: string } | null; next: { id: string; title: string; color: string } | null }> = {};
    STAGES.forEach((stage, idx) => {
      map[stage.id] = {
        prev: idx > 0 ? { id: STAGES[idx - 1].id, title: STAGES[idx - 1].title, color: STAGES[idx - 1].color } : null,
        next: idx < STAGES.length - 1 ? { id: STAGES[idx + 1].id, title: STAGES[idx + 1].title, color: STAGES[idx + 1].color } : null,
      };
    });
    return map;
  }, [STAGES]);

  const handleSwipeMove = useCallback((deal: Deal, targetStageId: string) => {
    const previousDeals = [...localDeals];
    // Optimistic update
    setLocalDeals((prev) => reorderDealsOptimistic(prev, deal.id, targetStageId as StageId, 0));
    // Persist
    updateDealMutation.mutate({ id: deal.id, stage: targetStageId as StageId, position: 0, deal, previousDeals });
  }, [updateDealMutation, localDeals]);

  // Prefer the actual pointer location; fallback to geometric matching for gaps
  const collisionDetectionStrategy: CollisionDetection = useCallback((args) => {
    const pointerHits = pointerWithin(args);
    if (pointerHits.length > 0) return pointerHits;
    return closestCorners(args);
  }, []);

  const resolveDropTarget = useCallback((draggedId: string, overId: string) => {
    let targetStage: StageId;
    let targetIndex: number;

    const isColumn = STAGES.some((s) => s.id === overId);

    if (isColumn) {
      targetStage = overId;
      targetIndex = dealsByStage[targetStage]?.length || 0;
      return { targetStage, targetIndex };
    }

    const overDeal = localDeals.find((d) => d.id === overId);
    if (!overDeal) return null;

    targetStage = overDeal.stage;
    const targetList = dealsByStage[targetStage] || [];
    const idx = targetList.findIndex((d) => d.id === overId);
    targetIndex = idx >= 0 ? idx : targetList.length;

    // If dragging within the same stage and hovering after itself, normalize index
    const draggedDeal = localDeals.find((d) => d.id === draggedId);
    if (draggedDeal?.stage === targetStage) {
      const currentIndex = targetList.findIndex((d) => d.id === draggedId);
      if (currentIndex >= 0 && currentIndex < targetIndex) {
        targetIndex -= 1;
      }
    }

    return { targetStage, targetIndex };
  }, [STAGES, dealsByStage, localDeals]);

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

    const target = resolveDropTarget(draggedId, overId);
    if (!target) return;

    const targetStage = target.targetStage;
    const targetIndex = target.targetIndex;
    const draggedDeal = localDeals.find((d) => d.id === draggedId);
    if (!draggedDeal) return;

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

  // Filter deals by selected seller + advanced filters
  const filteredDeals = useMemo(() => {
    let result = selectedSeller === "all" ? localDeals : localDeals.filter(deal => deal.user_id === selectedSeller);
    if (searchQuery.trim()) {
      result = result.filter(deal =>
        deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return applyAdvancedFilters(result);
  }, [localDeals, selectedSeller, searchQuery, applyAdvancedFilters]);

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
    <>
      <div className="h-[calc(100vh-64px)] flex flex-col bg-background text-foreground">
        {/* Header - Premium Style - 3 responsive rows */}
        <div className="flex flex-col gap-3 px-4 sm:px-6 py-4 sm:py-5 border-b border-border bg-card backdrop-blur-sm shadow-sm">
          {/* Row 1: Title + deal count + action buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 ring-1 ring-emerald-100 dark:ring-emerald-500/20">
                <Target className="h-4 sm:h-5 w-4 sm:w-5 text-emerald-600 dark:text-emerald-200" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                  <span className="hidden sm:inline">Pipeline de Vendas</span>
                  <span className="sm:hidden">Pipeline</span>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20">
                    <Sparkles className="h-3 w-3" />
                    Live
                  </span>
                </h1>
                <p className="text-xs sm:text-[13px] text-muted-foreground font-medium mt-0.5">
                  {isLoading ? "Carregando..." : (
                    <>{deals.length} negociações • <span className="text-emerald-600 dark:text-emerald-300">{formatCurrency(pipelineTotal)}</span></>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Selection Mode Toggle */}
              <Button
                variant={selectionMode ? "default" : "outline"}
                size="sm"
                onClick={toggleSelectionMode}
                aria-label={selectionMode ? "Selecionando" : "Selecionar"}
                className={`min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 h-9 ${selectionMode ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "border-border hover:bg-muted text-foreground"}`}
              >
                <CheckSquare className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{selectionMode ? "Selecionando" : "Selecionar"}</span>
              </Button>

              {/* Select All / Deselect All - visible only in selection mode */}
              {selectionMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectedDeals.size === allVisibleDealIds.length ? deselectAll : selectAll}
                  aria-label={selectedDeals.size === allVisibleDealIds.length ? "Desmarcar todos" : "Selecionar todos"}
                  className="border-border hover:bg-muted text-foreground min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 h-9"
                >
                  <CheckCheck className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">
                    {selectedDeals.size === allVisibleDealIds.length ? "Desmarcar todos" : "Selecionar todos"}
                  </span>
                </Button>
              )}

              {/* Config Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfig(true)}
                aria-label="Configurações"
                className="border-border hover:bg-muted text-foreground min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 h-9"
              >
                <Settings2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Configurar</span>
              </Button>

              {/* New Deal Button */}
              <Button
                size="sm"
                onClick={() => setShowNewDeal(true)}
                aria-label="Adicionar"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-200 min-h-[44px] sm:min-h-0 h-9"
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Nova Negociação</span>
              </Button>
            </div>
          </div>

          {/* Row 2: Search bar (full width on mobile, always visible) */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar negociações..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 h-11 sm:h-9 bg-card border-border text-foreground placeholder:text-muted-foreground focus:ring-emerald-500"
            />
          </div>

          {/* Row 3: Filter pills (seller, view toggle) - horizontal scroll on mobile */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5 -mb-0.5">
            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-muted px-1 py-1 rounded-lg border border-border flex-shrink-0">
              <Button
                variant={viewMode === "kanban" ? "default" : "ghost"}
                size="sm"
                className="min-h-[44px] sm:min-h-0 h-8 min-w-[44px] sm:min-w-0"
                onClick={() => setViewMode("kanban")}
              >
                Kanban
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                className="min-h-[44px] sm:min-h-0 h-8 min-w-[44px] sm:min-w-0"
                onClick={() => setViewMode("list")}
              >
                Lista
              </Button>
            </div>

            {/* Seller Filter */}
            <Select value={selectedSeller} onValueChange={setSelectedSeller}>
              <SelectTrigger className="w-40 flex-shrink-0 min-h-[44px] sm:min-h-0 h-9 bg-card border-border text-foreground">
                <User className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Vendedor" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">Vendedores</SelectItem>
                {vendors.map((vendor: any) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Advanced Filters Bar */}
        <div className="px-4 sm:px-6 py-2 border-b border-border bg-card/50">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Toggle filters button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                activeFilterCount > 0
                  ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Filter className="h-3 w-3" />
              Filtros
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className={`h-3 w-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </button>

            {/* Inline active filter pills (always visible when active) */}
            {!showFilters && activeFilterCount > 0 && (
              <>
                {filterHotDeals && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30">
                    <Flame className="h-3 w-3" /> Hot
                    <button onClick={() => setFilterHotDeals(false)} className="ml-0.5 hover:text-orange-200"><X className="h-2.5 w-2.5" /></button>
                  </span>
                )}
                {filterRottingDeals && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30">
                    <Clock className="h-3 w-3" /> Parados
                    <button onClick={() => setFilterRottingDeals(false)} className="ml-0.5 hover:text-rose-200"><X className="h-2.5 w-2.5" /></button>
                  </span>
                )}
                {filterProbability !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30">
                    {filterProbability === "high" ? "Alta 70%+" : filterProbability === "medium" ? "Média 30-69%" : "Baixa <30%"}
                    <button onClick={() => setFilterProbability("all")} className="ml-0.5 hover:text-blue-200"><X className="h-2.5 w-2.5" /></button>
                  </span>
                )}
                {filterDateRange !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/30">
                    <CalendarDays className="h-3 w-3" />
                    {filterDateRange === "this_week" ? "Esta semana" : filterDateRange === "this_month" ? "Este mês" : "Vencidos"}
                    <button onClick={() => setFilterDateRange("all")} className="ml-0.5 hover:text-purple-200"><X className="h-2.5 w-2.5" /></button>
                  </span>
                )}
                {filterTagIds.length > 0 && filterTagIds.map((tid) => {
                  const tag = companyTags.find((t: any) => t.id === tid);
                  if (!tag) return null;
                  return (
                    <span key={tid} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ring-1" style={{ backgroundColor: `${tag.color}22`, color: tag.color, borderColor: `${tag.color}55` }}>
                      {tag.name}
                      <button onClick={() => setFilterTagIds((prev) => prev.filter((id) => id !== tid))} className="ml-0.5 hover:opacity-70"><X className="h-2.5 w-2.5" /></button>
                    </span>
                  );
                })}
                <button
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3 w-3" /> Limpar filtros
                </button>
              </>
            )}

            {/* Expanded filter options */}
            {showFilters && (
              <>
                {/* Hot Deals */}
                <button
                  onClick={() => setFilterHotDeals(!filterHotDeals)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    filterHotDeals
                      ? "bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Flame className="h-3 w-3" /> Hot Deals
                </button>

                {/* Rotting Deals */}
                <button
                  onClick={() => setFilterRottingDeals(!filterRottingDeals)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    filterRottingDeals
                      ? "bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Clock className="h-3 w-3" /> Parados 3+ dias
                </button>

                {/* Separator */}
                <div className="w-px h-5 bg-border" />

                {/* Probability quick buttons */}
                {(["high", "medium", "low"] as const).map((level) => {
                  const labels = { high: "Alta (70%+)", medium: "Média (30-69%)", low: "Baixa (<30%)" };
                  const isActive = filterProbability === level;
                  return (
                    <button
                      key={level}
                      onClick={() => setFilterProbability(isActive ? "all" : level)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {labels[level]}
                    </button>
                  );
                })}

                {/* Separator */}
                <div className="w-px h-5 bg-border" />

                {/* Date range quick buttons */}
                {(["this_week", "this_month", "overdue"] as const).map((range) => {
                  const labels = { this_week: "Esta semana", this_month: "Este mês", overdue: "Vencidos" };
                  const isActive = filterDateRange === range;
                  return (
                    <button
                      key={range}
                      onClick={() => setFilterDateRange(isActive ? "all" : range)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/30"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <CalendarDays className="h-3 w-3" /> {labels[range]}
                    </button>
                  );
                })}

                {/* Tags */}
                {companyTags.length > 0 && (
                  <>
                    <div className="w-px h-5 bg-border" />
                    {companyTags.map((tag: any) => {
                      const isActive = filterTagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          onClick={() =>
                            setFilterTagIds((prev) =>
                              isActive ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                            )
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                          style={
                            isActive
                              ? { backgroundColor: `${tag.color}22`, color: tag.color, boxShadow: `inset 0 0 0 1px ${tag.color}55` }
                              : undefined
                          }
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                          {tag.name}
                        </button>
                      );
                    })}
                  </>
                )}

                {/* Clear all */}
                {activeFilterCount > 0 && (
                  <>
                    <div className="w-px h-5 bg-border" />
                    <button
                      onClick={clearAllFilters}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <X className="h-3 w-3" /> Limpar filtros
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Rotting Deals Banner */}
        {rottingDealsCount > 0 && !rottingBannerDismissed && (
          <div
            className="flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5 border-b border-amber-500/20 cursor-pointer"
            style={{ background: "linear-gradient(90deg, rgba(245,158,11,0.12), rgba(239,68,68,0.10))" }}
            onClick={() => setFilterRottingDeals((prev) => !prev)}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 flex-shrink-0" />
              <span className="text-amber-200">
                {rottingDealsCount} negociação{rottingDealsCount !== 1 ? "ões" : ""} sem atualização há mais de 3 dias
              </span>
              {filterRottingDeals && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wide">
                  Filtro ativo
                </span>
              )}
            </div>
            <button
              className="p-1 rounded-md hover:bg-white/10 transition-colors text-amber-300/70 hover:text-amber-200"
              onClick={(e) => {
                e.stopPropagation();
                setRottingBannerDismissed(true);
                setFilterRottingDeals(false);
              }}
              title="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-x-auto overflow-y-auto sm:overflow-y-hidden scrollbar-thin">
          {isLoading ? (
            <KanbanSkeleton />
          ) : viewMode === "kanban" ? (
            <DndContext
              sensors={sensors}
              collisionDetection={collisionDetectionStrategy}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
              measuring={{
                droppable: {
                  strategy: MeasuringStrategy.WhileDragging,
                },
              }}
            >
              {/* Mobile stage selector pills */}
              <div className="flex sm:hidden gap-2 px-4 pt-3 pb-1 overflow-x-auto scrollbar-none">
                {STAGES.map((stage, idx) => {
                  const Icon = stage.icon;
                  return (
                    <button
                      key={stage.id}
                      onClick={() => {
                        setActiveStageIndex(idx);
                        const container = kanbanScrollRef.current;
                        if (container) {
                          const columnWidth = container.scrollWidth / STAGES.length;
                          container.scrollTo({ left: columnWidth * idx, behavior: "smooth" });
                        }
                      }}
                      className={`
                        flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold
                        flex-shrink-0 min-h-[44px] transition-all duration-200
                        ${activeStageIndex === idx
                          ? `${stage.bgColor} ${stage.color} ring-1 ${stage.borderColor}`
                          : "bg-muted/60 text-muted-foreground hover:bg-muted"
                        }
                      `}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {stage.title}
                      <span className="ml-0.5 text-[10px] opacity-70">
                        {(stageTotals[stage.id]?.count) || 0}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div
                ref={kanbanScrollRef}
                className="
                  flex gap-2 sm:gap-3 p-4 sm:p-6 h-full
                  sm:min-w-max
                  max-sm:snap-x max-sm:snap-mandatory max-sm:overflow-x-auto max-sm:scrollbar-none
                "
                onScroll={(e) => {
                  if (window.innerWidth >= 640) return;
                  const container = e.currentTarget;
                  const columnWidth = container.scrollWidth / STAGES.length;
                  const newIndex = Math.round(container.scrollLeft / columnWidth);
                  if (newIndex !== activeStageIndex && newIndex >= 0 && newIndex < STAGES.length) {
                    setActiveStageIndex(newIndex);
                  }
                }}
              >
                {STAGES.map((stage, idx) => (
                    <KanbanColumn
                      key={stage.id}
                      stage={stage}
                      deals={dealsByStage[stage.id] || []}
                      total={stageTotals[stage.id] || { count: 0, value: 0 }}
                      formatCurrency={formatCurrency}
                      onDeleteDeal={(deal) => {
                        if (confirm(`Tem certeza que deseja excluir a negociação "${deal.title}"?`)) {
                          deleteDealMutation.mutate(deal.id);
                        }
                      }}
                      showConversionRate={idx > 0}
                      previousStageCount={idx > 0 ? stageTotals[STAGES[idx - 1].id]?.count : undefined}
                      isLast={idx === STAGES.length - 1}
                      selectionMode={selectionMode}
                      selectedDeals={selectedDeals}
                      onToggleSelect={toggleSelectDeal}
                      stageNeighbors={stageNeighborsMap[stage.id]}
                      onSwipeMove={handleSwipeMove}
                    />
                ))}
              </div>

              {/* Mobile stage indicator dots */}
              <div className="flex sm:hidden justify-center gap-1.5 pb-3 pt-1">
                {STAGES.map((stage, idx) => (
                  <button
                    key={stage.id}
                    onClick={() => {
                      setActiveStageIndex(idx);
                      const container = kanbanScrollRef.current;
                      if (container) {
                        const columnWidth = container.scrollWidth / STAGES.length;
                        container.scrollTo({ left: columnWidth * idx, behavior: "smooth" });
                      }
                    }}
                    className={`
                      h-2 rounded-full transition-all duration-300
                      ${activeStageIndex === idx
                        ? `w-6 ${stage.color.replace("text-", "bg-")}`
                        : "w-2 bg-muted-foreground/30"
                      }
                    `}
                    aria-label={stage.title}
                  />
                ))}
              </div>

              {/* Drag Overlay - Fast animation (disabled during selection mode) */}
              <DragOverlay
                dropAnimation={{
                  duration: 180,
                  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                }}
                modifiers={[]}
              >
                {activeDeal && !selectionMode ? (
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
                <div className="text-muted-foreground text-sm">Nenhuma negociação cadastrada.</div>
              )}
              {sortedDealsForList.map((deal) => (
                <div
                  key={deal.id}
                  className={`bg-card border rounded-xl p-4 sm:p-5 shadow-sm hover:border-emerald-500/30 hover:shadow-md transition-all ${
                    selectionMode && selectedDeals.has(deal.id)
                      ? "border-emerald-500 ring-2 ring-emerald-500/40"
                      : "border-border"
                  } ${selectionMode ? "cursor-pointer" : ""}`}
                  onClick={selectionMode ? () => toggleSelectDeal(deal.id) : undefined}
                >
                  <div className="flex flex-col gap-3 sm:gap-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-3">
                        {selectionMode && (
                          <div
                            className={`
                              w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150
                              ${selectedDeals.has(deal.id)
                                ? "bg-emerald-500 border-emerald-500"
                                : "bg-muted border-border hover:border-emerald-400"
                              }
                            `}
                          >
                            {selectedDeals.has(deal.id) && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        )}
                        <div className="text-base sm:text-lg font-semibold text-foreground">
                          {deal.title || "Sem título"}
                        </div>
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
                        aria-label="Excluir"
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
          const wasWon = dealToLose.stage === "closed_won";
          await supabase
            .from("deals")
            .update({
              stage: "closed_lost" as any,
              loss_reason: reason
            })
            .eq("id", dealToLose.id);
          if (wasWon) {
            try {
              await unsyncDealSale(dealToLose.id, dealToLose.user_id, queryClient);
            } catch (unsyncError) {
              logger.error("Erro ao remover venda sincronizada do deal perdido:", unsyncError);
            }
          }
          queryClient.invalidateQueries({ queryKey: ["deals"] });
          setShowLostModal(false);
          setDealToLose(null);
          toast.success("Negociação marcada como perdida");
        }}
        dealTitle={dealToLose?.title || ""}
      />

      {/* Win Celebration */}
      <WinCelebration
        show={showConfetti}
        dealTitle={celebrationMessage}
        dealValue={celebrationValue}
        formatCurrency={formatCurrency}
        onComplete={() => setShowConfetti(false)}
      />

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {selectionMode && selectedDeals.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 rounded-2xl bg-card border border-border shadow-2xl shadow-black/20"
          >
            {/* Count */}
            <span className="text-sm font-semibold text-foreground whitespace-nowrap">
              {selectedDeals.size} selecionado{selectedDeals.size !== 1 ? "s" : ""}
            </span>

            <div className="w-px h-6 bg-border" />

            {/* Move to... dropdown */}
            <div className="relative" ref={bulkMoveRef}>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground hover:bg-muted h-8 text-xs sm:text-sm"
                onClick={() => {
                  setShowBulkMoveMenu((p) => !p);
                  setShowBulkAssignMenu(false);
                }}
              >
                <ArrowRightCircle className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Mover para...</span>
                <span className="sm:hidden">Mover</span>
              </Button>
              {showBulkMoveMenu && (
                <div className="absolute bottom-full mb-2 left-0 w-48 rounded-xl bg-card border border-border shadow-xl py-1 z-[110]">
                  {STAGES.map((stage) => {
                    const Icon = stage.icon;
                    return (
                      <button
                        key={stage.id}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                        onClick={() => {
                          bulkMoveMutation.mutate({
                            dealIds: Array.from(selectedDeals),
                            targetStage: stage.id,
                          });
                        }}
                      >
                        <Icon className={`h-4 w-4 ${stage.color}`} />
                        {stage.title}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Assign to... dropdown */}
            <div className="relative" ref={bulkAssignRef}>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground hover:bg-muted h-8 text-xs sm:text-sm"
                onClick={() => {
                  setShowBulkAssignMenu((p) => !p);
                  setShowBulkMoveMenu(false);
                }}
              >
                <UserPlus className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Atribuir a...</span>
                <span className="sm:hidden">Atribuir</span>
              </Button>
              {showBulkAssignMenu && (
                <div className="absolute bottom-full mb-2 left-0 w-48 rounded-xl bg-card border border-border shadow-xl py-1 z-[110] max-h-60 overflow-y-auto">
                  {vendors.map((vendor: any) => (
                    <button
                      key={vendor.id}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      onClick={() => {
                        bulkAssignMutation.mutate({
                          dealIds: Array.from(selectedDeals),
                          userId: vendor.id,
                        });
                      }}
                    >
                      <User className="h-4 w-4 text-muted-foreground" />
                      {vendor.nome}
                    </button>
                  ))}
                  {vendors.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum vendedor encontrado</div>
                  )}
                </div>
              )}
            </div>

            <div className="w-px h-6 bg-border" />

            {/* Delete button */}
            {!showBulkDeleteConfirm ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-8 text-xs sm:text-sm"
                onClick={() => setShowBulkDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Deletar</span>
              </Button>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-destructive font-medium">Confirmar?</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-rose-400 hover:bg-rose-500/20 h-7 px-2 text-xs font-bold"
                  onClick={() => {
                    bulkDeleteMutation.mutate(Array.from(selectedDeals));
                  }}
                >
                  Sim
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:bg-muted h-7 px-2 text-xs"
                  onClick={() => setShowBulkDeleteConfirm(false)}
                >
                  Não
                </Button>
              </div>
            )}

            <div className="w-px h-6 bg-border" />

            {/* Cancel */}
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground hover:bg-muted h-8 text-xs sm:text-sm"
              onClick={() => {
                setSelectedDeals(new Set());
                setShowBulkDeleteConfirm(false);
                setShowBulkMoveMenu(false);
                setShowBulkAssignMenu(false);
              }}
            >
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
