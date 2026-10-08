import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, MailOpen, Send, RefreshCw, Inbox, ArrowLeft, Reply, Copy, Archive, ArchiveRestore,
  ShieldAlert, MessageCircle, Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import DOMPurify from "dompurify";

// Aba de Suporte do super admin: o que precisa do Markus. Em cima, os pedidos
// de Raio-X (demo_requests source='orcamento_teste'), que são os leads dos
// anúncios. Embaixo, a caixa de suporte@vyzon.com.br (Resend), separada em
// pessoas, códigos de verificação e o resto, com lido e arquivado guardados em
// support_inbox_state.

interface ReceivedEmail {
  id: string;
  to: string[];
  from: string;
  subject: string;
  created_at: string;
  message_id?: string;
  attachments?: Array<{ filename?: string; content_type?: string }>;
  vyzon_contact?: "usuario" | "lead" | null;
}

interface EmailDetail extends ReceivedEmail {
  html?: string;
  text?: string;
}

interface RaioXRequest {
  id: string;
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  biggest_pain: string | null;
  landing_page: string | null;
  utm_content: string | null;
  utm_campaign: string | null;
  status: string;
  created_at: string;
}

type InboxState = { email_id: string; read_at: string | null; archived_at: string | null };
type Aba = "pessoas" | "codigos" | "outros" | "arquivados";

// support_inbox_state (migration 20261008d) ainda não está nos tipos gerados.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const STATUS: Array<{ value: string; label: string; cor: string }> = [
  { value: "pending", label: "Novo", cor: "#d97706" },
  { value: "contacted", label: "Chamei", cor: "#2563EB" },
  { value: "scheduled", label: "Conversa marcada", cor: "#7c3aed" },
  { value: "completed", label: "Raio-X feito", cor: "#16a34a" },
  { value: "cancelled", label: "Sem interesse", cor: "#64748b" },
];

// Nome legível do anúncio a partir do utm_content da campanha do Meta.
const ANUNCIO: Record<string, string> = {
  "ad-dois-dias": "Vídeo Dois dias",
  "ad-eu-sou-o-orcamento": "Vídeo Eu sou o orçamento",
  "ad-dois-universos": "Vídeo Dois universos",
  "ad-img-sumiu": "Imagem Visualizou e sumiu",
  "ad-img-parado": "Imagem Quanto está parado",
  "ad-img-universos": "Imagem Dois universos",
};

const PROVEDOR_PESSOAL = /@(gmail|googlemail|hotmail|outlook|live|yahoo|icloud|me|uol|bol|terra|ig|globo)\.(com|com\.br)$/i;
const PARECE_GOLPE =
  /(verification required|verifica[cç][aã]o (necess|obrigat)|will be deleted|ser[aã]o apagad|storage limit|limite de armazenamento|senha expir|password expir|conta (bloqueada|suspensa)|account (suspended|locked))/i;

function remetente(from: string) {
  const match = from.match(/^"?([^"<]+?)"?\s*<(.+)>$/);
  return match ? { nome: match[1].trim(), email: match[2].trim() } : { nome: from, email: from };
}

/** Código de verificação no assunto ("558361 é seu código", "Your code: 1234"). */
function codigoDo(subject: string): string | null {
  if (!/(c[oó]digo|code|verifica|otp|token|senha)/i.test(subject || "")) return null;
  return subject.match(/\b(\d{4,8})\b/)?.[1] || null;
}

function categoria(e: ReceivedEmail): Exclude<Aba, "arquivados"> {
  if (codigoDo(e.subject)) return "codigos";
  if (e.vyzon_contact || PROVEDOR_PESSOAL.test(remetente(e.from).email)) return "pessoas";
  return "outros";
}

function quando(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ptBR });
  } catch {
    return iso;
  }
}

function iniciais(texto: string) {
  return texto.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");
}

function digitos(phone: string | null) {
  const d = (phone || "").replace(/\D/g, "");
  if (!d) return "";
  return d.length <= 11 ? `55${d}` : d;
}

async function copiar(texto: string, aviso: string) {
  try {
    await navigator.clipboard.writeText(texto);
    toast.success(aviso);
  } catch {
    toast.error("Não consegui copiar");
  }
}

