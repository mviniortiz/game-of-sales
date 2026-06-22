import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// useEvaPriorContext — lê o que a empresa JÁ configurou no eva_business_context
// (serviços, ICP, tom de voz, promessas proibidas) e devolve:
//   - summary: texto compacto pra EVA não repetir perguntas já respondidas (edge)
//   - seeds:   valores pré-prontos por CHAVE DE CAMPO (vende/icp/redline/tom...),
//              pra o "agente nascendo" já mostrar o que ela sabe antes de perguntar.
// Adaptatividade do EVA Studio (leva 3): a conversa começa já conhecendo a casa.

export interface EvaPriorContext {
    /** Resumo curto pro prompt da EVA (vazio se a empresa ainda não configurou nada). */
    summary: string;
    /** Valores prontos por chave de campo dos especialistas (só os que dá pra derivar). */
    seeds: Record<string, string>;
    /** true quando a query resolveu (mesmo que sem contexto). */
    ready: boolean;
}

const EMPTY: EvaPriorContext = { summary: "", seeds: {}, ready: false };

function asText(v: unknown): string {
    return typeof v === "string" ? v.trim() : "";
}

function servicesText(services: unknown[]): string {
    const parts = services
        .map((s) => {
            if (typeof s === "string") return s.trim();
            if (s && typeof s === "object") {
                const o = s as Record<string, unknown>;
                const nome = asText(o.nome) || asText(o.name);
                const desc = asText(o.descricao) || asText(o.description);
                return [nome, desc].filter(Boolean).join(" — ");
            }
            return "";
        })
        .filter(Boolean);
    return parts.slice(0, 6).join("; ");
}

function precoText(services: unknown[]): string {
    for (const s of services) {
        if (s && typeof s === "object") {
            const o = s as Record<string, unknown>;
            const modelo = asText(o.modelo_cobranca);
            const min = typeof o.preco_min === "number" ? o.preco_min : null;
            const max = typeof o.preco_max === "number" ? o.preco_max : null;
            const faixa = min && max ? `R$ ${min} a R$ ${max}` : min ? `a partir de R$ ${min}` : "";
            const txt = [modelo, faixa].filter(Boolean).join(", ");
            if (txt) return txt;
        }
    }
    return "";
}

function buildPrior(row: Record<string, unknown> | null): EvaPriorContext {
    if (!row) return { ...EMPTY, ready: true };

    const agency = (row.agency as Record<string, unknown>) ?? {};
    const icp = (row.icp as Record<string, unknown>) ?? {};
    const services = Array.isArray(row.services) ? (row.services as unknown[]) : [];

    const vende = servicesText(services);
    const icpTxt = asText(icp.descricao);
    const tom = asText(agency.tom_de_voz);
    const proibidas = Array.isArray(agency.promessas_proibidas)
        ? (agency.promessas_proibidas as unknown[]).map(asText).filter(Boolean).join("; ")
        : "";
    const preco = precoText(services);

    // seeds por chave de campo (genéricas, casam com os especialistas)
    const seeds: Record<string, string> = {};
    if (vende) { seeds.vende = vende; seeds.escopo = vende; }
    if (icpTxt) { seeds.icp = icpTxt; seeds.alvo = icpTxt; }
    if (proibidas) seeds.redline = proibidas;
    if (tom) seeds.tom = tom;
    if (preco) seeds.preco = preco;

    // summary humano pra edge (só o que existe)
    const lines: string[] = [];
    if (vende) lines.push(`O que a agência vende: ${vende}`);
    if (icpTxt) lines.push(`Cliente ideal: ${icpTxt}`);
    if (tom) lines.push(`Tom de voz: ${tom}`);
    if (proibidas) lines.push(`Nunca prometer: ${proibidas}`);
    if (preco) lines.push(`Precificação: ${preco}`);

    return { summary: lines.join("\n"), seeds, ready: true };
}

export function useEvaPriorContext(): EvaPriorContext {
    const { companyId } = useAuth();

    const { data, isSuccess } = useQuery({
        queryKey: ["eva-prior-context", companyId],
        enabled: !!companyId,
        staleTime: 60_000,
        queryFn: async (): Promise<Record<string, unknown> | null> => {
            const { data } = await supabase
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela fora dos types gerados (padrão do projeto)
                .from("eva_business_context" as any)
                .select("agency, services, icp")
                .eq("company_id", companyId)
                .maybeSingle();
            return (data as unknown as Record<string, unknown> | null) ?? null;
        },
    });

    return useMemo(() => {
        if (!companyId) return EMPTY;
        if (!isSuccess) return EMPTY;
        return buildPrior(data ?? null);
    }, [companyId, isSuccess, data]);
}
