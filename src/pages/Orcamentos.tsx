// Orçamentos: o placar de dinheiro parado. Tela principal do app desde 2026-09-16.
// Lê o placar pelo useQuoteBoard e marca desfecho via set_quote_outcome. O
// estado de cada orçamento (nunca respondeu, respondeu e sumiu, esperando
// você...) é calculado no banco (view quote_tracking_live); a tela só agrupa e mostra.
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowUpDown, ArrowUpRight, Check, FileText, MessageCircle, MoreHorizontal, RotateCcw, Search, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { quoteRpc, useQuoteBoard, type QuoteBoard, type QuoteItem, type QuoteOutcome, type QuoteState } from "@/hooks/useQuoteBoard";
import { brl, evaLine, OPEN_QUOTE_STATES, plural, quoteName, stateLine } from "@/lib/quoteText";
import { DayTicks } from "@/components/quotes/DayTicks";
import { useWhatsappConnection } from "@/hooks/useWhatsappConnection";
import { useAuth } from "@/contexts/AuthContext";
import { EVA_SETUP_PATH, setupDismissKey, useEvaSetup } from "@/hooks/useEvaSetup";
import { PrimeirosPassos } from "@/components/quotes/PrimeirosPassos";
import { usePlano } from "@/hooks/usePlano";

const PERIODS = [7, 30, 90] as const;
type Period = (typeof PERIODS)[number];

type Tab = "parked" | "your_turn" | "talking" | "closed";
// A aba fica no endereço (?aba=) para o Início e os avisos levarem direto a ela.
const TAB_PARAM: Record<Tab, string> = { parked: "parados", your_turn: "esperando", talking: "conversa", closed: "encerrados" };
const tabFromParam = (v: string | null): Tab | null =>
  (Object.entries(TAB_PARAM).find(([, p]) => p === v)?.[0] as Tab | undefined) ?? null;

type Sort = "valor" | "tempo" | "recente";
const SORTS: Array<{ key: Sort; label: string }> = [
  { key: "valor", label: "Maior valor" },
  { key: "tempo", label: "Há mais tempo" },
  { key: "recente", label: "Mais recente" },
];
const SORT_KEY = "vyz:orcamentos:ordem";
function loadSort(): Sort {
  try {
    const v = localStorage.getItem(SORT_KEY);
    return SORTS.some((o) => o.key === v) ? (v as Sort) : "valor";
  } catch {
    return "valor";
  }
}
const fold = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const TAB_STATES: Record<Tab, QuoteState[]> = {
  parked: ["no_reply", "went_quiet"],
  your_turn: ["your_turn"],
  talking: ["talking"],
  closed: ["won", "lost", "expired", "closed"],
};

const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";
const FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F6F4EF]";
const SURFACE_SHADOW = "0 1px 2px rgba(15,23,42,0.04), 0 12px 32px -18px rgba(15,23,42,0.14)";

