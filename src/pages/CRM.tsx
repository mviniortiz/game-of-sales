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
  CheckCircle,
  Trash2,
  User,
  Filter,
  X,
  ArrowRightCircle,
  ArrowDownUp,
  UserPlus,
} from "lucide-react";
// F5P.4e — Phosphor duotone padronizado (mesmo set da sidebar).
// Alias *Ph evita conflito com nomes lucide já em uso no arquivo.
import {
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
import { DealCard, quoteStatus } from "@/components/crm/DealCard";
import { NewDealModal } from "@/components/crm/NewDealModal";
import { KanbanSkeleton } from "@/components/crm/KanbanSkeleton";
import { PipelineConfigModal } from "@/components/crm/PipelineConfigModal";
import { LostDealModal } from "@/components/crm/LostDealModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { WinCelebration } from "@/components/crm/WinCelebration";
import { useDealTags } from "@/hooks/useDealTags";
import { usePipelineContextData } from "@/hooks/usePipelineContextData";
import { useQuoteBoard, type QuoteItem } from "@/hooks/useQuoteBoard";
import { OPEN_QUOTE_STATES } from "@/lib/quoteText";
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
  account_name?: string | null;
  additional_contacts?: Array<{ phone?: string; name?: string }> | null;
  sla_breach_at?: string | null;
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

// Lista: uma grade só, usada pelo cabeçalho e por toda linha, senão as colunas
// não alinham entre si. Antes cada item era um card de 131px com o meio da
// linha vazio (medido: ~900px de nada entre o responsável e o valor).
const LIST_GRID =
  "grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)_104px_132px_minmax(0,1fr)_60px_92px_32px] gap-x-3 gap-y-0.5 sm:gap-y-1";
// No mobile a linha empilhava os oito campos (208px de altura, "50%" e a data
// soltos sem rótulo). Ali só cabem os quatro que identificam a negociação, em
// duas colunas; o resto volta a partir de sm.
const LIST_CELL_MAIN = "col-start-1 row-start-1 sm:col-auto sm:row-auto";
const LIST_CELL_SUB = "col-start-1 row-start-2 sm:col-auto sm:row-auto";
const LIST_CELL_RIGHT_TOP = "col-start-2 row-start-1 justify-self-end sm:justify-self-auto sm:col-auto sm:row-auto";
const LIST_CELL_RIGHT_SUB = "col-start-2 row-start-2 justify-self-end sm:justify-self-auto sm:col-auto sm:row-auto";
const LIST_CELL_DESKTOP = "hidden sm:flex";
const LIST_CELL_DESKTOP_BLOCK = "hidden sm:block";
const LIST_TH = "text-[10.5px] uppercase font-semibold tracking-[0.07em] text-muted-foreground truncate";

// Filtros, ordem e modo de exibição valem entre visitas (por navegador). Busca
// não entra: texto digitado é da tarefa do momento.
const FILTERS_KEY = "vyz:pipeline:filtros";
type SavedFilters = {
  view?: "kanban" | "list";
  sort?: "urgencia" | "position" | "az" | "za" | "value_desc" | "value_asc" | "created" | "updated";
  sellers?: string[];
  status?: "all" | "open" | "won" | "lost";
  active?: "all" | "active" | "inactive";
  hot?: boolean;
  rotting?: boolean;
  prob?: "all" | "high" | "medium" | "low";
  date?: "all" | "this_week" | "this_month" | "overdue";
  tags?: string[];
  quote?: boolean;
};
function loadSavedFilters(): SavedFilters {
  try {
    const parsed = JSON.parse(localStorage.getItem(FILTERS_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

const CHIP =
  "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11.5px] font-medium transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)]";
const CHIP_ON = "bg-[var(--vyz-accent-soft-10)] text-[var(--vyz-accent-text)] ring-1 ring-[var(--vyz-accent-border)]";
const CHIP_OFF =
  "border border-input bg-background text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/15 dark:hover:bg-white/[0.06]";
const PILL =
  "inline-flex h-7 items-center gap-1 rounded-full pl-2.5 pr-1 text-[11px] font-medium bg-[var(--vyz-accent-soft-8)] text-[var(--vyz-accent-text)]";
const PILL_X =
  "ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[var(--vyz-accent-soft-12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)]";

const PROB_LABELS = { high: "Prob. alta (70%+)", medium: "Prob. média (30 a 69%)", low: "Prob. baixa (até 29%)" } as const;
const DATE_LABELS = { this_week: "Criadas esta semana", this_month: "Criadas este mês", overdue: "Previsão vencida" } as const;

const foldText = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

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
  const [saved] = useState(loadSavedFilters);
  const [viewMode, setViewMode] = useState<"kanban" | "list">(() =>
    saved.view ?? (typeof window !== "undefined" && window.innerWidth < 640 ? "list" : "kanban")
  );
  // Mobile kanban: track visible column
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const kanbanScrollRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState("");
  const [celebrationValue, setCelebrationValue] = useState(0);
  const [selectedSellers, setSelectedSellers] = useState<string[]>(saved.sellers ?? []); // vazio = todos
  const [filterStatusKind, setFilterStatusKind] = useState<"all" | "open" | "won" | "lost">(saved.status ?? "all");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">(saved.active ?? "all");
  const [sortBy, setSortBy] = useState<"urgencia" | "position" | "az" | "za" | "value_desc" | "value_asc" | "created" | "updated">(saved.sort ?? "urgencia");
  const [dealToDelete, setDealToDelete] = useState<Deal | null>(null);

  // Múltiplos funis (pipelines)
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [showNewPipeline, setShowNewPipeline] = useState(false);

  // Advanced filter state
  const [filterHotDeals, setFilterHotDeals] = useState(saved.hot ?? false);
  const [filterRottingDeals, setFilterRottingDeals] = useState(saved.rotting ?? false);
  const [filterProbability, setFilterProbability] = useState<"all" | "high" | "medium" | "low">(saved.prob ?? "all");
  const [filterDateRange, setFilterDateRange] = useState<"all" | "this_week" | "this_month" | "overdue">(saved.date ?? "all");
  const [filterTagIds, setFilterTagIds] = useState<string[]>(saved.tags ?? []);
  const [filterQuoteParked, setFilterQuoteParked] = useState(saved.quote ?? false);
  const [showFilters, setShowFilters] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const next: SavedFilters = {
      view: viewMode, sort: sortBy, sellers: selectedSellers, status: filterStatusKind, active: filterActive,
      hot: filterHotDeals, rotting: filterRottingDeals, prob: filterProbability, date: filterDateRange, tags: filterTagIds,
      quote: filterQuoteParked,
    };
    try {
      localStorage.setItem(FILTERS_KEY, JSON.stringify(next));
    } catch {
      /* navegador sem storage: filtros só valem nesta visita */
    }
  }, [viewMode, sortBy, selectedSellers, filterStatusKind, filterActive, filterHotDeals, filterRottingDeals, filterProbability, filterDateRange, filterTagIds, filterQuoteParked]);

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
  const { data: companyTags = [], isSuccess: tagsLoaded } = useDealTags(effectiveCompanyId);

  // Etiqueta salva que foi apagada filtraria tudo para zero sem mostrar pílula.
  useEffect(() => {
    if (!effectiveCompanyId || !tagsLoaded) return;
    setFilterTagIds((prev) => {
      const next = prev.filter((id) => companyTags.some((t: any) => t.id === id));
      return next.length === prev.length ? prev : next;
    });
  }, [effectiveCompanyId, tagsLoaded, companyTags]);

  // Tudo que restringe a lista conta, inclusive responsável e status da barra de cima.
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedSellers.length > 0) count++;
    if (filterStatusKind !== "all" || filterActive !== "all") count++;
    if (filterHotDeals) count++;
    if (filterRottingDeals) count++;
    if (filterProbability !== "all") count++;
    if (filterDateRange !== "all") count++;
    if (filterTagIds.length > 0) count++;
    if (filterQuoteParked) count++;
    return count;
  }, [selectedSellers, filterStatusKind, filterActive, filterHotDeals, filterRottingDeals, filterProbability, filterDateRange, filterTagIds, filterQuoteParked]);

  const clearAllFilters = useCallback(() => {
    setSelectedSellers([]);
    setSearchQuery("");
    setFilterHotDeals(false);
    setFilterRottingDeals(false);
    setFilterProbability("all");
    setFilterDateRange("all");
    setFilterTagIds([]);
    setFilterQuoteParked(false);
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
  }, [filterHotDeals, filterProbability, filterDateRange, filterTagIds, dealTagMap]);

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

  // Placar de orçamentos cruzado por card: o orçamento aberto mais recente de cada deal.
  const { query: quoteQuery } = useQuoteBoard(30);
  const quoteByDeal = useMemo(() => {
    const m = new Map<string, QuoteItem>();
    for (const q of quoteQuery.data?.items ?? []) {
      if (!q.deal_id || !OPEN_QUOTE_STATES.includes(q.state)) continue;
      const cur = m.get(q.deal_id);
      if (!cur || new Date(q.sent_at) > new Date(cur.sent_at)) m.set(q.deal_id, q);
    }
    return m;
  }, [quoteQuery.data]);

  const parkedCount = quoteQuery.data?.totals.parked_count ?? 0;
  const parkedAmount = quoteQuery.data?.totals.parked_amount ?? 0;

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
        case "urgencia": {
          // Cliente esperando > orçamento parado (maior valor primeiro) > em
          // conversa > aberto sem orçamento (mais recente) > fechado.
          const rank = (d: Deal) => {
            if (kindOf(d.stage_id) !== "open") return 4;
            const q = quoteByDeal.get(d.id);
            if (!q) return 3;
            return q.state === "your_turn" ? 0 : q.state === "talking" ? 2 : 1;
          };
          const valor = (d: Deal) => quoteByDeal.get(d.id)?.amount ?? (Number(d.value) || 0);
          return a.sort((x, y) => rank(x) - rank(y) || (rank(x) === 3 ? ts(y, "updated_at") - ts(x, "updated_at") : valor(y) - valor(x)));
        }
        case "position":
        default: return a.sort((x, y) => x.position - y.position);
      }
    },
    [sortBy, kindOf, quoteByDeal],
  );


  // Pipeline único de filtragem (vendedor multi + busca + avançados + status + ativo).
  // Usado por dealsByStage, stageTotals, filteredDeals e allVisibleDealIds.
  const filterDeals = useCallback(
    (list: Deal[]): Deal[] => {
      let r = selectedSellers.length === 0 ? list : list.filter((d) => selectedSellers.includes(d.user_id));
      if (searchQuery.trim()) {
        const q = foldText(searchQuery.trim());
        const qDigits = searchQuery.replace(/\D/g, "");
        r = r.filter(
          (d) =>
            foldText(d.title || "").includes(q) ||
            foldText(d.customer_name || "").includes(q) ||
            (qDigits.length >= 4 && (d.customer_phone || "").replace(/\D/g, "").includes(qDigits)),
        );
      }
      r = applyAdvancedFilters(r);
      if (filterQuoteParked) {
        r = r.filter((d) => {
          const q = quoteByDeal.get(d.id);
          return !!q && (q.state === "no_reply" || q.state === "went_quiet");
        });
      }
      if (filterRottingDeals) {
        r = r.filter(
          (d) => kindOf(d.stage_id) === "open" && !!d.updated_at && differenceInDays(new Date(), new Date(d.updated_at)) > 3,
        );
      }
      if (filterStatusKind !== "all") r = r.filter((d) => kindOf(d.stage_id) === filterStatusKind);
      if (filterActive !== "all") {
        r = r.filter((d) => (filterActive === "active" ? d.is_active !== false : d.is_active === false));
      }
      return r;
    },
    [selectedSellers, searchQuery, applyAdvancedFilters, filterQuoteParked, quoteByDeal, filterRottingDeals, filterStatusKind, filterActive, kindOf],
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
        account_name: d.account_name ?? null,
        additional_contacts: Array.isArray(d.additional_contacts) ? d.additional_contacts : null,
        sla_breach_at: d.sla_breach_at ?? null,
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

  // "Fechou" no menu do card: mesmo caminho do arraste até a etapa de ganho
  // (comemoração e venda sincronizada inclusas).
  const handleMarkWon = useCallback((deal: Deal) => {
    const won = STAGES.find((s) => s.kind === "won");
    if (!won) {
      toast.error("Este funil não tem etapa de ganho. Crie uma em Configurar funil.");
      return;
    }
    if (deal.stage_id === won.id) return;
    handleSwipeMove(deal, won.id);
  }, [STAGES, handleSwipeMove]);

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
  const isFiltering = activeFilterCount > 0 || searchQuery.trim() !== "";
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

  // Kanban/Lista: linha de cima no desktop (a barra de ferramentas não cabe em
  // 1440px com ele), barra de ferramentas no celular.
  const viewToggle = (
    <div role="group" aria-label="Modo de exibição" className="inline-flex items-center gap-0.5 rounded-full border border-input bg-background p-0.5 flex-shrink-0 dark:border-white/10 dark:bg-white/[0.03]">
      {([
        { id: "kanban", label: "Kanban" },
        { id: "list", label: "Lista" },
      ] as const).map((v) => {
        const active = viewMode === v.id;
        return (
          <button
            key={v.id}
            type="button"
            aria-pressed={active}
            onClick={() => setViewMode(v.id)}
            className={`h-9 sm:h-7 rounded-full px-3.5 sm:px-3 text-[13px] sm:text-[11.5px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)] ${
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
  );

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
      <div className="vz-page-full -mx-3 -my-3 sm:-mx-4 sm:-my-4 md:-mx-6 md:-my-6 flex flex-col text-foreground min-w-0 overflow-hidden">
        {/* F5P.4e — Header com Phosphor duotone + toolbar reestruturada.
            Row 1 = título / stats / ações. Row 2 = search à esquerda, controles à direita (sem spacer flex-1 que squeezava o search). */}
        <div className="flex flex-col gap-2.5 px-4 sm:px-6 py-3 sm:py-3.5 border-b border-border bg-card shadow-sm">
          {/* Row 1: Title + stats inline + action buttons */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight whitespace-nowrap">
                  Pipeline
                </h1>
                {/* KPI inline: o que está na tela (respeita filtros e busca), valor e parados */}
                <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] sm:text-[12.5px] text-muted-foreground/90 font-medium sm:pl-2 sm:ml-0.5 sm:border-l border-border/60" aria-live="polite">
                  {isLoading ? (
                    <span>Carregando...</span>
                  ) : (
                    <>
                      <span className="tabular-nums text-foreground">{filteredDeals.length}</span>
                      {isFiltering && <span>de <span className="tabular-nums">{deals.length}</span></span>}
                      <span>{(isFiltering ? deals.length : filteredDeals.length) === 1 ? "oportunidade" : "oportunidades"}</span>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-foreground tabular-nums font-semibold">{formatCurrency(pipelineTotal)}</span>
                      {/* Integrador pensa em orçamento parado, não em card parado: com o
                          placar ativo, o dinheiro parado substitui o "N paradas" genérico. */}
                      {parkedCount > 0 && (
                        <>
                          {/* No celular o chip desce para a linha de baixo: o ponto ficaria solto. */}
                          <span className="hidden sm:inline text-muted-foreground/40">·</span>
                          <button
                            type="button"
                            aria-pressed={filterQuoteParked}
                            onClick={() => setFilterQuoteParked((prev) => !prev)}
                            title={filterQuoteParked ? "Mostrar todas" : "Ver só os orçamentos sem resposta"}
                            className={`inline-flex h-9 sm:h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 sm:px-2 -mx-0.5 font-semibold tabular-nums transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)] ${
                              filterQuoteParked
                                ? "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200"
                                : "text-amber-700 hover:bg-amber-50 dark:text-amber-300/90 dark:hover:bg-amber-500/10"
                            }`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
                            {parkedAmount > 0
                              ? `${formatCurrency(parkedAmount)} parados`
                              : `${parkedCount} ${parkedCount === 1 ? "orçamento parado" : "orçamentos parados"}`}
                          </button>
                        </>
                      )}
                      {rottingDealsCount > 0 && parkedCount === 0 && (
                        <>
                          <span className="text-muted-foreground/40">·</span>
                          <button
                            type="button"
                            aria-pressed={filterRottingDeals}
                            onClick={() => setFilterRottingDeals((prev) => !prev)}
                            title={filterRottingDeals ? "Mostrar todas" : "Ver só as sem movimento há mais de 3 dias"}
                            className={`inline-flex h-6 items-center gap-1 rounded-full px-2 -mx-0.5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)] ${
                              filterRottingDeals
                                ? "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200"
                                : "text-amber-700 hover:bg-amber-50 dark:text-amber-300/90 dark:hover:bg-amber-500/10"
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden />
                            <span className="tabular-nums font-semibold">{rottingDealsCount}</span>
                            <span>{rottingDealsCount === 1 ? "parada" : "paradas"}</span>
                            {filterRottingDeals && <XPh size={10} weight="bold" aria-hidden />}
                          </button>
                        </>
                      )}
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="hidden sm:block">{viewToggle}</div>
              <Button
                variant={selectionMode ? "default" : "outline"}
                size="sm"
                onClick={toggleSelectionMode}
                aria-label={selectionMode ? "Selecionando" : "Selecionar"}
                aria-pressed={selectionMode}
                className={`min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 h-9 rounded-full ${selectionMode ? "bg-[var(--vyz-btn-solid)] text-[var(--vyz-btn-on)] hover:bg-[var(--vyz-btn-solid)] hover:opacity-90" : "border-border hover:bg-muted text-foreground"}`}
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
                  className="border-border hover:bg-muted text-foreground min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 h-9 rounded-full"
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
                aria-label="Configurar funil"
                className="border-border hover:bg-muted text-foreground min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 h-9 rounded-full"
              >
                <SettingsPh size={16} weight="duotone" className="sm:mr-2" />
                <span className="hidden sm:inline">Configurar</span>
              </Button>

              <Button
                size="sm"
                onClick={() => setShowNewDeal(true)}
                aria-label="Nova oportunidade"
                className="rounded-full bg-[var(--vyz-btn-solid)] text-[var(--vyz-btn-on)] font-semibold hover:bg-[var(--vyz-btn-solid)] hover:opacity-90 active:scale-[0.98] transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:active:scale-100 min-h-[44px] sm:min-h-0 h-9"
              >
                <PlusPh size={16} weight="bold" className="sm:mr-1.5" />
                <span className="hidden sm:inline">Nova oportunidade</span>
              </Button>
            </div>
          </div>

          {/* Row 2: Toolbar — search à esquerda (largura fixa sensata), controles empurrados com ml-auto.
              F5P.4e: removido spacer flex-1 que squeezava o search no layout anterior. */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-full sm:w-56 2xl:w-72 flex-shrink-0">
              <SearchPh size={15} weight="duotone" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 pointer-events-none" />
              <Input
                ref={searchRef}
                type="search"
                aria-label="Buscar oportunidades"
                placeholder="Buscar nome ou telefone"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape" && searchQuery) {
                    e.preventDefault();
                    setSearchQuery("");
                  }
                }}
                className="w-full pl-9 pr-8 h-9 rounded-full border border-input bg-background text-base md:text-[13px] text-foreground placeholder:text-muted-foreground/70 transition-[border-color,box-shadow] duration-150 hover:border-border focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[var(--vyz-accent)] focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.15)] [&::-webkit-search-cancel-button]:hidden dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/15"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Limpar busca"
                  onClick={() => {
                    setSearchQuery("");
                    searchRef.current?.focus();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)]"
                >
                  <XPh size={11} weight="bold" />
                </button>
              )}
            </div>

            {/* Controles empurrados à direita. No mobile QUEBRAM em linhas (antes
                transbordavam pra fora da tela, deixando o filtro de vendedores
                inacessível); no desktop seguem em linha única alinhados à direita. */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:flex-1 sm:min-w-0 sm:justify-end">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                aria-expanded={showFilters}
                className={`${CHIP} h-9 ${activeFilterCount > 0 ? CHIP_ON : CHIP_OFF}`}
              >
                <FunnelPh size={13} weight="duotone" />
                Filtros
                {activeFilterCount > 0 && (
                  <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-[var(--vyz-accent)] text-white text-[10px] font-bold tabular-nums">
                    {activeFilterCount}
                  </span>
                )}
                <CaretDownPh size={12} weight="bold" className={`transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${showFilters ? "rotate-180" : ""}`} />
              </button>

              <div className="sm:hidden">{viewToggle}</div>

              {/* No celular os seletores ficam atrás de "Filtros"; no desktop, sempre à vista. */}
              <div className={showFilters ? "contents" : "hidden sm:contents"}>
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
                  minWidth="150px"
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
                allLabel="Responsáveis"
                minWidth="150px"
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
                minWidth="140px"
              />

              {/* Ordenação */}
              <FilterSelect
                value={sortBy}
                onChange={(v) => setSortBy(v as typeof sortBy)}
                options={[
                  { value: "urgencia", label: "Mais urgente" },
                  { value: "position", label: "Ordem manual" },
                  { value: "created", label: "Criadas por último" },
                  { value: "updated", label: "Atualização recente" },
                  { value: "value_desc", label: "Maior valor" },
                  { value: "value_asc", label: "Menor valor" },
                  { value: "az", label: "Nome (A-Z)" },
                  { value: "za", label: "Nome (Z-A)" },
                ]}
                icon={ArrowDownUp}
                neutralValue="urgencia"
                minWidth="150px"
              />
              </div>
            </div>
          </div>
        </div>

        {/* Filtros avançados: abertos pelo botão "Filtros"; fechados, mostram só o que está ativo. */}
        {(showFilters || activeFilterCount > 0) && (
        <div className="px-4 sm:px-6 py-2 border-b border-border bg-muted/30 dark:bg-card/30">
          <div className="flex items-center gap-2 flex-wrap">

            {/* Inline active filter pills (always visible when active) */}
            {!showFilters && activeFilterCount > 0 && (
              <>
                {filterHotDeals && (
                  <span className={PILL}>
                    <FlamePh size={12} weight="duotone" /> Quentes
                    <button type="button" aria-label="Remover filtro Quentes" onClick={() => setFilterHotDeals(false)} className={PILL_X}><XPh size={10} weight="bold" /></button>
                  </span>
                )}
                {filterQuoteParked && (
                  <span className={PILL}>
                    Orçamento parado
                    <button type="button" aria-label="Remover filtro Orçamento parado" onClick={() => setFilterQuoteParked(false)} className={PILL_X}><XPh size={10} weight="bold" /></button>
                  </span>
                )}
                {filterRottingDeals && (
                  <span className={PILL}>
                    <ClockPh size={12} weight="duotone" /> Sem movimento
                    <button type="button" aria-label="Remover filtro Parados" onClick={() => setFilterRottingDeals(false)} className={PILL_X}><XPh size={10} weight="bold" /></button>
                  </span>
                )}
                {filterProbability !== "all" && (
                  <span className={PILL}>
                    {PROB_LABELS[filterProbability]}
                    <button type="button" aria-label="Remover filtro de probabilidade" onClick={() => setFilterProbability("all")} className={PILL_X}><XPh size={10} weight="bold" /></button>
                  </span>
                )}
                {filterDateRange !== "all" && (
                  <span className={PILL}>
                    <CalendarPh size={12} weight="duotone" />
                    {DATE_LABELS[filterDateRange]}
                    <button type="button" aria-label="Remover filtro de data" onClick={() => setFilterDateRange("all")} className={PILL_X}><XPh size={10} weight="bold" /></button>
                  </span>
                )}
                {filterTagIds.length > 0 && filterTagIds.map((tid) => {
                  const tag = companyTags.find((t: any) => t.id === tid);
                  if (!tag) return null;
                  return (
                    <span key={tid} className="inline-flex h-7 items-center gap-1 rounded-full pl-2.5 pr-1 text-[11px] font-medium" style={{ backgroundColor: `${tag.color}1a`, color: tag.color, boxShadow: `inset 0 0 0 1px ${tag.color}40` }}>
                      {tag.name}
                      <button type="button" aria-label={`Remover etiqueta ${tag.name}`} onClick={() => setFilterTagIds((prev) => prev.filter((id) => id !== tid))} className="ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"><XPh size={10} weight="bold" /></button>
                    </span>
                  );
                })}
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-150"
                >
                  Limpar tudo
                </button>
              </>
            )}

            {/* Expanded filter options — F5P.4e: chips com contraste light/dark + Phosphor */}
            {showFilters && (
              <>
                <button
                  type="button"
                  aria-pressed={filterQuoteParked}
                  onClick={() => setFilterQuoteParked(!filterQuoteParked)}
                  title="Orçamento enviado que o cliente nunca respondeu ou respondeu e sumiu"
                  className={`${CHIP} ${filterQuoteParked ? CHIP_ON : CHIP_OFF}`}
                >
                  Orçamento parado
                </button>

                <button
                  type="button"
                  aria-pressed={filterHotDeals}
                  onClick={() => setFilterHotDeals(!filterHotDeals)}
                  className={`${CHIP} ${filterHotDeals ? CHIP_ON : CHIP_OFF}`}
                >
                  <FlamePh size={13} weight="duotone" /> Quentes
                </button>

                <button
                  type="button"
                  aria-pressed={filterRottingDeals}
                  onClick={() => setFilterRottingDeals(!filterRottingDeals)}
                  className={`${CHIP} ${filterRottingDeals ? CHIP_ON : CHIP_OFF}`}
                >
                  <ClockPh size={13} weight="duotone" /> Sem movimento há 3+ dias
                </button>

                <div className="w-px h-5 bg-border" />

                {(["high", "medium", "low"] as const).map((level) => {
                  const isActive = filterProbability === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setFilterProbability(isActive ? "all" : level)}
                      className={`${CHIP} ${isActive ? CHIP_ON : CHIP_OFF}`}
                    >
                      {PROB_LABELS[level]}
                    </button>
                  );
                })}

                <div className="w-px h-5 bg-border" />

                {(["this_week", "this_month", "overdue"] as const).map((range) => {
                  const isActive = filterDateRange === range;
                  return (
                    <button
                      key={range}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setFilterDateRange(isActive ? "all" : range)}
                      className={`${CHIP} ${isActive ? CHIP_ON : CHIP_OFF}`}
                    >
                      <CalendarPh size={13} weight="duotone" /> {DATE_LABELS[range]}
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
                          type="button"
                          aria-pressed={isActive}
                          onClick={() =>
                            setFilterTagIds((prev) =>
                              isActive ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                            )
                          }
                          className={`${CHIP} ${isActive ? "" : CHIP_OFF}`}
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
                      type="button"
                      onClick={clearAllFilters}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11.5px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-150"
                    >
                      Limpar tudo
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        )}


        {!isLoading && filteredDeals.length === 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-border bg-card" role="status">
            <p className="text-[13px] text-muted-foreground">
              {deals.length > 0
                ? "Nenhuma oportunidade com esses filtros."
                : "Nenhuma oportunidade neste funil ainda. Orçamento enviado pelo WhatsApp conectado vira card aqui sozinho."}
            </p>
            {deals.length > 0 ? (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex h-8 items-center rounded-full border border-border px-3.5 text-[12px] font-medium text-foreground hover:bg-muted transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)]"
              >
                Limpar filtros
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowNewDeal(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--vyz-btn-solid)] px-3.5 text-[12px] font-semibold text-[var(--vyz-btn-on)] hover:opacity-90 transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)]"
              >
                <PlusPh size={13} weight="bold" /> Nova oportunidade
              </button>
            )}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 min-w-0 overflow-x-auto overflow-y-auto sm:overflow-y-hidden">
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
              {/* A faixa "Precisa de você agora" saiu daqui (2026-08-25): ela
                  repetia, no topo, cards que já estavam nas colunas logo
                  abaixo, então a mesma negociação aparecia duas vezes na mesma
                  tela. A urgência continua legível no próprio card, pela
                  leitura da EVA e pelo tempo parado. */

}

              {/* Mobile stage selector pills */}
              <div className="flex sm:hidden gap-2 px-4 pt-3 pb-1 overflow-x-auto no-scrollbar">
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
                /* Enquanto arrasta, o board inteiro entra em modo de arraste: o
                   CSS desliga hover e transição de cada card. Sem isso, cada
                   reordenação disparava a transição de todos os cards ao mesmo
                   tempo, e o custo cresce com o tamanho do funil. */
                data-dragging={activeId ? "true" : undefined}
                className="
                  flex gap-2 sm:gap-3 p-4 sm:p-6 h-full
                  sm:min-w-max
                  max-sm:snap-x max-sm:snap-mandatory max-sm:overflow-x-auto max-sm:no-scrollbar
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
                  const showAssignee = new Set(filteredDeals.map((d) => d.user_id)).size > 1;
                  return STAGES.map((stage, idx) => (
                    <KanbanColumn
                      key={stage.id}
                      stage={stage}
                      deals={dealsByStage[stage.id] || []}
                      total={stageTotals[stage.id] || { count: 0, value: 0 }}
                      maxColumnValue={maxColumnValue}
                      formatCurrency={formatCurrency}
                      onDeleteDeal={setDealToDelete}
                      onMarkWon={handleMarkWon}
                      quoteByDeal={quoteByDeal}
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
                      showAssignee={showAssignee}
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
            // pb-24 no celular: o botão "Perguntar à EVA" fica fixo embaixo e cobria a última linha
            <div className="p-4 pb-24 sm:p-6">
              {sortedDealsForList.length > 0 && (
                <div className="rounded-xl border border-border bg-white dark:bg-card overflow-hidden">
                  {/* Cabeçalho de colunas. Sem ele, "50%" e "24 de ago." eram
                      números soltos no fim da linha: o cliente via o dado e não
                      sabia o que era. */}
                  <div
                    className={`${LIST_GRID} hidden sm:grid px-4 py-2 border-b border-border`}
                    style={{ background: "rgba(15,23,42,0.025)" }}
                  >
                    <span className={LIST_TH}>Negociação</span>
                    <span className={LIST_TH}>Cliente</span>
                    <span className={`${LIST_TH} text-right`}>Valor</span>
                    <span className={LIST_TH}>Etapa</span>
                    <span className={LIST_TH}>Responsável</span>
                    <span className={`${LIST_TH} text-right`}>Prob.</span>
                    <span className={`${LIST_TH} text-right`}>Atualizado</span>
                    <span aria-hidden />
                  </div>

                  {sortedDealsForList.map((deal) => {
                    const value = Number(deal.value) || 0;
                    const owner = (deal as { profiles?: { nome?: string; avatar_url?: string } }).profiles;
                    const ownerName = owner?.nome || (deal.assignee_outside_company ? "Outro time" : "Sem responsável");
                    const initials = (owner?.nome || "?").trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
                    const isSel = selectionMode && selectedDeals.has(deal.id);
                    const quote = quoteByDeal.get(deal.id);
                    const st = quote ? quoteStatus(quote) : null;
                    const quoteLine = st ? (
                      <span className={`mt-0.5 flex min-w-0 items-center gap-1.5 text-[11.5px] font-medium ${st.tone}`}>
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${st.dot}`} aria-hidden />
                        <span className="truncate">{st.text}</span>
                      </span>
                    ) : null;
                    return (
                      <div
                        key={deal.id}
                        onClick={selectionMode ? () => toggleSelectDeal(deal.id) : () => navigate(`/deals/${deal.id}`)}
                        className={`${LIST_GRID} group items-center px-4 py-2.5 border-b border-border/60 last:border-b-0 cursor-pointer transition-colors duration-150 ${
                          isSel ? "bg-[var(--vyz-accent-soft-6)]" : "hover:bg-muted/50"
                        }`}
                      >
                        {/* Negociação */}
                        <div className={`${LIST_CELL_MAIN} flex items-center gap-2.5 min-w-0`}>
                          {selectionMode && (
                            <div
                              className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
                                isSel ? "bg-[var(--vyz-accent)] border-[var(--vyz-accent)]" : "bg-muted border-border"
                              }`}
                            >
                              {isSel && (
                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          )}
                          <span className="text-[13.5px] font-semibold text-foreground truncate" style={{ letterSpacing: "-0.01em" }}>
                            {deal.title || "Sem título"}
                          </span>
                        </div>

                        {/* Cliente e, embaixo, em que pé está o orçamento: no celular a lista
                            é a visão padrão e sem isso o integrador não via quem sumiu. Lá a
                            situação ganha linha própria, senão a etiqueta da etapa a corta. */}
                        <span className={`${LIST_CELL_SUB} min-w-0 text-[12.5px] text-muted-foreground`}>
                          <span className="block truncate">{deal.customer_name || "—"}</span>
                          {quoteLine && <span className="hidden sm:flex">{quoteLine}</span>}
                        </span>
                        {quoteLine && <span className="col-span-2 col-start-1 row-start-3 sm:hidden">{quoteLine}</span>}

                        {/* Valor */}
                        <span className={`${LIST_CELL_RIGHT_TOP} text-[13.5px] font-bold tabular-nums text-foreground text-right`}>
                          {value ? formatCurrency(value) : <span className="text-[12px] font-medium text-muted-foreground/70">Sem valor</span>}
                        </span>

                        {/* Etapa */}
                        <span className={`${LIST_CELL_RIGHT_SUB} min-w-0 flex sm:justify-start`}>
                          {renderStageBadge(deal.stage_id || "")}
                        </span>

                        {/* Responsável */}
                        <span className={`${LIST_CELL_DESKTOP} items-center gap-2 min-w-0`}>
                          {owner?.avatar_url ? (
                            <img src={owner.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover shrink-0" />
                          ) : (
                            <span
                              className="h-5 w-5 rounded-full shrink-0 flex items-center justify-center text-white text-[9.5px] font-semibold"
                              style={{ background: "var(--vyz-gradient-accent)" }}
                            >
                              {initials}
                            </span>
                          )}
                          <span className="text-[12.5px] text-muted-foreground truncate">{ownerName}</span>
                        </span>

                        {/* Probabilidade */}
                        <span className={`${LIST_CELL_DESKTOP_BLOCK} text-[12.5px] font-medium text-muted-foreground tabular-nums text-right`}>
                          {deal.probability ? `${deal.probability}%` : "—"}
                        </span>

                        {/* Atualizado */}
                        <span className={`${LIST_CELL_DESKTOP_BLOCK} text-[12.5px] text-muted-foreground/80 tabular-nums text-right`}>
                          {deal.updated_at
                            ? new Date(deal.updated_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
                            : "—"}
                        </span>

                        {/* Ações */}
                        <button
                          type="button"
                          aria-label={`Excluir ${deal.title || "negociação"}`}
                          className="hidden sm:block justify-self-end opacity-50 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 text-rose-500 hover:text-rose-600 p-1 rounded transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDealToDelete(deal);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
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

      <AlertDialog
        open={!!dealToDelete}
        onOpenChange={(open) => {
          if (!open && !deleteDealMutation.isPending) setDealToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta oportunidade?</AlertDialogTitle>
            <AlertDialogDescription>
              {dealToDelete?.title ? `“${dealToDelete.title}” sai do funil. ` : ""}Não dá para desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteDealMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteDealMutation.isPending}
              onClick={(e) => {
                // Fica aberto até o banco confirmar; o onSuccess fecha.
                e.preventDefault();
                if (dealToDelete) deleteDealMutation.mutate(dealToDelete.id);
              }}
              className="rounded-full bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600"
            >
              {deleteDealMutation.isPending ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
