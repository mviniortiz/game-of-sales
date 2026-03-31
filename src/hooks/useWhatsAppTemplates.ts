import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────────
export interface WhatsAppTemplate {
  id: string;
  company_id: string;
  name: string;
  category: string;
  content: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateVariables {
  nome?: string;
  telefone?: string;
  valor_deal?: number;
  estagio?: string;
  empresa?: string;
}

export const TEMPLATE_CATEGORIES = [
  { value: "saudacao", label: "Saudação" },
  { value: "follow-up", label: "Follow-up" },
  { value: "proposta", label: "Proposta" },
  { value: "cobranca", label: "Cobrança" },
  { value: "geral", label: "Geral" },
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number]["value"];

const TABLE = "whatsapp_templates";

// ── Fetch all templates for a company ──────────────────────
export function useTemplates(companyId: string | null) {
  return useQuery<WhatsAppTemplate[]>({
    queryKey: ["whatsapp-templates", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .select("*")
        .eq("company_id", companyId)
        .order("category", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
  });
}

// ── Group templates by category ────────────────────────────
export function useTemplatesGrouped(companyId: string | null) {
  const query = useTemplates(companyId);
  const grouped = (query.data ?? []).reduce<Record<string, WhatsAppTemplate[]>>(
    (acc, tpl) => {
      const cat = tpl.category || "geral";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(tpl);
      return acc;
    },
    {}
  );
  return { ...query, grouped };
}

// ── Mutations ──────────────────────────────────────────────
export function useTemplateMutations(companyId: string | null) {
  const qc = useQueryClient();

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["whatsapp-templates", companyId] });

  const createTemplate = useMutation({
    mutationFn: async (
      data: Pick<WhatsAppTemplate, "name" | "category" | "content"> & {
        created_by?: string;
      }
    ) => {
      const { error } = await (supabase as any).from(TABLE).insert({
        company_id: companyId,
        ...data,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateTemplate = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: Partial<Pick<WhatsAppTemplate, "name" | "category" | "content">> & {
      id: string;
    }) => {
      const { error } = await (supabase as any)
        .from(TABLE)
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from(TABLE)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { createTemplate, updateTemplate, deleteTemplate };
}

// ── Variable substitution ──────────────────────────────────
export function applyTemplate(
  content: string,
  variables: TemplateVariables
): string {
  let result = content;
  if (variables.nome) result = result.replace(/\{\{nome\}\}/gi, variables.nome);
  if (variables.telefone)
    result = result.replace(/\{\{telefone\}\}/gi, variables.telefone);
  if (variables.valor_deal !== undefined) {
    const formatted = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(variables.valor_deal);
    result = result.replace(/\{\{valor_deal\}\}/gi, formatted);
  }
  if (variables.estagio)
    result = result.replace(/\{\{estagio\}\}/gi, variables.estagio);
  if (variables.empresa)
    result = result.replace(/\{\{empresa\}\}/gi, variables.empresa);
  return result;
}

export const AVAILABLE_VARIABLES = [
  { key: "{{nome}}", description: "Nome do contato" },
  { key: "{{telefone}}", description: "Telefone do contato" },
  { key: "{{valor_deal}}", description: "Valor do deal (R$)" },
  { key: "{{estagio}}", description: "Estágio do pipeline" },
  { key: "{{empresa}}", description: "Nome da empresa" },
];
