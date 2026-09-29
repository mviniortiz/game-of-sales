// Orçamentos: o placar de dinheiro parado. Tela principal do app desde 2026-09-16.
// Lê a RPC get_quote_board e marca desfecho via set_quote_outcome. O estado de
// cada orçamento (nunca respondeu, respondeu e sumiu, esperando você...) é
// calculado no banco (view quote_tracking_live); a tela só agrupa e mostra.
// As RPCs ainda não estão nos tipos gerados, daí o cast local.
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowUpRight, Check, FileText, MessageCircle, MoreHorizontal, RotateCcw, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Contrato ──────────────────────────────────────────────────────────────
type QuoteState = "no_reply" | "went_quiet" | "your_turn" | "talking" | "won" | "lost" | "expired" | "closed";
type QuoteOutcome = "won" | "lost" | null;
type DraftStatus = "pending" | "accepted" | "adjusted" | "rejected" | "expired" | "sent";

export type QuoteItem = {
  id: string;
  deal_id: string | null;
  conversation_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  amount: number | null;
  detected_by: "pdf" | "text";
  sent_at: string;
  state: QuoteState;
  /** Dias no estado atual (desde o orçamento, a última fala do cliente ou o desfecho). */
  days: number;
  outcome: QuoteOutcome;
  recovered: boolean;
  followup_sent_at: string | null;
  draft_status: DraftStatus | null;
  draft_at: string | null;
};

export type QuoteBoard = {
  totals: {
    parked_amount: number;
    parked_count: number;
    no_reply_count: number;
    went_quiet_count: number;
    your_turn_amount: number;
    your_turn_count: number;
    talking_count: number;
    recovered_amount: number;
    recovered_count: number;
    won_amount: number;
    won_count: number;
    lost_count: number;
    expired_count: number;
    total_count: number;
  };
  items: QuoteItem[];
};

type RpcResult<T> = { data: T | null; error: { message: string; code?: string } | null };
type RpcFn = <T>(fn: string, args: Record<string, unknown>) => PromiseLike<RpcResult<T>>;
const rpc = supabase.rpc.bind(supabase) as unknown as RpcFn;

const PERIODS = [7, 30, 90] as const;
type Period = (typeof PERIODS)[number];

/** Com 30 dias sem o cliente escrever, o orçamento morre (quote_tracking_expire). */
const EXPIRE_DAYS = 30;

type Tab = "parked" | "your_turn" | "talking" | "closed";
const TAB_STATES: Record<Tab, QuoteState[]> = {
  parked: ["no_reply", "went_quiet"],
  your_turn: ["your_turn"],
  talking: ["talking"],
  closed: ["won", "lost", "expired", "closed"],
};

// ─── Preview (só em dev): ?preview=1 | vazio | erro ─────────────────────────
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const previewItem = (p: Partial<QuoteItem> & Pick<QuoteItem, "id" | "state" | "days">): QuoteItem => ({
  deal_id: `d-${p.id}`, conversation_id: `c-${p.id}`, contact_name: null, contact_phone: null, amount: null,
  detected_by: "pdf", sent_at: daysAgo(p.days), outcome: null, recovered: false, followup_sent_at: null,
  draft_status: null, draft_at: null, ...p,
});
const PREVIEW_BOARD: QuoteBoard = {
  totals: {
    parked_amount: 115_300, parked_count: 5, no_reply_count: 3, went_quiet_count: 2,
    your_turn_amount: 18_400, your_turn_count: 1, talking_count: 1,
    recovered_amount: 23_900, recovered_count: 1, won_amount: 35_500, won_count: 2,
    lost_count: 1, expired_count: 1, total_count: 11,
  },
  items: [
    previewItem({ id: "p1", state: "your_turn", days: 1, contact_name: "Marcos Vieira", amount: 18_400, sent_at: daysAgo(6) }),
    previewItem({ id: "p2", state: "went_quiet", days: 8, contact_name: "Padaria Trigo Bom", amount: 61_200, sent_at: daysAgo(12), draft_status: "pending", draft_at: daysAgo(0) }),
    previewItem({ id: "p3", state: "no_reply", days: 5, contact_name: "Carlos Menezes", amount: 23_900, draft_status: "sent", draft_at: daysAgo(3), followup_sent_at: daysAgo(3) }),
    previewItem({ id: "p4", state: "went_quiet", days: 4, contact_name: "Juliana Rocha", amount: 14_300, sent_at: daysAgo(9) }),
    previewItem({ id: "p5", state: "no_reply", days: 22, contact_name: "Ana Paula Ribeiro", amount: 15_900, draft_status: "rejected", draft_at: daysAgo(19) }),
    previewItem({ id: "p6", state: "no_reply", days: 1, contact_name: null, contact_phone: "5521988887777", amount: null, detected_by: "text" }),
    previewItem({ id: "p7", state: "talking", days: 1, contact_name: "Condomínio Vila Verde", amount: 142_000, sent_at: daysAgo(4) }),
    previewItem({ id: "p8", state: "won", days: 2, contact_name: "Rafael Nunes", amount: 23_900, recovered: true, outcome: "won", followup_sent_at: daysAgo(9), sent_at: daysAgo(16) }),
    previewItem({ id: "p9", state: "won", days: 6, contact_name: "Mercado Bom Preço", amount: 11_600, outcome: "won", sent_at: daysAgo(14) }),
    previewItem({ id: "p10", state: "lost", days: 3, contact_name: "Pedro Almeida", amount: 9_800, outcome: "lost", sent_at: daysAgo(11) }),
    previewItem({ id: "p11", state: "expired", days: 31, contact_name: "Studio Forma", amount: 12_300, sent_at: daysAgo(31) }),
  ],
};
const EMPTY_BOARD: QuoteBoard = {
  totals: {
    parked_amount: 0, parked_count: 0, no_reply_count: 0, went_quiet_count: 0,
    your_turn_amount: 0, your_turn_count: 0, talking_count: 0,
    recovered_amount: 0, recovered_count: 0, won_amount: 0, won_count: 0,
    lost_count: 0, expired_count: 0, total_count: 0,
  },
  items: [],
};