// ── Pedidos de Raio-X ──────────────────────────────────────────────────────

function PedidosRaioX() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["suporte-raio-x"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demo_requests")
        .select("id, name, company, email, phone, biggest_pain, landing_page, utm_content, utm_campaign, status, created_at")
        .eq("source", "orcamento_teste")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data || []) as RaioXRequest[];
    },
    refetchInterval: 60_000,
  });

  const mudarStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("demo_requests").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suporte-raio-x"] }),
    onError: (err: Error) => toast.error(err?.message || "Não consegui mudar o status"),
  });

  const pedidos = data || [];
  const novos = pedidos.filter((p) => p.status === "pending").length;

  return (
    <section className="rounded-2xl border border-border bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">Pedidos de Raio-X</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Quem pediu o Raio-X na home. Os anúncios do Meta caem aqui.
          </p>
        </div>
        {novos > 0 && (
          <span className="rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ background: "#d97706" }}>
            {novos} {novos === 1 ? "novo" : "novos"}
          </span>
        )}
      </header>

      {isLoading ? (
        <div className="flex h-24 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="px-5 py-6 text-sm text-rose-600">Erro ao carregar: {(error as Error).message}</p>
      ) : pedidos.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">
          Nenhum pedido ainda. Quando alguém pedir, ele aparece aqui e você recebe um e-mail.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {pedidos.map((p) => {
            const status = STATUS.find((s) => s.value === p.status) || STATUS[0];
            const tel = digitos(p.phone);
            const primeiro = (p.name || "").trim().split(/\s+/)[0] || "tudo bem";
            const abertura =
              `Oi, ${primeiro}, aqui é o Markus, do Vyzon. Vi que você pediu o Raio-X das suas propostas. ` +
              "Consegue 20 minutos hoje ou amanhã pra gente olhar juntos?";
            const contexto = (p.biggest_pain || "").replace(/^Energia solar\.\s*/, "");
            const origem = p.utm_content ? ANUNCIO[p.utm_content] || p.utm_content : p.utm_campaign || "Sem anúncio";
            return (
              <li key={p.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-semibold text-foreground">{p.name || p.email || "Sem nome"}</span>
                    {p.company && <span className="text-sm text-muted-foreground">{p.company}</span>}
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{ color: status.cor, background: `${status.cor}14` }}
                    >
                      {status.label}
                    </span>
                  </div>
                  {contexto && <p className="mt-1 text-[13px] text-foreground/80">{contexto}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {quando(p.created_at)} · {origem}
                    {p.phone ? ` · ${p.phone}` : ""}
                    {p.email ? ` · ${p.email}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {tel ? (
                    <Button asChild size="sm" className="rounded-full">
                      <a
                        href={`https://wa.me/${tel}?text=${encodeURIComponent(abertura)}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => {
                          if (p.status === "pending") mudarStatus.mutate({ id: p.id, status: "contacted" });
                        }}
                      >
                        <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                        Chamar no WhatsApp
                      </a>
                    </Button>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" /> sem telefone
                    </span>
                  )}
                  <select
                    aria-label="Status do pedido"
                    value={p.status}
                    onChange={(e) => mudarStatus.mutate({ id: p.id, status: e.target.value })}
                    className="h-9 rounded-full border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    {STATUS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ── Caixa de suporte@ ──────────────────────────────────────────────────────

const Suporte = () => {
  const queryClient = useQueryClient();
  const [aba, setAba] = useState<Aba>("pessoas");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");

  const { data: listData, isLoading, refetch, isFetching, error: listError } = useQuery({
    queryKey: ["support-inbox"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-support-inbox", {
        body: { action: "list", limit: 50 },
      });
      if (error) {
        let msg = "Erro ao listar e-mails";
        try {
          if (error.context && typeof error.context.json === "function") {
            const body = await error.context.json();
            if (body?.error) msg = body.error;
          }
        } catch {
          /* mantém a mensagem padrão */
        }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(`Resend: ${data.error}${data.status ? ` (${data.status})` : ""}`);
      return data as { data: ReceivedEmail[]; has_more: boolean };
    },
    refetchInterval: 30_000,
  });

  const { data: estados } = useQuery({
    queryKey: ["support-inbox-state"],
    queryFn: async () => {
      const { data, error } = await db.from("support_inbox_state").select("email_id, read_at, archived_at");
      if (error) throw error;
      return new Map(((data || []) as InboxState[]).map((s) => [s.email_id, s]));
    },
  });

  const salvarEstado = useMutation({
    mutationFn: async (s: { email_id: string; read_at?: string | null; archived_at?: string | null }) => {
      const atual = estados?.get(s.email_id);
      const linha = {
        email_id: s.email_id,
        read_at: s.read_at !== undefined ? s.read_at : atual?.read_at ?? null,
        archived_at: s.archived_at !== undefined ? s.archived_at : atual?.archived_at ?? null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await db.from("support_inbox_state").upsert(linha);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["support-inbox-state"] }),
  });

  const { data: emailDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ["support-inbox", selectedId],
    queryFn: async () => {
      if (!selectedId) return null;
      const { data, error } = await supabase.functions.invoke("admin-support-inbox", {
        body: { action: "get", id: selectedId },
      });
      if (error) throw error;
      return data as EmailDetail;
    },
    enabled: !!selectedId,
  });

  const replyMutation = useMutation({
    mutationFn: async () => {
      if (!emailDetail) throw new Error("Nenhum e-mail aberto");
      const corpo = replyText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
      const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;line-height:1.6;">
        ${corpo}
        <br><br>
        <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0;">
        <div style="color:#666;font-size:13px;">
          <strong>Vyzon Suporte</strong><br>
          <a href="https://vyzon.com.br" style="color:#2563EB;text-decoration:none;">vyzon.com.br</a>
        </div>
      </div>`;
      const { error } = await supabase.functions.invoke("admin-support-inbox", {
        body: {
          action: "reply",
          to: remetente(emailDetail.from).email,
          subject: emailDetail.subject?.startsWith("Re:") ? emailDetail.subject : `Re: ${emailDetail.subject || ""}`,
          html,
          inReplyTo: emailDetail.message_id,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Resposta enviada");
      setReplyText("");
      setReplyOpen(false);
    },
    onError: (err: Error) => toast.error(err?.message || "Erro ao enviar resposta"),
  });

  const emails = useMemo(() => listData?.data || [], [listData]);
  const porAba = useMemo(() => {
    const grupos: Record<Aba, ReceivedEmail[]> = { pessoas: [], codigos: [], outros: [], arquivados: [] };
    for (const e of emails) {
      if (estados?.get(e.id)?.archived_at) grupos.arquivados.push(e);
      else grupos[categoria(e)].push(e);
    }
    return grupos;
  }, [emails, estados]);
  const naoLidos = (lista: ReceivedEmail[]) => lista.filter((e) => !estados?.get(e.id)?.read_at).length;
  const visiveis = porAba[aba];

  const abrir = (e: ReceivedEmail) => {
    setSelectedId(e.id);
    setReplyOpen(false);
    if (!estados?.get(e.id)?.read_at) salvarEstado.mutate({ email_id: e.id, read_at: new Date().toISOString() });
  };

  const arquivar = (id: string, arquivado: boolean) => {
    salvarEstado.mutate({ email_id: id, archived_at: arquivado ? null : new Date().toISOString() });
    if (!arquivado) setSelectedId(null);
  };

  const ABAS: Array<{ id: Aba; label: string }> = [
    { id: "pessoas", label: "Pessoas" },
    { id: "codigos", label: "Códigos" },
    { id: "outros", label: "Outros" },
    { id: "arquivados", label: "Arquivados" },
  ];

  const detalheArquivado = selectedId ? Boolean(estados?.get(selectedId)?.archived_at) : false;
  const codigoAberto = emailDetail ? codigoDo(emailDetail.subject) : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1
              className="text-2xl font-bold text-foreground sm:text-3xl"
              style={{ fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}
            >
              Suporte
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pedidos de Raio-X e e-mails de suporte@vyzon.com.br.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch();
              queryClient.invalidateQueries({ queryKey: ["suporte-raio-x"] });
            }}
            disabled={isFetching}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        <PedidosRaioX />

        <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-3 py-2.5">
            {ABAS.map((a) => {
              const ativa = aba === a.id;
              const n = a.id === "arquivados" ? porAba[a.id].length : naoLidos(porAba[a.id]);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    setAba(a.id);
                    setSelectedId(null);
                  }}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    ativa ? "bg-foreground font-semibold text-background" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {a.label}
                  {n > 0 && (
                    <span className={`rounded-full px-1.5 text-[11px] ${ativa ? "bg-background/20" : "bg-muted text-foreground/70"}`}>
                      {n}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="grid min-h-[60vh] grid-cols-1 lg:grid-cols-[360px_1fr]">
            {/* lista */}
            <div className={`border-border lg:border-r ${selectedId ? "hidden lg:block" : ""}`}>
              {isLoading ? (
                <div className="flex h-64 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : listError ? (
                <div className="flex h-64 flex-col items-center justify-center px-6 text-center">
                  <p className="mb-2 text-sm font-medium text-rose-600">Erro ao carregar</p>
                  <p className="text-xs text-muted-foreground">{(listError as Error).message}</p>
                  <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
                    Tentar novamente
                  </Button>
                </div>
              ) : visiveis.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center px-6 text-center">
                  <Inbox className="mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-foreground/80">
                    {aba === "pessoas" ? "Nenhum e-mail de pessoa" : aba === "arquivados" ? "Nada arquivado" : "Nada aqui"}
                  </p>
                  {aba === "pessoas" && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Aqui entram clientes, leads e quem escreve de Gmail, Hotmail e afins.
                    </p>
                  )}
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {visiveis.map((e) => {
                    const { nome, email } = remetente(e.from);
                    const lido = Boolean(estados?.get(e.id)?.read_at);
                    const ativo = e.id === selectedId;
                    const codigo = codigoDo(e.subject);
                    const golpe = PARECE_GOLPE.test(e.subject || "");
                    return (
                      <li key={e.id}>
                        <button
                          type="button"
                          onClick={() => abrir(e)}
                          className={`w-full px-4 py-3 text-left transition-colors focus:outline-none focus-visible:bg-muted ${
                            ativo ? "bg-muted" : "hover:bg-muted/60"
                          }`}
                          style={{ boxShadow: ativo ? "inset 2px 0 0 var(--vyz-accent)" : undefined }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground/70">
                              {iniciais(nome)}
                              {!lido && (
                                <span
                                  className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card"
                                  style={{ background: "var(--vyz-accent)" }}
                                />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`truncate text-sm ${lido ? "text-foreground/80" : "font-semibold text-foreground"}`}>
                                  {nome}
                                </span>
                                <span className="shrink-0 text-[11px] text-muted-foreground">{quando(e.created_at)}</span>
                              </div>
                              <p className={`mt-0.5 truncate text-xs ${lido ? "text-muted-foreground" : "text-foreground/80"}`}>
                                {e.subject || "(sem assunto)"}
                              </p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                {e.vyzon_contact && (
                                  <span
                                    className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                                    style={{ color: "var(--vyz-accent)", background: "var(--vyz-accent-soft-10)" }}
                                  >
                                    {e.vyzon_contact === "usuario" ? "Usuário do Vyzon" : "Lead"}
                                  </span>
                                )}
                                {golpe && (
                                  <span className="flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-rose-600">
                                    <ShieldAlert className="h-3 w-3" /> Parece golpe
                                  </span>
                                )}
                                {codigo && (
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(ev) => {
                                      ev.stopPropagation();
                                      copiar(codigo, `Código ${codigo} copiado`);
                                    }}
                                    onKeyDown={(ev) => {
                                      if (ev.key === "Enter") {
                                        ev.stopPropagation();
                                        copiar(codigo, `Código ${codigo} copiado`);
                                      }
                                    }}
                                    className="flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground hover:bg-muted"
                                  >
                                    {codigo} <Copy className="h-3 w-3" />
                                  </span>
                                )}
                                {!e.vyzon_contact && !golpe && !codigo && (
                                  <span className="truncate text-[11px] text-muted-foreground/70">{email}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* leitura */}
            <div className={`relative ${selectedId ? "" : "hidden lg:block"}`}>
              {!selectedId ? (
                <div className="flex h-full min-h-[400px] flex-col items-center justify-center px-6 text-center">
                  <MailOpen className="mb-4 h-12 w-12 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-foreground/70">Selecione um e-mail para ler</p>
                  <p className="mt-1 text-xs text-muted-foreground">A lista atualiza sozinha a cada 30 segundos</p>
                </div>
              ) : loadingDetail ? (
                <div className="flex h-full min-h-[400px] items-center justify-center">
                  <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
                </div>
              ) : emailDetail ? (
                <div className="flex h-full flex-col">
                  <div className="border-b border-border px-6 py-5">
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      className="mb-3 flex items-center gap-1 text-xs text-muted-foreground lg:hidden"
                    >
                      <ArrowLeft className="h-3 w-3" /> Voltar
                    </button>
                    <h2 className="mb-3 text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                      {emailDetail.subject || "(sem assunto)"}
                    </h2>
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{remetente(emailDetail.from).nome}</span>
                          <span className="text-xs text-muted-foreground">&lt;{remetente(emailDetail.from).email}&gt;</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          para {(emailDetail.to || []).join(", ")} · {quando(emailDetail.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {codigoAberto && (
                          <Button variant="outline" size="sm" onClick={() => copiar(codigoAberto, `Código ${codigoAberto} copiado`)}>
                            <Copy className="mr-1.5 h-3.5 w-3.5" />
                            {codigoAberto}
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => arquivar(emailDetail.id, detalheArquivado)}>
                          {detalheArquivado ? (
                            <><ArchiveRestore className="mr-1.5 h-3.5 w-3.5" /> Desarquivar</>
                          ) : (
                            <><Archive className="mr-1.5 h-3.5 w-3.5" /> Arquivar</>
                          )}
                        </Button>
                        <Button size="sm" onClick={() => setReplyOpen((v) => !v)}>
                          <Reply className="mr-1.5 h-3.5 w-3.5" />
                          Responder
                        </Button>
                      </div>
                    </div>
                    {PARECE_GOLPE.test(emailDetail.subject || "") && (
                      <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
                        <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                        Assunto típico de golpe. Não clique em links nem informe senha.
                      </p>
                    )}
                  </div>

                  <div className="flex-1 overflow-auto px-6 py-5">
                    {emailDetail.html ? (
                      <div
                        className="prose max-w-none text-sm text-foreground/85 dark:prose-invert"
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(emailDetail.html, {
                            FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"],
                            FORBID_ATTR: ["onerror", "onload", "onclick"],
                          }),
                        }}
                      />
                    ) : emailDetail.text ? (
                      <pre className="whitespace-pre-wrap font-sans text-sm text-foreground/85">{emailDetail.text}</pre>
                    ) : (
                      <p className="text-sm italic text-muted-foreground">(e-mail sem conteúdo)</p>
                    )}

                    {emailDetail.attachments && emailDetail.attachments.length > 0 && (
                      <div className="mt-6 border-t border-border pt-4">
                        <p className="mb-2 text-xs text-muted-foreground">{emailDetail.attachments.length} anexo(s)</p>
                        {emailDetail.attachments.map((att, i) => (
                          <div key={i} className="flex items-center gap-2 rounded-lg bg-muted p-2 text-xs text-foreground/70">
                            {att.filename} ({att.content_type})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <AnimatePresence>
                    {replyOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden border-t border-border"
                      >
                        <div className="px-6 py-4">
                          <p className="mb-2 text-xs text-muted-foreground">
                            Respondendo para <strong className="text-foreground/80">{remetente(emailDetail.from).email}</strong>
                          </p>
                          <Textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Escreva a resposta"
                            rows={6}
                            className="resize-none"
                          />
                          <div className="mt-3 flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setReplyOpen(false);
                                setReplyText("");
                              }}
                            >
                              Cancelar
                            </Button>
                            <Button size="sm" onClick={() => replyMutation.mutate()} disabled={!replyText.trim() || replyMutation.isPending}>
                              {replyMutation.isPending ? (
                                <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Enviando</>
                              ) : (
                                <><Send className="mr-1.5 h-3.5 w-3.5" /> Enviar</>
                              )}
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Suporte;
