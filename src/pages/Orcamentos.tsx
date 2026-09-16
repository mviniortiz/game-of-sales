// Orçamentos: o placar de dinheiro parado. Tela principal do app desde 2026-09-16.
// Lê a RPC get_quote_board (contrato do backend) e marca desfecho via
// set_quote_outcome. As RPCs ainda não estão nos tipos gerados, daí o cast local.
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowUpRight, Check, FileText, MessageCircle, RotateCcw, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";

// ─── Contrato ──────────────────────────────────────────────────────────────
type QuoteStatus = "open" | "replied" | "followup_suggested" | "closed";
type QuoteOutcome = "won" | "lost" | null;

export type QuoteItem = {
  id: string;
  deal_id: string | null;
  conversation_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  amount: number | null;
  sent_at: string;
  status: QuoteStatus;
  outcome: QuoteOutcome;
  replied_at: string | null;
  followup_sent_at: string | null;
  recovered: boolean;
  days_waiting: number;
};

export type QuoteBoard = {
  totals: {
    parked_amount: number;
    parked_count: number;
    recovered_amount: number;
    recovered_count: number;
    won_amount: number;
    won_count: number;
    lost_count: number;
    replied_count: number;
    total_count: number;
  };
  items: QuoteItem[];
};

type RpcResult<T> = { data: T | null; error: { message: string; code?: string } | null };
type RpcFn = <T>(fn: string, args: Record<string, unknown>) => PromiseLike<RpcResult<T>>;
const rpc = supabase.rpc.bind(supabase) as unknown as RpcFn;

const PERIODS = [7, 30, 90] as const;
type Period = (typeof PERIODS)[number];

// ─── Preview (só em dev): ?preview=1 | vazio | erro ─────────────────────────
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const PREVIEW_BOARD: QuoteBoard = {
  totals: {
    parked_amount: 18450, parked_count: 3,
    recovered_amount: 4200, recovered_count: 1,
    won_amount: 7400, won_count: 2,
    lost_count: 1, replied_count: 4, total_count: 7,
  },
  items: [
    { id: "p1", deal_id: "d1", conversation_id: "c1", contact_name: "Clínica Sorriso Pleno", contact_phone: "5511999990001", amount: 9800, sent_at: daysAgo(5), status: "followup_suggested", outcome: null, replied_at: null, followup_sent_at: null, recovered: false, days_waiting: 5 },
    { id: "p2", deal_id: null, conversation_id: "c2", contact_name: "Rafael Nunes", contact_phone: "5511999990002", amount: null, sent_at: daysAgo(3), status: "open", outcome: null, replied_at: null, followup_sent_at: null, recovered: false, days_waiting: 3 },
    { id: "p3", deal_id: "d3", conversation_id: "c3", contact_name: "Studio Forma Arquitetura", contact_phone: "5511999990003", amount: 8650, sent_at: daysAgo(1), status: "open", outcome: null, replied_at: null, followup_sent_at: null, recovered: false, days_waiting: 1 },
    { id: "p4", deal_id: "d4", conversation_id: "c4", contact_name: "Mariana Costa", contact_phone: "5511999990004", amount: 4200, sent_at: daysAgo(9), status: "replied", outcome: null, replied_at: daysAgo(4), followup_sent_at: daysAgo(6), recovered: true, days_waiting: 0 },
    { id: "p5", deal_id: "d5", conversation_id: "c5", contact_name: "Academia Pulso", contact_phone: "5511999990005", amount: 5200, sent_at: daysAgo(12), status: "closed", outcome: "won", replied_at: daysAgo(11), followup_sent_at: null, recovered: false, days_waiting: 0 },
    { id: "p6", deal_id: "d6", conversation_id: "c6", contact_name: "Pedro Almeida", contact_phone: "5511999990006", amount: 2200, sent_at: daysAgo(15), status: "closed", outcome: "won", replied_at: daysAgo(13), followup_sent_at: null, recovered: false, days_waiting: 0 },
    { id: "p7", deal_id: null, conversation_id: "c7", contact_name: null, contact_phone: "5511999990007", amount: 3100, sent_at: daysAgo(20), status: "closed", outcome: "lost", replied_at: daysAgo(18), followup_sent_at: null, recovered: false, days_waiting: 0 },
  ],
};
const EMPTY_BOARD: QuoteBoard = {
  totals: { parked_amount: 0, parked_count: 0, recovered_amount: 0, recovered_count: 0, won_amount: 0, won_count: 0, lost_count: 0, replied_count: 0, total_count: 0 },
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
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

function statusOf(q: QuoteItem): { label: string; tone: "wait" | "eva" | "ok" | "won" | "lost" | "muted" } {
  if (q.outcome === "won") return { label: "Ganho", tone: "won" };
  if (q.outcome === "lost") return { label: "Perdido", tone: "lost" };
  if (q.status === "replied") return { label: "Respondeu", tone: "ok" };
  if (q.status === "followup_suggested") return { label: "EVA preparou retomada", tone: "eva" };
  if (q.status === "closed") return { label: "Encerrado", tone: "muted" };
  return { label: "Aguardando resposta", tone: "wait" };
}

const TONE_CLASS: Record<ReturnType<typeof statusOf>["tone"], string> = {
  wait: "bg-amber-50 text-amber-800 ring-amber-200",
  eva: "bg-violet-50 text-violet-800 ring-violet-200",
  ok: "bg-[var(--vyz-accent-soft-8)] text-[var(--vyz-accent-dark)] ring-[var(--vyz-accent-border)]",
  won: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  lost: "bg-[var(--vyz-surface-2)] text-[var(--vyz-text-muted)] ring-[var(--vyz-border-strong)]",
  muted: "bg-[var(--vyz-surface-2)] text-[var(--vyz-text-muted)] ring-[var(--vyz-border-strong)]",
};

const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";
const FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F6F4EF]";
const CARD_SHADOW = "0 1px 2px rgba(15,23,42,0.04), 0 12px 32px -18px rgba(15,23,42,0.14)";

