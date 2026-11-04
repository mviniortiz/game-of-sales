// WebhooksLeads
// Admin UI para lead_webhooks: gera URL+secret pra cliente plugar no
// Meta Lead Ads (via Zapier/Make), Google Lead Form, typeform, etc.

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
    CheckCircle,
    CircleNotch,
    Code,
    Copy,
    Eye,
    EyeSlash,
    Plus,
    Tray,
    Trash,
    Warning,
    WebhooksLogo,
} from "@phosphor-icons/react";
import { formatError } from "@/lib/utils";

type SourceKind = "meta_lead_ads" | "google_lead_form" | "google_sheets" | "zapier" | "make" | "custom";

type LeadWebhook = {
    id: string;
    company_id: string;
    slug: string;
    secret: string;
    label: string;
    source_kind: SourceKind;
    field_mapping: { name: string[]; email: string[]; phone: string[] };
    default_product_id: string | null;
    default_owner_id: string | null;
    enabled: boolean;
    total_received: number;
    total_rejected: number;
    last_seen_at: string | null;
    last_error: string | null;
    created_at: string;
};

const SOURCE_META: Record<SourceKind, { label: string; hint: string }> = {
    meta_lead_ads: {
        label: "Meta Lead Ads",
        hint: "Via Zapier/Make: Instant Leads → Webhook",
    },
    google_lead_form: {
        label: "Google Lead Form",
        hint: "Via Zapier/Make conectado ao Google Ads",
    },
    google_sheets: {
        label: "Google Sheets",
        hint: "Apps Script onEdit envia cada linha nova em tempo real",
    },
    zapier: { label: "Zapier", hint: "Qualquer Zap que mande webhook" },
    make: { label: "Make (Integromat)", hint: "Qualquer cenário HTTP" },
    custom: { label: "Custom / API", hint: "Seu próprio integrador" },
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

// Aliases padrão que o backend já reconhece (pick_field). O usuário pode
// somar os nomes EXATOS das colunas dele por cima destes.
const DEFAULT_ALIASES: Record<"name" | "email" | "phone", string[]> = {
    name: ["full_name", "name", "nome", "customer_name", "lead_name"],
    email: ["email", "e-mail", "e_mail", "customer_email"],
    phone: ["phone", "phone_number", "telefone", "whatsapp", "celular", "customer_phone"],
};

// Junta os aliases padrão com as colunas que o usuário digitou (lowercase,
// sem duplicar), pra montar o field_mapping persistido no webhook.
function buildFieldMapping(custom: { name: string; email: string; phone: string }) {
    const parse = (raw: string) =>
        raw
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);
    const merge = (base: string[], extra: string[]) =>
        Array.from(new Set([...extra, ...base]));
    return {
        name: merge(DEFAULT_ALIASES.name, parse(custom.name)),
        email: merge(DEFAULT_ALIASES.email, parse(custom.email)),
        phone: merge(DEFAULT_ALIASES.phone, parse(custom.phone)),
    };
}