// ─── Formatação ────────────────────────────────────────────────────────────
const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: Number.isInteger(v) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(v);

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const ago = (days: number) => (days <= 0 ? "hoje" : days === 1 ? "ontem" : `há ${days} dias`);
const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));

/** O que aconteceu com o orçamento, em uma linha. */
function stateLine(q: QuoteItem): string {
  switch (q.state) {
    case "no_reply":
      return `Nunca respondeu · orçamento${q.detected_by === "pdf" ? " em PDF" : ""} enviado ${ago(q.days)}`;
    case "went_quiet":
      return `Respondeu e sumiu · última mensagem do cliente ${ago(q.days)}`;
    case "your_turn":
      return `Esperando você · mandou mensagem ${ago(q.days)} e está sem resposta`;
    case "talking":
      return `Em conversa · cliente falou ${ago(q.days)}`;
    case "won":
      return q.recovered ? `Fechou com retomada · ${ago(q.days)}` : `Fechou · ${ago(q.days)}`;
    case "lost":
      return `Perdeu · ${ago(q.days)}`;
    case "expired":
      return `Morreu · ${EXPIRE_DAYS} dias sem o cliente escrever`;
    default:
      return "Encerrado no pipeline";
  }
}

/** O que a EVA fez por este orçamento. Só para orçamento aberto. */
function evaLine(q: QuoteItem): string | null {
  if (!["no_reply", "went_quiet", "your_turn", "talking"].includes(q.state) || !q.draft_status) return null;
  switch (q.draft_status) {
    case "pending":
      return "Retomada pronta no seu WhatsApp, esperando o seu ok";
    case "sent":
    case "adjusted":
      return `Retomada enviada ${ago(daysSince(q.followup_sent_at ?? q.draft_at ?? q.sent_at))}`;
    case "rejected":
      return "Você descartou a retomada";
    case "expired":
      return "A retomada expirou sem resposta sua";
    default:
      return null;
  }
}

const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";
const FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F6F4EF]";
const SURFACE_SHADOW = "0 1px 2px rgba(15,23,42,0.04), 0 12px 32px -18px rgba(15,23,42,0.14)";