// ─── Página ────────────────────────────────────────────────────────────────
export default function Orcamentos() {
  const [searchParams, setSearchParams] = useSearchParams();
  const preview = import.meta.env.DEV ? searchParams.get("preview") : null;
  const [days, setDays] = useState<Period>(30);
  const tab = tabFromParam(searchParams.get("aba"));
  const setTab = (t: Tab) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("aba", TAB_PARAM[t]);
      return next;
    }, { replace: true });
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>(loadSort);
  const changeSort = (s: Sort) => {
    setSort(s);
    try { localStorage.setItem(SORT_KEY, s); } catch { /* sem storage: vale só nesta visita */ }
  };
  const qc = useQueryClient();
  const { query: board, queryKey } = useQuoteBoard(days, preview);

  const outcome = useMutation({
    mutationFn: async (vars: { id: string; outcome: QuoteOutcome }) => {
      if (import.meta.env.DEV && preview) return;
      const { error } = await quoteRpc<unknown>("set_quote_outcome", {
        p_quote_id: vars.id,
        p_outcome: vars.outcome,
      });
      if (error) throw new Error(error.message);
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<QuoteBoard>(queryKey);
      // Desfazer depende da conversa pra saber o estado; esse espera o refetch.
      if (prev && vars.outcome) {
        qc.setQueryData<QuoteBoard>(queryKey, {
          ...prev,
          items: prev.items.map((it) =>
            it.id === vars.id
              ? { ...it, outcome: vars.outcome, state: vars.outcome as QuoteState, days: 0, recovered: vars.outcome === "won" && !!it.followup_sent_at }
              : it,
          ),
        });
      }
      return { prev };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
      toast.error("Não consegui salvar. Tente de novo.");
    },
    onSuccess: (_d, vars) => {
      if (!vars.outcome) {
        toast.success("Desfeito.");
        return;
      }
      // Fechou depois da retomada da EVA: o dinheiro que voltou, com o valor real.
      const item = board.data?.items.find((it) => it.id === vars.id);
      const voltou = vars.outcome === "won" && item?.followup_sent_at && item.amount;
      toast.success(
        voltou ? `${brl(item.amount!)} de volta. Essa proposta fechou depois da retomada da EVA.` : vars.outcome === "won" ? "Marcado como fechado." : "Marcado como perdido.",
        { action: { label: "Desfazer", onClick: () => outcome.mutate({ id: vars.id, outcome: null }) } },
      );
    },
    onSettled: () => {
      if (!preview) qc.invalidateQueries({ queryKey: ["quote-board"] });
    },
  });

  const wa = useWhatsappConnection();
  const setup = useEvaSetup();
  const { isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const adiou = (() => {
    try { return !!setup.companyId && localStorage.getItem(setupDismissKey(setup.companyId)) === "1"; } catch { return true; }
  })();
  const { pago, carregando: planoCarregando } = usePlano();
  // Conta nova: sem assinatura vai para o Raio-X automático (o grátis); quem
  // assina cai uma vez na conversa de configuração da EVA, e quem adiou vê a
  // lista de primeiros passos. Super admin operando outra empresa nunca é levado.
  useEffect(() => {
    if (preview || !isAdmin || isSuperAdmin || planoCarregando) return;
    if (!pago && setup.fezRaioX === false) navigate("/raio-x", { replace: true });
    else if (pago && setup.configured === false && !adiou) navigate(EVA_SETUP_PATH, { replace: true });
  }, [preview, pago, planoCarregando, setup.fezRaioX, setup.configured, isAdmin, isSuperAdmin, adiou, navigate]);
  const data = board.data;
  const isEmpty = !!data && data.items.length === 0 && data.totals.total_count === 0;
  // Sem parado mas com cliente esperando, abre direto no que pede ação.
  const activeTab: Tab = tab ?? (data && data.totals.parked_count === 0 && data.totals.your_turn_count > 0 ? "your_turn" : "parked");

  return (
    <div className="mx-auto w-full max-w-4xl pb-16">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[15px] font-semibold text-[var(--vyz-text-primary)]">Orçamentos</h1>
        <PeriodFilter value={days} onChange={setDays} />
      </header>

      {!preview && pago && isAdmin && setup.companyId && setup.configured !== null && (
        <PrimeirosPassos companyId={setup.companyId} configured={setup.configured} connected={wa.connected} />
      )}

      {board.isLoading || (!data && !board.isError) ? (
        <BoardSkeleton />
      ) : board.isError ? (
        <ErrorState
          missing={(board.error as { code?: string })?.code === "PGRST202" || /could not find the function/i.test(String(board.error?.message))}
          onRetry={() => board.refetch()}
          retrying={board.isFetching}
        />
      ) : isEmpty ? (
        <EmptyState days={days} connected={wa.connected} checking={wa.loading} />
      ) : data ? (
        <>
          <Scoreboard totals={data.totals} onPick={setTab} />
          <QuoteList
            items={data.items}
            totals={data.totals}
            tab={activeTab}
            onTab={setTab}
            days={days}
            query={query}
            onQuery={setQuery}
            sort={sort}
            onSort={changeSort}
            pendingId={outcome.isPending ? outcome.variables?.id ?? null : null}
            onOutcome={(id, o) => outcome.mutate({ id, outcome: o })}
          />
        </>
      ) : null}
    </div>
  );
}

