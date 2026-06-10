// ─────────────────────────────────────────────────────────────────────────────
// F6T.4 — useCompanyTags
//
// Gestão centralizada das tags da empresa (sistema F6T.1 — tags + tag_assignments).
// Lista todas as tags + contagem de uso por entidade, e expõe mutations de
// criar / editar / excluir / mesclar. Escrita real (não read-only como F6T.2/3).
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeTagName, slugifyTag } from "@/lib/tags";
import type { Tag, TagEntityType } from "@/types/tags";

export interface TagWithUsage extends Tag {
    usage: number;
    usageByType: Partial<Record<TagEntityType, number>>;
}

export interface CreateTagInput {
    name: string;
    color: string;
    description?: string | null;
}

export interface UpdateTagInput {
    id: string;
    name?: string;
    color?: string;
    description?: string | null;
}

export function useCompanyTags() {
    const { companyId, user } = useAuth();
    const qc = useQueryClient();

    const query = useQuery({
        queryKey: ["company-tags", companyId],
        enabled: !!companyId,
        staleTime: 30_000,
        queryFn: async (): Promise<TagWithUsage[]> => {
            const [tagsRes, assignsRes] = await Promise.all([
                supabase
                    .from("tags")
                    .select("*")
                    .eq("company_id", companyId)
                    .order("name", { ascending: true }),
                supabase
                    .from("tag_assignments")
                    .select("tag_id, entity_type")
                    .eq("company_id", companyId),
            ]);

            if (tagsRes.error) throw tagsRes.error;

            const usage = new Map<string, { total: number; byType: Record<string, number> }>();
            for (const a of (assignsRes.data ?? []) as Array<{ tag_id: string; entity_type: string }>) {
                const u = usage.get(a.tag_id) ?? { total: 0, byType: {} };
                u.total += 1;
                u.byType[a.entity_type] = (u.byType[a.entity_type] ?? 0) + 1;
                usage.set(a.tag_id, u);
            }

            return ((tagsRes.data ?? []) as Tag[]).map((t) => ({
                ...t,
                usage: usage.get(t.id)?.total ?? 0,
                usageByType: (usage.get(t.id)?.byType ?? {}) as Partial<Record<TagEntityType, number>>,
            }));
        },
    });

    const invalidate = () => {
        qc.invalidateQueries({ queryKey: ["company-tags", companyId] });
        // tags aparecem em deals/conversas — invalida os caches de leitura também
        qc.invalidateQueries({ queryKey: ["deals-tags"] });
        qc.invalidateQueries({ queryKey: ["entity-tags"] });
    };

    const createTag = useMutation({
        mutationFn: async (input: CreateTagInput) => {
            if (!companyId) throw new Error("Empresa não identificada");
            const name = normalizeTagName(input.name);
            if (!name) throw new Error("Informe um nome para a tag");
            const { error } = await supabase.from("tags").insert({
                company_id: companyId,
                name,
                slug: slugifyTag(name),
                color: input.color,
                description: input.description?.toString().trim() || null,
                created_by: user?.id ?? null,
            });
            if (error) throw error;
        },
        onSuccess: invalidate,
    });

    const updateTag = useMutation({
        mutationFn: async (input: UpdateTagInput) => {
            const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
            if (input.name !== undefined) {
                const name = normalizeTagName(input.name);
                if (!name) throw new Error("Informe um nome para a tag");
                patch.name = name;
                patch.slug = slugifyTag(name);
            }
            if (input.color !== undefined) patch.color = input.color;
            if (input.description !== undefined) {
                patch.description = input.description?.toString().trim() || null;
            }
            const { error } = await supabase.from("tags").update(patch).eq("id", input.id);
            if (error) throw error;
        },
        onSuccess: invalidate,
    });

    const deleteTag = useMutation({
        mutationFn: async (id: string) => {
            // tag_assignments tem ON DELETE CASCADE → remove os vínculos junto.
            const { error } = await supabase.from("tags").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: invalidate,
    });

    const mergeTags = useMutation({
        mutationFn: async ({ sourceId, targetId }: { sourceId: string; targetId: string }) => {
            if (sourceId === targetId) throw new Error("Escolha uma tag de destino diferente");

            const [srcRes, tgtRes] = await Promise.all([
                supabase
                    .from("tag_assignments")
                    .select("id, entity_type, entity_id")
                    .eq("tag_id", sourceId),
                supabase
                    .from("tag_assignments")
                    .select("entity_type, entity_id")
                    .eq("tag_id", targetId),
            ]);
            if (srcRes.error) throw srcRes.error;
            if (tgtRes.error) throw tgtRes.error;

            const targetKeys = new Set(
                (tgtRes.data ?? []).map((a: { entity_type: string; entity_id: string }) => `${a.entity_type}:${a.entity_id}`),
            );
            const src = (srcRes.data ?? []) as Array<{ id: string; entity_type: string; entity_id: string }>;

            // assignments da origem que a entidade JÁ tem na tag destino → remover (evita
            // violar o unique). O resto → reapontar pra tag destino.
            const toDelete = src.filter((a) => targetKeys.has(`${a.entity_type}:${a.entity_id}`)).map((a) => a.id);
            const toMove = src.filter((a) => !targetKeys.has(`${a.entity_type}:${a.entity_id}`)).map((a) => a.id);

            if (toDelete.length) {
                const { error } = await supabase.from("tag_assignments").delete().in("id", toDelete);
                if (error) throw error;
            }
            if (toMove.length) {
                const { error } = await supabase.from("tag_assignments").update({ tag_id: targetId }).in("id", toMove);
                if (error) throw error;
            }
            const { error } = await supabase.from("tags").delete().eq("id", sourceId);
            if (error) throw error;
        },
        onSuccess: invalidate,
    });

    return useMemo(
        () => ({
            tags: query.data ?? [],
            loading: query.isLoading,
            error: query.error instanceof Error ? query.error.message : null,
            refetch: query.refetch,
            createTag,
            updateTag,
            deleteTag,
            mergeTags,
        }),
        [query.data, query.isLoading, query.error, query.refetch, createTag, updateTag, deleteTag, mergeTags],
    );
}
