import { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { playSaleChime } from "./sounds";

type DealForSync = {
  id: string;
  title?: string | null;
  value?: number | null;
  customer_name?: string | null;
  product_id?: string | null;
  user_id: string;
  company_id?: string | null;
};

const SALES_QUERY_KEYS = [
  "vendas",
  "vendas-evolution",
  "vendas-por-produto",
  "vendas-por-plataforma",
  "admin-stats-vendas",
  "admin-top-vendedores",
  "admin-vendas-evolution",
  "metas-consolidadas",
  "metas-individuais",
  "metas-individuais-full",
  "metas-progresso",
  "vendas-mes-atual",
  "vendedores-metas",
  "seller-ranking",
  "vendedores-ranking",
  "meta-consolidada-atual",
  "contribuicao-vendedores",
  "meta-mensal",
  "show-rate",
  "conversion-rate",
  "vendas-prev-month",
];

const formatDate = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export const invalidateSalesQueries = async (queryClient?: QueryClient) => {
  if (!queryClient) return;
  await Promise.all(
    SALES_QUERY_KEYS.map((key) =>
      queryClient.invalidateQueries({ queryKey: [key] })
    )
  );
};

/**
 * Resolve the product name from the produtos table when a product_id is available.
 * Falls back to deal title or a default string.
 */
async function resolveProductName(
  productId: string | null | undefined,
  fallback: string
): Promise<{ nome: string; validProductId: string | null }> {
  if (!productId) return { nome: fallback, validProductId: null };

  const { data } = await supabase
    .from("produtos")
    .select("id, nome")
    .eq("id", productId)
    .maybeSingle();

  if (data) return { nome: data.nome, validProductId: data.id };
  // Product doesn't exist (maybe deleted) — don't send invalid FK
  return { nome: fallback, validProductId: null };
}

/**
 * Cria uma venda aprovada a partir de um deal ganho, se ainda não existir.
 * Usa o campo observacoes como chave de idempotência (deal id).
 */
export const syncWonDealToSale = async (
  deal: DealForSync,
  queryClient?: QueryClient,
  fallbackCompanyId?: string | null
) => {
  if (!deal?.id || !deal.user_id) {
    console.warn("[salesSync] Deal inválido para sync:", deal);
    return;
  }

  const observacoes = `Sincronizado automaticamente do CRM (deal ${deal.id})`;

  // Idempotency check
  const { data: existing, error: existingError } = await supabase
    .from("vendas")
    .select("id")
    .eq("observacoes", observacoes)
    .eq("user_id", deal.user_id)
    .limit(1);

  if (existingError) {
    console.error("[salesSync] Erro ao verificar venda existente:", existingError);
    throw existingError;
  }
  if (existing && existing.length > 0) return;

  // Resolve product name and validate FK
  const { nome: produtoNome, validProductId } = await resolveProductName(
    deal.product_id,
    deal.customer_name || deal.title || "Deal CRM"
  );

  const hoje = new Date();
  const payload = {
    user_id: deal.user_id,
    company_id: deal.company_id || fallbackCompanyId || null,
    cliente_nome: deal.customer_name || deal.title || "Cliente",
    produto_id: validProductId,
    produto_nome: produtoNome,
    valor: Number(deal.value) || 0,
    plataforma: "CRM",
    forma_pagamento: "CRM" as any,
    status: "Aprovado" as any,
    observacoes,
    data_venda: formatDate(hoje),
  };

  const { error: insertError } = await supabase.from("vendas").insert(payload);
  if (insertError) {
    console.error("[salesSync] Erro ao inserir venda:", insertError, "Payload:", payload);
    throw insertError;
  }

  playSaleChime();
  await invalidateSalesQueries(queryClient);
};

/**
 * Remove a venda sincronizada automaticamente para um deal, quando ele deixa de
 * estar ganho (ex.: foi marcado como perdido depois).
 */
export const unsyncDealSale = async (
  dealId: string,
  userId: string,
  queryClient?: QueryClient
) => {
  if (!dealId || !userId) return;

  const observacoes = `Sincronizado automaticamente do CRM (deal ${dealId})`;

  const { error } = await supabase
    .from("vendas")
    .delete()
    .eq("observacoes", observacoes)
    .eq("user_id", userId);

  if (error) {
    console.error("[salesSync] Erro ao remover venda sincronizada:", error);
    throw error;
  }

  await invalidateSalesQueries(queryClient);
};
