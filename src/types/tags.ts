// ─────────────────────────────────────────────────────────────────────────────
// F6T.1 — Tag System types
//
// Types puros (sem lógica). Helpers ficam em src/lib/tags.ts.
// Schema: supabase/migrations/20260522_f6t1_tags_foundation.sql
// ─────────────────────────────────────────────────────────────────────────────

export type TagEntityType =
  | "conversation"
  | "deal"
  | "contact"
  | "knowledge_item";

export type TagSource = "manual" | "eva_suggested" | "system";

export interface Tag {
  id: string;
  company_id: string;
  name: string;
  slug: string;
  color: string | null;
  category: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TagAssignment {
  id: string;
  company_id: string;
  tag_id: string;
  entity_type: TagEntityType;
  entity_id: string;
  source: TagSource;
  confidence: number | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

/** Assignment + tag carregada em JOIN (uso futuro nas UIs). */
export interface TagAssignmentWithTag extends TagAssignment {
  tag: Tag;
}