// ─── Página ────────────────────────────────────────────────────────────────
export default function Orcamentos() {
  const { companyId } = useAuth();
  const { activeCompanyId } = useTenant();
  const effectiveCompanyId = activeCompanyId || companyId;
  const [searchParams] = useSearchParams();
  const preview = import.meta.env.DEV ? searchParams.get("preview") : null;
  const [days, setDays] = useState<Period>(30);
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
      if (prev) {
        qc.setQueryData<QuoteBoard>(queryKey, {
          ...prev,
          items: prev.items.map((it) =>
            it.id === vars.id
              ? { ...it, outcome: vars.outcome, status: vars.outcome ? "closed" : it.replied_at ? "replied" : "open" }
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
      toast.success(vars.outcome === "won" ? "Marcado como ganho." : vars.outcome === "lost" ? "Marcado como perdido." : "Desfeito.");
    },
    onSettled: () => {
      if (!preview) qc.invalidateQueries({ queryKey: ["quote-board"] });
    },
  });

  const data = board.data;
  const isEmpty = !!data && data.items.length === 0 && data.totals.total_count === 0;

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
          <Scoreboard totals={data.totals} />
          <section aria-labelledby="orc-lista" className="mt-8">
            <h2 id="orc-lista" className="mb-3 text-[13px] font-medium text-[var(--vyz-text-muted)]">
              {plural(data.items.length, "orçamento", "orçamentos")} nos últimos {days} dias
            </h2>
            {data.items.length === 0 ? (
              <p className="rounded-[10px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] p-5 text-[14px] text-[var(--vyz-text-muted)]">
                Nenhum orçamento neste período. Tente um período maior.
              </p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {data.items.map((q) => (
                  <QuoteRow
                    key={q.id}
                    q={q}
                    pending={outcome.isPending && outcome.variables?.id === q.id}
                    onOutcome={(o) => outcome.mutate({ id: q.id, outcome: o })}
                  />
                ))}
              </ul>
            )}
          </section>
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

function Scoreboard({ totals }: { totals: QuoteBoard["totals"] }) {
  return (
    <section aria-label="Placar" className="mt-6">
      <p className="font-satoshi text-[44px] font-black leading-[1.0] tracking-[-0.04em] text-[var(--vyz-text-primary)] sm:text-[64px]">
        {brl(totals.parked_amount)} <span className="text-[var(--vyz-text-muted)]">parados</span>
      </p>
      <p className="mt-2 text-[15px] text-[var(--vyz-text)]">
        em {plural(totals.parked_count, "orçamento sem resposta", "orçamentos sem resposta")}
      </p>

      <dl className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <Stat
          label="Recuperados com a EVA"
          value={brl(totals.recovered_amount)}
          sub={plural(totals.recovered_count, "orçamento", "orçamentos")}
          eva
        />
        <Stat label="Ganhos" value={brl(totals.won_amount)} sub={plural(totals.won_count, "orçamento", "orçamentos")} />
        <Stat
          label="Responderam"
          value={`${totals.replied_count} de ${totals.total_count}`}
          sub={totals.total_count > 0 ? `${Math.round((totals.replied_count / totals.total_count) * 100)}% dos enviados` : "nenhum enviado"}
        />
      </dl>
    </section>
  );
}

function Stat({ label, value, sub, eva }: { label: string; value: string; sub: string; eva?: boolean }) {
  return (
    <div
      className="rounded-[10px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] px-4 py-3.5"
      style={{ boxShadow: CARD_SHADOW }}
    >
      <dt className="flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--vyz-text-muted)]">
        {eva && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#6d28d9]" />}
        {label}
      </dt>
      <dd className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-[var(--vyz-text-primary)]">{value}</dd>
      <dd className="text-[12.5px] text-[var(--vyz-text-soft)]">{sub}</dd>
    </div>
  );
}

function QuoteRow({ q, pending, onOutcome }: { q: QuoteItem; pending: boolean; onOutcome: (o: QuoteOutcome) => void }) {
  const st = statusOf(q);
  const name = q.contact_name?.trim() || q.contact_phone || "Contato sem nome";
  const waiting = !q.outcome && (q.status === "open" || q.status === "followup_suggested");
  const when = waiting
    ? q.days_waiting <= 0
      ? "enviado hoje"
      : `há ${plural(q.days_waiting, "dia", "dias")} sem resposta`
    : `enviado em ${shortDate(q.sent_at)}`;

  return (
    <li
      className={`rounded-[10px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] p-4 transition-shadow duration-200 ${EASE} hover:shadow-[0_1px_2px_rgba(15,23,42,0.05),0_16px_36px_-18px_rgba(15,23,42,0.22)] motion-reduce:transition-none`}
      style={{ boxShadow: CARD_SHADOW }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-[var(--vyz-text-primary)]">{name}</p>
          <p className="mt-0.5 text-[13px] text-[var(--vyz-text-muted)]">{when}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-medium ring-1 ring-inset ${TONE_CLASS[st.tone]}`}>
              {st.label}
            </span>
            {q.recovered && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[12px] font-medium text-[#6d28d9] ring-1 ring-inset ring-violet-200">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#6d28d9]" />
                Recuperado pela EVA
              </span>
            )}
          </div>
        </div>
        <p
          className={`shrink-0 text-left sm:text-right ${
            q.amount != null
              ? "text-[20px] font-semibold tracking-[-0.02em] text-[var(--vyz-text-primary)]"
              : "text-[13px] text-[var(--vyz-text-soft)]"
          } ${q.outcome === "lost" ? "line-through decoration-[var(--vyz-text-dim)]" : ""}`}
        >
          {q.amount != null ? brl(q.amount) : "valor não identificado"}
        </p>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-[var(--vyz-border-subtle)] pt-3">
        {q.outcome ? (
          <button type="button" disabled={pending} onClick={() => onOutcome(null)} className={`${BTN_GHOST} ${FOCUS}`}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Desfazer
          </button>
        ) : (
          <>
            <button type="button" disabled={pending} onClick={() => onOutcome("won")} className={`${BTN_PRIMARY} ${FOCUS}`}>
              <Check className="h-4 w-4" aria-hidden />
              Ganhou
            </button>
            <button type="button" disabled={pending} onClick={() => onOutcome("lost")} className={`${BTN_OUTLINE} ${FOCUS}`}>
              <X className="h-4 w-4" aria-hidden />
              Perdeu
            </button>
          </>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-1">
          {q.conversation_id && (
            <Link to={`/inbox?conversationId=${q.conversation_id}`} className={`${BTN_GHOST} ${FOCUS}`} aria-label={`Abrir conversa com ${name}`}>
              <MessageCircle className="h-4 w-4" aria-hidden />
              Conversa
            </Link>
          )}
          {q.deal_id && (
            <Link to={`/deals/${q.deal_id}`} className={`${BTN_GHOST} ${FOCUS}`} aria-label={`Abrir card de ${name}`}>
              <ArrowUpRight className="h-4 w-4" aria-hidden />
              Card
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}

const BTN_BASE = `inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold transition-all duration-150 ${EASE} active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100`;
const BTN_PRIMARY = `${BTN_BASE} bg-[#0B1220] text-white hover:bg-[#1F2A3B]`;
const BTN_OUTLINE = `${BTN_BASE} border border-[var(--vyz-border-strong)] bg-[var(--vyz-surface-1)] text-[var(--vyz-text-strong)] hover:bg-[var(--vyz-surface-2)]`;
const BTN_GHOST = `${BTN_BASE} px-3 font-medium text-[var(--vyz-text-muted)] hover:bg-[var(--vyz-surface-2)] hover:text-[var(--vyz-text-primary)]`;

function EmptyState({ days }: { days: number }) {
  return (
    <section
      className="mt-6 rounded-[10px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] p-6 sm:p-8"
      style={{ boxShadow: CARD_SHADOW }}
    >
      <FileText className="h-6 w-6 text-[var(--vyz-text-soft)]" aria-hidden />
      <h2 className="mt-4 font-satoshi text-[26px] font-bold leading-[1.1] tracking-[-0.03em] text-[var(--vyz-text-primary)]">
        Nenhum orçamento nos últimos {days} dias
      </h2>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--vyz-text)]">
        Assim que você enviar um orçamento pelo WhatsApp, em PDF ou numa mensagem com valor, ele aparece aqui.
      </p>
      <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[var(--vyz-text)]">
        Se o cliente não responder em 2 dias, a EVA prepara a retomada e manda pra você aprovar no seu WhatsApp.
        Nada sai sem o seu ok.
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
    <section role="alert" className="mt-6 rounded-[10px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] p-6" style={{ boxShadow: CARD_SHADOW }}>
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
      <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className={`${block} h-24`} />)}
      </div>
      <div className="mt-8 flex flex-col gap-2.5">
        {[0, 1, 2].map((i) => <div key={i} className={`${block} h-28`} />)}
      </div>
    </div>
  );
}

