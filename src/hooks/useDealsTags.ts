// ─────────────────────────────────────────────────────────────────────────────
// F6T.2 — useDealsTags
//
// Carrega tags (sistema F6T.1 — tags + tag_assignments) para um conjunto de
// deals em UMA query batched. Evita N+1 e mantém o pipeline funcional mesmo
// se a query falhar (retorna Map vazio).
//
// Read-only. Sem chamada de IA. Sem chamada de edge function.
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { groupTagsByEntity } from "@/lib/tags";
import type { Tag, TagAssignment, TagAssignmentWithTag, TagEntityType } from "@/types/tags";

interface TagJoinRow extends Omit<TagAssignment, "id"> {
    id: string;
    tags: Tag | null;
}

export function useDealsTags(dealIds: string[]) {
    // Estabiliza queryKey por conjunto, não por ordem
    const idsKey = useMemo(() => [...dealIds].sort().join("|"), [dealIds]);

    const query = useQuery({
        queryKey: ["deals-tags", idsKey],
        enabled: dealIds.length > 0,
        staleTime: 30_000,
        queryFn: async (): Promise<Map<string, Tag[]>> => {
            if (dealIds.length === 0) return new Map();

            const { data, error } = await supabase
                .from("tag_assignments")
                .select(`
                    id,
                    company_id,
                    tag_id,
                    entity_type,
                    entity_id,
                    source,
                    confidence,
                    metadata,
                    created_by,
                    created_at,
                    tags:tag_id (
                        id, company_id, name, slug, color, category, description,
                        created_by, created_at, updated_at
                    )
                `)
                .eq("entity_type", "deal")
                .in("entity_id", dealIds);

            if (error) {
                if (import.meta.env.DEV) {
                    console.warn("[useDealsTags] query failed:", error.message);
                }
                return new Map();
            }

            const rows = (data ?? []) as unknown as TagJoinRow[];
            const assignments: TagAssignmentWithTag[] = rows
                .filter((r) => r.tags !== null)
                .map((r) => ({
                    id: r.id,
                    company_id: r.company_id,
                    tag_id: r.tag_id,
                    entity_type: r.entity_type,
                    entity_id: r.entity_id,
                    source: r.source,
                    confidence: r.confidence,
                    metadata: r.metadata ?? {},
                    created_by: r.created_by,
                    created_at: r.created_at,
                    tag: r.tags as Tag,
                }));

            // groupTagsByEntity retorna Map<"deal:id", Tag[]>; aqui o caller
            // recebe Map<dealId, Tag[]> direto pra facilitar lookup.
            const byEntityKey = groupTagsByEntity(assignments);
            const byDealId = new Map<string, Tag[]>();
            for (const [key, tags] of byEntityKey) {
                const dealId = key.slice("deal:".length);
                byDealId.set(dealId, tags);
            }
            return byDealId;
        },
    });

    return useMemo(
        () => ({
            loading: query.isLoading,
            error: query.error instanceof Error ? query.error.message : null,
            tagsByDeal: query.data ?? new Map<string, Tag[]>(),
            getTags: (dealId: string): Tag[] => query.data?.get(dealId) ?? [],
            refetch: query.refetch,
        }),
        [query],
    );
}

/**
 * Variante single-deal pro DealCommandCenter. Reusa o hook em um array de 1
 * — mantém uma única source-of-truth no React Query cache se outras telas
 * também buscarem o mesmo deal.
 */
export function useDealTagsSingle(dealId: string | undefined | null) {
    const ids = useMemo(() => (dealId ? [dealId] : []), [dealId]);
    const { tagsByDeal, loading, error } = useDealsTags(ids);
    return {
        tags: dealId ? (tagsByDeal.get(dealId) ?? []) : [],
        loading,
        error,
    };
}

/**
 * F6T.3 — tags de qualquer entidade (conversation/deal/contact/knowledge_item).
 * Read-only. Usado no EvaPanel pra mostrar marcadores comerciais da conversa
 * e do deal vinculado. Sem IA: só lê tag_assignments já gravadas.
 */
export function useEntityTags(
    entityType: TagEntityType,
    entityId: string | null | undefined,
) {
    const query = useQuery({
        queryKey: ["entity-tags", entityType, entityId ?? null],
        enabled: !!entityId,
        staleTime: 30_000,
        queryFn: async (): Promise<Tag[]> => {
            if (!entityId) return [];
            const { data, error } = await supabase
                .from("tag_assignments")
                .select(`
                    tags:tag_id (
                        id, company_id, name, slug, color, category, description,
                        created_by, created_at, updated_at
                    )
                `)
                .eq("entity_type", entityType)
                .eq("entity_id", entityId);

            if (error) {
                if (import.meta.env.DEV) {
                    console.warn(`[useEntityTags:${entityType}] query failed:`, error.message);
                }
                return [];
            }

            return ((data ?? []) as unknown as Array<{ tags: Tag | null }>)
                .map((r) => r.tags)
                .filter((t): t is Tag => t !== null);
        },
    });

    return {
        tags: query.data ?? [],
        loading: query.isLoading,
    };
}
