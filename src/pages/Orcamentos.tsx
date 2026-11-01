// Orçamentos: o placar de dinheiro parado. Tela principal do app desde 2026-09-16.
// Lê o placar pelo useQuoteBoard e marca desfecho via set_quote_outcome. O
// estado de cada orçamento (nunca respondeu, respondeu e sumiu, esperando
// você...) é calculado no banco (view quote_tracking_live); a tela só agrupa e mostra.
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowUpDown, ArrowUpRight, Check, FileText, MessageCircle, MoreHorizontal, RotateCcw, Search, X } from "lucide-react";
import { WhatsappLogo } from "@phosphor-icons/react";
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
import { EvaBot } from "@/components/eva/EvaBot";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Count } from "@/vendor/stageshow/motion/Count";
import { Swap } from "@/vendor/stageshow/motion/Swap";
import { useWhatsappConnection } from "@/hooks/useWhatsappConnection";
import { useAuth } from "@/contexts/AuthContext";
import { EVA_SETUP_PATH, raioXDismissKey, setupDismissKey, useEvaSetup } from "@/hooks/useEvaSetup";
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
  "outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--vyz-bg)]";
const SURFACE_SHADOW = "0 1px 2px rgba(15,23,42,0.04)";

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
  const adiouRaioX = (() => {
    try { return !!setup.companyId && localStorage.getItem(raioXDismissKey(setup.companyId)) === "1"; } catch { return true; }
  })();
  const { pago, carregando: planoCarregando } = usePlano();
  // Conta nova: sem assinatura vai para o Raio-X automático (o grátis); quem
  // assina cai uma vez na conversa de configuração da EVA, e quem adiou vê a
  // lista de primeiros passos. Super admin operando outra empresa nunca é levado.
  useEffect(() => {
    if (preview || !isAdmin || isSuperAdmin || planoCarregando) return;
    if (!pago && setup.fezRaioX === false && !adiouRaioX) navigate("/raio-x", { replace: true });
    else if (pago && setup.configured === false && !adiou) navigate(EVA_SETUP_PATH, { replace: true });
  }, [preview, pago, planoCarregando, setup.fezRaioX, setup.configured, isAdmin, isSuperAdmin, adiou, adiouRaioX, navigate]);
  const data = board.data;
  const isEmpty = !!data && data.items.length === 0 && data.totals.total_count === 0;
  // Sem parado mas com cliente esperando, abre direto no que pede ação.
  const activeTab: Tab = tab ?? (data && data.totals.parked_count === 0 && data.totals.your_turn_count > 0 ? "your_turn" : "parked");

  return (
    <div className="vp-tela pb-16">
      <header className="vp-cabeca">
        <div>
          <h1 className="vp-titulo">
            {data ? (
              <>
                <span className="vp-valor"><Count value={data.totals.parked_amount} format={brl} /></span> parados
              </>
            ) : (
              "Orçamentos"
            )}
          </h1>
          <p className="vp-sub">
            {!data
              ? `Últimos ${days} dias`
              : data.totals.parked_count === 0
                ? "Nenhum orçamento parado agora"
                : `${plural(data.totals.parked_count, "orçamento", "orçamentos")} sem resposta nos últimos ${days} dias`}
          </p>
        </div>
        <PeriodFilter value={days} onChange={setDays} />
      </header>

      {!preview && !pago && !planoCarregando && setup.fezRaioX === false && (
        <section aria-label="Raio-X pendente" className="mt-4 flex flex-col gap-3 rounded-2xl border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-[var(--vyz-text-strong)]">Seu Raio-X ainda não foi feito</p>
            <p className="mt-0.5 text-[13px] text-[var(--vyz-text-muted)]">Conecte o WhatsApp e veja em uns 3 minutos quanto está parado nas suas propostas.</p>
          </div>
          <Link to="/raio-x" className={`${BTN_PRIMARY} ${FOCUS} shrink-0`}>
            Fazer meu Raio-X
          </Link>
        </section>
      )}

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
          <Resumo totals={data.totals} onPick={setTab} />
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
    <div role="radiogroup" aria-label="Período" className="vp-segmento">
      {PERIODS.map((p) => (
        <button key={p} type="button" role="radio" aria-checked={p === value} onClick={() => onChange(p)}>
          {p} dias
        </button>
      ))}
    </div>
  );
}

