// WebhooksLeads
// Admin UI para lead_webhooks: gera URL+secret pra cliente plugar no
// Meta Lead Ads (via Zapier/Make), Google Lead Form, typeform, etc.

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
    AlertTriangle,
    CheckCircle2,
    Code2,
    Copy,
    Eye,
    EyeOff,
    Inbox,
    Loader2,
    Plus,
    Trash2,
    Webhook,
} from "lucide-react";
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

const fmtDateTime = (iso: string | null) => {
    if (!iso) return "—";
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
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <p className="text-sm text-muted-foreground max-w-xl">
                        Receba leads automaticamente do Meta Lead Ads (via Zapier/Make),
                        typeform ou qualquer sistema que consiga mandar webhook. Cada lead
                        entra direto no pipeline como deal em estágio Lead.
                    </p>
                </div>
                <Button onClick={() => setFormOpen(true)} className="flex-shrink-0">
                    <Plus className="h-4 w-4 mr-1.5" />
                    Novo webhook
                </Button>
            </header>

            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
            ) : !hooks || hooks.length === 0 ? (
                <EmptyState onCreate={() => setFormOpen(true)} />
            ) : (
                <div className="space-y-3">
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
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir esse webhook?</AlertDialogTitle>
                        <AlertDialogDescription>
                            A URL vai parar de funcionar na hora. Qualquer integração externa
                            apontada pra essa URL vai começar a falhar.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={onDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
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
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20 mx-auto flex items-center justify-center mb-4">
                <Webhook className="h-5 w-5 text-emerald-400" />
            </div>
            <h3 className="text-base font-semibold mb-1">Nenhum webhook configurado</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-5">
                Crie um webhook de entrada pra receber leads do Meta Lead Ads, Zapier, Make
                ou seu próprio integrador.
            </p>
            <Button onClick={onCreate}>
                <Plus className="h-4 w-4 mr-1.5" />
                Criar primeiro webhook
            </Button>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
function buildAppsScript(url: string, secret: string) {
    return `// Vyzon · Google Sheets → Pipeline em tempo real
// Cabeçalhos obrigatórios na linha 1: name, email, phone

const VYZON_URL = '${url}';
const VYZON_SECRET = '${secret}';

function onEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  const row = e.range.getRow();
  if (row <= 1) return; // ignora cabeçalho

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0].map(h => String(h).trim().toLowerCase());
  const values = sheet.getRange(row, 1, 1, headers.length).getValues()[0];

  const payload = {};
  headers.forEach((h, i) => { if (h) payload[h] = values[i]; });
  payload._sheet = sheet.getName();
  payload._row = row;

  UrlFetchApp.fetch(VYZON_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-webhook-secret': VYZON_SECRET },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
}`;
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

    return (
        <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted flex-shrink-0 flex items-center justify-center ring-1 ring-border">
                    <Webhook className="h-4 w-4 text-muted-foreground" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold truncate">{hook.label}</h3>
                        <span
                            className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ring-1 tracking-wider uppercase ${
                                hook.enabled
                                    ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
                                    : "bg-muted text-muted-foreground ring-border"
                            }`}
                        >
                            {hook.enabled ? "Ativo" : "Pausado"}
                        </span>
                        <span className="text-xs text-muted-foreground">· {meta.label}</span>
                    </div>

                    <div className="mt-3 space-y-2">
                        <FieldRow label="URL" value={url} onCopy={() => copy(url, "URL")} />
                        <FieldRow
                            label="Secret"
                            value={showSecret ? hook.secret : "•".repeat(Math.min(24, hook.secret.length))}
                            onCopy={() => copy(hook.secret, "Secret")}
                            rightSlot={
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setShowSecret((s) => !s)}
                                    className="h-7 px-2"
                                >
                                    {showSecret ? (
                                        <EyeOff className="h-3.5 w-3.5" />
                                    ) : (
                                        <Eye className="h-3.5 w-3.5" />
                                    )}
                                </Button>
                            }
                        />
                    </div>

                    {isSheets && (
                        <div className="mt-3">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowScript((s) => !s)}
                                className="h-7 px-2 text-xs gap-1.5"
                            >
                                <Code2 className="h-3.5 w-3.5" />
                                {showScript ? "Ocultar Apps Script" : "Ver Apps Script pronto"}
                            </Button>
                            {showScript && (
                                <div className="mt-2 rounded-md border border-border bg-muted/40 overflow-hidden">
                                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/60">
                                        <span className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">
                                            Cole em Extensões → Apps Script
                                        </span>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() =>
                                                copy(buildAppsScript(url, hook.secret), "Apps Script")
                                            }
                                            className="h-6 px-2 text-xs"
                                        >
                                            <Copy className="h-3 w-3 mr-1" />
                                            Copiar
                                        </Button>
                                    </div>
                                    <pre className="text-[11px] font-mono p-3 overflow-x-auto leading-relaxed max-h-64">
                                        {buildAppsScript(url, hook.secret)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-3 flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                            <Inbox className="h-3 w-3" />
                            {hook.total_received} recebidos
                        </span>
                        {hook.total_rejected > 0 && (
                            <>
                                <span>·</span>
                                <span className="inline-flex items-center gap-1 text-amber-400">
                                    <AlertTriangle className="h-3 w-3" />
                                    {hook.total_rejected} rejeitados
                                </span>
                            </>
                        )}
                        <span>·</span>
                        <span>Último lead: {fmtDateTime(hook.last_seen_at)}</span>
                        {hook.last_error && (
                            <>
                                <span>·</span>
                                <span className="text-destructive font-mono">
                                    {hook.last_error}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex-shrink-0 flex items-center gap-2">
                    <Switch checked={hook.enabled} onCheckedChange={onToggle} />
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={onDelete}
                        className="h-8 px-2 text-destructive hover:text-destructive"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
        </div>
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
            <span className="text-[10px] font-mono font-semibold text-muted-foreground w-14 uppercase tracking-wider">
                {label}
            </span>
            <code className="flex-1 text-[11px] font-mono bg-muted px-2 py-1 rounded truncate">
                {value}
            </code>
            <Button size="sm" variant="ghost" onClick={onCopy} className="h-7 px-2">
                <Copy className="h-3.5 w-3.5" />
            </Button>
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
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Novo webhook de leads</DialogTitle>
                    <DialogDescription>
                        Gere uma URL única com secret. Use no Zapier/Make ou qualquer integrador
                        que mande webhook.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <Label>Origem</Label>
                        <Select
                            value={sourceKind}
                            onValueChange={(v) => setSourceKind(v as SourceKind)}
                        >
                            <SelectTrigger>
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
                        <p className="text-xs text-muted-foreground">
                            {SOURCE_META[sourceKind].hint}
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="wh-label">Nome</Label>
                        <Input
                            id="wh-label"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="Ex.: Campanha Meta Abril 2026"
                        />
                    </div>

                    {produtos && produtos.length > 0 && (
                        <div className="space-y-1.5">
                            <Label>Produto padrão (opcional)</Label>
                            <Select value={defaultProductId} onValueChange={setDefaultProductId}>
                                <SelectTrigger>
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
                            <p className="text-xs text-muted-foreground">
                                Todo lead desse webhook entra já vinculado a esse produto.
                            </p>
                        </div>
                    )}

                    {sourceKind === "google_sheets" ? (
                        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-muted-foreground space-y-2">
                            <p className="flex items-center gap-1.5 text-emerald-400 font-medium">
                                <CheckCircle2 className="h-3 w-3" />
                                Como funciona (Google Sheets → Vyzon em tempo real)
                            </p>
                            <ol className="list-decimal list-inside space-y-1 ml-1">
                                <li>Crie o webhook (você recebe URL + secret).</li>
                                <li>
                                    No Sheets: <span className="font-mono">Extensões → Apps Script</span>,
                                    cole o código abaixo e salve.
                                </li>
                                <li>
                                    Cabeçalho da planilha obrigatório:{" "}
                                    <code className="font-mono">name</code>,{" "}
                                    <code className="font-mono">email</code>,{" "}
                                    <code className="font-mono">phone</code>.
                                </li>
                                <li>
                                    Na primeira execução o Apps Script pede permissão. Depois, cada
                                    linha nova cai no pipeline em ~2s.
                                </li>
                            </ol>
                            <p className="text-[11px] text-muted-foreground/80 pt-1">
                                O snippet completo aparece com a URL e o secret já preenchidos
                                assim que o webhook for criado.
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-muted-foreground space-y-1">
                            <p className="flex items-center gap-1.5 text-emerald-400 font-medium">
                                <CheckCircle2 className="h-3 w-3" />
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

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={saving}>
                        Cancelar
                    </Button>
                    <Button onClick={onSubmit} disabled={saving}>
                        {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                        Criar webhook
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