// ─── Blocos ────────────────────────────────────────────────────────────────
function PeriodFilter({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div role="radiogroup" aria-label="Período" className="inline-flex rounded-full border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] p-0.5">
      {PERIODS.map((p) => {
        const active = p === value;
        return (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(p)}
            className={`h-8 min-w-[52px] rounded-full px-3 text-[13px] font-medium transition-colors duration-150 ${EASE} ${FOCUS} ${
              active ? "bg-[#0B1220] text-white" : "text-[var(--vyz-text-muted)] hover:text-[var(--vyz-text-primary)]"
            }`}
          >
            {p} dias
          </button>
        );
      })}
    </div>
  );
}

function Scoreboard({ totals, onPick }: { totals: QuoteBoard["totals"]; onPick: (t: Tab) => void }) {
  const parts = [
    totals.no_reply_count > 0 && plural(totals.no_reply_count, "nunca respondeu", "nunca responderam"),
    totals.went_quiet_count > 0 && plural(totals.went_quiet_count, "respondeu e sumiu", "responderam e sumiram"),
  ].filter(Boolean);

  return (
    <section aria-label="Placar" className="mt-6">
      <p className="font-satoshi text-[44px] font-black leading-[1.0] tracking-[-0.04em] text-[var(--vyz-text-primary)] sm:text-[64px]">
        {brl(totals.parked_amount)} <span className="text-[var(--vyz-text-muted)]">parados</span>
      </p>
      <p className="mt-2 text-[15px] text-[var(--vyz-text)]">
        {totals.parked_count === 0
          ? "Nenhum orçamento parado agora."
          : `${plural(totals.parked_count, "orçamento", "orçamentos")}: ${parts.join(", ")}.`}
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-y-4 border-y border-[var(--vyz-border)] py-4 sm:grid-cols-4 sm:gap-y-0 sm:divide-x sm:divide-[var(--vyz-border)]">
        <Figure
          label="Esperando você"
          value={totals.your_turn_count > 0 ? plural(totals.your_turn_count, "cliente", "clientes") : "ninguém"}
          sub={totals.your_turn_count > 0 ? brl(totals.your_turn_amount) : "todos respondidos"}
          alert={totals.your_turn_count > 0}
          onClick={() => onPick("your_turn")}
        />
        <Figure
          label="Voltaram com retomada"
          value={brl(totals.recovered_amount)}
          sub={plural(totals.recovered_count, "fechou depois da EVA", "fecharam depois da EVA")}
          eva
          onClick={() => onPick("closed")}
        />
        <Figure
          label="Fechados"
          value={brl(totals.won_amount)}
          sub={plural(totals.won_count, "orçamento", "orçamentos")}
          onClick={() => onPick("closed")}
        />
        <Figure
          label="Perdidos"
          value={String(totals.lost_count + totals.expired_count)}
          sub={`${totals.lost_count} disseram não, ${totals.expired_count} morreram`}
          onClick={() => onPick("closed")}
        />
      </dl>
    </section>
  );
}

