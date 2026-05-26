// ─────────────────────────────────────────────────────────────────────────────
// V1.1.1 (2026-05-26) — VincularDealModal
//
// Vincula uma conversa da Inbox a uma oportunidade JÁ EXISTENTE (anti-duplicidade).
// Fluxo: lista deals abertos da company → busca por título/cliente/telefone →
// seleciona → UPDATE channel_conversations SET deal_id = deal.id (WHERE deal_id
// IS NULL, anti-sobrescrita).
//
// Read-only nas deals (só SELECT). Não cria deal. Não envia mensagem. Não move
// stage. Não chama IA. A única escrita é o vínculo na channel_conversations.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Link2, Search, Loader2, ArrowRight } from "lucide-react";
import { formatError } from "@/lib/utils";
import { sanitizeDisplayName } from "@/lib/displayName";

interface DealRow {
    id: string;
    title: string | null;
    stage: string;
    customer_name: string | null;
    customer_phone: string | null;
    value: number | null;
    updated_at: string;
}

const STAGE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    lead: { label: "Novo lead", color: "#64748B", bg: "rgba(148,163,184,0.14)" },
    qualification: { label: "Qualificação", color: "#1D4ED8", bg: "rgba(37,99,235,0.10)" },
    proposal: { label: "Proposta", color: "#6D28D9", bg: "rgba(124,58,237,0.10)" },
    negotiation: { label: "Negociação", color: "#B45309", bg: "rgba(245,158,11,0.10)" },
};

