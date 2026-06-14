// Estilos e tipos compartilhados de pipeline/estágios.
// Antes duplicados em CRM.tsx, DealDetails.tsx, ConversionFunnelDonut.tsx e
// PipelineConfigModal.tsx. Centralizar evita divergência de ícone/cor entre telas.
import {
  Target,
  Users,
  DollarSign,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Zap,
  Star,
  XCircle,
  type LucideIcon,
} from "lucide-react";

// ── Tipos ────────────────────────────────────────────────────────────────────

// Natureza do estágio. Substitui as comparações hardcoded por string
// ('closed_won'/'closed_lost') espalhadas pelo código.
export type StageKind = "open" | "won" | "lost";

// Chaves legadas do enum/CHECK de deals.stage (mantidas em dual-write).
export type LegacyStageKey =
  | "lead"
  | "qualification"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

// Config editável de um estágio (espelha a linha em pipeline_stages).
export interface StageConfig {
  id: string;
  title: string;
  iconId: string;
  colorId: string;
  kind: StageKind;
  defaultProbability?: number;
  legacyKey?: LegacyStageKey | null;
}

// Estágio já resolvido para render (com ícone e classes de cor).
export interface Stage {
  id: string;
  title: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  kind: StageKind;
  defaultProbability?: number;
  legacyKey?: LegacyStageKey | null;
}

// ── Catálogos de ícone/cor (UI do editor) ───────────────────────────────────

export const AVAILABLE_ICONS: { id: string; icon: LucideIcon; label: string }[] = [
  { id: "target", icon: Target, label: "Alvo" },
  { id: "users", icon: Users, label: "Usuários" },
  { id: "dollar", icon: DollarSign, label: "Dinheiro" },
  { id: "trending", icon: TrendingUp, label: "Crescimento" },
  { id: "check", icon: CheckCircle, label: "Concluído" },
  { id: "alert", icon: AlertCircle, label: "Alerta" },
  { id: "sparkles", icon: Sparkles, label: "Destaque" },
  { id: "zap", icon: Zap, label: "Rápido" },
  { id: "star", icon: Star, label: "Estrela" },
  { id: "x", icon: XCircle, label: "Cancelado" },
];

export const AVAILABLE_COLORS: { id: string; dotColor: string; label: string }[] = [
  { id: "gray", dotColor: "bg-slate-500", label: "Cinza" },
  { id: "blue", dotColor: "bg-blue-500", label: "Azul" },
  { id: "indigo", dotColor: "bg-indigo-500", label: "Índigo" },
  { id: "purple", dotColor: "bg-violet-500", label: "Roxo" },
  { id: "amber", dotColor: "bg-amber-500", label: "Âmbar" },
  { id: "emerald", dotColor: "bg-emerald-500", label: "Verde" },
  { id: "rose", dotColor: "bg-rose-500", label: "Rosa" },
  { id: "cyan", dotColor: "bg-cyan-500", label: "Ciano" },
];

// ── Mapas de resolução ──────────────────────────────────────────────────────

export const ICON_MAP: Record<string, LucideIcon> = {
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

// Light-first (tons -600), cada estágio com matiz próprio. Mantém o que estava
// em CRM.tsx (LP-PIPE.1 2026-06-09).
export const COLOR_MAP: Record<string, { color: string; bgColor: string; borderColor: string }> = {
  gray: { color: "text-slate-500", bgColor: "bg-slate-500/10", borderColor: "border-slate-500/30" },
  blue: { color: "text-blue-600", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30" },
  indigo: { color: "text-indigo-600", bgColor: "bg-indigo-500/10", borderColor: "border-indigo-500/30" },
  purple: { color: "text-violet-600", bgColor: "bg-violet-500/10", borderColor: "border-violet-500/30" },
  amber: { color: "text-amber-600", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/30" },
  emerald: { color: "text-emerald-600", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/30" },
  rose: { color: "text-rose-600", bgColor: "bg-rose-500/10", borderColor: "border-rose-500/30" },
  cyan: { color: "text-cyan-600", bgColor: "bg-cyan-500/10", borderColor: "border-cyan-500/30" },
};

// Converte StageConfig em Stage resolvido para render.
export function configToStage(config: StageConfig): Stage {
  const colors = COLOR_MAP[config.colorId] || COLOR_MAP.gray;
  return {
    id: config.id,
    title: config.title,
    icon: ICON_MAP[config.iconId] || Target,
    kind: config.kind,
    defaultProbability: config.defaultProbability,
    legacyKey: config.legacyKey ?? null,
    ...colors,
  };
}

// ── Dual-write: stage_id (novo) ⇄ deals.stage (legado) ──────────────────────

// Fallback quando um estágio custom (legacyKey null) precisa gravar deals.stage,
// que continua restrito aos 6 valores do enum/CHECK.
const KIND_TO_LEGACY: Record<StageKind, LegacyStageKey> = {
  open: "qualification",
  won: "closed_won",
  lost: "closed_lost",
};

// Valor a gravar em deals.stage (legado) para um estágio. Usa legacyKey quando
// disponível; senão deriva do kind. NUNCA retorna valor fora dos 6 do enum.
export function deriveLegacyStage(
  stage: Pick<StageConfig, "kind" | "legacyKey"> | null | undefined,
): LegacyStageKey {
  if (!stage) return "lead";
  return stage.legacyKey ?? KIND_TO_LEGACY[stage.kind];
}