function makeSecret(len = 24) {
    const bytes = new Uint8Array(len);
    crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

function makeSlug(companyId: string) {
    const part = makeSecret(6).toLowerCase().replace(/[^a-z0-9]/g, "");
    return `${companyId.slice(0, 8)}-${part}`;
}

// Traduz o código técnico de last_error pra algo acionável pro usuário.
const ERROR_HINTS: Record<string, string> = {
    missing_contact_fields:
        "Os leads chegaram sem nome, e-mail nem telefone reconhecíveis. Confira o mapeamento de colunas: os nomes precisam bater com os do cabeçalho.",
    invalid_secret:
        "O secret enviado não confere. Confirme que o secret no Apps Script/integração é exatamente o desta tela.",
    disabled: "O webhook estava pausado quando o lead chegou. Ative-o acima.",
    no_owner_available:
        "Nenhum vendedor disponível pra receber o lead. Verifique se há um responsável padrão ou um admin na empresa.",
};

const fmtDateTime = (iso: string | null) => {
    if (!iso) return "nenhum ainda";
    return new Date(iso).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
};

// ═══════════════════════════════════════════════════════════════════════════
export default function WebhooksLeads() {
    const { companyId } = useAuth();
    const { activeCompanyId } = useTenant();
    const effectiveCompanyId = activeCompanyId || companyId;
    const queryClient = useQueryClient();

    const [searchParams, setSearchParams] = useSearchParams();
    const [formOpen, setFormOpen] = useState(false);
    const [initialSourceKind, setInitialSourceKind] = useState<SourceKind>("meta_lead_ads");
    const [deleteTarget, setDeleteTarget] = useState<LeadWebhook | null>(null);

    useEffect(() => {
        const create = searchParams.get("create");
        if (create && create in SOURCE_META) {
            setInitialSourceKind(create as SourceKind);
            setFormOpen(true);
            searchParams.delete("create");
            setSearchParams(searchParams, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    const { data: hooks, isLoading } = useQuery({
        queryKey: ["lead_webhooks_list", effectiveCompanyId],
        queryFn: async () => {
            if (!effectiveCompanyId) return [];
            const { data, error } = await supabase
                .from("lead_webhooks")
                .select("*")
                .eq("company_id", effectiveCompanyId)
                .order("created_at", { ascending: false });
            if (error) throw error;
            return (data ?? []) as unknown as LeadWebhook[];
        },
        enabled: !!effectiveCompanyId,
    });

    const refetch = () =>
        queryClient.invalidateQueries({ queryKey: ["lead_webhooks_list", effectiveCompanyId] });

    const onCreated = () => {
        setFormOpen(false);
        refetch();
    };

    const onDelete = async () => {
        if (!deleteTarget) return;
        const { error } = await supabase
            .from("lead_webhooks")
            .delete()
            .eq("id", deleteTarget.id);
        if (error) {
            toast.error(`Erro ao excluir: ${formatError(error)}`);
            return;
        }
        toast.success("Webhook excluído");
        setDeleteTarget(null);
        refetch();
    };

    const onToggleEnabled = async (h: LeadWebhook, enabled: boolean) => {
        const { error } = await supabase
            .from("lead_webhooks")
            .update({ enabled })
            .eq("id", h.id);
        if (error) {
            toast.error(`Erro: ${formatError(error)}`);
            return;
        }
        toast.success(enabled ? "Webhook ativado" : "Webhook desativado");
        refetch();
    };

    return (
        <div className="vp-pilha">
            <section className="vp-cartao vp-cartao__cab" aria-labelledby="wh-titulo">
                <div className="min-w-0 max-w-xl">
                    <h2 id="wh-titulo" className="vp-rotulo">Webhooks de entrada</h2>
                    <p className="vp-sub">
                        Receba leads automaticamente do Meta Lead Ads (via Zapier/Make),
                        typeform ou qualquer sistema que consiga mandar webhook. Cada lead
                        entra direto no pipeline como deal em estágio Lead.
                    </p>
                </div>
                <button type="button" className="vp-botao" onClick={() => setFormOpen(true)}>
                    <Plus size={16} weight="bold" aria-hidden />
                    Novo webhook
                </button>
            </section>

            {isLoading ? (
                <div className="vp-vazio" aria-busy="true">
                    <div className="flex items-center justify-center py-10">
                        <CircleNotch size={20} className="animate-spin motion-reduce:animate-none" aria-hidden />
                        <span className="sr-only">Carregando os webhooks</span>
                    </div>
                </div>
            ) : !hooks || hooks.length === 0 ? (
                <EmptyState onCreate={() => setFormOpen(true)} />
            ) : (
                <div className="vp-pilha">
                    {hooks.map((h) => (
                        <WebhookRow
                            key={h.id}
                            hook={h}
                            onToggle={(enabled) => onToggleEnabled(h, enabled)}
                            onDelete={() => setDeleteTarget(h)}
                        />
                    ))}
                </div>
            )}

            {formOpen && effectiveCompanyId && (
                <CreateDialog
                    companyId={effectiveCompanyId}
                    initialSourceKind={initialSourceKind}
                    onClose={() => setFormOpen(false)}
                    onCreated={onCreated}
                />
            )}

            <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
                <AlertDialogContent className="vp-dialogo border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] text-[var(--vyz-text-primary)] sm:rounded-[18px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-[var(--vyz-text-primary)]">Excluir esse webhook?</AlertDialogTitle>
                        <AlertDialogDescription className="text-[var(--vyz-text-muted)]">
                            A URL vai parar de funcionar na hora. Qualquer integração externa
                            apontada pra essa URL vai começar a falhar.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="mt-0 rounded-full border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] font-semibold text-[var(--vyz-text-primary)] hover:bg-[var(--vyz-bg)] hover:text-[var(--vyz-text-primary)] focus-visible:ring-[var(--vyz-accent)]">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={onDelete} className="rounded-full bg-[var(--vyz-danger)] font-semibold text-white hover:bg-[var(--vyz-danger)] hover:opacity-90 focus-visible:ring-[var(--vyz-accent)]">
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
function EmptyState({ onCreate }: { onCreate: () => void }) {
    return (
        <section className="vp-cartao" aria-labelledby="wh-vazio">
            <div className="py-6 text-center">
                <WebhooksLogo size={28} className="mx-auto mb-3 text-[var(--vyz-text-muted)]" aria-hidden />
                <h2 id="wh-vazio" className="vp-rotulo">Nenhum webhook configurado</h2>
                <p className="vp-campo__ajuda mx-auto mb-5 mt-1 max-w-sm">
                    Crie um webhook de entrada pra receber leads do Meta Lead Ads, Zapier, Make
                    ou seu próprio integrador.
                </p>
                <button type="button" className="vp-botao" onClick={onCreate}>
                    <Plus size={16} weight="bold" aria-hidden />
                    Criar primeiro webhook
                </button>
            </div>
        </section>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
function buildAppsScript(url: string, secret: string) {
    return `// Vyzon · Google Sheets → Pipeline em tempo real
//
// PASSO ÚNICO: com este código colado, rode a função "vyzonInstalar"
// uma vez (menu ▶ Executar → vyzonInstalar) e autorize quando pedir.
// Pronto: cada linha nova cai no pipeline em ~2s.
//
// Por que "vyzonInstalar"? O gatilho simples onEdit do Google é bloqueado
// de chamar a internet (UrlFetchApp). Esta função instala um gatilho
// AUTORIZADO, que pode enviar o lead pra Vyzon.

const VYZON_URL = '${url}';
const VYZON_SECRET = '${secret}';

// ▶ Rode UMA vez pra ativar (e autorize o acesso).
function vyzonInstalar() {
  const ss = SpreadsheetApp.getActive();
  // remove gatilhos Vyzon antigos pra não duplicar
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'vyzonOnEdit') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('vyzonOnEdit')
    .forSpreadsheet(ss)
    .onEdit()
    .create();
  SpreadsheetApp.getActive().toast('Vyzon conectado! Novas linhas vão pro pipeline.', 'Vyzon', 5);
}

// Disparado a cada edição (gatilho instalado, autorizado).
function vyzonOnEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  const row = e.range.getRow();
  if (row <= 1) return; // ignora cabeçalho

  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) return;
  const headers = sheet.getRange(1, 1, 1, lastCol)
    .getValues()[0].map(function (h) { return String(h).trim().toLowerCase(); });
  const values = sheet.getRange(row, 1, 1, headers.length).getValues()[0];

  const payload = {};
  headers.forEach(function (h, i) { if (h) payload[h] = values[i]; });
  if (!Object.keys(payload).length) return;
  payload._sheet = sheet.getName();
  payload._row = row;

  const res = UrlFetchApp.fetch(VYZON_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-webhook-secret': VYZON_SECRET },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  // Falhas ficam visíveis em "Execuções" do Apps Script (não silenciadas).
  if (res.getResponseCode() >= 300) {
    console.error('Vyzon ' + res.getResponseCode() + ': ' + res.getContentText());
  }
}`;
}

// Traduz os erros crus do lead-webhook pra algo acionável (mata o "erro escondido
// no log do Apps Script"). Surfaçado direto no card.
function friendlyLeadError(e: string | null): string | null {
    if (!e) return null;
    const s = e.toLowerCase();
    if (s.includes("contact") || s.includes("missing")) return "faltou nome, e-mail ou telefone. Confira os nomes das colunas da planilha";
    if (s.includes("secret")) return "secret inválido. Confira o que foi colado no Apps Script";
    if (s.includes("slug") || s.includes("not_found") || s.includes("404")) return "webhook não encontrado. Recrie e cole o novo código";
    return e;
}

function relShort(iso: string | null): string {
    if (!iso) return "";
    const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (min < 1) return "agora";
    if (min < 60) return `há ${min}min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `há ${h}h`;
    return `há ${Math.floor(h / 24)}d`;
}

function WebhookRow({
    hook,
    onToggle,
    onDelete,
}: {
    hook: LeadWebhook;
    onToggle: (enabled: boolean) => void;
    onDelete: () => void;
}) {
    const [showSecret, setShowSecret] = useState(false);
    const [showScript, setShowScript] = useState(false);
    const [testing, setTesting] = useState(false);
    const url = `${SUPABASE_URL}/functions/v1/lead-webhook/${hook.slug}`;
    const meta = SOURCE_META[hook.source_kind];
    const isSheets = hook.source_kind === "google_sheets";

    const copy = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(`${label} copiado`);
        } catch {
            toast.error("Não foi possível copiar");
        }
    };

    // Envia um lead de teste (modo __vyzon_test): valida secret + mapeamento SEM
    // criar deal. Mostra o resultado na hora (acaba o "será que conectou?").
    const sendTest = async () => {
        setTesting(true);
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-webhook-secret": hook.secret },
                body: JSON.stringify({ __vyzon_test: true, nome: "Lead de Teste", email: "teste@vyzon.com.br", telefone: "11999999999" }),
            });
            if (res.status === 401) {
                toast.error("Secret inválido. Confira o que está colado no Apps Script.");
            } else if (res.ok) {
                toast.success("Conexão ok! Secret válido e o webhook está recebendo.");
            } else {
                toast.error("O webhook respondeu com erro. Tente recriar.");
            }
        } catch {
            toast.error("Não consegui alcançar o webhook.");
        } finally {
            setTesting(false);
        }
    };

    return (
        <section className="vp-cartao" aria-label={hook.label}>
            <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-[15px] font-semibold text-[var(--vyz-text-primary)]">{hook.label}</h3>
                        <span className="vp-chip" data-tom={hook.enabled ? "ok" : undefined}>
                            {hook.enabled ? "Ativo" : "Pausado"}
                        </span>
                        <span className="text-[13px] text-[var(--vyz-text-muted)]">{meta.label}</span>
                    </div>

                    <div className="mt-3 space-y-2">
                        <FieldRow label="URL" value={url} onCopy={() => copy(url, "URL")} />
                        <FieldRow
                            label="Secret"
                            value={showSecret ? hook.secret : "•".repeat(Math.min(24, hook.secret.length))}
                            onCopy={() => copy(hook.secret, "Secret")}
                            rightSlot={
                                <button
                                    type="button"
                                    className="vp-icone vp-icone--chico"
                                    onClick={() => setShowSecret((s) => !s)}
                                    aria-label={showSecret ? "Esconder secret" : "Mostrar secret"}
                                    aria-pressed={showSecret}
                                >
                                    {showSecret ? <EyeSlash size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                                </button>
                            }
                        />
                    </div>

                    {/* Saúde do webhook: surfaça recebidos/rejeitados/último erro
                        (antes só ficava escondido no log do Apps Script). */}
                    {(hook.total_received > 0 || hook.total_rejected > 0 || hook.last_error) && (
                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                            <span className="text-[var(--vyz-text-muted)]">
                                {hook.total_received} recebido{hook.total_received === 1 ? "" : "s"}
                                {hook.last_seen_at ? ` · último ${relShort(hook.last_seen_at)}` : ""}
                            </span>
                            {hook.total_rejected > 0 && (
                                <span className="font-medium text-[var(--vyz-warning)]">
                                    {hook.total_rejected} rejeitado{hook.total_rejected === 1 ? "" : "s"}
                                </span>
                            )}
                            {hook.last_error && (
                                <span className="text-[var(--vyz-danger)]">Último erro: {friendlyLeadError(hook.last_error)}</span>
                            )}
                        </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" className="vp-botao vp-botao--quieto" onClick={sendTest} disabled={testing}>
                            {testing && <CircleNotch size={16} className="animate-spin motion-reduce:animate-none" aria-hidden />}
                            {testing ? "Testando" : "Enviar lead de teste"}
                        </button>
                        {isSheets && (
                            <button
                                type="button"
                                className="vp-botao vp-botao--quieto"
                                onClick={() => setShowScript((s) => !s)}
                                aria-expanded={showScript}
                            >
                                <Code size={16} aria-hidden />
                                {showScript ? "Ocultar Apps Script" : "Ver Apps Script pronto"}
                            </button>
                        )}
                    </div>

                    {isSheets && showScript && (
                        <div className="mt-3 overflow-hidden rounded-[12px] border border-[var(--vyz-border)] bg-[var(--vyz-bg)]">
                            <div className="flex items-center justify-between gap-2 border-b border-[var(--vyz-border)] px-3 py-1.5">
                                <span className="text-[12px] font-medium text-[var(--vyz-text-muted)]">
                                    Cole em Extensões → Apps Script
                                </span>
                                <button
                                    type="button"
                                    className="vp-botao vp-botao--quieto vp-botao--chico"
                                    onClick={() => copy(buildAppsScript(url, hook.secret), "Apps Script")}
                                >
                                    <Copy size={14} aria-hidden />
                                    Copiar
                                </button>
                            </div>
                            <pre className="max-h-64 overflow-x-auto p-3 font-mono text-[12px] leading-relaxed text-[var(--vyz-text-primary)]">
                                {buildAppsScript(url, hook.secret)}
                            </pre>
                        </div>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px] text-[var(--vyz-text-muted)]">
                        <span className="inline-flex items-center gap-1">
                            <Tray size={14} aria-hidden />
                            {hook.total_received} recebidos
                        </span>
                        {hook.total_rejected > 0 && (
                            <>
                                <span aria-hidden>·</span>
                                <span className="inline-flex items-center gap-1 text-[var(--vyz-warning)]">
                                    <Warning size={14} aria-hidden />
                                    {hook.total_rejected} rejeitados
                                </span>
                            </>
                        )}
                        <span aria-hidden>·</span>
                        <span>Último lead: {fmtDateTime(hook.last_seen_at)}</span>
                    </div>

                    {hook.last_error && (
                        <div className="mt-3 flex items-start gap-2 rounded-[12px] bg-[var(--vyz-danger-bg)] px-3 py-2.5">
                            <Warning size={16} className="mt-0.5 shrink-0 text-[var(--vyz-danger)]" aria-hidden />
                            <div className="min-w-0">
                                <p className="text-[13px] font-medium text-[var(--vyz-danger)]">
                                    {ERROR_HINTS[hook.last_error]
                                        ? "Último envio foi rejeitado"
                                        : "Último erro"}
                                </p>
                                <p className="mt-0.5 text-[13px] leading-snug text-[var(--vyz-text)]">
                                    {ERROR_HINTS[hook.last_error] ?? hook.last_error}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <Switch
                        checked={hook.enabled}
                        onCheckedChange={onToggle}
                        aria-label={hook.enabled ? `Pausar ${hook.label}` : `Ativar ${hook.label}`}
                        className="data-[state=checked]:bg-[var(--vyz-accent)] data-[state=unchecked]:bg-[var(--vyz-surface-3)]"
                    />
                    <button type="button" className="vp-icone vp-icone--perigo" onClick={onDelete} aria-label={`Excluir ${hook.label}`} title="Excluir">
                        <Trash size={18} aria-hidden />
                    </button>
                </div>
            </div>
        </section>
    );
}

function FieldRow({
    label,
    value,
    onCopy,
    rightSlot,
}: {
    label: string;
    value: string;
    onCopy: () => void;
    rightSlot?: React.ReactNode;
}) {
    return (
        <div className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-[12px] font-semibold text-[var(--vyz-text-muted)]">
                {label}
            </span>
            <code className="min-w-0 flex-1 truncate rounded-[8px] bg-[var(--vyz-bg)] px-2 py-1.5 font-mono text-[12px] text-[var(--vyz-text-primary)]">
                {value}
            </code>
            <button type="button" className="vp-icone vp-icone--chico" onClick={onCopy} aria-label={`Copiar ${label}`} title={`Copiar ${label}`}>
                <Copy size={16} aria-hidden />
            </button>
            {rightSlot}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
function CreateDialog({
    companyId,
    initialSourceKind = "meta_lead_ads",
    onClose,
    onCreated,
}: {
    companyId: string;
    initialSourceKind?: SourceKind;
    onClose: () => void;
    onCreated: () => void;
}) {
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [label, setLabel] = useState("");
    const [sourceKind, setSourceKind] = useState<SourceKind>(initialSourceKind);
    const [defaultProductId, setDefaultProductId] = useState<string>("none");
    const [colName, setColName] = useState("");
    const [colEmail, setColEmail] = useState("");
    const [colPhone, setColPhone] = useState("");

    const { data: produtos } = useQuery({
        queryKey: ["produtos_for_webhook", companyId],
        queryFn: async () => {
            const { data } = await supabase
                .from("produtos")
                .select("id, nome")
                .eq("company_id", companyId)
                .eq("ativo", true);
            return data ?? [];
        },
        enabled: !!companyId,
    });

    useEffect(() => {
        if (!label) setLabel(SOURCE_META[sourceKind].label);
    }, [sourceKind]); // eslint-disable-line

    const onSubmit = async () => {
        if (!label.trim()) {
            toast.error("Dê um nome pro webhook");
            return;
        }
        setSaving(true);
        const payload = {
            company_id: companyId,
            slug: makeSlug(companyId),
            secret: makeSecret(),
            label: label.trim(),
            source_kind: sourceKind,
            field_mapping: buildFieldMapping({
                name: colName,
                email: colEmail,
                phone: colPhone,
            }),
            default_product_id: defaultProductId === "none" ? null : defaultProductId,
            default_owner_id: user?.id ?? null,
            enabled: true,
            created_by: user?.id ?? null,
        };
        const { error } = await supabase.from("lead_webhooks").insert(payload);
        setSaving(false);
        if (error) {
            toast.error(`Erro ao criar: ${formatError(error)}`);
            return;
        }
        toast.success("Webhook criado. Copie a URL e o secret pra usar na integração.");
        onCreated();
    };

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="vp-dialogo border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] text-[var(--vyz-text-primary)] sm:rounded-[18px] sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-[var(--vyz-text-primary)]">Novo webhook de leads</DialogTitle>
                    <DialogDescription className="text-[var(--vyz-text-muted)]">
                        Gere uma URL única com secret. Use no Zapier/Make ou qualquer integrador
                        que mande webhook.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-2">
                    <div className="vp-campo">
                        <span className="vp-rotulo" id="wh-origem">Origem</span>
                        <Select
                            value={sourceKind}
                            onValueChange={(v) => setSourceKind(v as SourceKind)}
                        >
                            <SelectTrigger aria-labelledby="wh-origem">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(Object.keys(SOURCE_META) as SourceKind[]).map((k) => (
                                    <SelectItem key={k} value={k}>
                                        {SOURCE_META[k].label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="vp-campo__ajuda">{SOURCE_META[sourceKind].hint}</p>
                    </div>

                    <label className="vp-campo">
                        <span className="vp-rotulo">Nome</span>
                        <input
                            id="wh-label"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="Ex.: Campanha Meta Abril 2026"
                        />
                    </label>

                    {produtos && produtos.length > 0 && (
                        <div className="vp-campo">
                            <span className="vp-rotulo" id="wh-produto">Produto padrão (opcional)</span>
                            <Select value={defaultProductId} onValueChange={setDefaultProductId}>
                                <SelectTrigger aria-labelledby="wh-produto">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Nenhum</SelectItem>
                                    {produtos.map((p: { id: string; nome: string }) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.nome}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="vp-campo__ajuda">Todo lead desse webhook entra já vinculado a esse produto.</p>
                        </div>
                    )}

                    <fieldset className="mb-3 rounded-[12px] bg-[var(--vyz-bg)] p-3">
                        <legend className="sr-only">Mapeamento de colunas</legend>
                        <p className="vp-rotulo">
                            Mapeamento de colunas{" "}
                            <span className="font-normal text-[var(--vyz-text-muted)]">(opcional)</span>
                        </p>
                        <p className="vp-campo__ajuda mb-3 mt-0.5 leading-snug">
                            {sourceKind === "google_sheets"
                                ? "Já reconhecemos colunas como Nome, Nome completo, Cliente, E-mail, Telefone, WhatsApp, Celular, Tel e Fone. Só preencha abaixo se sua planilha usar OUTROS nomes."
                                : "Nomes dos campos no payload da integração, se forem diferentes dos padrões. Separe por vírgula."}
                        </p>
                        <div className="grid grid-cols-1 gap-x-2 sm:grid-cols-3">
                            <label className="vp-campo vp-campo--junto">
                                <span className="text-[13px] text-[var(--vyz-text-muted)]">Coluna de nome</span>
                                <input
                                    id="map-name"
                                    value={colName}
                                    onChange={(e) => setColName(e.target.value)}
                                    placeholder="Nome completo"
                                />
                            </label>
                            <label className="vp-campo vp-campo--junto">
                                <span className="text-[13px] text-[var(--vyz-text-muted)]">Coluna de e-mail</span>
                                <input
                                    id="map-email"
                                    value={colEmail}
                                    onChange={(e) => setColEmail(e.target.value)}
                                    placeholder="E-mail"
                                />
                            </label>
                            <label className="vp-campo vp-campo--junto">
                                <span className="text-[13px] text-[var(--vyz-text-muted)]">Coluna de telefone</span>
                                <input
                                    id="map-phone"
                                    value={colPhone}
                                    onChange={(e) => setColPhone(e.target.value)}
                                    placeholder="WhatsApp"
                                />
                            </label>
                        </div>
                    </fieldset>

                    {sourceKind === "google_sheets" ? (
                        <div className="space-y-2 rounded-[12px] bg-[var(--vyz-success-bg)] p-3 text-[13px] text-[var(--vyz-text)]">
                            <p className="flex items-center gap-1.5 font-medium text-[var(--vyz-success)]">
                                <CheckCircle size={16} weight="fill" aria-hidden />
                                Como funciona (Google Sheets → Vyzon em tempo real)
                            </p>
                            <ol className="ml-1 list-inside list-decimal space-y-1">
                                <li>Crie o webhook (você recebe URL + secret).</li>
                                <li>
                                    No Sheets: <span className="font-mono">Extensões → Apps Script</span>,
                                    cole o código que aparece após criar e salve.
                                </li>
                                <li>
                                    Rode a função{" "}
                                    <code className="font-mono">vyzonInstalar</code> uma vez
                                    (botão ▶ Executar).{" "}
                                    <span className="font-medium text-[var(--vyz-warning)]">Na 1ª vez o Google pede permissão, é normal, clique em Permitir.</span>
                                </li>
                                <li>
                                    A 1ª linha da planilha é o cabeçalho; os leads vêm da linha 2
                                    em diante. Colunas como{" "}
                                    <code className="font-mono">Nome</code>,{" "}
                                    <code className="font-mono">E-mail</code>,{" "}
                                    <code className="font-mono">Telefone</code> e{" "}
                                    <code className="font-mono">WhatsApp</code> são reconhecidas
                                    sozinhas (mapeie acima só se usar outros nomes).
                                </li>
                                <li>Depois disso, cada linha nova cai no pipeline em ~2s.</li>
                            </ol>
                            <p className="pt-1 text-[13px] text-[var(--vyz-text-muted)]">
                                O snippet completo aparece com a URL e o secret já preenchidos
                                assim que o webhook for criado.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1 rounded-[12px] bg-[var(--vyz-success-bg)] p-3 text-[13px] text-[var(--vyz-text)]">
                            <p className="flex items-center gap-1.5 font-medium text-[var(--vyz-success)]">
                                <CheckCircle size={16} weight="fill" aria-hidden />
                                Como funciona
                            </p>
                            <p>
                                Ao criar, você recebe URL + secret. Configure no Zapier (ou Make)
                                apontando a ação HTTP Webhook pra essa URL, passando o secret no
                                header <code className="font-mono">x-webhook-secret</code> ou query{" "}
                                <code className="font-mono">?secret=</code>.
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <button type="button" className="vp-botao vp-botao--quieto" onClick={onClose} disabled={saving}>
                        Cancelar
                    </button>
                    <button type="button" className="vp-botao" onClick={onSubmit} disabled={saving}>
                        {saving && <CircleNotch size={16} className="animate-spin motion-reduce:animate-none" aria-hidden />}
                        Criar webhook
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
