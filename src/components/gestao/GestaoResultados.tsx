import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useQuoteBoard } from "@/hooks/useQuoteBoard";
import { brl, monthStartIso } from "./format";

type DealRow = { id: string; user_id: string | null; value: number | null; stage: string | null; updated_at: string };
type ProfileRow = { id: string; nome: string | null };

const CLOSED = new Set(["closed_won", "closed_lost"]);

/** Números da empresa no placar de orçamentos (30 dias) e o retrato por vendedor. */
export function GestaoResultados() {
  const { companyId } = useAuth();
  const { activeCompanyId } = useTenant();
  const company = activeCompanyId || companyId;
  const { query: board } = useQuoteBoard(30);

  const data = useQuery({
    queryKey: ["gestao-resultados", company],
    enabled: !!company,
    queryFn: async () => {
      const [deals, people] = await Promise.all([
        supabase.from("deals").select("id, user_id, value, stage, updated_at").eq("company_id", company!).limit(5000),
        supabase.from("profiles").select("id, nome").eq("company_id", company!),
      ]);
      if (deals.error) throw deals.error;
      if (people.error) throw people.error;
      return { deals: (deals.data ?? []) as DealRow[], people: (people.data ?? []) as ProfileRow[] };
    },
  });

  const totals = board.data?.totals;
  const monthStart = monthStartIso();

  const { wonMonth, rows } = useMemo(() => {
    const deals = data.data?.deals ?? [];
    const dealOwner = new Map(deals.map((d) => [d.id, d.user_id]));
    const won = deals.filter((d) => d.stage === "closed_won" && d.updated_at >= monthStart);

    const parkedByUser = new Map<string, { count: number; amount: number }>();
    for (const q of board.data?.items ?? []) {
      if (q.state !== "no_reply" && q.state !== "went_quiet") continue;
      const owner = q.deal_id ? dealOwner.get(q.deal_id) : null;
      if (!owner) continue;
      const cur = parkedByUser.get(owner) ?? { count: 0, amount: 0 };
      parkedByUser.set(owner, { count: cur.count + 1, amount: cur.amount + (q.amount ?? 0) });
    }

    const rows = (data.data?.people ?? []).map((p) => {
      const mine = deals.filter((d) => d.user_id === p.id);
      const open = mine.filter((d) => !CLOSED.has(d.stage ?? ""));
      const wonMine = won.filter((d) => d.user_id === p.id);
      return {
        id: p.id,
        nome: p.nome || "Sem nome",
        openCount: open.length,
        openValue: open.reduce((s, d) => s + (Number(d.value) || 0), 0),
        parked: parkedByUser.get(p.id) ?? { count: 0, amount: 0 },
        wonCount: wonMine.length,
        wonValue: wonMine.reduce((s, d) => s + (Number(d.value) || 0), 0),
      };
    });
    rows.sort((a, b) => b.parked.amount - a.parked.amount || b.openValue - a.openValue);

    return {
      wonMonth: { count: won.length, value: won.reduce((s, d) => s + (Number(d.value) || 0), 0) },
      rows,
    };
  }, [data.data, board.data, monthStart]);

  const loading = board.isLoading || data.isLoading;
  const failed = board.isError || data.isError;

  const tiles = [
    { label: "Parado agora", value: brl(totals?.parked_amount ?? 0), sub: `${totals?.parked_count ?? 0} orçamentos sem resposta`, tone: "warn" as const },
    { label: "Esperando vocês", value: brl(totals?.your_turn_amount ?? 0), sub: `${totals?.your_turn_count ?? 0} clientes responderam`, tone: "accent" as const },
    { label: "Recuperado pela EVA", value: brl(totals?.recovered_amount ?? 0), sub: `${totals?.recovered_count ?? 0} fechados depois da retomada`, tone: "eva" as const },
    { label: "Fechado no mês", value: brl(wonMonth.value), sub: `${wonMonth.count} negócios ganhos`, tone: "plain" as const },
  ];

  return (
    <div className="space-y-6">
      {failed && (
        <p role="alert" className="rounded-[10px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-2)] px-4 py-3 text-[13px] text-[var(--vyz-text-muted)]">
          Não deu para carregar todos os números agora. Tente de novo em instantes.
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-[14px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] px-4 py-4 shadow-[0_1px_2px_rgba(11,18,32,0.04)]">
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: t.tone === "warn" ? "#D97706" : t.tone === "eva" ? "#6d28d9" : t.tone === "accent" ? "var(--vyz-accent)" : "var(--vyz-text-soft)" }}
              />
              <p className="text-[12px] font-medium text-[var(--vyz-text-muted)]">{t.label}</p>
            </div>
            {loading ? (
              <div className="mt-3 h-7 w-24 rounded-md bg-[var(--vyz-surface-2)] animate-pulse motion-reduce:animate-none" />
            ) : (
              <p className="mt-2 text-[24px] font-semibold tabular-nums tracking-[-0.02em] text-[var(--vyz-text-primary)]">{t.value}</p>
            )}
            <p className="mt-1 text-[12px] text-[var(--vyz-text-muted)]">{t.sub}</p>
          </div>
        ))}
      </div>

      <section aria-labelledby="gestao-por-vendedor">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="gestao-por-vendedor" className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--vyz-text-primary)]">
            Por vendedor
          </h2>
          <p className="text-[12px] text-[var(--vyz-text-muted)]">Orçamentos dos últimos 30 dias · fechados neste mês</p>
        </div>

        <div className="mt-3 overflow-x-auto rounded-[14px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)]">
          <table className="w-full min-w-[560px] text-[13px]">
            <thead>
              <tr className="text-left text-[12px] text-[var(--vyz-text-muted)]">
                <th scope="col" className="px-4 py-3 font-medium">Vendedor</th>
                <th scope="col" className="px-4 py-3 font-medium text-right">Em aberto</th>
                <th scope="col" className="px-4 py-3 font-medium text-right">Orçamentos parados</th>
                <th scope="col" className="px-4 py-3 font-medium text-right">Fechado no mês</th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                [0, 1, 2].map((i) => (
                  <tr key={i} className="border-t border-[var(--vyz-border-subtle)]">
                    <td colSpan={4} className="px-4 py-3">
                      <div className="h-4 w-full rounded bg-[var(--vyz-surface-2)] animate-pulse motion-reduce:animate-none" />
                    </td>
                  </tr>
                ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[var(--vyz-text-muted)]">
                    Ninguém na equipe ainda. Convide alguém na aba Equipe.
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-[var(--vyz-border-subtle)]">
                    <th scope="row" className="px-4 py-3 text-left font-medium text-[var(--vyz-text-primary)]">{r.nome}</th>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--vyz-text)]">
                      {brl(r.openValue)} <span className="text-[var(--vyz-text-muted)]">· {r.openCount}</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {r.parked.count > 0 ? (
                        <span className="text-[#B45309]">
                          {r.parked.amount > 0 ? (
                            <>
                              {brl(r.parked.amount)} <span className="opacity-80">· {r.parked.count}</span>
                            </>
                          ) : (
                            `${r.parked.count} sem valor lido`
                          )}
                        </span>
                      ) : (
                        <span className="text-[var(--vyz-text-soft)]">nenhum</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--vyz-text)]">
                      {brl(r.wonValue)} <span className="text-[var(--vyz-text-muted)]">· {r.wonCount}</span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
