import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowUp, CalendarBlank, Plus, Trash, UserSwitch, X } from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";

// Modo atendente (28/10/2026): responde sozinho, no WhatsApp da empresa, quem
// escreveu primeiro, só sobre dúvidas e agendamento. Liga por empresa; quem liga
// é a equipe Vyzon (guard_atendente_enabled). As tabelas ainda não estão nos
// tipos gerados do Supabase.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const SEGMENTOS = [
  { id: "pet", label: "Pet shop, banho e tosa" },
  { id: "fisio", label: "Fisioterapia" },
  { id: "odonto", label: "Odontologia" },
  { id: "saude", label: "Outra clínica de saúde" },
  { id: "beleza", label: "Salão e estética" },
  { id: "outro", label: "Outro" },
];
const REGRAS_SUGERIDAS: Record<string, string[]> = {
  pet: ["Não informe preço: o valor depende do porte e é confirmado no atendimento.", "Pergunte o nome e o porte do pet antes de agendar.", "Sem orientação veterinária."],
  fisio: ["Não informe preço.", "Pergunte se a pessoa tem pedido médico.", "Sem orientação clínica: dúvida de tratamento vai para o fisioterapeuta."],
  odonto: ["Não informe preço: o valor é passado na avaliação.", "Sem diagnóstico nem indicação de remédio."],
  saude: ["Não informe preço.", "Sem diagnóstico nem indicação de remédio."],
  beleza: ["Não informe preço: depende do comprimento e do estado do cabelo.", "Pergunte se é a primeira vez no salão."],
  outro: ["Não informe preço."],
};

type Faixa = [string, string];
type ServicoForm = { id: string; label: string; minutes: number };
type Form = {
  business_name: string;
  segment: string;
  address: string;
  notes: string;
  tone: string;
  owner_alert_phone: string;
  services: ServicoForm[];
  hours: Faixa[][];
  rules: string[];
};
type Agendamento = { id: string; service_label: string | null; starts_at: string; customer_name: string | null; customer_phone: string | null; notes: string | null; source: string };
type ConversaComDono = { conversation_id: string; motivo: string | null; resumo: string | null; pausado_em: string | null; aviso_dono_erro: string | null; channel_conversations: { channel_contacts: { name: string | null; phone_e164: string | null } | null } | null };
type Msg = { role: "user" | "assistant"; content: string };

const VAZIO: Form = {
  business_name: "",
  segment: "pet",
  address: "",
  notes: "",
  tone: "",
  owner_alert_phone: "",
  services: [],
  hours: [[["08:00", "18:00"]], [["08:00", "18:00"]], [["08:00", "18:00"]], [["08:00", "18:00"]], [["08:00", "18:00"]], [["08:00", "12:00"]], []],
  rules: [],
};

function slug(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "servico";
}

function formDaLinha(row: Record<string, unknown> | null): Form {
  if (!row) return VAZIO;
  const services = Array.isArray(row.services) ? (row.services as [string, string, number][]).map(([id, label, minutes]) => ({ id, label, minutes })) : [];
  const hours = Array.isArray(row.hours) && row.hours.length === 7 ? (row.hours as Faixa[][]) : VAZIO.hours;
  return {
    business_name: (row.business_name as string) || "",
    segment: (row.segment as string) || "outro",
    address: (row.address as string) || "",
    notes: (row.notes as string) || "",
    tone: (row.tone as string) || "",
    owner_alert_phone: (row.owner_alert_phone as string) || "",
    services,
    hours,
    rules: Array.isArray(row.rules) ? (row.rules as string[]) : [],
  };
}

function linhaDoForm(f: Form) {
  const usados = new Set<string>();
  const services = f.services
    .filter((s) => s.label.trim() && s.minutes > 0)
    .map((s) => {
      let id = s.id || slug(s.label);
      while (usados.has(id)) id = `${id}-2`;
      usados.add(id);
      return [id, s.label.trim(), Math.round(s.minutes)];
    });
  return {
    business_name: f.business_name.trim() || null,
    segment: f.segment,
    address: f.address.trim() || null,
    notes: f.notes.trim() || null,
    tone: f.tone.trim() || null,
    owner_alert_phone: f.owner_alert_phone.replace(/\D/g, "") || null,
    services,
    hours: f.hours.map((d) => d.filter(([a, b]) => a && b && a < b)),
    rules: f.rules.map((r) => r.trim()).filter(Boolean),
  };
}

