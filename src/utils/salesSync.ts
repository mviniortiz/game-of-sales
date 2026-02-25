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
 * Cria uma venda aprovada a partir de um deal ganho, se ainda não existir.
 * Usa o campo observacoes como chave de idempotência (deal id).
 */
export const syncWonDealToSale = async (
  deal: DealForSync,
  queryClient?: QueryClient
) => {
  if (!deal?.id || !deal.user_id) return;

  const observacoes = `Sincronizado automaticamente do CRM (deal ${deal.id})`;

  const { data: existing, error: existingError } = await supabase
    .from("vendas")
    .select("id")
    .eq("observacoes", observacoes)
    .eq("user_id", deal.user_id)
    .limit(1);

  if (existingError) throw existingError;
  if (existing && existing.length > 0) return;

  const hoje = new Date();
  const payload = {
    user_id: deal.user_id,
    company_id: deal.company_id || null,
    cliente_nome: deal.customer_name || deal.title || "Cliente",
    produto_id: deal.product_id || null,
    produto_nome: deal.title || "Deal CRM",
    valor: Number(deal.value) || 0,
    plataforma: "Pix/Boleto",
    forma_pagamento: "PIX" as any,
    status: "Aprovado" as any,
    observacoes,
    data_venda: formatDate(hoje),
  };

  const { error: insertError } = await supabase.from("vendas").insert(payload);
  if (insertError) throw insertError;

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

  if (error) throw error;

  await invalidateSalesQueries(queryClient);
};

