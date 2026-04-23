// RelatoriosPublicos
// Admin UI pra gerenciar links públicos white-label (tabela public_reports).
// Cria/lista/revoga tokens. A página pública vive em /r/:token (ver App.tsx)
// e o dado vem da edge function `public-report` (ver supabase/functions).

import { useEffect, useMemo, useState } from "react";
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
    Copy,
    ExternalLink,
    Eye,
    Link2,
    Loader2,
    Plus,
    ShieldOff,
    Trash2,
} from "lucide-react";
import { formatError } from "@/lib/utils";

type EnabledMetrics = {
    pipeline_summary: boolean;
    core_metrics: boolean;
    forecast: boolean;
    cpl_by_campaign: boolean;
    funnel_by_origin: boolean;
};

type PublicReportRow = {
    id: string;
    share_token: string;
    title: string;
    client_name: string | null;
    logo_url: string | null;
    enabled_metrics: EnabledMetrics;
    period_days: number;
    expires_at: string | null;
    revoked_at: string | null;
    view_count: number;
    last_viewed_at: string | null;
    created_at: string;
};

const DEFAULT_METRICS: EnabledMetrics = {
    pipeline_summary: true,
    core_metrics: true,
    forecast: true,
    cpl_by_campaign: true,
    funnel_by_origin: true,
};

const METRIC_LABELS: Record<keyof EnabledMetrics, string> = {
    pipeline_summary: "Pipeline por estágio",
    core_metrics: "Métricas core (deals, win rate, receita)",
    forecast: "Forecast ponderado",
    cpl_by_campaign: "CPL por campanha",
    funnel_by_origin: "Funil por origem",
};

const PERIOD_OPTIONS = [7, 14, 30, 60, 90, 180, 365];

// Token gerado no client: URL-safe, 32 chars (alinhado ao regex da edge function)
function generateToken() {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

const fmtDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

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
export default function RelatoriosPublicos() {
    const { companyId } = useAuth();
    const { activeCompanyId } = useTenant();
    const effectiveCompanyId = activeCompanyId || companyId;

    const [loading, setLoading] = useState(true);
    const [reports, setReports] = useState<PublicReportRow[]>([]);
    const [createOpen, setCreateOpen] = useState(false);
    const [revokeTarget, setRevokeTarget] = useState<PublicReportRow | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<PublicReportRow | null>(null);

    useEffect(() => {
        if (effectiveCompanyId) load();
    }, [effectiveCompanyId]);

    const load = async () => {
        if (!effectiveCompanyId) return;
        setLoading(true);
        const { data, error } = await supabase
            .from("public_reports")
            .select(
                "id, share_token, title, client_name, logo_url, enabled_metrics, period_days, expires_at, revoked_at, view_count, last_viewed_at, created_at"
            )
            .eq("company_id", effectiveCompanyId)
            .order("created_at", { ascending: false });
        if (error) {
            toast.error(`Erro ao carregar: ${formatError(error)}`);
            setLoading(false);
            return;
        }
        setReports((data as unknown as PublicReportRow[]) ?? []);
        setLoading(false);
    };

    const onCreated = (row: PublicReportRow) => {
        setReports((prev) => [row, ...prev]);
        setCreateOpen(false);
        const url = `${window.location.origin}/r/${row.share_token}`;
        navigator.clipboard.writeText(url).catch(() => {});
        toast.success("Relatório criado. Link copiado.");
    };

    const onRevoke = async () => {
        if (!revokeTarget) return;
        const { error } = await supabase
            .from("public_reports")
            .update({ revoked_at: new Date().toISOString() })
            .eq("id", revokeTarget.id);
        if (error) {
            toast.error(`Erro ao revogar: ${formatError(error)}`);
            return;
        }
        toast.success("Relatório revogado. Link parou de funcionar.");
        setRevokeTarget(null);
        load();
    };

    const onDelete = async () => {
        if (!deleteTarget) return;
        const { error } = await supabase.from("public_reports").delete().eq("id", deleteTarget.id);
        if (error) {
            toast.error(`Erro ao excluir: ${formatError(error)}`);
            return;
        }
        toast.success("Relatório excluído.");
        setDeleteTarget(null);
        load();
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <p className="text-sm text-muted-foreground max-w-xl">
                        Links públicos com dashboard white-label. Seu cliente acessa sem login,
                        vê as métricas que você liberou, com logo e identidade dele.
                    </p>
                </div>
                <Button onClick={() => setCreateOpen(true)} className="flex-shrink-0">
                    <Plus className="h-4 w-4 mr-1.5" />
                    Novo relatório
                </Button>
            </header>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
            ) : reports.length === 0 ? (
                <EmptyState onCreate={() => setCreateOpen(true)} />
            ) : (
                <div className="space-y-2">
                    {reports.map((r) => (
                        <ReportRow
                            key={r.id}
                            report={r}
                            onRevoke={() => setRevokeTarget(r)}
                            onDelete={() => setDeleteTarget(r)}
                        />
                    ))}
                </div>
            )}

            {createOpen && effectiveCompanyId && (
                <CreateDialog
                    companyId={effectiveCompanyId}
                    onClose={() => setCreateOpen(false)}
                    onCreated={onCreated}
                />
            )}

            <AlertDialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Revogar esse relatório?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Quem tiver o link vai ver uma mensagem de "indisponível". Você pode
                            criar um novo depois. Essa ação não apaga o registro.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={onRevoke}>Revogar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir esse relatório?</AlertDialogTitle>
                        <AlertDialogDescription>
                            O link vai parar de funcionar na hora e o registro (incluindo
                            histórico de visualizações) some. Não dá pra desfazer.
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
                <Link2 className="h-5 w-5 text-emerald-400" />
            </div>
            <h3 className="text-base font-semibold mb-1">Nenhum link compartilhado ainda</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-5">
                Crie um link público pro seu cliente acompanhar o resultado sem precisar entrar
                na plataforma.
            </p>
            <Button onClick={onCreate}>
                <Plus className="h-4 w-4 mr-1.5" />
                Criar primeiro relatório
            </Button>
        </div>
    );
}

