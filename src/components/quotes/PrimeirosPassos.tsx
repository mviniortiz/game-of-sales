// Primeiros passos no topo de Orçamentos, até a pessoa fechar o ciclo uma vez:
// a EVA conhece a empresa, o WhatsApp está conectado, a primeira retomada foi
// aprovada e o primeiro orçamento foi marcado. Cada item mostra o que fazer, no
// lugar onde se faz. Some sozinha quando os quatro estão feitos.
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { VyzonMark } from "@/components/brand/VyzonMark";
import { EVA_SETUP_PATH } from "@/hooks/useEvaSetup";

const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";

type Item = { feito: boolean; titulo: string; como: string; acao?: { label: string; to: string } };

export function PrimeirosPassos({ companyId, configured, connected }: { companyId: string; configured: boolean; connected: boolean }) {
    const q = useQuery({
        queryKey: ["primeiros-passos", companyId],
        staleTime: 60_000,
        queryFn: async () => {
            const [aprovadas, marcados] = await Promise.all([
                // agent_suggestions e quote_tracking não estão nos tipos gerados.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (supabase as any)
                    .from("agent_suggestions")
                    .select("id", { count: "exact", head: true })
                    .eq("company_id", companyId)
                    .eq("kind", "followup")
                    .in("status", ["accepted", "adjusted", "sent"]),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (supabase as any)
                    .from("quote_tracking")
                    .select("id", { count: "exact", head: true })
                    .eq("company_id", companyId)
                    .not("outcome", "is", null),
            ]);
            return { aprovou: (aprovadas.count ?? 0) > 0, marcou: (marcados.count ?? 0) > 0 };
        },
    });
    if (!q.data) return null;

    const itens: Item[] = [
        {
            feito: configured,
            titulo: "A EVA conhece sua empresa",
            como: "Uma conversa de 3 minutos para ela escrever do seu jeito.",
            acao: { label: "Começar", to: EVA_SETUP_PATH },
        },
        {
            feito: connected,
            titulo: "WhatsApp conectado",
            como: "Ela lê suas propostas e acha as que pararam.",
            acao: { label: "Conectar", to: EVA_SETUP_PATH },
        },
        {
            feito: q.data.aprovou,
            titulo: "Primeira retomada aprovada",
            como: "Quando a EVA te mandar uma retomada no WhatsApp, responda 1. Ela sai do seu número.",
        },
        {
            feito: q.data.marcou,
            titulo: "Primeiro orçamento marcado",
            como: "Fechou ou perdeu? Marque no orçamento. É assim que o placar mostra o que voltou.",
        },
    ];
    const feitos = itens.filter((i) => i.feito).length;
    if (feitos === itens.length) return null;
    const proximo = itens.findIndex((i) => !i.feito);

    return (
        <section aria-label="Primeiros passos" className="mt-4 rounded-2xl border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5">
            <div className="flex items-center gap-3">
                <VyzonMark size={36} />
                <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-[var(--vyz-text-strong)]">Primeiros passos</p>
                    <p className="text-[13px] text-[var(--vyz-text-muted)]">{feitos} de {itens.length} feitos</p>
                </div>
                <div className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-[var(--vyz-surface-2)] sm:block" aria-hidden>
                    <div className={`h-full rounded-full bg-[#2563EB] transition-[width] duration-700 ${EASE} motion-reduce:transition-none`} style={{ width: `${(feitos / itens.length) * 100}%` }} />
                </div>
            </div>
            <ol className="mt-3 flex flex-col">
                {itens.map((it, i) => (
                    <li key={it.titulo} className="flex items-start gap-3 border-t border-[var(--vyz-border-subtle)] py-3 first:border-t-0">
                        <span
                            aria-hidden
                            className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[12px] font-semibold ${
                                it.feito ? "border-[#2563EB] bg-[#2563EB] text-white" : i === proximo ? "border-[#0B1220] text-[#0B1220]" : "border-[var(--vyz-border-strong)] text-[var(--vyz-text-muted)]"
                            }`}
                        >
                            {it.feito ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className={`block text-[14px] font-semibold ${it.feito ? "text-[var(--vyz-text-muted)] line-through decoration-[var(--vyz-text-soft)]" : "text-[var(--vyz-text-strong)]"}`}>
                                {it.titulo}
                                <span className="sr-only">{it.feito ? " (feito)" : ""}</span>
                            </span>
                            {!it.feito && i === proximo && <span className="mt-0.5 block text-[13px] leading-snug text-[var(--vyz-text-muted)]">{it.como}</span>}
                        </span>
                        {!it.feito && i === proximo && it.acao && (
                            <Link
                                to={it.acao.to}
                                className={`inline-flex h-9 shrink-0 items-center rounded-full bg-[#0B1220] px-4 text-[13px] font-semibold text-white transition-colors duration-150 ${EASE} hover:bg-[#1F2A3B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)] focus-visible:ring-offset-2`}
                            >
                                {it.acao.label}
                            </Link>
                        )}
                    </li>
                ))}
            </ol>
        </section>
    );
}
