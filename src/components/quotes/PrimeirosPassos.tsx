// Primeiros passos no topo de Orçamentos, até a pessoa fechar o ciclo uma vez:
// a EVA conhece a empresa, o WhatsApp está conectado, a primeira retomada foi
// aprovada e o primeiro orçamento foi marcado. Cada item mostra o que fazer, no
// lugar onde se faz. Some sozinha quando os quatro estão feitos.
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

    const atual = itens[proximo];
    const depois = itens.slice(proximo + 1).filter((it) => !it.feito);
    // Uma linha só: o passo da vez em destaque e o resto resumido. A lista
    // inteira, com os feitos riscados, empurrava o placar para baixo da dobra.
    return (
        <section aria-label="Primeiros passos" className="mt-4 rounded-2xl border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span aria-hidden className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#0B1220] text-[12px] font-semibold text-[#0B1220]">
                        {proximo + 1}
                    </span>
                    <div className="min-w-0">
                        <p className="text-[12px] font-medium text-[var(--vyz-text-muted)]">
                            Primeiros passos · {feitos} de {itens.length} feitos
                        </p>
                        <p className="text-[14px] font-semibold text-[var(--vyz-text-strong)]">{atual.titulo}</p>
                        <p className="mt-0.5 text-[13px] leading-snug text-[var(--vyz-text-muted)]">{atual.como}</p>
                        {depois.length > 0 && (
                            <p className="mt-1 text-[12px] text-[var(--vyz-text-soft)]">Depois: {depois.map((d) => d.titulo).join(" · ")}</p>
                        )}
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-3 pl-10 sm:pl-0">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--vyz-surface-2)]" aria-hidden>
                        <div className={`h-full rounded-full bg-[#2563EB] transition-[width] duration-700 ${EASE} motion-reduce:transition-none`} style={{ width: `${(feitos / itens.length) * 100}%` }} />
                    </div>
                    {atual.acao && (
                        <Link
                            to={atual.acao.to}
                            className={`inline-flex h-9 items-center rounded-full bg-[#0B1220] px-4 text-[13px] font-semibold text-white transition-colors duration-150 ${EASE} hover:bg-[#1F2A3B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)] focus-visible:ring-offset-2`}
                        >
                            {atual.acao.label}
                        </Link>
                    )}
                </div>
            </div>
        </section>
    );
}
