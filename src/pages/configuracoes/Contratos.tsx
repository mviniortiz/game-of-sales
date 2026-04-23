// Contratos
// Admin UI para a tabela public.contracts.
// Lista + sumário (MRR, contratos ativos, renovações próximas) + CRUD.

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import {
    CalendarClock,
    CheckCircle2,
    FileText,
    Loader2,
    Pause,
    Pencil,
    Plus,
    Trash2,
    TrendingDown,
    TrendingUp,
    XCircle,
} from "lucide-react";
import { formatError } from "@/lib/utils";

type BillingCycle = "monthly" | "quarterly" | "yearly" | "one_time";
type ContractStatus = "active" | "paused" | "ended";

type Contract = {
    id: string;
    company_id: string;
    deal_id: string | null;
    client_name: string;
    contact_email: string | null;
    value: number;
    billing_cycle: BillingCycle;
    start_date: string;
    end_date: string | null;
    status: ContractStatus;
    auto_renew: boolean;
    notify_days_before: number;
    notes: string | null;
    created_at: string;
    updated_at: string;
};

type ContractsSummary = {
    mrr_active: number;
    count_active: number;
    count_paused: number;
    count_ended: number;
    renewals_next_30d: number;
    mrr_at_risk_30d: number;
    ended_last_90d: number;
    mrr_lost_90d: number;
};

const CYCLE_LABEL: Record<BillingCycle, string> = {
    monthly: "Mensal",
    quarterly: "Trimestral",
    yearly: "Anual",
    one_time: "Pagamento único",
};

const STATUS_LABEL: Record<ContractStatus, string> = {
    active: "Ativo",
    paused: "Pausado",
    ended: "Encerrado",
};

const currency = (n: number) =>
    new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
    }).format(n);

const fmtDate = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
};

const mrrOf = (c: Pick<Contract, "value" | "billing_cycle">) => {
    switch (c.billing_cycle) {
        case "monthly":
            return c.value;
        case "quarterly":
            return c.value / 3;
        case "yearly":
            return c.value / 12;
        default:
            return 0;
    }
};

