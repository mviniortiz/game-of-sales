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
import { toast } from "sonner";
import { Search, Loader2, ArrowRight } from "lucide-react";
import "@/components/layout/tela.css";
import "./funilDialogo.css";
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

// Etapa do negócio em letra normal e cor neutra (antes: uma cor por etapa).
const STAGE_LABELS: Record<string, string> = {
    lead: "Novo lead",
    qualification: "Qualificação",
    proposal: "Proposta",
    negotiation: "Negociação",
};

function norm(s: string): string {
    return s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function formatBRL(v: number | null): string | null {
    if (!v || v <= 0) return null;
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
            toast.success("Conversa vinculada ao negócio");
            onLinked(dealId);
            onClose();
        },
        onError: (err) => {
            toast.error(`Não consegui vincular: ${formatError(err)}`);
        },
    });

    const linkingId = link.isPending ? (link.variables as string | undefined) : undefined;
    // Mesmo número da conversa: o negócio provável sobe com um aviso.
    const telConversa = (prefillSearch || "").replace(/\D/g, "").slice(-8);
    const mesmoNumero = (d: DealRow) =>
        telConversa.length === 8 && (d.customer_phone || "").replace(/\D/g, "").endsWith(telConversa);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="vp-dialogo fd-dialogo sm:max-w-[520px]">
                <DialogHeader className="fd-cab">
                    <DialogTitle className="fd-titulo">Vincular a um negócio do funil</DialogTitle>
                    <DialogDescription className="fd-sub">
                        Escolha o negócio deste cliente. A conversa passa a aparecer nele.
                    </DialogDescription>
                </DialogHeader>

                <div className="fd-busca">
                    <label className="vp-campo vp-campo--junto">
                        <span className="sr-only">Buscar negócio</span>
                        <Search className="fd-busca__icone" aria-hidden />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Nome, negócio ou telefone"
                            autoFocus
                        />
                    </label>
                </div>

                <div className="fd-corpo">
                    {isLoading ? (
                        <div className="fd-vazio">
                            <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-label="Carregando" />
                        </div>
                    ) : error ? (
                        <p className="fd-vazio" role="alert">Não consegui carregar os negócios. Tente de novo.</p>
                    ) : filtered.length === 0 ? (
                        <div className="fd-vazio">
                            <b>{(deals?.length ?? 0) === 0 ? "Nenhum negócio aberto no funil" : "Nada com essa busca"}</b>
                            {(deals?.length ?? 0) === 0
                                ? "Feche e use Pôr no funil para criar um a partir da conversa."
                                : "Apague a busca para ver todos os negócios abertos."}
                        </div>
                    ) : (
                        <ul className="fd-lista">
                            {filtered.map((d) => {
                                const safeCustomer = sanitizeDisplayName(d.customer_name);
                                const isLinkingThis = linkingId === d.id;
                                const valor = formatBRL(d.value);
                                return (
                                    <li key={d.id}>
                                        <button
                                            type="button"
                                            disabled={link.isPending}
                                            onClick={() => link.mutate(d.id)}
                                            className="fd-item"
                                        >
                                            <span className="fd-item__meio">
                                                <b>{d.title || safeCustomer || "Negócio"}</b>
                                                <span>{[safeCustomer, valor].filter(Boolean).join(" · ")}</span>
                                            </span>
                                            {mesmoNumero(d) && <span className="vp-chip fd-item__par">Mesmo número</span>}
                                            <span className="vp-chip">{STAGE_LABELS[d.stage] ?? "Aberto"}</span>
                                            {isLinkingThis ? (
                                                <Loader2 className="fd-item__seta animate-spin motion-reduce:animate-none" aria-label="Vinculando" />
                                            ) : (
                                                <ArrowRight className="fd-item__seta" aria-hidden />
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
