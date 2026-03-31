import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  CustomFieldDefinition,
  CustomFieldValue,
  CustomFieldWithValue,
} from "@/types/customFields";

const TABLE_DEFS = "deal_custom_field_definitions";
const TABLE_VALS = "deal_custom_field_values";

// ── Fetch definitions for a company ──────────────────────
export function useCustomFieldDefinitions(companyId: string | null) {
  return useQuery<CustomFieldDefinition[]>({
    queryKey: ["custom-field-defs", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await (supabase as any)
        .from(TABLE_DEFS)
        .select("*")
        .eq("company_id", companyId)
        .order("position", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
  });
}

// ── Fetch definitions + values for a specific deal ───────
export function useDealCustomFields(
  dealId: string | undefined,
  companyId: string | null
) {
  const { data: definitions = [] } = useCustomFieldDefinitions(companyId);

  const { data: values = [], ...rest } = useQuery<CustomFieldValue[]>({
    queryKey: ["custom-field-vals", dealId],
    queryFn: async () => {
      if (!dealId) return [];
      const { data, error } = await (supabase as any)
        .from(TABLE_VALS)
        .select("*")
        .eq("deal_id", dealId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!dealId,
  });

  const fields: CustomFieldWithValue[] = useMemo(() => {
    return definitions.map((def) => {
      const val = values.find((v) => v.field_definition_id === def.id);
      return {
        ...def,
        fieldValue: val?.value ?? null,
        valueId: val?.id ?? null,
      };
    });
  }, [definitions, values]);

  return { fields, ...rest };
}

// ── Mutations ────────────────────────────────────────────
export function useCustomFieldMutations(companyId: string | null) {
  const qc = useQueryClient();

  const createDefinition = useMutation({
    mutationFn: async (
      data: Pick<
        CustomFieldDefinition,
        "field_name" | "field_type" | "options" | "is_required"
      > & { position?: number }
    ) => {
      const { error } = await (supabase as any).from(TABLE_DEFS).insert({
        company_id: companyId,
        ...data,
      });
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["custom-field-defs", companyId] }),
  });

  const updateDefinition = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<CustomFieldDefinition> & { id: string }) => {
      const { error } = await (supabase as any)
        .from(TABLE_DEFS)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["custom-field-defs", companyId] }),
  });

  const deleteDefinition = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from(TABLE_DEFS)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["custom-field-defs", companyId] }),
  });

  const upsertFieldValue = useMutation({
    mutationFn: async ({
      dealId,
      fieldDefinitionId,
      value,
    }: {
      dealId: string;
      fieldDefinitionId: string;
      value: string | null;
    }) => {
      const { error } = await (supabase as any)
        .from(TABLE_VALS)
        .upsert(
          {
            deal_id: dealId,
            field_definition_id: fieldDefinitionId,
            value,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "deal_id,field_definition_id" }
        );
      if (error) throw error;
    },
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({
        queryKey: ["custom-field-vals", vars.dealId],
      }),
  });

  return { createDefinition, updateDefinition, deleteDefinition, upsertFieldValue };
}
