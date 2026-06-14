// ─────────────────────────────────────────────────────────────────────────────
// F6T.1 — Tag System helpers (puros, sem UI, sem chamadas Supabase)
//
// Funções utilitárias para normalizar nomes/slugs, mapear cores semânticas
// para classes Tailwind, agrupar assignments por entidade e validar
// entity_type contra o CHECK do schema.
//
// Schema: supabase/migrations/20260522_f6t1_tags_foundation.sql
// Types:  src/types/tags.ts
// ─────────────────────────────────────────────────────────────────────────────
import type {
  Tag,
  TagAssignment,
  TagAssignmentWithTag,
  TagEntityType,
  TagSource,
} from "@/types/tags";

// Re-export para callers que importarem só de lib/tags
export type { Tag, TagAssignment, TagAssignmentWithTag, TagEntityType, TagSource };

// ─── Validação ─────────────────────────────────────────────────────────────

const VALID_ENTITY_TYPES: ReadonlyArray<TagEntityType> = [
  "conversation",
  "deal",
  "contact",
  "knowledge_item",
];

const VALID_SOURCES: ReadonlyArray<TagSource> = [
  "manual",
  "eva_suggested",
  "system",
];

export function isValidTagEntityType(type: unknown): type is TagEntityType {
  return typeof type === "string" && (VALID_ENTITY_TYPES as readonly string[]).includes(type);
}

export function isValidTagSource(source: unknown): source is TagSource {
  return typeof source === "string" && (VALID_SOURCES as readonly string[]).includes(source);
}

// ─── Normalização ──────────────────────────────────────────────────────────

/**
 * Normaliza o nome da tag para exibição: trim, colapsa espaços internos,
 * mantém capitalização original. Não retorna vazio (caller deve validar).
 */
export function normalizeTagName(name: string): string {
  return String(name ?? "").trim().replace(/\s+/g, " ");
}

/**
 * Gera slug determinístico para constraint unique(company_id, slug).
 * - lowercase
 * - remove acentos (NFD)
 * - troca não-alfanuméricos por hífen
 * - colapsa hífens e tira de pontas
 *
 * "Lead Quente" → "lead-quente"
 * "Objeção: Preço" → "objecao-preco"
 */
export function slugifyTag(name: string): string {
  return normalizeTagName(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Cores ─────────────────────────────────────────────────────────────────

// Paleta semântica reservada para tag.color. Hex puro também é aceito
// (caller pode aplicar via style inline), mas para classes Tailwind
// usamos nomes da palette do projeto.
const TAG_COLOR_CLASSES: Record<string, string> = {
  emerald: "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300",
  blue:    "bg-blue-500/15 text-blue-700 ring-blue-500/30 dark:text-blue-300",
  sky:     "bg-sky-500/15 text-sky-700 ring-sky-500/30 dark:text-sky-300",
  amber:   "bg-amber-500/15 text-amber-700 ring-amber-500/30 dark:text-amber-300",
  orange:  "bg-orange-500/15 text-orange-700 ring-orange-500/30 dark:text-orange-300",
  rose:    "bg-rose-500/15 text-rose-700 ring-rose-500/30 dark:text-rose-300",
  red:     "bg-red-500/15 text-red-700 ring-red-500/30 dark:text-red-300",
  violet:  "bg-violet-500/15 text-violet-700 ring-violet-500/30 dark:text-violet-300",
  purple:  "bg-purple-500/15 text-purple-700 ring-purple-500/30 dark:text-purple-300",
  slate:   "bg-slate-500/15 text-slate-700 ring-slate-500/30 dark:text-slate-300",
};

const DEFAULT_TAG_COLOR_CLASS = TAG_COLOR_CLASSES.slate;

// Paleta única de cores de tag (nome semântico + hex p/ swatch + rótulo PT-BR).
// Fonte única reusada pelo picker e pela gestão de tags. `tag.color` guarda o
// NOME (ex.: "emerald"); o card resolve via getTagColorClass.
export const TAG_PALETTE: ReadonlyArray<{ name: string; hex: string; label: string }> = [
  { name: "emerald", hex: "#10B981", label: "Verde" },
  { name: "blue", hex: "#3B82F6", label: "Azul" },
  { name: "sky", hex: "#0EA5E9", label: "Ciano" },
  { name: "violet", hex: "#8B5CF6", label: "Violeta" },
  { name: "purple", hex: "#A855F7", label: "Roxo" },
  { name: "amber", hex: "#F59E0B", label: "Âmbar" },
  { name: "orange", hex: "#F97316", label: "Laranja" },
  { name: "rose", hex: "#F43F5E", label: "Rosa" },
  { name: "red", hex: "#EF4444", label: "Vermelho" },
  { name: "slate", hex: "#64748B", label: "Cinza" },
];

/** Hex correspondente a um nome de cor da paleta (fallback cinza). */
export function tagHex(color?: string | null): string {
  if (!color) return "#64748B";
  if (isHexColor(color)) return color;
  return TAG_PALETTE.find((c) => c.name === color.trim().toLowerCase())?.hex ?? "#64748B";
}

/**
 * Retorna classes Tailwind para uma cor semântica (e.g. "emerald") ou
 * fallback neutro. Para hex puro, caller deve aplicar via style inline.
 */
export function getTagColorClass(color?: string | null): string {
  if (!color) return DEFAULT_TAG_COLOR_CLASS;
  const key = color.trim().toLowerCase();
  return TAG_COLOR_CLASSES[key] ?? DEFAULT_TAG_COLOR_CLASS;
}

/**
 * Detecta se a cor é hex (#RRGGBB ou #RGB). Útil para alternar entre
 * style inline vs class semântica.
 */
export function isHexColor(color?: string | null): boolean {
  if (!color) return false;
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color.trim());
}

// ─── Agrupamento ───────────────────────────────────────────────────────────

/**
 * Indexa assignments por (entity_type, entity_id) → Tag[]. Pensado para
 * hidratar listas (pipeline, inbox) com 1 query batched e lookup O(1).
 *
 * A chave do Map é "entity_type:entity_id".
 */
export function groupTagsByEntity(
  assignments: TagAssignmentWithTag[],
): Map<string, Tag[]> {
  const map = new Map<string, Tag[]>();
  for (const a of assignments) {
    if (!a?.tag) continue;
    const key = `${a.entity_type}:${a.entity_id}`;
    const list = map.get(key);
    if (list) {
      list.push(a.tag);
    } else {
      map.set(key, [a.tag]);
    }
  }
  return map;
}

/** Helper para construir a key usada por groupTagsByEntity. */
export function entityKey(entity_type: TagEntityType, entity_id: string): string {
  return `${entity_type}:${entity_id}`;
}
