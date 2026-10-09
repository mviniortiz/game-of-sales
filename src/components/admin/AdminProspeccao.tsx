import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// PROSPECT.2 — painel da prospecção automatizada do Markus. O envio e a leitura
// das respostas rodam na edge prospect-run e no webhook; aqui ele acompanha o
// funil, liga e desliga, ajusta o teto diário e importa integradoras novas.

type Prospect = {
  id: string;
  agency_name: string | null;
  city: string | null;
  rating_count: number | null;
  score: number | null;
  status: string;
  phone_e164: string | null;
  sent_at: string | null;
  followup_sent_at: string | null;
  replied_at: string | null;
  reply_kind: string | null;
  last_reply: string | null;
  reply_code: string | null;
  variant: string | null;
};

type Instance = { id: string; is_active: boolean; daily_cap: number; window_start: number; window_end: number; next_send_at: string | null };

const ETAPAS: { id: string; label: string }[] = [
  { id: "mapeado", label: "Na fila" },
  { id: "aguardando_aprovacao", label: "Esperando seu ok" },
  { id: "aprovado", label: "Aprovado" },
  { id: "enviado", label: "Abordado" },
  { id: "respondeu", label: "Respondeu" },
  { id: "conversa_marcada", label: "Conversa marcada" },
  { id: "sem_interesse", label: "Sem interesse" },
];
const ROTULO = Object.fromEntries([...ETAPAS.map((e) => [e.id, e.label]), ["descartado", "Descartado"]]);
const VERSAO: Record<string, string> = { pergunta: "Pergunta + motivo", numero: "Número da Greener", curta: "Pergunta curta", pergunta_cafe: "Pergunta (com café)" };
const LEITURA: Record<string, string> = { interesse: "quer conversar", sem_interesse: "não quer", automatico: "robô", duvida: "dúvida" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabelas da prospecção ainda fora dos tipos gerados
const db = supabase as any;
const quando = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";

function tail10(raw: string): string {
  return raw.replace(/\D/g, "").slice(-10);
}

export function AdminProspeccao() {
  const { user, companyId } = useAuth();
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState<string>("todos");
  const [importar, setImportar] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["prospeccao", user?.id],
    enabled: !!user?.id,
    refetchInterval: 30000,
    queryFn: async () => {
      const [lista, inst] = await Promise.all([
        db.from("prospecting_allowlist")
          .select("id, agency_name, city, rating_count, score, status, phone_e164, sent_at, followup_sent_at, replied_at, reply_kind, last_reply, reply_code, variant")
          .eq("user_id", user!.id).order("updated_at", { ascending: false }),
        db.from("prospecting_instances").select("id, is_active, daily_cap, window_start, window_end, next_send_at").eq("user_id", user!.id).maybeSingle(),
      ]);
      if (lista.error) throw lista.error;
      return { prospects: (lista.data || []) as Prospect[], inst: (inst.data || null) as Instance | null };
    },
  });

  const prospects = useMemo(() => data?.prospects ?? [], [data]);
  const inst = data?.inst ?? null;
  const contagem = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of prospects) c[p.status] = (c[p.status] || 0) + 1;
    return c;
  }, [prospects]);
  const visiveis = filtro === "todos" ? prospects : prospects.filter((p) => p.status === filtro);
  const recarregar = () => qc.invalidateQueries({ queryKey: ["prospeccao", user?.id] });

  async function alternar() {
    if (!user?.id || !companyId) return;
    const proximo = !inst?.is_active;
    const res = inst
      ? await db.from("prospecting_instances").update({ is_active: proximo }).eq("id", inst.id)
      : await db.from("prospecting_instances").insert({ user_id: user.id, company_id: companyId, is_active: true, label: "Prospecção integradoras" });
    if (res.error) return toast.error(res.error.message);
    toast.success(proximo ? "Prospecção ligada. Só as integradoras da lista entram no Vyzon." : "Prospecção desligada.");
    recarregar();
  }

  async function mudarTeto(v: number) {
    if (!inst) return;
    const res = await db.from("prospecting_instances").update({ daily_cap: v }).eq("id", inst.id);
    if (res.error) return toast.error(res.error.message);
    recarregar();
  }

  async function mudarStatus(id: string, status: string) {
    const res = await db.from("prospecting_allowlist").update({ status, reply_code: null }).eq("id", id);
    if (res.error) return toast.error(res.error.message);
    recarregar();
  }

  // Uma por linha: Empresa; Cidade; Avaliações; Celular; Nota (1 a 3); Sinal
  async function fazerImportacao() {
    if (!user?.id || !companyId) return;
    const linhas = importar.split("\n").map((l) => l.trim()).filter(Boolean);
    const rows = linhas.map((l) => {
      const [empresa, cidade, aval, cel, nota, sinal] = l.split(";").map((x) => x?.trim() || "");
      const digitos = cel.replace(/\D/g, "");
      return {
        company_id: companyId, user_id: user.id, created_by: user.id,
        agency_name: empresa, city: cidade || null, rating_count: Number(aval) || null,
        phone_e164: digitos ? (digitos.length <= 11 ? `55${digitos}` : digitos) : null,
        phone_tail: tail10(cel), score: Number(nota) || 2, signal: sinal || null,
        niche: "integradora solar", status: "mapeado",
      };
    }).filter((r) => r.agency_name && r.phone_tail.length === 10);
    if (!rows.length) return toast.error("Nenhuma linha válida. Formato: Empresa; Cidade; Avaliações; Celular; Nota; Sinal");
    const res = await db.from("prospecting_allowlist").upsert(rows, { onConflict: "user_id,phone_tail", ignoreDuplicates: true });
    if (res.error) return toast.error(res.error.message);
    toast.success(`${rows.length} integradoras na fila.`);
    setImportar("");
    recarregar();
  }

  // Teste de abordagens: taxa de resposta de cada versão da primeira mensagem.
  const porVersao = useMemo(() => {
    const v: Record<string, { abordados: number; responderam: number; conversas: number }> = {};
    for (const p of prospects) {
      if (!p.variant || !p.sent_at) continue;
      const x = (v[p.variant] ||= { abordados: 0, responderam: 0, conversas: 0 });
      x.abordados++;
      if (p.replied_at) x.responderam++;
      if (p.status === "conversa_marcada") x.conversas++;
    }
    return v;
  }, [prospects]);

  const respondeu = (contagem.respondeu || 0) + (contagem.conversa_marcada || 0) + (contagem.sem_interesse || 0);
  const abordados = respondeu + (contagem.enviado || 0);

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] p-4">
        <div>
          <p className="text-[15px] font-semibold text-[var(--vyz-text-primary)]">
            Prospecção {inst?.is_active ? "ligada" : "desligada"}
          </p>
          <p className="mt-0.5 text-[13px] text-[var(--vyz-text-muted)]">
            {inst?.is_active
              ? `Todo dia útil, às ${inst.window_start}h, chega no seu WhatsApp o lote do dia para aprovar. Envio entre ${inst.window_start}h e ${inst.window_end}h, 2 a 5 minutos entre contatos.`
              : "Ligada, só as integradoras desta lista entram no Vyzon pelo seu WhatsApp, e o lote do dia chega para você aprovar."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {inst && (
            <label className="flex items-center gap-2 text-[13px] text-[var(--vyz-text-muted)]">
              Por dia
              <select value={inst.daily_cap} onChange={(e) => mudarTeto(Number(e.target.value))}
                className="h-9 rounded-lg border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] px-2 text-[14px] text-[var(--vyz-text-primary)]">
                {[3, 5, 8, 10, 15].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          )}
          <button onClick={alternar}
            className={`h-9 rounded-full px-4 text-[13px] font-semibold ${inst?.is_active ? "border border-[var(--vyz-border)] text-[var(--vyz-text-primary)]" : "bg-[var(--vyz-text-primary)] text-[var(--vyz-surface-1)]"}`}>
            {inst?.is_active ? "Desligar" : "Ligar prospecção"}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Na fila", valor: (contagem.mapeado || 0) + (contagem.aguardando_aprovacao || 0) + (contagem.aprovado || 0) },
          { label: "Abordados", valor: abordados },
          { label: "Responderam", valor: respondeu, extra: abordados ? `${Math.round((respondeu / abordados) * 100)}%` : "" },
          { label: "Conversas marcadas", valor: contagem.conversa_marcada || 0 },
        ].map((k) => (
          <div key={k.label} className="rounded-[10px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] p-3">
            <p className="text-[12px] text-[var(--vyz-text-muted)]">{k.label}</p>
            <p className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-[var(--vyz-text-primary)]">
              {k.valor} {k.extra ? <span className="text-[13px] font-medium text-[var(--vyz-text-muted)]">{k.extra}</span> : null}
            </p>
          </div>
        ))}
      </section>

      {Object.keys(porVersao).length > 0 && (
        <section className="rounded-[10px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] p-4">
          <p className="text-[14px] font-semibold text-[var(--vyz-text-primary)]">Qual abordagem funciona melhor</p>
          <p className="mt-0.5 text-[12.5px] text-[var(--vyz-text-muted)]">Com menos de 30 abordagens por versão, a diferença ainda pode ser sorte.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {Object.entries(porVersao).map(([nome, x]) => (
              <div key={nome} className="rounded-lg border border-[var(--vyz-border)] p-3">
                <p className="text-[13px] font-semibold capitalize text-[var(--vyz-text-primary)]">{VERSAO[nome] || nome}</p>
                <p className="mt-1 text-[20px] font-semibold tracking-[-0.02em] text-[var(--vyz-text-primary)]">
                  {x.abordados ? Math.round((x.responderam / x.abordados) * 100) : 0}%
                  <span className="ml-1 text-[12.5px] font-normal text-[var(--vyz-text-muted)]">responderam</span>
                </p>
                <p className="text-[12.5px] text-[var(--vyz-text-muted)]">{x.responderam} de {x.abordados} · {x.conversas} conversas</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="-mx-1 overflow-x-auto px-1">
        <div className="inline-flex gap-1">
          {[{ id: "todos", label: "Todos" }, ...ETAPAS].map((e) => (
            <button key={e.id} onClick={() => setFiltro(e.id)}
              className={`h-9 whitespace-nowrap rounded-full px-3 text-[13px] ${filtro === e.id ? "bg-[var(--vyz-text-primary)] text-[var(--vyz-surface-1)]" : "border border-[var(--vyz-border)] text-[var(--vyz-text-muted)]"}`}>
              {e.label} {e.id === "todos" ? prospects.length : contagem[e.id] || 0}
            </button>
          ))}
        </div>
      </div>

      <section className="overflow-hidden rounded-[10px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)]">
        {isLoading ? (
          <p className="p-4 text-[14px] text-[var(--vyz-text-muted)]">Carregando…</p>
        ) : visiveis.length === 0 ? (
          <p className="p-4 text-[14px] text-[var(--vyz-text-muted)]">Nenhuma integradora aqui.</p>
        ) : (
          <ul className="divide-y divide-[var(--vyz-border)]">
            {visiveis.map((p) => (
              <li key={p.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[var(--vyz-text-primary)]">
                    {p.agency_name}
                    <span className="ml-2 font-normal text-[var(--vyz-text-muted)]">
                      {[p.city, p.rating_count ? `${p.rating_count} avaliações` : ""].filter(Boolean).join(" · ")}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-[var(--vyz-text-muted)]">
                    {ROTULO[p.status] || p.status}
                    {p.reply_kind ? ` · ${LEITURA[p.reply_kind] || p.reply_kind}` : ""}
                    {p.sent_at ? ` · abordado ${quando(p.sent_at)}` : ""}
                    {p.replied_at ? ` · respondeu ${quando(p.replied_at)}` : ""}
                    {p.reply_code ? ` · esperando seu ok (${p.reply_code})` : ""}
                  </p>
                  {p.last_reply && (
                    <p className="mt-1 line-clamp-2 text-[13px] text-[var(--vyz-text-primary)]">
                      {p.last_reply.split("\n").filter((l) => l.startsWith("Eles:")).pop()?.replace(/^Eles:\s*/, "")}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {p.status !== "conversa_marcada" && ["respondeu", "enviado"].includes(p.status) && (
                    <button onClick={() => mudarStatus(p.id, "conversa_marcada")}
                      className="h-9 rounded-full border border-[var(--vyz-border)] px-3 text-[12.5px] text-[var(--vyz-text-primary)]">
                      Conversa marcada
                    </button>
                  )}
                  {!["descartado", "sem_interesse"].includes(p.status) && (
                    <button onClick={() => mudarStatus(p.id, "descartado")}
                      className="h-9 rounded-full px-3 text-[12.5px] text-[var(--vyz-text-muted)]">
                      Descartar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-[10px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] p-4">
        <p className="text-[14px] font-semibold text-[var(--vyz-text-primary)]">Adicionar integradoras</p>
        <p className="mt-0.5 text-[12.5px] text-[var(--vyz-text-muted)]">Uma por linha: Empresa; Cidade; Avaliações; Celular; Nota de 1 a 3; Sinal</p>
        <textarea value={importar} onChange={(e) => setImportar(e.target.value)} rows={4}
          placeholder="Haus Energie; Palhoça; 163; (48) 99144-4258; 3; 163 avaliações 5,0"
          className="mt-2 w-full rounded-lg border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] p-2 text-[16px] sm:text-[14px] text-[var(--vyz-text-primary)]" />
        <button onClick={fazerImportacao} disabled={!importar.trim()}
          className="mt-2 h-9 rounded-full bg-[var(--vyz-text-primary)] px-4 text-[13px] font-semibold text-[var(--vyz-surface-1)] disabled:opacity-40">
          Colocar na fila
        </button>
      </section>
    </div>
  );
}