function norm(s: string): string {
    return s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function formatBRL(v: number | null): string {
    if (!v || v <= 0) return "R$ 0";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

interface VincularDealModalProps {
    open: boolean;
    onClose: () => void;
    conversationId: string;
    /** Telefone/nome pra pré-filtrar e surfar a provável duplicata. */
    prefillSearch?: string;
    onLinked: (dealId: string) => void;
}

export const VincularDealModal = ({
    open,
    onClose,
    conversationId,
    prefillSearch,
    onLinked,
}: VincularDealModalProps) => {
    const { companyId } = useAuth();
    const { activeCompanyId } = useTenant();
    const queryClient = useQueryClient();
    const effectiveCompanyId = activeCompanyId || companyId;

    const [search, setSearch] = useState("");

    // Pré-preenche a busca quando abre (geralmente o telefone do contato).
    useEffect(() => {
        if (open) setSearch(prefillSearch || "");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const { data: deals, isLoading, error } = useQuery({
        queryKey: ["open-deals-link", effectiveCompanyId],
        enabled: open && !!effectiveCompanyId,
        staleTime: 15_000,
        queryFn: async (): Promise<DealRow[]> => {
            const { data, error: e } = await supabase
                .from("deals")
                .select("id, title, stage, customer_name, customer_phone, value, updated_at")
                .eq("company_id", effectiveCompanyId!)
                .not("stage", "in", "(closed_won,closed_lost)")
                .order("updated_at", { ascending: false })
                .limit(200);
            if (e) throw e;
            return (data ?? []) as DealRow[];
        },
    });

    const filtered = useMemo(() => {
        const list = deals ?? [];
        const t = norm(search.trim());
        const tDigits = search.replace(/\D/g, "");
        if (!t && !tDigits) return list;
        return list.filter((d) => {
            const text = norm(`${d.title || ""} ${d.customer_name || ""}`);
            const phone = (d.customer_phone || "").replace(/\D/g, "");
            const byText = t ? text.includes(t) : false;
            const byPhone = tDigits.length >= 4 ? phone.includes(tDigits) : false;
            return byText || byPhone;
        });
    }, [deals, search]);

    const link = useMutation({
        mutationFn: async (dealId: string) => {
            const { error: e } = await supabase
                .from("channel_conversations")
                .update({ deal_id: dealId })
                .eq("id", conversationId)
                .is("deal_id", null); // anti-sobrescrita de vínculo existente
            if (e) throw e;
            return dealId;
        },
        onSuccess: (dealId) => {
            queryClient.invalidateQueries({ queryKey: ["deals"] });
            toast.success("Conversa vinculada à oportunidade");
            onLinked(dealId);
            onClose();
        },
        onError: (err) => {
            toast.error(`Erro ao vincular: ${formatError(err)}`);
        },
    });

    const linkingId = link.isPending ? (link.variables as string | undefined) : undefined;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] max-w-[560px] max-h-[88vh] overflow-hidden bg-card border border-[#D9E2EC] p-0 flex flex-col">
                <DialogHeader
                    className="px-6 pt-6 pb-5 relative overflow-hidden shrink-0"
                    style={{
                        background: "linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(74,140,232,0.04) 100%), #FFFFFF",
                        borderBottom: "1px solid #EAF0F6",
                    }}
                >
                    <DialogTitle className="flex items-center gap-3.5 text-foreground">
                        <div
                            className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: "rgba(37,99,235,0.10)", border: "1px solid rgba(37,99,235,0.20)" }}
                        >
                            <Link2 className="h-5 w-5" strokeWidth={2.3} style={{ color: "#2563EB" }} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[18px] font-bold tracking-tight" style={{ color: "#0B1220", letterSpacing: "-0.018em" }}>
                                Vincular oportunidade existente
                            </span>
                            <p className="text-[12.5px] text-muted-foreground font-normal mt-0.5 leading-snug">
                                Conecte esta conversa a um deal aberto do pipeline.
                            </p>
                        </div>
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Selecione uma oportunidade aberta para vincular à conversa.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 pt-4 pb-2 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "#94A3B8" }} />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por título, cliente ou telefone"
                            className="h-10 text-sm pl-9"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="px-6 pb-6 pt-2 overflow-y-auto flex-1 min-h-[180px]">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#2563EB" }} />
                        </div>
                    ) : error ? (
                        <p className="text-[12.5px] text-center py-10" style={{ color: "#B91C1C" }}>
                            Não consegui carregar as oportunidades. Tente novamente.
                        </p>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-[13px] font-semibold mb-1" style={{ color: "#0B1220" }}>
                                {(deals?.length ?? 0) === 0 ? "Nenhuma oportunidade aberta" : "Nenhum resultado para a busca"}
                            </p>
                            <p className="text-[11.5px]" style={{ color: "#64748B" }}>
                                {(deals?.length ?? 0) === 0
                                    ? "Crie uma nova oportunidade a partir da conversa."
                                    : "Limpe a busca para ver todos os deals abertos."}
                            </p>
                        </div>
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {filtered.map((d) => {
                                const stage = STAGE_LABELS[d.stage] || STAGE_LABELS.lead;
                                const safeCustomer = sanitizeDisplayName(d.customer_name);
                                const isLinkingThis = linkingId === d.id;
                                return (
                                    <li key={d.id}>
                                        <button
                                            type="button"
                                            disabled={link.isPending}
                                            onClick={() => link.mutate(d.id)}
                                            className="w-full text-left rounded-xl px-4 py-3 flex items-center gap-3 transition-colors hover:bg-[#F4F7FB] disabled:opacity-60 disabled:cursor-not-allowed"
                                            style={{ border: "1px solid #E2E8F0", background: "#FFFFFF" }}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                    <span className="text-[13.5px] font-semibold truncate" style={{ color: "#0B1220" }}>
                                                        {d.title || safeCustomer || "Oportunidade"}
                                                    </span>
                                                    <span
                                                        className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
                                                        style={{ background: stage.bg, color: stage.color, fontWeight: 700, letterSpacing: "0.04em" }}
                                                    >
                                                        {stage.label}
                                                    </span>
                                                </div>
                                                <p className="text-[11.5px] truncate" style={{ color: "#64748B" }}>
                                                    {[safeCustomer, formatBRL(d.value)].filter(Boolean).join(" · ")}
                                                </p>
                                            </div>
                                            {isLinkingThis ? (
                                                <Loader2 className="h-4 w-4 animate-spin shrink-0" style={{ color: "#2563EB" }} />
                                            ) : (
                                                <ArrowRight className="h-4 w-4 shrink-0" style={{ color: "#2563EB" }} />
                                            )}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