function ReportRow({
    report,
    onRevoke,
    onDelete,
}: {
    report: PublicReportRow;
    onRevoke: () => void;
    onDelete: () => void;
}) {
    const url = `${window.location.origin}/r/${report.share_token}`;
    const isRevoked = !!report.revoked_at;
    const isExpired = !!report.expires_at && new Date(report.expires_at) < new Date();
    const status: "active" | "revoked" | "expired" = isRevoked
        ? "revoked"
        : isExpired
        ? "expired"
        : "active";

    const [copied, setCopied] = useState(false);
    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            toast.success("Link copiado");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Não foi possível copiar");
        }
    };

    return (
        <div className="rounded-lg border border-border bg-card p-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-start gap-3">
                {report.logo_url ? (
                    <img
                        src={report.logo_url}
                        alt=""
                        className="h-10 w-10 rounded-lg object-cover flex-shrink-0 ring-1 ring-border"
                    />
                ) : (
                    <div className="h-10 w-10 rounded-lg bg-muted flex-shrink-0 flex items-center justify-center ring-1 ring-border">
                        <Link2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold truncate">
                            {report.client_name || report.title}
                        </h3>
                        <StatusBadge status={status} />
                    </div>

                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {report.title} · últimos {report.period_days}d
                    </p>

                    <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {report.view_count} {report.view_count === 1 ? "visita" : "visitas"}
                        </span>
                        <span>·</span>
                        <span>Criado em {fmtDate(report.created_at)}</span>
                        {report.last_viewed_at && (
                            <>
                                <span>·</span>
                                <span>Última visita {fmtDateTime(report.last_viewed_at)}</span>
                            </>
                        )}
                        {report.expires_at && !isExpired && (
                            <>
                                <span>·</span>
                                <span>Expira em {fmtDate(report.expires_at)}</span>
                            </>
                        )}
                    </div>

                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <code className="text-[11px] font-mono bg-muted px-2 py-1 rounded truncate max-w-[280px] sm:max-w-sm">
                            {url}
                        </code>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={copyLink}
                            disabled={isRevoked}
                            className="h-7 px-2"
                        >
                            <Copy className="h-3.5 w-3.5 mr-1" />
                            {copied ? "Copiado" : "Copiar"}
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            asChild
                            disabled={isRevoked}
                            className="h-7 px-2"
                        >
                            <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => isRevoked && e.preventDefault()}
                            >
                                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                Abrir
                            </a>
                        </Button>
                    </div>
                </div>

                <div className="flex-shrink-0 flex items-center gap-1">
                    {!isRevoked && (
                        <Button size="sm" variant="ghost" onClick={onRevoke} className="h-8 px-2">
                            <ShieldOff className="h-3.5 w-3.5 mr-1" />
                            Revogar
                        </Button>
                    )}
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

function StatusBadge({ status }: { status: "active" | "revoked" | "expired" }) {
    const map = {
        active: { label: "Ativo", cls: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20" },
        revoked: { label: "Revogado", cls: "bg-muted text-muted-foreground ring-border" },
        expired: { label: "Expirado", cls: "bg-amber-500/10 text-amber-400 ring-amber-500/20" },
    } as const;
    const { label, cls } = map[status];
    return (
        <span
            className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ring-1 tracking-wider uppercase ${cls}`}
        >
            {label}
        </span>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
function CreateDialog({
    companyId,
    onClose,
    onCreated,
}: {
    companyId: string;
    onClose: () => void;
    onCreated: (row: PublicReportRow) => void;
}) {
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [title, setTitle] = useState("Relatório de performance");
    const [clientName, setClientName] = useState("");
    const [logoUrl, setLogoUrl] = useState("");
    const [periodDays, setPeriodDays] = useState(30);
    const [expiresInDays, setExpiresInDays] = useState<number | null>(null);
    const [metrics, setMetrics] = useState<EnabledMetrics>(DEFAULT_METRICS);

    const toggle = (key: keyof EnabledMetrics) =>
        setMetrics((m) => ({ ...m, [key]: !m[key] }));

    const anyMetricOn = useMemo(() => Object.values(metrics).some(Boolean), [metrics]);

    const onSubmit = async () => {
        if (!title.trim()) {
            toast.error("Dê um título pro relatório");
            return;
        }
        if (!anyMetricOn) {
            toast.error("Habilite pelo menos uma métrica");
            return;
        }

        setSaving(true);
        const share_token = generateToken();
        const expires_at = expiresInDays
            ? new Date(Date.now() + expiresInDays * 86400000).toISOString()
            : null;

        const payload = {
            company_id: companyId,
            share_token,
            title: title.trim(),
            client_name: clientName.trim() || null,
            logo_url: logoUrl.trim() || null,
            enabled_metrics: metrics,
            period_days: periodDays,
            expires_at,
            created_by: user?.id ?? null,
        };

        const { data, error } = await supabase
            .from("public_reports")
            .insert(payload)
            .select(
                "id, share_token, title, client_name, logo_url, enabled_metrics, period_days, expires_at, revoked_at, view_count, last_viewed_at, created_at"
            )
            .single();

        setSaving(false);
        if (error || !data) {
            toast.error(`Erro ao criar: ${formatError(error)}`);
            return;
        }
        onCreated(data as unknown as PublicReportRow);
    };

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Novo relatório público</DialogTitle>
                    <DialogDescription>
                        Gere um link sem login pro cliente acompanhar os números.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="pr-title">Título</Label>
                        <Input
                            id="pr-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Relatório de performance"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="pr-client">Nome do cliente (opcional)</Label>
                        <Input
                            id="pr-client"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            placeholder="Ex.: Novellus Saúde"
                        />
                        <p className="text-xs text-muted-foreground">
                            Aparece no header e no título da aba. Se vazio, usa o nome da sua
                            empresa.
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="pr-logo">URL do logo do cliente (opcional)</Label>
                        <Input
                            id="pr-logo"
                            value={logoUrl}
                            onChange={(e) => setLogoUrl(e.target.value)}
                            placeholder="https://..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label>Período</Label>
                            <Select
                                value={String(periodDays)}
                                onValueChange={(v) => setPeriodDays(Number(v))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PERIOD_OPTIONS.map((d) => (
                                        <SelectItem key={d} value={String(d)}>
                                            Últimos {d} dias
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Expiração</Label>
                            <Select
                                value={expiresInDays === null ? "never" : String(expiresInDays)}
                                onValueChange={(v) =>
                                    setExpiresInDays(v === "never" ? null : Number(v))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="never">Nunca expira</SelectItem>
                                    <SelectItem value="7">Em 7 dias</SelectItem>
                                    <SelectItem value="30">Em 30 dias</SelectItem>
                                    <SelectItem value="90">Em 90 dias</SelectItem>
                                    <SelectItem value="365">Em 1 ano</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Métricas exibidas</Label>
                        <div className="space-y-2 rounded-lg border border-border p-3">
                            {(Object.keys(METRIC_LABELS) as (keyof EnabledMetrics)[]).map(
                                (key) => (
                                    <div
                                        key={key}
                                        className="flex items-center justify-between gap-3"
                                    >
                                        <span className="text-sm">{METRIC_LABELS[key]}</span>
                                        <Switch
                                            checked={metrics[key]}
                                            onCheckedChange={() => toggle(key)}
                                        />
                                    </div>
                                )
                            )}
                        </div>
                        {!anyMetricOn && (
                            <p className="text-xs text-destructive">
                                Habilite pelo menos uma métrica.
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={saving}>
                        Cancelar
                    </Button>
                    <Button onClick={onSubmit} disabled={saving || !anyMetricOn}>
                        {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                        Criar e copiar link
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
