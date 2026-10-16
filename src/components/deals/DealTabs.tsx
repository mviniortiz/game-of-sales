// Abas Tarefas e Arquivos do detalhe do card (DealCommandCenter).
import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isBefore, isToday, isTomorrow, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
    CheckCircle2, Circle, Phone, Mail, MessageSquare, FileText, Plus, Trash2, Image as ImageIcon,
    Mic, Film, Paperclip, Download, Loader2, ArrowUpRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSignedWhatsAppMediaUrl } from "@/lib/whatsappMedia";

const LINHA = "flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-[var(--ibx-line-soft)] last:border-b-0";
const ICONE = "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ibx-sunken)] text-[var(--vyz-text-muted)]";
const GHOST = "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--vyz-text-muted)] hover:bg-[var(--ibx-paper)] hover:text-[var(--vyz-text-primary)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)] disabled:opacity-40";
const BOTAO = "inline-flex items-center gap-1.5 h-9 px-4 whitespace-nowrap rounded-full text-[13px] font-semibold bg-[var(--vyz-btn-solid)] text-[var(--vyz-btn-on)] hover:opacity-90 transition-[opacity,transform] duration-150 active:scale-[0.98] motion-reduce:active:scale-100 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)] focus-visible:ring-offset-2";
const TITULO_GRUPO = "px-4 sm:px-5 pt-4 pb-1.5 text-[11.5px] font-medium text-[var(--vyz-text-muted)]";

const Vazio = ({ icon: Icon, titulo, texto, acao }: { icon: typeof Plus; titulo: string; texto: string; acao?: React.ReactNode }) => (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className={`${ICONE} h-10 w-10`}><Icon className="h-4 w-4" aria-hidden /></div>
        <p className="mt-3 text-[13.5px] font-semibold text-[var(--vyz-text-primary)]">{titulo}</p>
        <p className="mt-1 max-w-[320px] text-[12.5px] leading-relaxed text-[var(--vyz-text-muted)]">{texto}</p>
        {acao && <div className="mt-4">{acao}</div>}
    </div>
);

// ─── Tarefas ────────────────────────────────────────────────────────────────

const TIPO_ICONE: Record<string, typeof Plus> = { tarefa: CheckCircle2, ligacao: Phone, reuniao: MessageSquare, proposta: FileText, email: Mail };

type Tarefa = {
    id: string; title: string; description: string | null; task_type: string | null;
    remind_at: string; completed: boolean; completed_at: string | null; user_id: string;
};

const prazo = (iso: string, feita: boolean) => {
    const d = new Date(iso);
    const hora = format(d, "HH:mm");
    if (feita) return { texto: format(d, "dd MMM", { locale: ptBR }), tom: "text-[var(--vyz-text-muted)]" };
    if (isBefore(d, startOfDay(new Date()))) return { texto: `Atrasada · ${format(d, "dd MMM", { locale: ptBR })}`, tom: "text-[var(--vyz-danger)] font-semibold" };
    if (isToday(d)) return { texto: `Hoje, ${hora}`, tom: "text-[var(--vyz-accent)] font-semibold" };
    if (isTomorrow(d)) return { texto: `Amanhã, ${hora}`, tom: "text-[var(--vyz-text-strong)]" };
    return { texto: format(d, "dd MMM, HH:mm", { locale: ptBR }), tom: "text-[var(--vyz-text-muted)]" };
};