const dataHora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const card = "rounded-[14px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] p-5";
const input =
  "h-10 w-full rounded-[10px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] px-3 text-[16px] text-[var(--vyz-text-primary)] outline-none transition-[border-color,box-shadow] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] placeholder:text-[var(--vyz-text-soft)] focus-visible:border-[var(--vyz-accent)] focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.2)] sm:text-[14px]";
const label = "mb-1.5 block text-[13px] font-medium text-[var(--vyz-text-muted)]";
const btnSec =
  "inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] px-3 text-[13px] font-medium text-[var(--vyz-text-primary)] outline-none transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[var(--vyz-surface-2)] active:scale-[0.98] focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.28)] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100";
const btnPri =
  "inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-[var(--vyz-accent)] px-4 text-[14px] font-semibold text-white shadow-[var(--vyz-shadow-cta)] outline-none transition-[filter,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:brightness-110 active:scale-[0.98] focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.35)] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100";
const iconBtn =
  "grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-[var(--vyz-text-muted)] outline-none transition-colors duration-150 hover:bg-[var(--vyz-surface-2)] hover:text-[var(--vyz-text-primary)] focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.28)]";

export default function Atendente() {
  const { companyId } = useAuth();
  const { activeCompanyId, isSuperAdmin } = useTenant();
  const company = activeCompanyId || companyId;
  const qc = useQueryClient();

  const cfgQ = useQuery({
    queryKey: ["atendente-config", company],
    enabled: !!company,
    queryFn: async () => {
      const { data, error } = await db.from("atendente_config").select("*").eq("company_id", company).maybeSingle();
      if (error) throw error;
      return data as Record<string, unknown> | null;
    },
  });

  const [form, setForm] = useState<Form>(VAZIO);
  const [sujo, setSujo] = useState(false);
  useEffect(() => {
    if (cfgQ.isSuccess) {
      setForm(formDaLinha(cfgQ.data));
      setSujo(false);
    }
  }, [cfgQ.isSuccess, cfgQ.data]);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setSujo(true);
  };

  const salvar = useMutation({
    mutationFn: async () => {
      const { error } = await db.from("atendente_config").upsert({ company_id: company, ...linhaDoForm(form) }, { onConflict: "company_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Atendente salvo");
      setSujo(false);
      qc.invalidateQueries({ queryKey: ["atendente-config", company] });
    },
    onError: (e: Error) => toast.error(`Não salvou: ${e.message}`),
  });

  const ligar = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await db.from("atendente_config").update({ enabled }).eq("company_id", company);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atendente-config", company] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const enabled = cfgQ.data?.enabled === true;
  const segmentoSugestoes = (REGRAS_SUGERIDAS[form.segment] || []).filter((r) => !form.rules.includes(r));

  if (cfgQ.isLoading) {
    return <div className={`${card} h-40 animate-pulse motion-reduce:animate-none`} aria-busy="true" />;
  }

  return (
    <div className="space-y-4">
      <section className={card} aria-labelledby="at-status">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="at-status" className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--vyz-text-primary)]">
              {enabled ? "Respondendo no seu WhatsApp" : "Desligado"}
            </h2>
            <p className="mt-1 max-w-[60ch] text-[13.5px] text-[var(--vyz-text)]">
              Responde na hora quem escreve para a empresa, só sobre dúvidas e agendamento. O resto ele passa para você e fica em silêncio
              naquela conversa. Quando você responde à mão, ele também para ali.
            </p>
          </div>
          <span
            className={`inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium ${
              enabled ? "bg-[var(--vyz-accent-soft-10)] text-[var(--vyz-accent)]" : "bg-[var(--vyz-surface-2)] text-[var(--vyz-text-muted)]"
            }`}
          >
            <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${enabled ? "bg-[var(--vyz-accent)]" : "bg-[var(--vyz-text-soft)]"}`} />
            {enabled ? "Ligado" : "Desligado"}
          </span>
        </div>
        {isSuperAdmin ? (
          <button type="button" className={`${btnSec} mt-4`} disabled={!cfgQ.data || ligar.isPending || sujo} onClick={() => ligar.mutate(!enabled)}>
            {enabled ? "Desligar nesta empresa" : "Ligar nesta empresa"}
          </button>
        ) : (
          !enabled && <p className="mt-3 text-[12.5px] text-[var(--vyz-text-muted)]">Quem liga é a equipe Vyzon, depois de você testar aqui embaixo.</p>
        )}
        {isSuperAdmin && sujo && <p className="mt-2 text-[12.5px] text-[var(--vyz-text-muted)]">Salve a configuração antes de ligar.</p>}
      </section>

      <section className={card} aria-labelledby="at-empresa">
        <h2 id="at-empresa" className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--vyz-text-primary)]">O que ele sabe da empresa</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="at-nome" className={label}>Nome que o cliente conhece</label>
            <input id="at-nome" className={input} value={form.business_name} onChange={(e) => set("business_name", e.target.value)} placeholder="Tesoura de Ouro" />
          </div>
          <div>
            <label htmlFor="at-seg" className={label}>Segmento</label>
            <select id="at-seg" className={input} value={form.segment} onChange={(e) => set("segment", e.target.value)}>
              {SEGMENTOS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="at-end" className={label}>Endereço</label>
            <input id="at-end" className={input} value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="R. Lauro Linhares, 280 - Trindade" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="at-notas" className={label}>O que mais ele pode contar</label>
            <textarea
              id="at-notas"
              rows={3}
              className={`${input} h-auto py-2.5`}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Atendemos pets idosos e medrosos com calma. Estacionamento na rua."
            />
          </div>
          <div>
            <label htmlFor="at-tom" className={label}>Tom</label>
            <input id="at-tom" className={input} value={form.tone} onChange={(e) => set("tone", e.target.value)} placeholder="cordial e direto, sem emoji" />
          </div>
          <div>
            <label htmlFor="at-dono" className={label}>Seu WhatsApp pessoal, para o aviso</label>
            <input
              id="at-dono"
              inputMode="tel"
              className={input}
              value={form.owner_alert_phone}
              onChange={(e) => set("owner_alert_phone", e.target.value)}
              placeholder="48 99999-0000"
            />
            <p className="mt-1.5 text-[12px] text-[var(--vyz-text-muted)]">Diferente do número da empresa. É para onde vai o aviso quando ele passa uma conversa.</p>
          </div>
        </div>
      </section>

      <section className={card} aria-labelledby="at-serv">
        <h2 id="at-serv" className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--vyz-text-primary)]">Serviços que ele agenda</h2>
        <ul className="mt-3 space-y-2">
          {form.services.map((s, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                aria-label="Nome do serviço"
                className={input}
                value={s.label}
                onChange={(e) => set("services", form.services.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                placeholder="Banho"
              />
              <div className="relative w-28 shrink-0">
                <input
                  aria-label="Duração em minutos"
                  type="number"
                  min={5}
                  step={5}
                  className={`${input} pr-10 tabular-nums`}
                  value={s.minutes}
                  onChange={(e) => set("services", form.services.map((x, j) => (j === i ? { ...x, minutes: Number(e.target.value) } : x)))}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12.5px] text-[var(--vyz-text-muted)]">min</span>
              </div>
              <button type="button" className={iconBtn} aria-label={`Remover ${s.label || "serviço"}`} onClick={() => set("services", form.services.filter((_, j) => j !== i))}>
                <Trash size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        {!form.services.length && <p className="mt-3 text-[13.5px] text-[var(--vyz-text-muted)]">Sem serviço cadastrado, ele não agenda nada e passa os pedidos para você.</p>}
        <button type="button" className={`${btnSec} mt-3`} onClick={() => set("services", [...form.services, { id: "", label: "", minutes: 60 }])}>
          <Plus size={14} aria-hidden /> Serviço
        </button>
      </section>

      <section className={card} aria-labelledby="at-horas">
        <h2 id="at-horas" className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--vyz-text-primary)]">Horário de funcionamento</h2>
        <p className="mt-1 text-[13px] text-[var(--vyz-text-muted)]">Os horários livres são estes menos o que já está marcado.</p>
        <ul className="mt-3 divide-y divide-[var(--vyz-border-subtle)]">
          {DIAS.map((dia, i) => {
            const faixas = form.hours[i] || [];
            const aberto = faixas.length > 0;
            const setDia = (v: Faixa[]) => set("hours", form.hours.map((d, j) => (j === i ? v : d)));
            return (
              <li key={dia} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
                <label className="flex w-28 items-center gap-2 text-[13.5px] font-medium text-[var(--vyz-text-primary)]">
                  <input type="checkbox" className="h-4 w-4 accent-[var(--vyz-accent)]" checked={aberto} onChange={(e) => setDia(e.target.checked ? [["08:00", "18:00"]] : [])} />
                  {dia}
                </label>
                {aberto ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {faixas.map(([a, b], k) => (
                      <div key={k} className="flex items-center gap-1.5">
                        <input type="time" aria-label={`${dia}, início`} className={`${input} h-9 w-[7.5rem] tabular-nums`} value={a} onChange={(e) => setDia(faixas.map((f, j) => (j === k ? [e.target.value, f[1]] : f)))} />
                        <span className="text-[13px] text-[var(--vyz-text-muted)]">às</span>
                        <input type="time" aria-label={`${dia}, fim`} className={`${input} h-9 w-[7.5rem] tabular-nums`} value={b} onChange={(e) => setDia(faixas.map((f, j) => (j === k ? [f[0], e.target.value] : f)))} />
                        {k > 0 && (
                          <button type="button" className={iconBtn} aria-label={`Remover intervalo de ${dia}`} onClick={() => setDia(faixas.filter((_, j) => j !== k))}>
                            <X size={14} aria-hidden />
                          </button>
                        )}
                      </div>
                    ))}
                    {faixas.length < 2 && (
                      <button type="button" className="text-[12.5px] font-medium text-[var(--vyz-accent)] underline-offset-2 hover:underline" onClick={() => setDia([...faixas, ["14:00", "18:00"]])}>
                        + intervalo
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-[13px] text-[var(--vyz-text-muted)]">Fechado</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className={card} aria-labelledby="at-regras">
        <h2 id="at-regras" className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--vyz-text-primary)]">Regras</h2>
        <p className="mt-1 text-[13px] text-[var(--vyz-text-muted)]">Fixas, sem precisar escrever: nunca inventa preço nem horário, não oferece o que não perguntaram, e passa para você o que não souber.</p>
        <ul className="mt-3 space-y-2">
          {form.rules.map((r, i) => (
            <li key={i} className="flex items-center gap-2">
              <input aria-label={`Regra ${i + 1}`} className={input} value={r} onChange={(e) => set("rules", form.rules.map((x, j) => (j === i ? e.target.value : x)))} />
              <button type="button" className={iconBtn} aria-label="Remover regra" onClick={() => set("rules", form.rules.filter((_, j) => j !== i))}>
                <Trash size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          {segmentoSugestoes.map((r) => (
            <button key={r} type="button" className={`${btnSec} h-auto min-h-8 py-1.5 text-left`} onClick={() => set("rules", [...form.rules, r])}>
              <Plus size={12} aria-hidden className="shrink-0" /> {r}
            </button>
          ))}
          <button type="button" className={`${btnSec} h-8`} onClick={() => set("rules", [...form.rules, ""])}>
            <Plus size={12} aria-hidden /> Regra própria
          </button>
        </div>
      </section>

      <div className="sticky bottom-3 z-10 flex justify-end">
        <button type="button" className={btnPri} disabled={!sujo || salvar.isPending} onClick={() => salvar.mutate()}>
          {salvar.isPending ? "Salvando…" : sujo ? "Salvar" : "Salvo"}
        </button>
      </div>

      {cfgQ.data && <Teste company={company!} nome={(cfgQ.data.business_name as string) || "a empresa"} desatualizado={sujo} />}
      {cfgQ.data && <ComVoce company={company!} />}
      {cfgQ.data && <Agenda company={company!} />}
    </div>
  );
}

function Teste({ company, nome, desatualizado }: { company: string; nome: string; desatualizado: boolean }) {
  const qc = useQueryClient();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const [nota, setNota] = useState<string | null>(null);
  const fim = useRef<HTMLDivElement>(null);
  const enviar = useMutation({
    // O histórico vai junto da mensagem: a bolha otimista do onMutate não pode entrar nele.
    mutationFn: async ({ t, antes }: { t: string; antes: Msg[] }) => {
      const { data, error } = await supabase.functions.invoke("atendente-responder", { body: { action: "simular", companyId: company, history: antes, text: t } });
      if (error) throw error;
      return data as { reply: string; history: Msg[]; handoff: { motivo: string } | null; eventos: { type: string; servico?: string; data?: string; hora?: string }[] };
    },
    onMutate: ({ t }) => setMsgs((m) => [...m, { role: "user", content: t }]),
    onSuccess: (d) => {
      setMsgs(d.history);
      const b = d.eventos.find((e) => e.type === "booking");
      setNota(d.handoff ? `Passou para você: ${d.handoff.motivo}` : b ? `Marcado na agenda como teste: ${b.servico}, ${b.data} ${b.hora}` : null);
      if (b) qc.invalidateQueries({ queryKey: ["atendente-agenda", company] });
    },
    onError: () => {
      setMsgs((m) => m.slice(0, -1));
      toast.error("O atendente não respondeu agora. Tente de novo.");
    },
  });
  useEffect(() => fim.current?.scrollIntoView({ block: "nearest" }), [msgs, enviar.isPending]);
  const mandar = () => {
    const t = texto.trim();
    if (!t || enviar.isPending) return;
    setTexto("");
    enviar.mutate({ t, antes: msgs });
  };
  const sugestoes = ["Tem horário amanhã?", "Quanto custa?", "Posso falar com alguém?"];

  return (
    <section className={card} aria-labelledby="at-teste">
      <div className="flex items-center justify-between gap-3">
        <h2 id="at-teste" className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--vyz-text-primary)]">Testar como cliente</h2>
        {msgs.length > 0 && (
          <button type="button" className={btnSec} onClick={() => { setMsgs([]); setNota(null); }}>
            Recomeçar
          </button>
        )}
      </div>
      <p className="mt-1 text-[13px] text-[var(--vyz-text-muted)]">
        Nada sai pelo WhatsApp. O que ele marcar entra na agenda como teste.{desatualizado ? " Salve antes: o teste usa a configuração salva." : ""}
      </p>
      <div className="mt-3 max-h-[360px] min-h-[120px] space-y-2 overflow-y-auto rounded-[10px] bg-[var(--vyz-surface-2)] p-3" aria-live="polite">
        {!msgs.length && (
          <div className="flex flex-wrap gap-2">
            {sugestoes.map((s) => (
              <button key={s} type="button" className={btnSec} onClick={() => enviar.mutate({ t: s, antes: msgs })} disabled={enviar.isPending}>
                {s}
              </button>
            ))}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <p
              className={`max-w-[80%] whitespace-pre-wrap rounded-[12px] px-3 py-2 text-[14px] leading-snug ${
                m.role === "user" ? "bg-[var(--vyz-accent)] text-white" : "border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] text-[var(--vyz-text-primary)]"
              }`}
            >
              {m.content}
            </p>
          </div>
        ))}
        {enviar.isPending && <p className="text-[12.5px] text-[var(--vyz-text-muted)]">{nome} está respondendo…</p>}
        <div ref={fim} />
      </div>
      {nota && <p className="mt-2 text-[12.5px] font-medium text-[var(--vyz-text)]">{nota}</p>}
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          mandar();
        }}
      >
        <input aria-label="Mensagem de teste" className={input} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva como se fosse o cliente" maxLength={600} />
        <button type="submit" className={`${btnPri} w-10 justify-center px-0`} aria-label="Enviar" disabled={!texto.trim() || enviar.isPending}>
          <ArrowUp size={16} weight="bold" aria-hidden />
        </button>
      </form>
    </section>
  );
}

function ComVoce({ company }: { company: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["atendente-com-voce", company],
    queryFn: async () => {
      const { data, error } = await db
        .from("atendente_conversas")
        .select("conversation_id, motivo, resumo, pausado_em, aviso_dono_erro, channel_conversations(channel_contacts(name, phone_e164))")
        .eq("company_id", company)
        .eq("estado", "com_dono")
        .order("pausado_em", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as ConversaComDono[];
    },
  });
  const devolver = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("atendente_conversas").update({ estado: "ativo", motivo: null, resumo: null, pausado_em: null, dono_respondeu_em: null }).eq("conversation_id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atendente-com-voce", company] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className={card} aria-labelledby="at-comvoce">
      <h2 id="at-comvoce" className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--vyz-text-primary)]">Conversas com você</h2>
      <p className="mt-1 text-[13px] text-[var(--vyz-text-muted)]">Aqui ele fica em silêncio. Volta sozinho depois de 24 horas sem mensagem sua, ou quando você devolver.</p>
      {q.isLoading ? (
        <div className="mt-3 h-12 animate-pulse rounded-[10px] bg-[var(--vyz-surface-2)] motion-reduce:animate-none" />
      ) : !q.data?.length ? (
        <p className="mt-3 text-[13.5px] text-[var(--vyz-text)]">Nenhuma agora.</p>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--vyz-border-subtle)]">
          {q.data.map((c) => {
            const contato = c.channel_conversations?.channel_contacts;
            return (
              <li key={c.conversation_id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-[var(--vyz-text-primary)]">{contato?.name || (contato?.phone_e164 ? `+${contato.phone_e164}` : "Cliente")}</p>
                  <p className="text-[12.5px] text-[var(--vyz-text-muted)]">
                    {c.motivo || "com você"}
                    {c.pausado_em ? ` · ${dataHora.format(new Date(c.pausado_em))}` : ""}
                  </p>
                  {c.resumo && <p className="mt-1 line-clamp-2 text-[13px] text-[var(--vyz-text)]">{c.resumo}</p>}
                  {c.aviso_dono_erro && <p className="mt-1 text-[12px] text-[var(--vyz-text-muted)]">O aviso no seu WhatsApp não saiu: {c.aviso_dono_erro}</p>}
                </div>
                <button type="button" className={btnSec} disabled={devolver.isPending} onClick={() => devolver.mutate(c.conversation_id)}>
                  <UserSwitch size={14} aria-hidden /> Devolver ao atendente
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Agenda({ company }: { company: string }) {
  const qc = useQueryClient();
  const desde = useMemo(() => new Date(Date.now() - 3_600_000).toISOString(), []);
  const q = useQuery({
    queryKey: ["atendente-agenda", company],
    queryFn: async () => {
      const { data, error } = await db
        .from("atendente_agendamentos")
        .select("id, service_label, starts_at, customer_name, customer_phone, notes, source")
        .eq("company_id", company)
        .eq("status", "confirmado")
        .gt("starts_at", desde)
        .order("starts_at")
        .limit(50);
      if (error) throw error;
      return (data || []) as Agendamento[];
    },
  });
  const cancelar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("atendente_agendamentos").update({ status: "cancelado" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atendente-agenda", company] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const limparTestes = useMutation({
    mutationFn: async () => {
      const { error } = await db.from("atendente_agendamentos").delete().eq("company_id", company).eq("source", "teste");
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atendente-agenda", company] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const temTeste = q.data?.some((a) => a.source === "teste");

  return (
    <section className={card} aria-labelledby="at-agenda">
      <div className="flex items-center justify-between gap-3">
        <h2 id="at-agenda" className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--vyz-text-primary)]">Próximos horários marcados</h2>
        {temTeste && (
          <button type="button" className={btnSec} disabled={limparTestes.isPending} onClick={() => limparTestes.mutate()}>
            Limpar testes
          </button>
        )}
      </div>
      {q.isLoading ? (
        <div className="mt-3 h-12 animate-pulse rounded-[10px] bg-[var(--vyz-surface-2)] motion-reduce:animate-none" />
      ) : !q.data?.length ? (
        <p className="mt-3 flex items-center gap-2 text-[13.5px] text-[var(--vyz-text)]">
          <CalendarBlank size={16} aria-hidden className="text-[var(--vyz-text-muted)]" /> Nada marcado ainda.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--vyz-border-subtle)]">
          {q.data.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-[14px] font-medium tabular-nums text-[var(--vyz-text-primary)]">
                  {dataHora.format(new Date(a.starts_at))} · {a.service_label}
                  {a.source === "teste" && (
                    <span className="ml-2 rounded-full bg-[var(--vyz-surface-2)] px-2 py-0.5 text-[11.5px] font-medium text-[var(--vyz-text-muted)]">teste</span>
                  )}
                </p>
                <p className="truncate text-[12.5px] text-[var(--vyz-text-muted)]">
                  {[a.customer_name, a.customer_phone ? `+${a.customer_phone}` : null, a.notes].filter(Boolean).join(" · ")}
                </p>
              </div>
              <button type="button" className={btnSec} disabled={cancelar.isPending} onClick={() => cancelar.mutate(a.id)}>
                Cancelar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