function Resumo({ totals, onPick }: { totals: QuoteBoard["totals"]; onPick: (t: Tab) => void }) {
  const tiles: Array<{ rotulo: string; valor: string; aba: Tab }> = [
    { rotulo: "Esperando você", valor: String(totals.your_turn_count), aba: "your_turn" },
    { rotulo: "Voltaram com retomada", valor: String(totals.recovered_count), aba: "closed" },
    { rotulo: "Fechados", valor: String(totals.won_count), aba: "closed" },
    { rotulo: "Perdidos", valor: String(totals.lost_count + totals.expired_count), aba: "closed" },
  ];
  return (
    <section aria-label="Placar" className="vp-resumo">
      {tiles.map((t) => (
        <button key={t.rotulo} type="button" className="vp-tile" onClick={() => onPick(t.aba)}>
          {t.rotulo}
          <b>{t.valor}</b>
        </button>
      ))}
    </section>
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

  const [abertoId, setAbertoId] = useState<string | null>(null);
  const aberto = visible.find((q) => q.id === abertoId) ?? visible[0] ?? null;

  return (
    <section aria-label="Orçamentos por situação">
      <div className="vp-barra">
        <div role="tablist" aria-label="Situação" className="vp-segmento">
          {tabs.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={t.key === tab} onClick={() => onTab(t.key)}>
              {t.label}
              <em>{t.count}</em>
            </button>
          ))}
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <label className="relative flex h-9 min-w-0 flex-1 items-center sm:w-56 sm:flex-none">
            <span className="sr-only">Buscar cliente ou telefone</span>
            <Search aria-hidden className="pointer-events-none absolute left-3 h-4 w-4 text-[var(--vyz-text-soft)]" />
            <input
              type="search"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") onQuery(""); }}
              placeholder="Buscar cliente ou telefone"
              className={`h-9 w-full rounded-full border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] pl-9 pr-8 text-[16px] sm:text-[13.5px] text-[var(--vyz-text-primary)] placeholder:text-[var(--vyz-text-soft)] transition-[border-color,box-shadow] duration-150 ${EASE} hover:border-[var(--vyz-border-strong)] focus:border-[var(--vyz-accent)] focus:outline-none focus:shadow-[0_0_0_3px_var(--vyz-accent-soft-12)] [&::-webkit-search-cancel-button]:hidden`}
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

      <div className="vp-orca">
        <div className="vp-tabela">
          {visible.length === 0 && needle && inTab.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-5">
              <p className="text-[14px] text-[var(--vyz-text-muted)]">Nenhum orçamento com “{query.trim()}” nesta aba.</p>
              <button type="button" onClick={() => onQuery("")} className="vp-botao vp-botao--quieto">
                Limpar busca
              </button>
            </div>
          ) : visible.length === 0 ? (
            <p className="px-4 py-7 text-[14px] leading-relaxed text-[var(--vyz-text-muted)]">{emptyTabText(tab, days)}</p>
          ) : (
            <>
              <div className="vp-tabela__cab" aria-hidden="true">
                <span>Cliente</span>
                <span>Situação</span>
                <span>Dias</span>
                <span style={{ textAlign: "right" }}>Valor</span>
                <span />
              </div>
              <ul>
                {visible.map((q) => (
                  <QuoteRow
                    key={q.id}
                    q={q}
                    aberta={aberto?.id === q.id}
                    onAbrir={() => setAbertoId(q.id)}
                    pending={pendingId === q.id}
                    onOutcome={(o) => onOutcome(q.id, o)}
                  />
                ))}
              </ul>
            </>
          )}
        </div>
        {aberto && <PainelEva q={aberto} onOutcome={(o) => onOutcome(aberto.id, o)} pending={pendingId === aberto.id} />}
      </div>
    </section>
  );
}

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

const SITUACAO: Record<QuoteState, { nome: string; tom?: "sol" | "ok" | "ruim" }> = {
  no_reply: { nome: "Nunca respondeu" },
  went_quiet: { nome: "Respondeu e sumiu" },
  your_turn: { nome: "Esperando você", tom: "sol" },
  talking: { nome: "Em conversa" },
  won: { nome: "Fechou", tom: "ok" },
  lost: { nome: "Perdeu", tom: "ruim" },
  expired: { nome: "Morreu", tom: "ruim" },
  closed: { nome: "Encerrado" },
};

// Dez marcas, uma por dia: a do 2º dia é amarela, porque é o dia em que a EVA avisa.
function Marcas({ dias }: { dias: number }) {
  return (
    <span className="vp-marcas" aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => (
        <i key={i} data-on={i < dias || undefined} data-dia2={i === 1 || undefined} />
      ))}
    </span>
  );
}

function QuoteRow({
  q, aberta, onAbrir, pending, onOutcome,
}: { q: QuoteItem; aberta: boolean; onAbrir: () => void; pending: boolean; onOutcome: (o: QuoteOutcome) => void }) {
  const name = quoteName(q);
  const open = OPEN_QUOTE_STATES.includes(q.state);
  const navigate = useNavigate();
  const target = q.conversation_id ? `/inbox?conversationId=${q.conversation_id}` : q.deal_id ? `/deals/${q.deal_id}` : null;
  const situacao = SITUACAO[q.state];
  // No computador a linha abre o painel da EVA; no celular, sem painel, abre a conversa.
  const escolher = () => {
    if (window.matchMedia("(min-width: 1024px)").matches || !target) onAbrir();
    else navigate(target);
  };

  return (
    <li className="vp-fila" data-aberta={aberta || undefined} style={pending ? { opacity: 0.6 } : undefined} onClick={escolher}>
      <span className="vp-fila__cliente">
        <button type="button" className={`truncate text-left text-[15px] font-semibold text-[var(--vyz-text-primary)] ${FOCUS}`} aria-pressed={aberta}>
          {name}
        </button>
        <span>{evaLine(q) ?? (q.detected_by === "pdf" ? "Orçamento em PDF" : "Orçamento por mensagem")}</span>
      </span>
      <span className="vp-chip" data-tom={situacao.tom}>{situacao.nome}</span>
      <span className="vp-fila__dias">
        {open && <Marcas dias={q.days} />}
        {open ? `${q.days}d` : ""}
      </span>
      <span className="vp-fila__valor">{q.amount != null ? brl(q.amount) : "Sem valor"}</span>
      <span className="vp-fila__menu" onClick={(e) => e.stopPropagation()}>
        <RowMenu q={q} name={name} pending={pending} onOutcome={onOutcome} />
      </span>
    </li>
  );
}