export function DealTasksTab({ dealId, onNew }: { dealId: string; onNew: () => void }) {
    const qc = useQueryClient();
    const { data: tarefas = [], isLoading } = useQuery({
        queryKey: ["deal-tasks", dealId],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("follow_up_reminders")
                .select("id, title, description, task_type, remind_at, completed, completed_at, user_id")
                .eq("deal_id", dealId)
                .order("remind_at", { ascending: true });
            if (error) throw error;
            return (data ?? []) as Tarefa[];
        },
    });
    const ids = Array.from(new Set(tarefas.map((t) => t.user_id)));
    const { data: nomes = {} } = useQuery({
        queryKey: ["deal-tasks-people", ids.join(",")],
        enabled: ids.length > 0,
        queryFn: async () => {
            const { data } = await supabase.from("profiles").select("id, nome").in("id", ids);
            return Object.fromEntries((data ?? []).map((p) => [p.id, (p.nome || "").split(" ")[0]])) as Record<string, string>;
        },
    });
    const invalidar = () => {
        qc.invalidateQueries({ queryKey: ["deal-tasks", dealId] });
        qc.invalidateQueries({ queryKey: ["reminders"] });
        qc.invalidateQueries({ queryKey: ["reminders-upcoming"] });
    };
    const alternar = useMutation({
        mutationFn: async (t: Tarefa) => {
            const { error } = await (supabase as any).from("follow_up_reminders")
                .update({ completed: !t.completed, completed_at: t.completed ? null : new Date().toISOString() }).eq("id", t.id);
            if (error) throw error;
        },
        onSuccess: invalidar,
        onError: () => toast.error("Não deu para atualizar a tarefa"),
    });
    const excluir = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase as any).from("follow_up_reminders").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: invalidar,
        onError: () => toast.error("Não deu para excluir a tarefa"),
    });

    if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-4 w-4 animate-spin text-[var(--vyz-text-muted)]" aria-label="Carregando" /></div>;

    const novo = <button type="button" onClick={onNew} className={BOTAO}><Plus className="h-3.5 w-3.5" aria-hidden /> Nova tarefa</button>;
    if (tarefas.length === 0) {
        return <Vazio icon={CheckCircle2} titulo="Nenhuma tarefa neste card" texto="Crie uma tarefa com prazo. Ela aparece aqui e no sino de lembretes de quem for o responsável." acao={novo} />;
    }

    const abertas = tarefas.filter((t) => !t.completed);
    const feitas = tarefas.filter((t) => t.completed).sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
    const linha = (t: Tarefa) => {
        const Icon = TIPO_ICONE[t.task_type ?? "tarefa"] ?? CheckCircle2;
        const p = prazo(t.remind_at, t.completed);
        return (
            <li key={t.id} className={`${LINHA} group`}>
                <button
                    type="button"
                    onClick={() => alternar.mutate(t)}
                    aria-label={t.completed ? `Reabrir: ${t.title}` : `Concluir: ${t.title}`}
                    className="shrink-0 rounded-full text-[var(--vyz-text-muted)] hover:text-[var(--vyz-success)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)]"
                >
                    {t.completed ? <CheckCircle2 className="h-5 w-5 text-[var(--vyz-success)]" /> : <Circle className="h-5 w-5" />}
                </button>
                <div className="min-w-0 flex-1">
                    <p className={`flex items-center gap-1.5 text-[13.5px] font-medium leading-snug ${t.completed ? "text-[var(--vyz-text-muted)] line-through" : "text-[var(--vyz-text-primary)]"}`}>
                        <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--vyz-text-muted)]" aria-hidden />
                        <span className="truncate">{t.title}</span>
                    </p>
                    <p className="mt-0.5 text-[12px] text-[var(--vyz-text-muted)]">
                        <span className={p.tom}>{p.texto}</span>
                        {nomes[t.user_id] && <> · {nomes[t.user_id]}</>}
                        {t.description && <> · <span className="break-words">{t.description}</span></>}
                    </p>
                </div>
                <button type="button" onClick={() => excluir.mutate(t.id)} aria-label={`Excluir: ${t.title}`} className={`${GHOST} sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100`}>
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            </li>
        );
    };
    return (
        <div>
            <div className="flex items-center justify-between gap-3 px-4 sm:px-5 pt-4">
                <p className="text-[12.5px] text-[var(--vyz-text-muted)]">
                    {abertas.length === 0 ? "Tudo em dia." : `${abertas.length} ${abertas.length === 1 ? "aberta" : "abertas"}`}
                </p>
                {novo}
            </div>
            {abertas.length > 0 && <ul className="mt-2">{abertas.map(linha)}</ul>}
            {feitas.length > 0 && (
                <>
                    <p className={TITULO_GRUPO}>Concluídas</p>
                    <ul>{feitas.map(linha)}</ul>
                </>
            )}
        </div>
    );
}

// ─── Arquivos ───────────────────────────────────────────────────────────────

type ArquivoConversa = { id: string; tipo: string; nome: string; quando: string; doCliente: boolean; storagePath: string | null; mime: string | null };
type Anexo = { id: string; name: string; path: string; size: number | null; mime: string | null; created_at: string };