function Figure({
  label, value, sub, eva, alert, onClick,
}: { label: string; value: string; sub: string; eva?: boolean; alert?: boolean; onClick: () => void }) {
  return (
    <div className="min-w-0 px-0 sm:px-4 sm:first:pl-0">
      <dt className="flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--vyz-text-muted)]">
        {eva && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#6d28d9]" />}
        {alert && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
        {label}
      </dt>
      <dd className="mt-0.5">
        <button
          type="button"
          onClick={onClick}
          className={`rounded text-left text-[19px] font-semibold tabular-nums tracking-[-0.02em] text-[var(--vyz-text-primary)] underline-offset-4 hover:underline ${FOCUS}`}
        >
          {value}
        </button>
      </dd>
      <dd className="truncate text-[12.5px] text-[var(--vyz-text-soft)]">{sub}</dd>
    </div>
  );
}

const SORTERS: Record<Sort, (a: QuoteItem, b: QuoteItem) => number> = {
  valor: (a, b) => (b.amount ?? -1) - (a.amount ?? -1),
  tempo: (a, b) => b.days - a.days,
  recente: (a, b) => a.days - b.days,
};

function QuoteList({
  items, totals, tab, onTab, days, query, onQuery, sort, onSort, pendingId, onOutcome,
}: {
  items: QuoteItem[];
  totals: QuoteBoard["totals"];
  tab: Tab;
  onTab: (t: Tab) => void;
  days: number;
  query: string;
  onQuery: (q: string) => void;
  sort: Sort;
  onSort: (s: Sort) => void;
  pendingId: string | null;
  onOutcome: (id: string, o: QuoteOutcome) => void;
}) {
  const closedCount = items.filter((q) => TAB_STATES.closed.includes(q.state)).length;
  const tabs: Array<{ key: Tab; label: string; count: number }> = [
    { key: "parked", label: "Parados", count: totals.parked_count },
    { key: "your_turn", label: "Esperando você", count: totals.your_turn_count },
    { key: "talking", label: "Em conversa", count: totals.talking_count },
    { key: "closed", label: "Encerrados", count: closedCount },
  ];
  const needle = fold(query.trim());
  const inTab = items.filter((q) => TAB_STATES[tab].includes(q.state));
  const visible = inTab
    .filter((q) => !needle || fold(`${q.contact_name ?? ""} ${q.contact_phone ?? ""}`).includes(needle))
    .sort(SORTERS[sort]);

  // Parados vêm em duas pilhas: cada uma pede uma retomada diferente.
  const groups: Array<{ title: string | null; rows: QuoteItem[] }> =
    tab === "parked"
      ? [
          { title: "Nunca responderam", rows: visible.filter((q) => q.state === "no_reply") },
          { title: "Responderam e sumiram", rows: visible.filter((q) => q.state === "went_quiet") },
        ]
          .filter((g) => g.rows.length > 0)
          .sort((a, b) => sum(b.rows) - sum(a.rows))
      : [{ title: null, rows: visible }];

  return (
    <section aria-label="Orçamentos por situação" className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div role="tablist" aria-label="Situação" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-px">
        {tabs.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTab(t.key)}
              className={`relative flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-medium transition-colors duration-150 ${EASE} ${FOCUS} ${
                active
                  ? "bg-[var(--vyz-surface-1)] text-[var(--vyz-text-primary)] shadow-[0_0_0_1px_var(--vyz-border-strong)]"
                  : "text-[var(--vyz-text-muted)] hover:text-[var(--vyz-text-primary)]"
              }`}
            >
              {t.label}
              <span className={`tabular-nums ${active ? "text-[var(--vyz-text-muted)]" : "text-[var(--vyz-text-soft)]"}`}>{t.count}</span>
            </button>
          );
        })}
      </div>
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <label className="relative flex h-9 min-w-0 flex-1 items-center sm:w-60 sm:flex-none">
          <span className="sr-only">Buscar cliente ou telefone</span>
          <Search aria-hidden className="pointer-events-none absolute left-3 h-4 w-4 text-[var(--vyz-text-soft)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") onQuery(""); }}
            placeholder="Buscar cliente ou telefone"
            className={`h-9 w-full rounded-full border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] pl-9 pr-8 text-[13.5px] text-[var(--vyz-text-primary)] placeholder:text-[var(--vyz-text-soft)] transition-[border-color,box-shadow] duration-150 ${EASE} hover:border-[var(--vyz-border-strong)] focus:border-[var(--vyz-accent)] focus:outline-none focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)] [&::-webkit-search-cancel-button]:hidden`}
          />
          {query && (
            <button
              type="button"
              onClick={() => onQuery("")}
              aria-label="Limpar busca"
              className={`absolute right-1.5 flex h-6 w-6 items-center justify-center rounded-full text-[var(--vyz-text-muted)] hover:bg-[var(--vyz-surface-3)] hover:text-[var(--vyz-text-primary)] ${FOCUS}`}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
        </label>
        <DropdownMenu>
          <DropdownMenuTrigger
            className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] px-3.5 text-[13px] font-medium text-[var(--vyz-text)] transition-colors duration-150 ${EASE} hover:border-[var(--vyz-border-strong)] hover:text-[var(--vyz-text-primary)] data-[state=open]:border-[var(--vyz-border-strong)] ${FOCUS}`}
          >
            <ArrowUpDown className="h-3.5 w-3.5" aria-hidden />
            {SORTS.find((o) => o.key === sort)?.label}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-[12px] font-medium text-[var(--vyz-text-muted)]">Ordenar por</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={sort} onValueChange={(v) => onSort(v as Sort)}>
              {SORTS.map((o) => (
                <DropdownMenuRadioItem key={o.key} value={o.key}>{o.label}</DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-[12px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)]" style={{ boxShadow: SURFACE_SHADOW }}>
        {visible.length === 0 && needle && inTab.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-6">
            <p className="text-[14px] text-[var(--vyz-text-muted)]">Nenhum orçamento com “{query.trim()}” nesta aba.</p>
            <button
              type="button"
              onClick={() => onQuery("")}
              className={`h-8 rounded-full border border-[var(--vyz-border-strong)] px-3.5 text-[13px] font-medium text-[var(--vyz-text-primary)] transition-colors duration-150 ${EASE} hover:bg-[var(--vyz-surface-2)] ${FOCUS}`}
            >
              Limpar busca
            </button>
          </div>
        ) : visible.length === 0 ? (
          <p className="px-5 py-8 text-[14px] leading-relaxed text-[var(--vyz-text-muted)]">{emptyTabText(tab, days)}</p>
        ) : (
          groups.map((g) => (
            <div key={g.title ?? "all"}>
              {g.title && (
                <div className="flex items-baseline justify-between gap-3 border-b border-[var(--vyz-border-subtle)] bg-[var(--vyz-surface-2)] px-4 py-2 sm:px-5">
                  <h2 className="text-[12.5px] font-semibold text-[var(--vyz-text-strong)]">{g.title}</h2>
                  <span className="text-[12.5px] tabular-nums text-[var(--vyz-text-muted)]">
                    {plural(g.rows.length, "orçamento", "orçamentos")} · {brl(sum(g.rows))}
                  </span>
                </div>
              )}
              <ul className="divide-y divide-[var(--vyz-border-subtle)]">
                {g.rows.map((q) => (
                  <QuoteRow key={q.id} q={q} pending={pendingId === q.id} onOutcome={(o) => onOutcome(q.id, o)} />
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

const sum = (rows: QuoteItem[]) => rows.reduce((s, q) => s + (q.amount ?? 0), 0);

function emptyTabText(tab: Tab, days: number): string {
  switch (tab) {
    case "parked":
      return "Nenhum orçamento parado. Quando um cliente não responder, ou responder e sumir, ele aparece aqui com a retomada da EVA.";
    case "your_turn":
      return "Ninguém esperando resposta sua. Quando um cliente escrever e ficar sem resposta, ele aparece aqui.";
    case "talking":
      return "Nenhuma conversa andando agora.";
    default:
      return `Nenhum orçamento encerrado nos últimos ${days} dias.`;
  }
}

function initials(name: string): string {
  const parts = name.replace(/[^\p{L}\s]/gu, "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function QuoteRow({ q, pending, onOutcome }: { q: QuoteItem; pending: boolean; onOutcome: (o: QuoteOutcome) => void }) {
  const name = quoteName(q);
  const open = OPEN_QUOTE_STATES.includes(q.state);
  const eva = evaLine(q);
  const target = q.conversation_id ? `/inbox?conversationId=${q.conversation_id}` : q.deal_id ? `/deals/${q.deal_id}` : null;

  return (
    <li className={`group relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 px-4 py-4 sm:grid-cols-[36px_minmax(0,1fr)_auto] sm:gap-x-3.5 sm:px-5 transition-colors duration-150 ${EASE} hover:bg-[var(--vyz-surface-2)] motion-reduce:transition-none ${pending ? "opacity-60" : ""}`}>
      <span
        aria-hidden
        className="mt-0.5 hidden h-9 w-9 items-center justify-center rounded-full sm:flex bg-[var(--vyz-surface-3)] text-[12px] font-semibold text-[var(--vyz-text-muted)]"
      >
        {q.contact_name ? initials(q.contact_name) : "#"}
      </span>

      <div className="min-w-0">
        {target ? (
          // Link esticado: a linha inteira abre a conversa; o menu fica por cima (z-10).
          <Link to={target} className={`block truncate text-[15px] font-semibold text-[var(--vyz-text-primary)] after:absolute after:inset-0 after:content-[''] ${FOCUS}`}>
            {name}
          </Link>
        ) : (
          <p className="truncate text-[15px] font-semibold text-[var(--vyz-text-primary)]">{name}</p>
        )}
        <p className={`mt-0.5 text-[13px] ${q.state === "your_turn" ? "font-medium text-amber-700" : "text-[var(--vyz-text-muted)]"}`}>
          {stateLine(q)}
        </p>
        {eva && (
          <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-[var(--vyz-text)]">
            <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#6d28d9]" />
            {eva}
          </p>
        )}
      </div>

      <div className="flex items-start gap-1.5">
        <div className="flex flex-col items-end gap-2 pt-0.5">
          <p
            className={
              q.amount != null
                ? `text-[16px] font-semibold tabular-nums tracking-[-0.01em] text-[var(--vyz-text-primary)] ${q.state === "lost" || q.state === "expired" ? "text-[var(--vyz-text-soft)] line-through decoration-[var(--vyz-text-dim)]" : ""}`
                : "text-[12.5px] text-[var(--vyz-text-soft)]"
            }
          >
            {q.amount != null ? brl(q.amount) : "valor não identificado"}
          </p>
          {open && <DayTicks days={q.days} />}
        </div>
        <RowMenu q={q} name={name} pending={pending} onOutcome={onOutcome} />
      </div>
    </li>
  );
}

function RowMenu({ q, name, pending, onOutcome }: { q: QuoteItem; name: string; pending: boolean; onOutcome: (o: QuoteOutcome) => void }) {
  const decided = q.state === "won" || q.state === "lost";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        aria-label={`Ações do orçamento de ${name}`}
        className={`relative z-10 -mr-2 flex h-8 w-8 items-center justify-center rounded-full text-[var(--vyz-text-muted)] transition-colors duration-150 ${EASE} hover:bg-[var(--vyz-surface-3)] hover:text-[var(--vyz-text-primary)] data-[state=open]:bg-[var(--vyz-surface-3)] ${FOCUS}`}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {decided ? (
          <DropdownMenuItem onSelect={() => onOutcome(null)}>
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden />
            Desfazer desfecho
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem onSelect={() => onOutcome("won")}>
              <Check className="mr-2 h-4 w-4" aria-hidden />
              Fechou
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onOutcome("lost")}>
              <X className="mr-2 h-4 w-4" aria-hidden />
              Perdeu
            </DropdownMenuItem>
          </>
        )}
        {(q.conversation_id || q.deal_id) && <DropdownMenuSeparator />}
        {q.conversation_id && (
          <DropdownMenuItem asChild>
            <Link to={`/inbox?conversationId=${q.conversation_id}`}>
              <MessageCircle className="mr-2 h-4 w-4" aria-hidden />
              Abrir conversa
            </Link>
          </DropdownMenuItem>
        )}
        {q.deal_id && (
          <DropdownMenuItem asChild>
            <Link to={`/deals/${q.deal_id}`}>
              <ArrowUpRight className="mr-2 h-4 w-4" aria-hidden />
              Abrir card
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const BTN_BASE = `inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold transition-all duration-150 ${EASE} active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100`;
const BTN_PRIMARY = `${BTN_BASE} bg-[#0B1220] text-white hover:bg-[#1F2A3B]`;
const BTN_OUTLINE = `${BTN_BASE} border border-[var(--vyz-border-strong)] bg-[var(--vyz-surface-1)] text-[var(--vyz-text-strong)] hover:bg-[var(--vyz-surface-2)]`;

// O histórico importado na conexão não abre rastreio, então logo depois de
// conectar o placar fica vazio até a primeira proposta nova sair.
function EmptyState({ days, connected, checking }: { days: number; connected: boolean; checking: boolean }) {
  return (
    <section
      className="mt-6 rounded-[10px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] p-6 sm:p-8"
      style={{ boxShadow: SURFACE_SHADOW }}
    >
      <FileText className="h-6 w-6 text-[var(--vyz-text-soft)]" aria-hidden />
      <h2 className="mt-4 font-satoshi text-[26px] font-bold leading-[1.1] tracking-[-0.03em] text-[var(--vyz-text-primary)]">
        Nenhum orçamento nos últimos {days} dias
      </h2>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--vyz-text)]">
        {connected
          ? "Seu WhatsApp está conectado. Cada orçamento que você enviar a partir de agora, em PDF ou numa mensagem com valor, aparece aqui. As conversas antigas importadas na conexão não entram no placar."
          : "Assim que você enviar um orçamento pelo WhatsApp, em PDF ou numa mensagem com valor, ele aparece aqui."}
      </p>
      <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[var(--vyz-text)]">
        Se o cliente não responder em 2 dias, ou responder e sumir, a EVA prepara a retomada e manda pra você aprovar no
        seu WhatsApp. Nada sai sem o seu ok.
      </p>
      {checking ? null : connected ? (
        <Link to="/inbox" className={`${BTN_OUTLINE} ${FOCUS} mt-6`}>
          <MessageCircle className="h-4 w-4" aria-hidden />
          Abrir conversas
        </Link>
      ) : (
        <Link to="/inbox?connect=1" className={`${BTN_PRIMARY} ${FOCUS} mt-6`}>
          <MessageCircle className="h-4 w-4" aria-hidden />
          Conectar WhatsApp
        </Link>
      )}
    </section>
  );
}