// O rascunho pendente deste orçamento, para o dono ler sem sair da tela.
function useRascunho(q: QuoteItem) {
  const { companyId } = useAuth();
  const { activeCompanyId } = useTenant();
  const empresa = activeCompanyId || companyId;
  return useQuery({
    queryKey: ["rascunho-orcamento", empresa, q.id, q.draft_status],
    enabled: !!empresa && q.draft_status === "pending" && !!(q.deal_id || q.conversation_id),
    staleTime: 30_000,
    queryFn: async () => {
      const filtro = supabase.from("agent_suggestions").select("suggestion").eq("company_id", empresa!).eq("status", "pending");
      const { data } = await (q.deal_id ? filtro.eq("deal_id", q.deal_id) : filtro.eq("conversation_id", q.conversation_id!))
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const sugestao = data?.suggestion as { message_text?: string } | null;
      return sugestao?.message_text ?? null;
    },
  });
}

function PainelEva({ q, pending, onOutcome }: { q: QuoteItem; pending: boolean; onOutcome: (o: QuoteOutcome) => void }) {
  const rascunho = useRascunho(q);
  const name = quoteName(q);
  const open = OPEN_QUOTE_STATES.includes(q.state);
  const situacao = SITUACAO[q.state];
  const conversa = q.conversation_id ? `/inbox?conversationId=${q.conversation_id}` : null;
  const card = q.deal_id ? `/deals/${q.deal_id}` : null;

  return (
    <aside className="vp-painel hidden lg:block" aria-label={`A EVA sobre ${name}`}>
      <div className="vp-painel__topo">
        <EvaBot size={56} state={q.draft_status === "pending" ? "talking" : q.state === "won" ? "happy" : "idle"} />
        <div>
          <b><Swap id={q.id}>{name}</Swap></b>
          <span><Swap id={`${q.id}-s`}>{situacao.nome}</Swap></span>
        </div>
      </div>
      <p className="vp-painel__texto">{stateLine(q).split(" · ").pop()}</p>
      {rascunho.data ? (
        <>
          <div className="vp-rotulo">{q.draft_status === "pending" ? "Rascunho esperando o seu 1" : "Rascunho"}</div>
          <p className="vp-balao vp-balao--sol">{rascunho.data}</p>
        </>
      ) : (
        evaLine(q) && <p className="vp-painel__texto">{evaLine(q)}</p>
      )}
      <div className="vp-acoes">
        {conversa && (
          <Link to={conversa} className="vp-botao">
            <WhatsappLogo size={16} weight="fill" aria-hidden />
            Abrir conversa
          </Link>
        )}
        {card && (
          <Link to={card} className="vp-botao vp-botao--quieto">
            Abrir card
          </Link>
        )}
        {open && (
          <div className="vp-acoes vp-acoes--linha" style={{ marginTop: 0 }}>
            <button type="button" className="vp-botao vp-botao--quieto" disabled={pending} onClick={() => onOutcome("won")}>Fechou</button>
            <button type="button" className="vp-botao vp-botao--quieto" disabled={pending} onClick={() => onOutcome("lost")}>Perdeu</button>
          </div>
        )}
      </div>
      <p className="vp-nota">Nada sai para o cliente sem o seu 1.</p>
    </aside>
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
const BTN_PRIMARY = `${BTN_BASE} bg-[var(--vyz-accent)] text-white hover:bg-[var(--vyz-accent-dark)]`;
const BTN_OUTLINE = `${BTN_BASE} border border-[var(--vyz-border-strong)] bg-[var(--vyz-surface-1)] text-[var(--vyz-text-strong)] hover:bg-[var(--vyz-surface-2)]`;

// Vazio com WhatsApp conectado: nenhuma proposta na janela escolhida. Contas
// conectadas depois de 08/10/2026 já trazem as propostas dos últimos 30 dias
// (quote-seed-history); as anteriores só contam o que sai depois da conexão.
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
          ? "Seu WhatsApp está conectado. Cada orçamento que você enviar, em PDF ou numa mensagem com valor, entra aqui sozinho, com o valor e há quantos dias o cliente não responde."
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