const MIDIA: Record<string, { icon: typeof Plus; nome: string }> = {
    image: { icon: ImageIcon, nome: "Foto" },
    audio: { icon: Mic, nome: "Áudio" },
    video: { icon: Film, nome: "Vídeo" },
    document: { icon: FileText, nome: "Documento" },
};

const tamanho = (b: number | null) => (!b ? "" : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1).replace(".", ",")} MB`);
const abrir = (url: string | null) => {
    if (!url) { toast.error("Não deu para abrir o arquivo"); return; }
    window.open(url, "_blank", "noopener,noreferrer");
};

export function DealFilesTab({ dealId, companyId, conversationHref, onOpenConversation }: {
    dealId: string;
    companyId: string | null;
    conversationHref: string | null;
    onOpenConversation: (href: string) => void;
}) {
    const qc = useQueryClient();
    const input = useRef<HTMLInputElement>(null);
    const [enviando, setEnviando] = useState(false);

    // Mídia que veio ou foi pelo WhatsApp nas conversas ligadas a este card.
    const { data: daConversa = [] } = useQuery({
        queryKey: ["deal-files-conversa", dealId],
        queryFn: async () => {
            const { data: convs } = await supabase.from("channel_conversations").select("id").eq("deal_id", dealId);
            const ids = (convs ?? []).map((c) => c.id);
            if (ids.length === 0) return [] as ArquivoConversa[];
            const { data } = await supabase.from("channel_messages")
                .select("id, message_type, direction, media_ref, message_timestamp")
                .in("conversation_id", ids)
                .in("message_type", ["document", "image", "audio", "video"])
                .order("message_timestamp", { ascending: false })
                .limit(60);
            return (data ?? []).map((m) => {
                const ref = (m.media_ref ?? {}) as Record<string, unknown>;
                return {
                    id: m.id,
                    tipo: m.message_type,
                    nome: (ref.file_name as string) || MIDIA[m.message_type]?.nome || "Arquivo",
                    quando: m.message_timestamp,
                    doCliente: m.direction !== "outbound",
                    storagePath: (ref.storage_path as string) || null,
                    mime: (ref.mimetype as string) || null,
                } as ArquivoConversa;
            });
        },
    });

    const { data: anexos = [] } = useQuery({
        queryKey: ["deal-files", dealId],
        queryFn: async () => {
            const { data, error } = await (supabase as any).from("deal_files")
                .select("id, name, path, size, mime, created_at").eq("deal_id", dealId).order("created_at", { ascending: false });
            if (error) throw error;
            return (data ?? []) as Anexo[];
        },
    });

    const anexar = async (files: FileList | null) => {
        if (!files?.length || !companyId) return;
        setEnviando(true);
        let ok = 0;
        for (const f of Array.from(files)) {
            if (f.size > 25 * 1024 * 1024) { toast.error(`${f.name} passa de 25 MB`); continue; }
            const seguro = f.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "-").slice(-80);
            const path = `${companyId}/${dealId}/${crypto.randomUUID()}-${seguro}`;
            const up = await supabase.storage.from("deal-files").upload(path, f, { contentType: f.type || undefined });
            if (up.error) { toast.error(`Não deu para enviar ${f.name}`); continue; }
            const { data: auth } = await supabase.auth.getUser();
            const { error } = await (supabase as any).from("deal_files").insert({
                deal_id: dealId, company_id: companyId, uploaded_by: auth.user?.id ?? null,
                name: f.name, path, size: f.size, mime: f.type || null,
            });
            if (error) { await supabase.storage.from("deal-files").remove([path]); toast.error(`Não deu para salvar ${f.name}`); continue; }
            ok++;
        }
        setEnviando(false);
        if (input.current) input.current.value = "";
        if (ok) { toast.success(ok === 1 ? "Arquivo anexado" : `${ok} arquivos anexados`); qc.invalidateQueries({ queryKey: ["deal-files", dealId] }); }
    };

    const remover = useMutation({
        mutationFn: async (a: Anexo) => {
            await supabase.storage.from("deal-files").remove([a.path]);
            const { error } = await (supabase as any).from("deal_files").delete().eq("id", a.id);
            if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["deal-files", dealId] }),
        onError: () => toast.error("Não deu para excluir o arquivo"),
    });

    const abrirAnexo = async (a: Anexo) => {
        const { data } = await supabase.storage.from("deal-files").createSignedUrl(a.path, 3600);
        abrir(data?.signedUrl ?? null);
    };
    const abrirDaConversa = async (f: ArquivoConversa) => {
        if (f.storagePath) { abrir(await getSignedWhatsAppMediaUrl(f.storagePath)); return; }
        if (conversationHref) onOpenConversation(conversationHref);
    };

    const botaoAnexar = (
        <button type="button" onClick={() => input.current?.click()} disabled={enviando || !companyId} className={BOTAO}>
            {enviando ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Paperclip className="h-3.5 w-3.5" aria-hidden />}
            {enviando ? "Enviando" : "Anexar arquivo"}
        </button>
    );

    return (
        <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); void anexar(e.dataTransfer.files); }}
        >
            <input ref={input} type="file" multiple className="hidden" onChange={(e) => { void anexar(e.target.files); }} />
            {daConversa.length === 0 && anexos.length === 0 ? (
                <Vazio icon={Paperclip} titulo="Nenhum arquivo ainda" texto="A proposta em PDF, as fotos e os áudios trocados pelo WhatsApp aparecem aqui sozinhos. Você também pode anexar ou arrastar um arquivo." acao={botaoAnexar} />
            ) : (
                <>
                    <div className="flex items-center justify-end sm:justify-between gap-3 px-4 sm:px-5 pt-4">
                        <p className="hidden sm:block text-[12.5px] text-[var(--vyz-text-muted)]">Arraste um arquivo para cá ou</p>
                        {botaoAnexar}
                    </div>
                    {anexos.length > 0 && (
                        <>
                            <p className={TITULO_GRUPO}>Anexados no card</p>
                            <ul>
                                {anexos.map((a) => (
                                    <li key={a.id} className={`${LINHA} group`}>
                                        <span className={ICONE}>{a.mime?.startsWith("image/") ? <ImageIcon className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}</span>
                                        <button type="button" onClick={() => { void abrirAnexo(a); }} className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:underline">
                                            <p className="truncate text-[13.5px] font-medium text-[var(--vyz-text-primary)]">{a.name}</p>
                                            <p className="text-[12px] text-[var(--vyz-text-muted)]">{[tamanho(a.size), format(new Date(a.created_at), "dd MMM", { locale: ptBR })].filter(Boolean).join(" · ")}</p>
                                        </button>
                                        <button type="button" onClick={() => remover.mutate(a)} aria-label={`Excluir ${a.name}`} className={`${GHOST} sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100`}><Trash2 className="h-3.5 w-3.5" /></button>
                                        <button type="button" onClick={() => { void abrirAnexo(a); }} aria-label={`Baixar ${a.name}`} className={GHOST}><Download className="h-3.5 w-3.5" /></button>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                    {daConversa.length > 0 && (
                        <>
                            <p className={TITULO_GRUPO}>Da conversa no WhatsApp</p>
                            <ul>
                                {daConversa.map((f) => {
                                    const Icon = MIDIA[f.tipo]?.icon ?? FileText;
                                    const podeAbrir = !!f.storagePath || !!conversationHref;
                                    return (
                                        <li key={f.id} className={LINHA}>
                                            <span className={ICONE}><Icon className="h-3.5 w-3.5" /></span>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-[13.5px] font-medium text-[var(--vyz-text-primary)]">{f.nome}</p>
                                                <p className="text-[12px] text-[var(--vyz-text-muted)]">
                                                    {f.doCliente ? "Do cliente" : "Seu"} · {format(new Date(f.quando), "dd MMM, HH:mm", { locale: ptBR })}
                                                </p>
                                            </div>
                                            {podeAbrir && (
                                                <button
                                                    type="button"
                                                    onClick={() => { void abrirDaConversa(f); }}
                                                    aria-label={f.storagePath ? `Abrir ${f.nome}` : `Ver ${f.nome} no Inbox`}
                                                    title={f.storagePath ? "Abrir" : "Ver no Inbox"}
                                                    className={GHOST}
                                                >
                                                    {f.storagePath ? <Download className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                                                </button>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