function ErrorState({ missing, onRetry, retrying }: { missing: boolean; onRetry: () => void; retrying: boolean }) {
  return (
    <section role="alert" className="mt-6 rounded-[10px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] p-6" style={{ boxShadow: SURFACE_SHADOW }}>
      <h2 className="text-[17px] font-semibold text-[var(--vyz-text-primary)]">
        {missing ? "O placar de orçamentos ainda está sendo ativado" : "Não consegui carregar seus orçamentos"}
      </h2>
      <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-[var(--vyz-text-muted)]">
        {missing
          ? "Essa tela ainda não está liberada na sua conta. Enquanto isso, suas conversas e oportunidades seguem no Inbox e no Pipeline."
          : "Pode ser a conexão. Tente de novo em instantes."}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={onRetry} disabled={retrying} className={`${BTN_PRIMARY} ${FOCUS}`}>
          <RotateCcw className="h-4 w-4" aria-hidden />
          {retrying ? "Tentando..." : "Tentar de novo"}
        </button>
        <Link to="/inbox" className={`${BTN_OUTLINE} ${FOCUS}`}>Abrir Inbox</Link>
      </div>
    </section>
  );
}

function BoardSkeleton() {
  const block = "rounded-[10px] bg-[var(--vyz-surface-3)] motion-safe:animate-pulse";
  return (
    <div aria-busy="true" aria-label="Carregando orçamentos" className="mt-6">
      <div className={`${block} h-14 w-3/4 max-w-md`} />
      <div className={`${block} mt-3 h-4 w-48`} />
      <div className={`${block} mt-6 h-16`} />
      <div className="mt-8 flex flex-col gap-px overflow-hidden rounded-[12px]">
        {[0, 1, 2, 3].map((i) => <div key={i} className={`${block} h-[72px] rounded-none`} />)}
      </div>
    </div>
  );
}