// ─── Página ────────────────────────────────────────────────────────────────
export default function Orcamentos() {
  const { companyId } = useAuth();
  const { activeCompanyId } = useTenant();
  const effectiveCompanyId = activeCompanyId || companyId;
  const [searchParams] = useSearchParams();
  const preview = import.meta.env.DEV ? searchParams.get("preview") : null;
  const [days, setDays] = useState<Period>(30);
  const [tab, setTab] = useState<Tab | null>(null);
  const qc = useQueryClient();
  const queryKey = ["quote-board", effectiveCompanyId, days, preview] as const;

  const board = useQuery({
    queryKey,
    enabled: !!preview || !!effectiveCompanyId,
    retry: false,
    queryFn: async (): Promise<QuoteBoard> => {
      if (import.meta.env.DEV && preview) {
        if (preview === "erro") throw Object.assign(new Error("preview"), { code: "PGRST202" });
        return preview === "vazio" ? EMPTY_BOARD : structuredClone(PREVIEW_BOARD);
      }
      const { data, error } = await rpc<QuoteBoard>("get_quote_board", {
        p_company_id: effectiveCompanyId,
        p_days: days,
      });
      if (error) throw Object.assign(new Error(error.message), { code: error.code });
      return {
        totals: { ...EMPTY_BOARD.totals, ...(data?.totals ?? {}) },
        items: data?.items ?? [],
      };
    },
  });

  const outcome = useMutation({
    mutationFn: async (vars: { id: string; outcome: QuoteOutcome }) => {
      if (import.meta.env.DEV && preview) return;
      const { error } = await rpc<unknown>("set_quote_outcome", {
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
      toast.success(vars.outcome === "won" ? "Marcado como fechado." : vars.outcome === "lost" ? "Marcado como perdido." : "Desfeito.");
    },
    onSettled: () => {
      if (!preview) qc.invalidateQueries({ queryKey: ["quote-board"] });
    },
  });

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

      {board.isLoading || (!data && !board.isError) ? (
        <BoardSkeleton />
      ) : board.isError ? (
        <ErrorState
          missing={(board.error as { code?: string })?.code === "PGRST202" || /could not find the function/i.test(String(board.error?.message))}
          onRetry={() => board.refetch()}
          retrying={board.isFetching}
        />
      ) : isEmpty ? (
        <EmptyState days={days} />
      ) : data ? (
        <>
          <Scoreboard totals={data.totals} onPick={setTab} />
          <QuoteList
            items={data.items}
            totals={data.totals}
            tab={activeTab}
            onTab={setTab}
            days={days}
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

function QuoteList({
  items, totals, tab, onTab, days, pendingId, onOutcome,
}: {
  items: QuoteItem[];
  totals: QuoteBoard["totals"];
  tab: Tab;
  onTab: (t: Tab) => void;
  days: number;
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
  const visible = items.filter((q) => TAB_STATES[tab].includes(q.state));

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

      <div className="mt-3 overflow-hidden rounded-[12px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)]" style={{ boxShadow: SURFACE_SHADOW }}>
        {visible.length === 0 ? (
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
  const name = q.contact_name?.trim() || (q.contact_phone ? `+${q.contact_phone}` : "Contato sem nome");
  const open = ["no_reply", "went_quiet", "your_turn", "talking"].includes(q.state);
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

// Um tracinho por dia até os 30 em que o orçamento morre: o dono vê quanto
// falta, não uma barra abstrata.
function DayTicks({ days }: { days: number }) {
  const filled = Math.min(days, EXPIRE_DAYS);
  const tone = filled >= 21 ? "bg-amber-600" : filled >= 8 ? "bg-[var(--vyz-text-muted)]" : "bg-[var(--vyz-text-soft)]";
  return (
    <div
      role="img"
      aria-label={`${plural(filled, "dia", "dias")} de ${EXPIRE_DAYS}. Com ${EXPIRE_DAYS} dias sem o cliente escrever, o orçamento é dado como morto.`}
      title={`${filled} de ${EXPIRE_DAYS} dias`}
      className="hidden gap-[2px] sm:flex"
    >
      {Array.from({ length: EXPIRE_DAYS }, (_, i) => (
        <span key={i} className={`h-2.5 w-[3px] rounded-[1px] ${i < filled ? tone : "bg-[var(--vyz-border)]"}`} />
      ))}
    </div>
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

function EmptyState({ days }: { days: number }) {
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
        Assim que você enviar um orçamento pelo WhatsApp, em PDF ou numa mensagem com valor, ele aparece aqui.
      </p>
      <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[var(--vyz-text)]">
        Se o cliente não responder em 2 dias, ou responder e sumir, a EVA prepara a retomada e manda pra você aprovar no
        seu WhatsApp. Nada sai sem o seu ok.
      </p>
      <Link to="/inbox?connect=1" className={`${BTN_PRIMARY} ${FOCUS} mt-6`}>
        <MessageCircle className="h-4 w-4" aria-hidden />
        Conectar WhatsApp
      </Link>
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