// ═══════════════════════════════════════════════════════════════════════════
export default function Contratos() {
    const { companyId } = useAuth();
    const { activeCompanyId } = useTenant();
    const effectiveCompanyId = activeCompanyId || companyId;
    const queryClient = useQueryClient();

    const [statusFilter, setStatusFilter] = useState<"all" | ContractStatus>("all");
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Contract | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Contract | null>(null);

    const { data: summary } = useQuery({
        queryKey: ["contracts_summary", effectiveCompanyId],
        queryFn: async () => {
            if (!effectiveCompanyId) return null;
            const { data, error } = await supabase.rpc("contracts_summary", {
                p_company_id: effectiveCompanyId,
            });
            if (error) throw error;
            return data as unknown as ContractsSummary;
        },
        enabled: !!effectiveCompanyId,
        staleTime: 60 * 1000,
    });

    const { data: contracts, isLoading } = useQuery({
        queryKey: ["contracts_list", effectiveCompanyId],
        queryFn: async () => {
            if (!effectiveCompanyId) return [];
            const { data, error } = await supabase
                .from("contracts")
                .select("*")
                .eq("company_id", effectiveCompanyId)
                .order("created_at", { ascending: false });
            if (error) throw error;
            return (data ?? []) as unknown as Contract[];
        },
        enabled: !!effectiveCompanyId,
    });

    const filtered = useMemo(() => {
        if (!contracts) return [];
        if (statusFilter === "all") return contracts;
        return contracts.filter((c) => c.status === statusFilter);
    }, [contracts, statusFilter]);

    const refetchAll = () => {
        queryClient.invalidateQueries({ queryKey: ["contracts_summary", effectiveCompanyId] });
        queryClient.invalidateQueries({ queryKey: ["contracts_list", effectiveCompanyId] });
    };

    const onSaved = () => {
        setFormOpen(false);
        setEditing(null);
        refetchAll();
    };

    const onDelete = async () => {
        if (!deleteTarget) return;
        const { error } = await supabase.from("contracts").delete().eq("id", deleteTarget.id);
        if (error) {
            toast.error(`Erro ao excluir: ${formatError(error)}`);
            return;
        }
        toast.success("Contrato excluído");
        setDeleteTarget(null);
        refetchAll();
    };

    const onToggleStatus = async (c: Contract, next: ContractStatus) => {
        const { error } = await supabase
            .from("contracts")
            .update({ status: next })
            .eq("id", c.id);
        if (error) {
            toast.error(`Erro: ${formatError(error)}`);
            return;
        }
        toast.success(`Contrato ${STATUS_LABEL[next].toLowerCase()}`);
        refetchAll();
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <p className="text-sm text-muted-foreground max-w-xl">
                        Cadastre contratos recorrentes ou avulsos. Aqui vive o MRR real do
                        portfólio, contratos próximos da renovação e churn do trimestre.
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setEditing(null);
                        setFormOpen(true);
                    }}
                    className="flex-shrink-0"
                >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Novo contrato
                </Button>
            </header>

            {summary && <SummaryGrid summary={summary} />}

            <div className="flex items-center justify-between">
                <Tabs
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
                >
                    <TabsList>
                        <TabsTrigger value="all">Todos</TabsTrigger>
                        <TabsTrigger value="active">Ativos</TabsTrigger>
                        <TabsTrigger value="paused">Pausados</TabsTrigger>
                        <TabsTrigger value="ended">Encerrados</TabsTrigger>
                    </TabsList>
                </Tabs>
                <span className="text-xs text-muted-foreground">
                    {filtered.length} {filtered.length === 1 ? "contrato" : "contratos"}
                </span>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
            ) : filtered.length === 0 ? (
                <EmptyState
                    onCreate={() => {
                        setEditing(null);
                        setFormOpen(true);
                    }}
                />
            ) : (
                <div className="space-y-2">
                    {filtered.map((c) => (
                        <ContractRow
                            key={c.id}
                            contract={c}
                            onEdit={() => {
                                setEditing(c);
                                setFormOpen(true);
                            }}
                            onDelete={() => setDeleteTarget(c)}
                            onPause={() => onToggleStatus(c, "paused")}
                            onResume={() => onToggleStatus(c, "active")}
                            onEnd={() => onToggleStatus(c, "ended")}
                        />
                    ))}
                </div>
            )}

            {formOpen && effectiveCompanyId && (
                <ContractFormDialog
                    companyId={effectiveCompanyId}
                    contract={editing}
                    onClose={() => {
                        setFormOpen(false);
                        setEditing(null);
                    }}
                    onSaved={onSaved}
                />
            )}

            <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir contrato?</AlertDialogTitle>
                        <AlertDialogDescription>
                            O registro some do portfólio. Se você só quer parar de contabilizar
                            no MRR, use "Encerrar" no menu.
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
function SummaryGrid({ summary }: { summary: ContractsSummary }) {
    const tiles = [
        {
            label: "MRR ativo",
            value: currency(summary.mrr_active),
            hint: `${summary.count_active} contratos ativos`,
            tone: "emerald" as const,
            icon: TrendingUp,
        },
        {
            label: "Renovações em 30d",
            value: `${summary.renewals_next_30d}`,
            hint: summary.mrr_at_risk_30d
                ? `${currency(summary.mrr_at_risk_30d)} em risco`
                : "sem auto-renovar",
            tone: "amber" as const,
            icon: CalendarClock,
        },
        {
            label: "Encerrados · 90d",
            value: `${summary.ended_last_90d}`,
            hint: summary.mrr_lost_90d
                ? `${currency(summary.mrr_lost_90d)} MRR perdido`
                : "nenhum",
            tone: "muted" as const,
            icon: TrendingDown,
        },
        {
            label: "Pausados",
            value: `${summary.count_paused}`,
            hint: "pagamento em standby",
            tone: "neutral" as const,
            icon: Pause,
        },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {tiles.map((t) => {
                const Icon = t.icon;
                const toneCls =
                    t.tone === "emerald"
                        ? "text-emerald-400"
                        : t.tone === "amber"
                        ? "text-amber-400"
                        : t.tone === "muted"
                        ? "text-muted-foreground"
                        : "text-foreground";
                return (
                    <div
                        key={t.label}
                        className="rounded-xl border border-border bg-card p-4"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {t.label}
                            </span>
                            <Icon className={`h-3.5 w-3.5 ${toneCls}`} />
                        </div>
                        <div className={`text-xl font-bold tabular-nums ${toneCls}`}>
                            {t.value}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                            {t.hint}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
function EmptyState({ onCreate }: { onCreate: () => void }) {
    return (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20 mx-auto flex items-center justify-center mb-4">
                <FileText className="h-5 w-5 text-emerald-400" />
            </div>
            <h3 className="text-base font-semibold mb-1">Nenhum contrato por aqui</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-5">
                Cadastre os contratos ativos pra o Vyzon calcular MRR, renovações e churn
                automático.
            </p>
            <Button onClick={onCreate}>
                <Plus className="h-4 w-4 mr-1.5" />
                Adicionar contrato
            </Button>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
function ContractRow({
    contract,
    onEdit,
    onDelete,
    onPause,
    onResume,
    onEnd,
}: {
    contract: Contract;
    onEdit: () => void;
    onDelete: () => void;
    onPause: () => void;
    onResume: () => void;
    onEnd: () => void;
}) {
    const mrr = mrrOf(contract);
    const daysRemaining = contract.end_date
        ? Math.ceil(
              (new Date(contract.end_date + "T00:00:00").getTime() - Date.now()) / 86400000
          )
        : null;

    const renewalWarn =
        contract.status === "active" &&
        daysRemaining !== null &&
        daysRemaining <= contract.notify_days_before &&
        daysRemaining >= 0;

    return (
        <div className="rounded-lg border border-border bg-card p-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold truncate">{contract.client_name}</h3>
                        <StatusBadge status={contract.status} />
                        {renewalWarn && (
                            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ring-1 tracking-wider uppercase bg-amber-500/10 text-amber-400 ring-amber-500/20">
                                Renova em {daysRemaining}d
                            </span>
                        )}
                    </div>

                    <div className="mt-1 flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                        <span className="font-mono font-semibold text-foreground">
                            {currency(contract.value)}
                            <span className="text-muted-foreground/70 font-normal">
                                {" "}/ {CYCLE_LABEL[contract.billing_cycle]}
                            </span>
                        </span>
                        {contract.billing_cycle !== "one_time" && (
                            <>
                                <span>·</span>
                                <span>
                                    <span className="font-mono">{currency(mrr)}</span> MRR
                                </span>
                            </>
                        )}
                    </div>

                    <div className="mt-2 flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                        <span>Início: {fmtDate(contract.start_date)}</span>
                        {contract.end_date && (
                            <>
                                <span>·</span>
                                <span>Fim: {fmtDate(contract.end_date)}</span>
                            </>
                        )}
                        {contract.auto_renew && contract.billing_cycle !== "one_time" && (
                            <>
                                <span>·</span>
                                <span className="text-emerald-400">Auto-renova</span>
                            </>
                        )}
                        {contract.contact_email && (
                            <>
                                <span>·</span>
                                <span className="truncate max-w-[220px]">
                                    {contract.contact_email}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex-shrink-0 flex items-center gap-1">
                    {contract.status === "active" && (
                        <Button size="sm" variant="ghost" onClick={onPause} className="h-8 px-2">
                            <Pause className="h-3.5 w-3.5" />
                        </Button>
                    )}
                    {contract.status === "paused" && (
                        <Button size="sm" variant="ghost" onClick={onResume} className="h-8 px-2">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                        </Button>
                    )}
                    {contract.status !== "ended" && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={onEnd}
                            className="h-8 px-2"
                            title="Encerrar"
                        >
                            <XCircle className="h-3.5 w-3.5" />
                        </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={onEdit} className="h-8 px-2">
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>
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

function StatusBadge({ status }: { status: ContractStatus }) {
    const map = {
        active: { label: "Ativo", cls: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20" },
        paused: { label: "Pausado", cls: "bg-amber-500/10 text-amber-400 ring-amber-500/20" },
        ended: { label: "Encerrado", cls: "bg-muted text-muted-foreground ring-border" },
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
function ContractFormDialog({
    companyId,
    contract,
    onClose,
    onSaved,
}: {
    companyId: string;
    contract: Contract | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const { user } = useAuth();
    const isEdit = !!contract;

    const [clientName, setClientName] = useState(contract?.client_name ?? "");
    const [contactEmail, setContactEmail] = useState(contract?.contact_email ?? "");
    const [value, setValue] = useState<string>(
        contract?.value != null ? String(contract.value) : ""
    );
    const [billingCycle, setBillingCycle] = useState<BillingCycle>(
        contract?.billing_cycle ?? "monthly"
    );
    const [startDate, setStartDate] = useState(
        contract?.start_date ?? new Date().toISOString().slice(0, 10)
    );
    const [endDate, setEndDate] = useState(contract?.end_date ?? "");
    const [autoRenew, setAutoRenew] = useState(contract?.auto_renew ?? true);
    const [notifyDaysBefore, setNotifyDaysBefore] = useState<number>(
        contract?.notify_days_before ?? 30
    );
    const [notes, setNotes] = useState(contract?.notes ?? "");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (billingCycle === "one_time") setAutoRenew(false);
    }, [billingCycle]);

    const onSubmit = async () => {
        const numValue = Number(value.replace(",", "."));
        if (!clientName.trim()) {
            toast.error("Informe o nome do cliente");
            return;
        }
        if (!Number.isFinite(numValue) || numValue < 0) {
            toast.error("Valor inválido");
            return;
        }
        if (!startDate) {
            toast.error("Data de início obrigatória");
            return;
        }

        setSaving(true);
        const payload = {
            company_id: companyId,
            client_name: clientName.trim(),
            contact_email: contactEmail.trim() || null,
            value: numValue,
            billing_cycle: billingCycle,
            start_date: startDate,
            end_date: endDate || null,
            auto_renew: billingCycle === "one_time" ? false : autoRenew,
            notify_days_before: notifyDaysBefore,
            notes: notes.trim() || null,
            ...(isEdit ? {} : { created_by: user?.id ?? null }),
        };

        const res = isEdit
            ? await supabase
                  .from("contracts")
                  .update(payload)
                  .eq("id", contract!.id)
            : await supabase.from("contracts").insert(payload);

        setSaving(false);
        if (res.error) {
            toast.error(`Erro ao salvar: ${formatError(res.error)}`);
            return;
        }
        toast.success(isEdit ? "Contrato atualizado" : "Contrato criado");
        onSaved();
    };

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Editar contrato" : "Novo contrato"}</DialogTitle>
                    <DialogDescription>
                        MRR é calculado automaticamente a partir do ciclo de cobrança.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="ct-client">Cliente</Label>
                        <Input
                            id="ct-client"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            placeholder="Ex.: Novellus Saúde"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="ct-email">E-mail de contato (opcional)</Label>
                        <Input
                            id="ct-email"
                            type="email"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            placeholder="financeiro@cliente.com.br"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="ct-value">Valor (R$)</Label>
                            <Input
                                id="ct-value"
                                type="number"
                                min={0}
                                step="0.01"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                placeholder="12500.00"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label>Ciclo</Label>
                            <Select
                                value={billingCycle}
                                onValueChange={(v) => setBillingCycle(v as BillingCycle)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="monthly">Mensal</SelectItem>
                                    <SelectItem value="quarterly">Trimestral</SelectItem>
                                    <SelectItem value="yearly">Anual</SelectItem>
                                    <SelectItem value="one_time">Pagamento único</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="ct-start">Início</Label>
                            <Input
                                id="ct-start"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="ct-end">Fim (opcional)</Label>
                            <Input
                                id="ct-end"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    {billingCycle !== "one_time" && (
                        <>
                            <div className="flex items-center justify-between rounded-lg border border-border p-3">
                                <div>
                                    <Label className="text-sm">Auto-renovar</Label>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Marca como "sem risco" nas renovações próximas
                                    </p>
                                </div>
                                <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="ct-notify">Avisar renovação com antecedência (dias)</Label>
                                <Input
                                    id="ct-notify"
                                    type="number"
                                    min={1}
                                    max={180}
                                    value={notifyDaysBefore}
                                    onChange={(e) =>
                                        setNotifyDaysBefore(Math.max(1, Number(e.target.value) || 30))
                                    }
                                />
                            </div>
                        </>
                    )}

                    <div className="space-y-1.5">
                        <Label htmlFor="ct-notes">Observações (opcional)</Label>
                        <Textarea
                            id="ct-notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Escopo, condições especiais, pessoa responsável…"
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={saving}>
                        Cancelar
                    </Button>
                    <Button onClick={onSubmit} disabled={saving}>
                        {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                        {isEdit ? "Salvar" : "Criar contrato"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
