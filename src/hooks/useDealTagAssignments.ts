// ─────────────────────────────────────────────────────────────────────────────
// F6T — Mutations de tag para um deal (sistema F6T.1: tag_assignments).
//
// Substitui o fluxo legado (deal_tags) no DealTagPicker. Aplicar/remover uma
// tag a um deal, e criar-e-aplicar uma tag nova. Tudo escopado por company.
// Invalida os caches de leitura (deals-tags, entity-tags, company-tags).
// ─────────────────────────────────────────────────────────────────────────────
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeTagName, slugifyTag } from "@/lib/tags";

export function useDealTagAssignments(companyId: string | null | undefined, dealId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["deals-tags"] });
    qc.invalidateQueries({ queryKey: ["entity-tags"] });
    qc.invalidateQueries({ queryKey: ["company-tags", companyId] });
  };

  // Aplica uma tag existente ao deal (idempotente — ignora duplicata).
  const assignTag = useMutation({
    mutationFn: async (tagId: string) => {
      if (!companyId) throw new Error("Empresa não identificada");
      const { error } = await supabase.from("tag_assignments").insert({
        company_id: companyId,
        tag_id: tagId,
        entity_type: "deal",
        entity_id: dealId,
        source: "manual",
        created_by: user?.id ?? null,
      });
      if (error && (error as { code?: string }).code !== "23505") throw error;
    },
    onSuccess: invalidate,
  });

  const removeTag = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from("tag_assignments")
        .delete()
        .eq("company_id", companyId)
        .eq("tag_id", tagId)
        .eq("entity_type", "deal")
        .eq("entity_id", dealId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  // Cria a tag (ou reaproveita a existente pelo slug) e aplica ao deal.
  const createAndAssign = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      if (!companyId) throw new Error("Empresa não identificada");
      const nm = normalizeTagName(name);
      if (!nm) throw new Error("Informe um nome para a tag");
      const slug = slugifyTag(nm);

      let tagId: string | undefined;
      const { data: created, error } = await supabase
        .from("tags")
        .insert({ company_id: companyId, name: nm, slug, color, created_by: user?.id ?? null })
        .select("id")
        .single();

      if (error) {
        // 23505 = já existe tag com esse slug → reaproveita
        if ((error as { code?: string }).code === "23505") {
          const { data: existing } = await supabase
            .from("tags")
            .select("id")
            .eq("company_id", companyId)
            .eq("slug", slug)
            .single();
          tagId = existing?.id;
        } else {
          throw error;
        }
      } else {
        tagId = created?.id;
      }

      if (!tagId) throw new Error("Não foi possível criar a tag");

      const { error: aErr } = await supabase.from("tag_assignments").insert({
        company_id: companyId,
        tag_id: tagId,
        entity_type: "deal",
        entity_id: dealId,
        source: "manual",
        created_by: user?.id ?? null,
      });
      if (aErr && (aErr as { code?: string }).code !== "23505") throw aErr;
      return tagId;
    },
    onSuccess: invalidate,
  });

  return { assignTag, removeTag, createAndAssign };
}
