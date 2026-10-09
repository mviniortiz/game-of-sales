import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";

// AUTO.1 — o que roda sozinho no WhatsApp do dono, num lugar só. Cada automação
// lê, qualifica e escreve; o que sai para alguém de fora passa pelo código de
// aprovação no WhatsApp dele. Os leads do anúncio vêm do webhook (ad_leads); a
// prospecção mora em prospecting_instances e a lista completa fica em Gestão.

type LeadConfig = {
  prefill?: string;
  oferta?: string;
  link?: string;
  perguntas?: string[];
  horario_conversa?: string;
  tom?: string;
};
type Automation = { id: string; enabled: boolean; config: LeadConfig };
type AdLead = {
  id: string;
  contact_name: string | null;
  phone_e164: string;
  status: string;
  is_integrador: boolean | null;
  propostas_mes: string | null;
  cidade: string | null;
  conversa: string;
  reply_code: string | null;
  ad_headline: string | null;
  created_at: string;
  last_inbound_at: string | null;
};
type Prospeccao = { id: string; is_active: boolean; daily_cap: number; window_start: number; window_end: number };

const STATUS: Record<string, string> = {
  novo: "Chegou agora",
  qualificando: "Entendendo o perfil",
  raio_x_oferecido: "Raio-X oferecido",
  conversa_marcada: "Conversa marcada",
  raio_x_feito: "Fez o Raio-X",
  sem_fit: "Não é integrador",
  sem_interesse: "Sem interesse",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabelas novas ainda fora dos tipos gerados
const db = supabase as any;

const quando = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";

function telefone(e164: string): string {
  const d = e164.replace(/\D/g, "").replace(/^55/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return e164;
}

const campo =
  "w-full rounded-[10px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] px-3 py-2 text-[16px] text-[var(--vyz-text-primary)] transition-shadow duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.25)] sm:text-[14px]";
const cartao = "rounded-[10px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] shadow-[0_1px_2px_rgba(15,23,42,0.04)]";
const botaoPrimario =
  "h-9 rounded-full bg-[var(--vyz-text-primary)] px-4 text-[13px] font-semibold text-[var(--vyz-surface-1)] transition-transform duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.3)]";
const botaoSecundario =
  "inline-flex h-9 items-center rounded-full border border-[var(--vyz-border)] px-4 text-[13px] font-semibold text-[var(--vyz-text-primary)] transition-colors duration-150 hover:bg-[var(--vyz-surface-2)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.3)]";

export default function Automacoes() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const chave = ["automacoes", user?.id];

  const { data, isLoading } = useQuery({
    queryKey: chave,
    enabled: !!user?.id,
    refetchInterval: 30000,
    queryFn: async () => {
      const [auto, leads, prosp] = await Promise.all([
        db.from("automations").select("id, enabled, config").eq("user_id", user!.id).eq("key", "lead_anuncio").maybeSingle(),
        db.from("ad_leads")
          .select("id, contact_name, phone_e164, status, is_integrador, propostas_mes, cidade, conversa, reply_code, ad_headline, created_at, last_inbound_at")
          .eq("user_id", user!.id).order("last_inbound_at", { ascending: false, nullsFirst: false }).limit(50),
        db.from("prospecting_instances").select("id, is_active, daily_cap, window_start, window_end").eq("user_id", user!.id).maybeSingle(),
      ]);
      if (auto.error) throw auto.error;
      return {
        auto: (auto.data || null) as Automation | null,
        leads: (leads.data || []) as AdLead[],
        prosp: (prosp.data || null) as Prospeccao | null,
      };
    },
  });

  const auto = data?.auto ?? null;
  const leads = useMemo(() => data?.leads ?? [], [data]);
  const prosp = data?.prosp ?? null;

  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState<LeadConfig & { perguntasTexto: string }>({ perguntasTexto: "" });
  useEffect(() => {
    if (auto && !editando) setRascunho({ ...auto.config, perguntasTexto: (auto.config.perguntas || []).join("\n") });
  }, [auto, editando]);

  async function salvarLead(patch: Partial<Automation>) {
    if (!auto) return;
    const { error } = await db.from("automations").update(patch).eq("id", auto.id);
    if (error) return toast.error("Não consegui salvar. Tente de novo.");
    qc.invalidateQueries({ queryKey: chave });
  }

  async function salvarTextos() {
    const { perguntasTexto, ...resto } = rascunho;
    const perguntas = perguntasTexto.split("\n").map((s) => s.trim()).filter(Boolean);
    await salvarLead({ config: { ...resto, perguntas } });
    setEditando(false);
    toast.success("Automação atualizada. Vale a partir da próxima mensagem.");
  }

  async function salvarProspeccao(patch: Partial<Prospeccao>) {
    if (!prosp) return;
    const { error } = await db.from("prospecting_instances").update(patch).eq("id", prosp.id);
    if (error) return toast.error("Não consegui salvar. Tente de novo.");
    qc.invalidateQueries({ queryKey: chave });
  }

  const pendentes = leads.filter((l) => l.reply_code).length;
  const integradores = leads.filter((l) => l.is_integrador).length;
  const ofertados = leads.filter((l) => ["raio_x_oferecido", "conversa_marcada", "raio_x_feito"].includes(l.status)).length;

  return (
    <div className="mx-auto w-full max-w-[880px] space-y-5 px-4 py-6 sm:px-6">
      <header>
        <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-[var(--vyz-text-primary)]">Automações</h1>
        <p className="mt-1 max-w-[620px] text-[14px] leading-relaxed text-[var(--vyz-text-muted)]">
          O que roda sozinho no seu WhatsApp. A EVA lê e escreve; o que sai para alguém de fora espera o seu código no WhatsApp:
          responda <b className="font-semibold text-[var(--vyz-text-primary)]">LK4 1</b> para enviar, <b className="font-semibold text-[var(--vyz-text-primary)]">LK4 2</b> para não enviar, ou o código seguido do seu texto.
        </p>
      </header>

      {isLoading ? (
        <p className="text-[14px] text-[var(--vyz-text-muted)]">Carregando…</p>
      ) : (
        <>
          {auto && (
            <section className={cartao}>
              <div className="flex items-start justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-[var(--vyz-text-primary)]">Leads do anúncio no WhatsApp</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--vyz-text-muted)]">
                    Quem toca no anúncio cai numa conversa com você. A cada mensagem, a EVA entende se é integrador, faz uma pergunta por vez e,
                    quando faz sentido, oferece o Raio-X com o link. Você recebe a resposta pronta no WhatsApp para aprovar.
                  </p>
                </div>
                <Switch className="relative shrink-0 after:absolute after:-inset-3 after:content-['']" checked={auto.enabled} onCheckedChange={(v) => salvarLead({ enabled: v })} aria-label="Ligar leads do anúncio" />
              </div>

              <div className="grid grid-cols-2 gap-px border-t border-[var(--vyz-border)] bg-[var(--vyz-border)] sm:grid-cols-4">
                {[
                  { label: "Chegaram", valor: leads.length },
                  { label: "Integradores", valor: integradores },
                  { label: "Raio-X oferecido", valor: ofertados },
                  { label: "Esperando seu ok", valor: pendentes },
                ].map((k) => (
                  <div key={k.label} className="bg-[var(--vyz-surface-1)] p-3">
                    <p className="text-[12px] text-[var(--vyz-text-muted)]">{k.label}</p>
                    <p className="mt-0.5 text-[20px] font-semibold tracking-[-0.02em] text-[var(--vyz-text-primary)]">{k.valor}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-[var(--vyz-border)] p-4">
                {!editando ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="min-w-0 text-[13px] text-[var(--vyz-text-muted)]">
                      Frase do anúncio: <span className="text-[var(--vyz-text-primary)]">"{auto.config.prefill}"</span>
                    </p>
                    <button type="button" onClick={() => setEditando(true)} className={botaoSecundario}>Editar textos</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {([
                      ["prefill", "Frase já escrita no anúncio", "É como a EVA reconhece quem veio do anúncio, além da marca do próprio WhatsApp."],
                      ["oferta", "O que oferecer", "Como a EVA descreve o Raio-X."],
                      ["link", "Link do Raio-X", ""],
                      ["horario_conversa", "Quando você pode conversar", "Ex.: dias úteis a partir das 15h."],
                      ["tom", "Tom das respostas", ""],
                    ] as const).map(([k, label, ajuda]) => (
                      <label key={k} className="block">
                        <span className="text-[13px] font-semibold text-[var(--vyz-text-primary)]">{label}</span>
                        {ajuda && <span className="block text-[12px] text-[var(--vyz-text-muted)]">{ajuda}</span>}
                        {k === "oferta" || k === "tom" ? (
                          <textarea rows={2} value={rascunho[k] || ""} onChange={(e) => setRascunho({ ...rascunho, [k]: e.target.value })} className={`${campo} mt-1`} />
                        ) : (
                          <input value={rascunho[k] || ""} onChange={(e) => setRascunho({ ...rascunho, [k]: e.target.value })} className={`${campo} mt-1 h-10`} />
                        )}
                      </label>
                    ))}
                    <label className="block">
                      <span className="text-[13px] font-semibold text-[var(--vyz-text-primary)]">O que descobrir na conversa</span>
                      <span className="block text-[12px] text-[var(--vyz-text-muted)]">Uma por linha. A EVA pergunta uma por vez, só o que ainda não sabe.</span>
                      <textarea rows={3} value={rascunho.perguntasTexto} onChange={(e) => setRascunho({ ...rascunho, perguntasTexto: e.target.value })} className={`${campo} mt-1`} />
                    </label>
                    <div className="flex gap-2">
                      <button type="button" onClick={salvarTextos} className={botaoPrimario}>Salvar</button>
                      <button type="button" onClick={() => setEditando(false)} className={botaoSecundario}>Cancelar</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-[var(--vyz-border)]">
                {leads.length === 0 ? (
                  <p className="p-4 text-[13.5px] text-[var(--vyz-text-muted)]">
                    Ninguém chegou pelo anúncio ainda. Quando alguém tocar em "Enviar mensagem", aparece aqui e no seu WhatsApp.
                  </p>
                ) : (
                  <ul className="divide-y divide-[var(--vyz-border)]">
                    {leads.map((l) => {
                      const ultima = l.conversa.split("\n").filter((x) => x.startsWith("Lead:")).pop()?.replace(/^Lead:\s*/, "");
                      const perfil = [l.propostas_mes ? `${l.propostas_mes} propostas/mês` : "", l.cidade || ""].filter(Boolean).join(" · ");
                      return (
                        <li key={l.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                          <div className="min-w-0">
                            <p className="text-[14px] font-semibold text-[var(--vyz-text-primary)]">
                              {l.contact_name || telefone(l.phone_e164)}
                              {l.contact_name && <span className="ml-2 text-[12.5px] font-normal text-[var(--vyz-text-muted)]">{telefone(l.phone_e164)}</span>}
                            </p>
                            <p className="mt-0.5 text-[12.5px] text-[var(--vyz-text-muted)]">
                              {STATUS[l.status] || l.status}
                              {perfil ? ` · ${perfil}` : ""}
                              {l.last_inbound_at ? ` · ${quando(l.last_inbound_at)}` : ""}
                            </p>
                            {ultima && <p className="mt-1 line-clamp-2 text-[13px] text-[var(--vyz-text-primary)]">"{ultima}"</p>}
                          </div>
                          {l.reply_code && (
                            <span className="shrink-0 self-start rounded-full bg-[var(--vyz-surface-2)] px-3 py-1 text-[12px] font-semibold text-[var(--vyz-text-primary)]">
                              Esperando seu ok · {l.reply_code}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          )}

          {prosp && (
            <section className={cartao}>
              <div className="flex items-start justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-[var(--vyz-text-primary)]">Prospecção de integradoras</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--vyz-text-muted)]">
                    Todo dia útil, às {prosp.window_start}h, chega no seu WhatsApp o lote do dia para aprovar. Saem entre {prosp.window_start}h e {prosp.window_end}h,
                    com 2 a 5 minutos entre contatos, e a EVA lê cada resposta. Ligada, só as integradoras da lista e os leads do anúncio entram no Vyzon pelo seu número.
                  </p>
                </div>
                <Switch className="relative shrink-0 after:absolute after:-inset-3 after:content-['']" checked={prosp.is_active} onCheckedChange={(v) => salvarProspeccao({ is_active: v })} aria-label="Ligar prospecção" />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--vyz-border)] p-4">
                <label className="flex items-center gap-2 text-[13px] text-[var(--vyz-text-muted)]">
                  Abordagens por dia
                  <select value={prosp.daily_cap} onChange={(e) => salvarProspeccao({ daily_cap: Number(e.target.value) })}
                    className="h-9 rounded-[10px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] px-2 text-[14px] text-[var(--vyz-text-primary)]">
                    {[3, 5, 8, 10, 15].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                <Link to="/admin?aba=prospeccao" className={botaoSecundario}>Ver lista e respostas</Link>
              </div>
            </section>
          )}

          {!auto && !prosp && (
            <p className="text-[14px] text-[var(--vyz-text-muted)]">Nenhuma automação nesta conta ainda.</p>
          )}
        </>
      )}
    </div>
  );
}
