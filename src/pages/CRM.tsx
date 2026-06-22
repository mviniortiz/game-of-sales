import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { logger } from "@/utils/logger";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  pointerWithin,
  rectIntersection,
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
import { FilterSelect, FilterChip, MultiSelectFilter } from "@/components/filters";
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
  ArrowDownUp,
  UserPlus,
  CheckCheck,
} from "lucide-react";
// F5P.4e — Phosphor duotone padronizado (mesmo set da sidebar).
// Alias *Ph evita conflito com nomes lucide já em uso no arquivo.
import {
  Target as TargetPh,
  MagnifyingGlass as SearchPh,
  Plus as PlusPh,
  Sliders as SettingsPh,
  CheckSquare as CheckSquarePh,
  Checks as CheckCheckPh,
  Funnel as FunnelPh,
  FireSimple as FlamePh,
  Clock as ClockPh,
  CalendarBlank as CalendarPh,
  CaretDown as CaretDownPh,
  X as XPh,
} from "@phosphor-icons/react";
import { differenceInDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { syncWonDealToSale, unsyncDealSale } from "@/utils/salesSync";
import { KanbanColumn } from "@/components/crm/KanbanColumn";
import { ReadinessBand } from "@/components/crm/ReadinessBand";
import { DealCard } from "@/components/crm/DealCard";
import { NewDealModal } from "@/components/crm/NewDealModal";
import { KanbanSkeleton } from "@/components/crm/KanbanSkeleton";
import { PipelineConfigModal } from "@/components/crm/PipelineConfigModal";
import { LostDealModal } from "@/components/crm/LostDealModal";
import { WinCelebration } from "@/components/crm/WinCelebration";
import { useDealTags } from "@/hooks/useDealTags";
import { usePipelineContextData } from "@/hooks/usePipelineContextData";
import { useDealsTags } from "@/hooks/useDealsTags";
import {
  configToStage,
  deriveLegacyStage,
  type StageConfig,
  type Stage,
  type StageKind,
} from "@/lib/pipelineStyles";
import {
  usePipelines,
  usePipelineStages,
  useUpdatePipeline,
  useCreatePipeline,
  useSetDefaultPipeline,
  useArchivePipeline,
  useStageDealCounts,
  DEFAULT_STAGE_CONFIGS,
} from "@/hooks/usePipelines";

// ICON_MAP, COLOR_MAP, configToStage, Stage e StageConfig agora vivem em
// @/lib/pipelineStyles (compartilhados entre CRM, DealDetails, dashboards).

// stage_id é um UUID de pipeline_stages. `stage` permanece como o valor LEGADO
// (lead..closed_lost) em dual-write, ainda lido por triggers/webhooks/RPCs.
export type StageId = string;

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
  stage: string;          // legado (closed_won, ...) — dual-write
  stage_id?: string | null; // chave de coluna (pipeline_stages.id)
  pipeline_id?: string | null;
  is_active?: boolean;
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

// Navegação mobile do kanban: rola até a etapa idx medindo o passo real
// (largura+gap) pela posição dos filhos — robusto com colunas em vw + gaps.
function scrollKanbanToStage(container: HTMLElement | null, idx: number) {
  if (!container || container.children.length === 0) return;
  const a = container.children[0] as HTMLElement;
  const b = container.children[1] as HTMLElement | undefined;
  const step = b ? b.offsetLeft - a.offsetLeft : a.offsetWidth;
  if (step <= 0) return;
  container.scrollTo({ left: step * idx, behavior: "smooth" });
}

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
  const [selectedSellers, setSelectedSellers] = useState<string[]>([]); // vazio = todos
  const [filterStatusKind, setFilterStatusKind] = useState<"all" | "open" | "won" | "lost">("all");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState<"position" | "az" | "za" | "value_desc" | "value_asc" | "created" | "updated">("position");
  const [dealToDelete, setDealToDelete] = useState<Deal | null>(null);

  // Múltiplos funis (pipelines)
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [showNewPipeline, setShowNewPipeline] = useState(false);

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
    setFilterStatusKind("all");
    setFilterActive("all");
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

  // ── Funis (pipelines) — substituem o antigo localStorage de estágios ───────
  const { data: pipelines = [] } = usePipelines(effectiveCompanyId);
  const updatePipeline = useUpdatePipeline(effectiveCompanyId);
  const createPipeline = useCreatePipeline(effectiveCompanyId);
  const setDefaultPipeline = useSetDefaultPipeline(effectiveCompanyId);
  const archivePipeline = useArchivePipeline(effectiveCompanyId);

  // Seleciona o funil quando a lista carrega ou muda a company. Restaura o
  // último funil escolhido (localStorage por company); senão cai no default.
  useEffect(() => {
    if (!pipelines.length) {
      setSelectedPipelineId(null);
      return;
    }
    setSelectedPipelineId((prev) => {
      if (prev && pipelines.some((p) => p.id === prev)) return prev;
      const saved = effectiveCompanyId
        ? localStorage.getItem(`vyzon_selected_pipeline_${effectiveCompanyId}`)
        : null;
      if (saved && pipelines.some((p) => p.id === saved)) return saved;
      const def = pipelines.find((p) => p.is_default) ?? pipelines[0];
      return def.id;
    });
  }, [pipelines, effectiveCompanyId]);

  // Persiste o funil selecionado pra restaurar ao voltar na aba.
  useEffect(() => {
    if (effectiveCompanyId && selectedPipelineId) {
      localStorage.setItem(`vyzon_selected_pipeline_${effectiveCompanyId}`, selectedPipelineId);
    }
  }, [selectedPipelineId, effectiveCompanyId]);

  const { data: stageConfigs = [] } = usePipelineStages(selectedPipelineId);

  const selectedPipeline = useMemo(
    () => pipelines.find((p) => p.id === selectedPipelineId) ?? null,
    [pipelines, selectedPipelineId],
  );

  const { data: stageDealCounts = {} } = useStageDealCounts(selectedPipelineId);

  // Estágios resolvidos (ícone + cor). Fallback p/ defaults só enquanto carrega
  // ou se o funil não tiver estágios — nesse caso não há deals para deslocar.
  const STAGES = useMemo<Stage[]>(
    () => (stageConfigs.length ? stageConfigs : DEFAULT_STAGE_CONFIGS).map(configToStage),
    [stageConfigs],
  );

  // Lookups por stage_id (kind + valor legado p/ dual-write).
  const stageById = useMemo(() => {
    const m = new Map<string, Stage>();
    STAGES.forEach((s) => m.set(s.id, s));
    return m;
  }, [STAGES]);
  const configById = useMemo(() => {
    const m = new Map<string, StageConfig>();
    (stageConfigs.length ? stageConfigs : DEFAULT_STAGE_CONFIGS).forEach((c) => m.set(c.id, c));
    return m;
  }, [stageConfigs]);
  const kindOf = useCallback(
    (stageId?: string | null): StageKind => stageById.get(stageId ?? "")?.kind ?? "open",
    [stageById],
  );
  const legacyOf = useCallback(
    (stageId?: string | null) => deriveLegacyStage(configById.get(stageId ?? "")),
    [configById],
  );
  const firstStageId = STAGES[0]?.id;

  // Ordenação compartilhada (kanban por coluna + lista). "position" = ordem manual.
  const sortDeals = useCallback(
    (arr: Deal[]): Deal[] => {
      const a = [...arr];
      const ts = (d: Deal, f: "created_at" | "updated_at") => new Date(d[f] || d.created_at || 0).getTime();
      switch (sortBy) {
        case "az": return a.sort((x, y) => x.title.localeCompare(y.title, "pt-BR"));
        case "za": return a.sort((x, y) => y.title.localeCompare(x.title, "pt-BR"));
        case "value_desc": return a.sort((x, y) => (Number(y.value) || 0) - (Number(x.value) || 0));
        case "value_asc": return a.sort((x, y) => (Number(x.value) || 0) - (Number(y.value) || 0));
        case "created": return a.sort((x, y) => ts(y, "created_at") - ts(x, "created_at"));
        case "updated": return a.sort((x, y) => ts(y, "updated_at") - ts(x, "updated_at"));
        case "position":
        default: return a.sort((x, y) => x.position - y.position);
      }
    },
    [sortBy],
  );

  // Pipeline único de filtragem (vendedor multi + busca + avançados + status + ativo).
  // Usado por dealsByStage, stageTotals, filteredDeals e allVisibleDealIds.
  const filterDeals = useCallback(
    (list: Deal[]): Deal[] => {
      let r = selectedSellers.length === 0 ? list : list.filter((d) => selectedSellers.includes(d.user_id));
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        r = r.filter((d) => d.title.toLowerCase().includes(q) || d.customer_name.toLowerCase().includes(q));
      }
      r = applyAdvancedFilters(r);
      if (filterStatusKind !== "all") r = r.filter((d) => kindOf(d.stage_id) === filterStatusKind);
      if (filterActive !== "all") {
        r = r.filter((d) => (filterActive === "active" ? d.is_active !== false : d.is_active === false));
      }
      return r;
    },
    [selectedSellers, searchQuery, applyAdvancedFilters, filterStatusKind, filterActive, kindOf],
  );

  // Optimized sensors for fast, responsive drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6, // Slightly higher threshold reduces accidental/jittery drags
      },
    })
  );

  // Persiste os estágios do funil atual (editor). Substitui o localStorage.
  const handleSaveStages = (newConfigs: StageConfig[]) => {
    if (!selectedPipelineId) return;
    updatePipeline.mutate({ pipelineId: selectedPipelineId, stages: newConfigs });
  };

  // Fetch deals (escopados ao funil selecionado)
  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["deals", effectiveCompanyId, selectedPipelineId],
    queryFn: async () => {
      let query = supabase
        .from("deals")
        .select("*")
        .order("position", { ascending: true });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }
      if (selectedPipelineId) {
        query = query.eq("pipeline_id", selectedPipelineId);
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
        stage_id: d.stage_id ?? null,
        pipeline_id: d.pipeline_id ?? null,
        is_active: d.is_active ?? true,
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
    queryClient.setQueryData(["deals", effectiveCompanyId, selectedPipelineId], deals);
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
  const allVisibleDealIds = useMemo(
    () => filterDeals(localDeals).map((d) => d.id),
    [localDeals, filterDeals],
  );

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
      // targetStage é o stage_id; grava também o stage legado (dual-write).
      const { error } = await supabase
        .from("deals")
        .update({ stage_id: targetStage, stage: legacyOf(targetStage) as any })
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

    // targetStage é o stage_id de destino; mantém o stage legado coerente.
    const dragged = { ...working[draggedIndex], stage_id: targetStage, stage: legacyOf(targetStage) };
    working.splice(draggedIndex, 1);

    const grouped: Record<string, Deal[]> = {};
    working.forEach((d) => {
      const key = d.stage_id || "";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(d);
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
    queryClient.setQueryData(["deals", effectiveCompanyId, selectedPipelineId], reordered);
    return previousDeals;
  };

  // Update deal mutation
  const updateDealMutation = useMutation({
    mutationFn: async ({ id, stage, position, deal }: { id: string; stage: string; position: number; deal?: Deal; previousDeals?: Deal[] }) => {
      // `stage` aqui é o stage_id de destino; grava o stage legado em dual-write.
      const targetStageId = stage;
      const targetKind = kindOf(targetStageId);
      const originKind = kindOf(deal?.stage_id);

      const { error } = await supabase
        .from("deals")
        .update({ stage_id: targetStageId, stage: legacyOf(targetStageId) as any, position })
        .eq("id", id);

      if (error) {
        logger.error("[DnD] PATCH deals ERROR", error);
        throw error;
      }

      if (targetKind === "won" && deal) {
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

      if (originKind === "won" && targetKind !== "won") {
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
        queryClient.setQueryData(["deals", effectiveCompanyId, selectedPipelineId], context.previousDeals);
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

    const dealsToFilter = filterDeals(localDeals);

    // Group deals by stage_id (chave de coluna)
    dealsToFilter.forEach((deal) => {
      const key = deal.stage_id || "";
      if (grouped[key]) {
        grouped[key].push(deal);
      } else if (STAGES.length > 0) {
        // stage_id desconhecido (deal não migrado): cai no 1º estágio
        grouped[STAGES[0].id].push(deal);
      }
    });

    // Ordena cada coluna conforme o sort selecionado (manual = position)
    Object.keys(grouped).forEach((stage) => {
      grouped[stage] = sortDeals(grouped[stage]);
    });

    return grouped;
  }, [localDeals, STAGES, filterDeals, sortDeals]);

  // Calculate totals per stage (from filtered deals)
  const stageTotals = useMemo(() => {
    const totals: Record<string, { count: number; value: number }> = {};

    STAGES.forEach(stage => {
      totals[stage.id] = { count: 0, value: 0 };
    });

    const dealsToCount = filterDeals(localDeals);

    dealsToCount.forEach((deal) => {
      const key = deal.stage_id || "";
      if (totals[key]) {
        totals[key].count++;
        totals[key].value += Number(deal.value) || 0;
      } else if (STAGES.length > 0) {
        const fallback = STAGES[0].id;
        totals[fallback].count++;
        totals[fallback].value += Number(deal.value) || 0;
      }
    });

    return totals;
  }, [localDeals, STAGES, filterDeals]);

  // Count rotting deals (3+ days without update, excluding closed stages)
  const rottingDealsCount = useMemo(() => {
    return localDeals.filter((deal) => {
      if (kindOf(deal.stage_id) !== "open") return false; // exclui ganho/perdido
      const days = deal.updated_at ? differenceInDays(new Date(), new Date(deal.updated_at)) : 0;
      return days > 3;
    }).length;
  }, [localDeals, kindOf]);

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

  // Collision detection: rectIntersection cobre gaps entre colunas (FunnelConnector + flex gap)
  // pois usa o rect do card arrastado (~280px) ao invés do pointer pontual.
  // Ordem: pointerWithin (mais preciso quando pointer está dentro) → rectIntersection
  // (cobre zona intermediária entre colunas) → closestCorners (último recurso geométrico).
  const collisionDetectionStrategy: CollisionDetection = useCallback((args) => {
    const pointerHits = pointerWithin(args);
    if (pointerHits.length > 0) return pointerHits;
    const rectHits = rectIntersection(args);
    if (rectHits.length > 0) return rectHits;
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

    targetStage = overDeal.stage_id || "";
    const targetList = dealsByStage[targetStage] || [];
    const idx = targetList.findIndex((d) => d.id === overId);
    targetIndex = idx >= 0 ? idx : targetList.length;

    // If dragging within the same stage and hovering after itself, normalize index
    const draggedDeal = localDeals.find((d) => d.id === draggedId);
    if (draggedDeal?.stage_id === targetStage) {
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
    if ((draggedDeal.stage_id || "") !== targetStage) {
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

  // Filter deals (vendedor multi + busca + avançados + status/ativo)
  const filteredDeals = useMemo(() => filterDeals(localDeals), [localDeals, filterDeals]);

  // F5P.2 — Contexto comercial (conversa + EVA) por deal
  const pipelineContext = usePipelineContextData(
    useMemo(() => filteredDeals.map((d) => d.id), [filteredDeals]),
  );

  // F6T.2 — Tags transversais (F6T.1) batched por deal
  const dealsTags = useDealsTags(
    useMemo(() => filteredDeals.map((d) => d.id), [filteredDeals]),
  );

  // Calculate pipeline total (from filtered deals)
  const pipelineTotal = filteredDeals.reduce((acc, deal) => acc + (Number(deal.value) || 0), 0);

  const sortedDealsForList = useMemo(() => {
    // Na lista não há posição visual; ordem manual cai em "atualização recente".
    if (sortBy === "position") {
      return [...filteredDeals].sort(
        (a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime(),
      );
    }
    return sortDeals(filteredDeals);
  }, [filteredDeals, sortBy, sortDeals]);

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
      {/* F5P.4f — fundo com gradient sutil pra tirar cinza chapado, sem ruído */}
      <div className="h-[calc(100vh-64px)] flex flex-col text-foreground bg-gradient-to-b from-background via-background to-slate-50/40 dark:to-card/20 min-w-0 max-w-full overflow-hidden">
        {/* F5P.4e — Header com Phosphor duotone + toolbar reestruturada.
            Row 1 = título / stats / ações. Row 2 = search à esquerda, controles à direita (sem spacer flex-1 que squeezava o search). */}
        <div className="flex flex-col gap-2.5 px-4 sm:px-6 py-3 sm:py-3.5 border-b border-border bg-card shadow-sm">
          {/* Row 1: Title + stats inline + action buttons */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 ring-1 ring-emerald-100 dark:ring-emerald-500/20 flex-shrink-0">
                <TargetPh size={18} weight="duotone" className="text-emerald-600 dark:text-emerald-200" />
              </div>
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight whitespace-nowrap">
                  <span className="hidden sm:inline">Pipeline de Vendas</span>
                  <span className="sm:hidden">Pipeline</span>
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
                {/* F5P.4f — KPI inline: total, valor e stale (quando houver), estilo Central */}
                <span className="hidden sm:flex items-center gap-1.5 text-[12.5px] text-muted-foreground/90 font-medium pl-2 ml-0.5 border-l border-border/60">
                  {isLoading ? (
                    <span>Carregando...</span>
                  ) : (
                    <>
                      <span className="tabular-nums text-foreground">{deals.length}</span>
                      <span>{deals.length === 1 ? "oportunidade" : "oportunidades"}</span>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-emerald-600 dark:text-emerald-300 tabular-nums font-semibold">{formatCurrency(pipelineTotal)}</span>
                      {rottingDealsCount > 0 && (
                        <>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300/90">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span className="tabular-nums font-semibold">{rottingDealsCount}</span>
                            <span>{rottingDealsCount === 1 ? "parada" : "paradas"}</span>
                          </span>
                        </>
                      )}
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant={selectionMode ? "default" : "outline"}
                size="sm"
                onClick={toggleSelectionMode}
                aria-label={selectionMode ? "Selecionando" : "Selecionar"}
                className={`min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 h-9 ${selectionMode ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "border-border hover:bg-muted text-foreground"}`}
              >
                <CheckSquarePh size={16} weight="duotone" className="sm:mr-2" />
                <span className="hidden sm:inline">{selectionMode ? "Selecionando" : "Selecionar"}</span>
              </Button>

              {selectionMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectedDeals.size === allVisibleDealIds.length ? deselectAll : selectAll}
                  aria-label={selectedDeals.size === allVisibleDealIds.length ? "Desmarcar todos" : "Selecionar todos"}
                  className="border-border hover:bg-muted text-foreground min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 h-9"
                >
                  <CheckCheckPh size={16} weight="duotone" className="sm:mr-2" />
                  <span className="hidden sm:inline">
                    {selectedDeals.size === allVisibleDealIds.length ? "Desmarcar todos" : "Selecionar todos"}
                  </span>
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfig(true)}
                aria-label="Configurações"
                className="border-border hover:bg-muted text-foreground min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 h-9"
              >
                <SettingsPh size={16} weight="duotone" className="sm:mr-2" />
                <span className="hidden sm:inline">Configurar</span>
              </Button>

              <Button
                size="sm"
                onClick={() => setShowNewDeal(true)}
                aria-label="Adicionar"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-200 min-h-[44px] sm:min-h-0 h-9"
              >
                <PlusPh size={16} weight="duotone" className="sm:mr-2" />
                <span className="hidden sm:inline">Nova Negociação</span>
              </Button>
            </div>
          </div>

          {/* Row 2: Toolbar — search à esquerda (largura fixa sensata), controles empurrados com ml-auto.
              F5P.4e: removido spacer flex-1 que squeezava o search no layout anterior. */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="relative w-full sm:w-72 flex-shrink-0">
              <SearchPh size={15} weight="duotone" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 pointer-events-none" />
              <Input
                type="text"
                placeholder="Buscar negociações..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 h-9 rounded-lg border border-input bg-background text-[13px] text-foreground placeholder:text-muted-foreground/70 transition-colors hover:border-border focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/40 focus-visible:ring-1 focus-visible:ring-emerald-500/40 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/15"
              />
            </div>

            {/* Controles empurrados à direita */}
            <div className="flex items-center gap-2 sm:ml-auto flex-shrink-0">
              <div className="inline-flex items-center gap-0.5 rounded-full border border-input bg-background p-0.5 flex-shrink-0 dark:border-white/10 dark:bg-white/[0.03]">
                {[
                  { id: "kanban", label: "Kanban" },
                  { id: "list", label: "Lista" },
                ].map((v) => {
                  const active = viewMode === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setViewMode(v.id as "kanban" | "list")}
                      className={`h-7 rounded-full px-3 text-[11.5px] font-medium transition-colors ${
                        active
                          ? "bg-muted text-foreground shadow-sm ring-1 ring-border/60 dark:bg-white/10 dark:ring-white/15"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {v.label}
                    </button>
                  );
                })}
              </div>

              {/* Seletor de funil (pipeline) */}
              {pipelines.length > 0 ? (
                <FilterSelect
                  value={selectedPipelineId ?? ""}
                  onChange={(val) => {
                    if (val === "__new__") {
                      setShowNewPipeline(true);
                      return;
                    }
                    setSelectedPipelineId(val);
                  }}
                  options={[
                    ...pipelines.map((p) => ({ value: p.id, label: p.name })),
                    { value: "__new__", label: "+ Novo funil" },
                  ]}
                  icon={Filter}
                  minWidth="170px"
                />
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewPipeline(true)}
                  className="border-border hover:bg-muted text-foreground h-9"
                >
                  <Filter className="h-3.5 w-3.5 sm:mr-2" />
                  <span className="hidden sm:inline">Criar funil</span>
                </Button>
              )}

              {/* Negociações (responsável) */}
              <MultiSelectFilter
                selected={selectedSellers}
                onChange={setSelectedSellers}
                options={vendors.map((v: any) => ({ value: v.id, label: v.nome }))}
                icon={User}
                allLabel="Todas as negociações"
                minWidth="170px"
              />

              {/* Status (tipo de estágio + ativo/inativo) */}
              <FilterSelect
                value={filterStatusKind !== "all" ? filterStatusKind : filterActive !== "all" ? filterActive : "all"}
                onChange={(v) => {
                  if (v === "open" || v === "won" || v === "lost") {
                    setFilterStatusKind(v);
                    setFilterActive("all");
                  } else if (v === "active" || v === "inactive") {
                    setFilterActive(v);
                    setFilterStatusKind("all");
                  } else {
                    setFilterStatusKind("all");
                    setFilterActive("all");
                  }
                }}
                options={[
                  { value: "all", label: "Todos os status" },
                  { value: "open", label: "Em aberto" },
                  { value: "won", label: "Ganhos" },
                  { value: "lost", label: "Perdidos" },
                  { value: "active", label: "Ativos" },
                  { value: "inactive", label: "Inativos" },
                ]}
                icon={CheckCircle}
                neutralValue="all"
                minWidth="160px"
              />

              {/* Ordenação */}
              <FilterSelect
                value={sortBy}
                onChange={(v) => setSortBy(v as typeof sortBy)}
                options={[
                  { value: "position", label: "Ordem manual" },
                  { value: "created", label: "Criadas por último" },
                  { value: "updated", label: "Atualização recente" },
                  { value: "value_desc", label: "Maior valor" },
                  { value: "value_asc", label: "Menor valor" },
                  { value: "az", label: "Nome (A-Z)" },
                  { value: "za", label: "Nome (Z-A)" },
                ]}
                icon={ArrowDownUp}
                neutralValue="position"
                minWidth="170px"
              />
            </div>
          </div>
        </div>

        {/* Advanced Filters Bar — F5P.4d: bg-muted/30 light + card/30 dark pra tier visual */}
        <div className="px-4 sm:px-6 py-2 border-b border-border bg-muted/30 dark:bg-card/30">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Contador de negociações (estilo RD) */}
            <span className="text-[12.5px] font-semibold text-foreground tabular-nums">
              {filteredDeals.length} {filteredDeals.length === 1 ? "negociação" : "negociações"}
            </span>
            <div className="w-px h-5 bg-border mx-0.5" />

            {/* Toggle filters button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11.5px] font-medium transition-colors ${
                activeFilterCount > 0
                  ? "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30 dark:text-emerald-300"
                  : "border border-input bg-background text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/15 dark:hover:bg-white/[0.06]"
              }`}
            >
              <FunnelPh size={13} weight="duotone" />
              Filtros
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
              <CaretDownPh size={12} weight="bold" className={`transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </button>

            {/* Inline active filter pills (always visible when active) */}
            {!showFilters && activeFilterCount > 0 && (
              <>
                {filterHotDeals && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-orange-500/15 text-orange-600 ring-1 ring-orange-500/30 dark:text-orange-400">
                    <FlamePh size={12} weight="duotone" /> Hot
                    <button onClick={() => setFilterHotDeals(false)} className="ml-0.5 hover:text-orange-700 dark:hover:text-orange-200"><XPh size={10} weight="bold" /></button>
                  </span>
                )}
                {filterRottingDeals && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/15 text-rose-600 ring-1 ring-rose-500/30 dark:text-rose-400">
                    <ClockPh size={12} weight="duotone" /> Parados
                    <button onClick={() => setFilterRottingDeals(false)} className="ml-0.5 hover:text-rose-700 dark:hover:text-rose-200"><XPh size={10} weight="bold" /></button>
                  </span>
                )}
                {filterProbability !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/15 text-blue-600 ring-1 ring-blue-500/30 dark:text-blue-400">
                    {filterProbability === "high" ? "Alta 70%+" : filterProbability === "medium" ? "Média 30-69%" : "Baixa <30%"}
                    <button onClick={() => setFilterProbability("all")} className="ml-0.5 hover:text-blue-700 dark:hover:text-blue-200"><XPh size={10} weight="bold" /></button>
                  </span>
                )}
                {filterDateRange !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/15 text-purple-600 ring-1 ring-purple-500/30 dark:text-purple-400">
                    <CalendarPh size={12} weight="duotone" />
                    {filterDateRange === "this_week" ? "Esta semana" : filterDateRange === "this_month" ? "Este mês" : "Vencidos"}
                    <button onClick={() => setFilterDateRange("all")} className="ml-0.5 hover:text-purple-700 dark:hover:text-purple-200"><XPh size={10} weight="bold" /></button>
                  </span>
                )}
                {filterTagIds.length > 0 && filterTagIds.map((tid) => {
                  const tag = companyTags.find((t: any) => t.id === tid);
                  if (!tag) return null;
                  return (
                    <span key={tid} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ring-1" style={{ backgroundColor: `${tag.color}22`, color: tag.color, borderColor: `${tag.color}55` }}>
                      {tag.name}
                      <button onClick={() => setFilterTagIds((prev) => prev.filter((id) => id !== tid))} className="ml-0.5 hover:opacity-70"><XPh size={10} weight="bold" /></button>
                    </span>
                  );
                })}
                <button
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <XPh size={12} weight="bold" /> Limpar filtros
                </button>
              </>
            )}

            {/* Expanded filter options — F5P.4e: chips com contraste light/dark + Phosphor */}
            {showFilters && (
              <>
                <button
                  onClick={() => setFilterHotDeals(!filterHotDeals)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11.5px] font-medium transition-colors ${
                    filterHotDeals
                      ? "bg-orange-500/15 text-orange-700 ring-1 ring-orange-500/30 dark:text-orange-300"
                      : "border border-input bg-background text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/15 dark:hover:bg-white/[0.06]"
                  }`}
                >
                  <FlamePh size={13} weight="duotone" /> Hot
                </button>

                <button
                  onClick={() => setFilterRottingDeals(!filterRottingDeals)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11.5px] font-medium transition-colors ${
                    filterRottingDeals
                      ? "bg-rose-500/15 text-rose-700 ring-1 ring-rose-500/30 dark:text-rose-300"
                      : "border border-input bg-background text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/15 dark:hover:bg-white/[0.06]"
                  }`}
                >
                  <ClockPh size={13} weight="duotone" /> Parados 3+ dias
                </button>

                <div className="w-px h-5 bg-border" />

                {(["high", "medium", "low"] as const).map((level) => {
                  const labels = { high: "Prob. alta", medium: "Prob. média", low: "Prob. baixa" };
                  const isActive = filterProbability === level;
                  return (
                    <button
                      key={level}
                      onClick={() => setFilterProbability(isActive ? "all" : level)}
                      className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11.5px] font-medium transition-colors ${
                        isActive
                          ? "bg-sky-500/15 text-sky-700 ring-1 ring-sky-500/30 dark:text-sky-300"
                          : "border border-input bg-background text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/15 dark:hover:bg-white/[0.06]"
                      }`}
                    >
                      {labels[level]}
                    </button>
                  );
                })}

                <div className="w-px h-5 bg-border" />

                {(["this_week", "this_month", "overdue"] as const).map((range) => {
                  const labels = { this_week: "Esta semana", this_month: "Este mês", overdue: "Vencidos" };
                  const isActive = filterDateRange === range;
                  return (
                    <button
                      key={range}
                      onClick={() => setFilterDateRange(isActive ? "all" : range)}
                      className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11.5px] font-medium transition-colors ${
                        isActive
                          ? "bg-violet-500/15 text-violet-700 ring-1 ring-violet-500/30 dark:text-violet-300"
                          : "border border-input bg-background text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/15 dark:hover:bg-white/[0.06]"
                      }`}
                    >
                      <CalendarPh size={13} weight="duotone" /> {labels[range]}
                    </button>
                  );
                })}

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
                          className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[11.5px] font-medium transition-colors ${
                            isActive
                              ? ""
                              : "border border-input bg-background text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/15 dark:hover:bg-white/[0.06]"
                          }`}
                          style={
                            isActive
                              ? { backgroundColor: `${tag.color}1a`, color: tag.color, boxShadow: `inset 0 0 0 1px ${tag.color}55` }
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

                {/* Status e Ativo/Inativo agora vivem no dropdown "Status" da toolbar. */}

                {activeFilterCount > 0 && (
                  <>
                    <div className="w-px h-5 bg-border" />
                    <button
                      onClick={clearAllFilters}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11.5px] font-medium text-rose-600 dark:text-rose-400 transition-colors hover:bg-rose-500/10"
                    >
                      <XPh size={13} weight="bold" /> Limpar filtros
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* F5P.4c — Rotting Banner com contraste decente em light + dark.
            Antes: text-amber-200/95 em fundo claro = ilegível. */}
        {rottingDealsCount > 0 && !rottingBannerDismissed && (
          <div
            className="flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5 border-b border-amber-300/40 dark:border-amber-500/20 cursor-pointer transition-colors bg-amber-50 hover:bg-amber-100/70 dark:bg-amber-500/[0.06] dark:hover:bg-amber-500/[0.10]"
            onClick={() => setFilterRottingDeals((prev) => !prev)}
          >
            <div className="flex items-center gap-2 text-[12.5px]">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
              <span className="font-medium text-amber-900 dark:text-amber-200">
                {rottingDealsCount} {rottingDealsCount === 1 ? "oportunidade" : "oportunidades"} sem atualização há mais de 3 dias
              </span>
              {filterRottingDeals && (
                <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-200 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">
                  filtro ativo
                </span>
              )}
            </div>
            <button
              className="p-1 rounded-md hover:bg-amber-200/60 dark:hover:bg-white/5 transition-colors text-amber-700/70 hover:text-amber-900 dark:text-amber-300/60 dark:hover:text-amber-200"
              onClick={(e) => {
                e.stopPropagation();
                setRottingBannerDismissed(true);
                setFilterRottingDeals(false);
              }}
              title="Fechar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 min-w-0 overflow-x-auto overflow-y-auto sm:overflow-y-hidden scrollbar-thin">
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
              {/* LP-PIPE.2 — faixa "Precisa de você agora" (leitura da EVA, accent roxo).
                  Some sozinha quando não há deal pronto. Não esconde nada do board. */}
              {!selectionMode && (
                <ReadinessBand
                  deals={filteredDeals}
                  contextByDeal={pipelineContext.contextByDeal}
                  formatCurrency={formatCurrency}
                />
              )}

              {/* Mobile stage selector pills */}
              <div className="flex sm:hidden gap-2 px-4 pt-3 pb-1 overflow-x-auto scrollbar-none">
                {STAGES.map((stage, idx) => {
                  const Icon = stage.icon;
                  return (
                    <button
                      key={stage.id}
                      onClick={() => {
                        setActiveStageIndex(idx);
                        scrollKanbanToStage(kanbanScrollRef.current, idx);
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
                  max-sm:scroll-pl-4 max-sm:pr-[14vw]
                "
                onScroll={(e) => {
                  if (window.innerWidth >= 640) return;
                  const container = e.currentTarget;
                  // Mede o passo real (largura+gap) pela posição dos filhos, não por
                  // scrollWidth/N (que drifta com colunas em vw + gaps).
                  const a = container.children[0] as HTMLElement | undefined;
                  const b = container.children[1] as HTMLElement | undefined;
                  if (!a) return;
                  const step = b ? b.offsetLeft - a.offsetLeft : a.offsetWidth;
                  if (step <= 0) return;
                  const newIndex = Math.min(STAGES.length - 1, Math.max(0, Math.round(container.scrollLeft / step)));
                  if (newIndex !== activeStageIndex) {
                    setActiveStageIndex(newIndex);
                  }
                }}
              >
                {(() => {
                  const maxColumnValue = Math.max(
                    0,
                    ...STAGES.map((s) => stageTotals[s.id]?.value || 0),
                  );
                  return STAGES.map((stage, idx) => (
                    <KanbanColumn
                      key={stage.id}
                      stage={stage}
                      deals={dealsByStage[stage.id] || []}
                      total={stageTotals[stage.id] || { count: 0, value: 0 }}
                      maxColumnValue={maxColumnValue}
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
                      contextByDeal={pipelineContext.contextByDeal}
                      tagsByDeal={dealsTags.tagsByDeal}
                    />
                  ));
                })()}
              </div>

              {/* Mobile stage indicator dots */}
              <div className="flex sm:hidden justify-center gap-1.5 pb-3 pt-1">
                {STAGES.map((stage, idx) => (
                  <button
                    key={stage.id}
                    onClick={() => {
                      setActiveStageIndex(idx);
                      scrollKanbanToStage(kanbanScrollRef.current, idx);
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
                      {renderStageBadge(deal.stage_id || "")}
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
        pipelineId={selectedPipelineId}
      />

      {/* Pipeline Config Modal */}
      <PipelineConfigModal
        open={showConfig}
        onClose={() => setShowConfig(false)}
        mode="edit"
        name={selectedPipeline?.name ?? "Pipeline de Vendas"}
        stages={stageConfigs}
        stageDealCounts={stageDealCounts}
        busy={updatePipeline.isPending}
        isDefault={!!selectedPipeline?.is_default}
        canArchive={pipelines.length > 1 && !selectedPipeline?.is_default}
        onSetDefault={
          selectedPipelineId && !selectedPipeline?.is_default
            ? () => setDefaultPipeline.mutate(selectedPipelineId)
            : undefined
        }
        onArchive={
          selectedPipelineId && pipelines.length > 1 && !selectedPipeline?.is_default
            ? () => {
                archivePipeline.mutate(selectedPipelineId, {
                  onSuccess: () => {
                    setShowConfig(false);
                    setSelectedPipelineId(null);
                  },
                });
              }
            : undefined
        }
        onSubmit={({ name, stages }) => {
          if (!selectedPipelineId) return;
          updatePipeline.mutate(
            { pipelineId: selectedPipelineId, name, stages },
            { onSuccess: () => setShowConfig(false) },
          );
        }}
      />

      {/* Criar novo funil */}
      <PipelineConfigModal
        open={showNewPipeline}
        onClose={() => setShowNewPipeline(false)}
        mode="create"
        name=""
        stages={DEFAULT_STAGE_CONFIGS}
        busy={createPipeline.isPending}
        onSubmit={({ name, stages }) => {
          createPipeline.mutate(
            { name, stages, makeDefault: pipelines.length === 0 },
            {
              onSuccess: (newId) => {
                setSelectedPipelineId(newId);
                setShowNewPipeline(false);
              },
            },
          );
        }}
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
          const wasWon = kindOf(dealToLose.stage_id) === "won";
          // Move para o estágio 'lost' do funil atual (dual-write stage legado).
          const lostStage = STAGES.find((s) => s.kind === "lost");
          await supabase
            .from("deals")
            .update({
              ...(lostStage ? { stage_id: lostStage.id } : {}),
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
                className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-500/10 h-8 text-xs sm:text-sm"
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
                  className="text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 h-7 px-2 text-xs font-bold"
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
