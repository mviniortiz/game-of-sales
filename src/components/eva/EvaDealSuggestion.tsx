// Card de sugestão da Eva IA pra um deal parado.
// Mostra mensagem gerada + botões de ação (enviar WhatsApp, editar, pular).

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { AlertTriangle, Pencil, Send, SkipForward, X, Check } from "lucide-react";
import { EvaAvatar } from "@/components/icons/EvaAvatar";
import { trackEvent } from "@/lib/analytics";

type Suggestion = {
    id: string;
    deal_id: string;
    suggestion_text: string;
    message_draft: string;
    reason: string | null;
    days_stale: number | null;
    sla_context: string | null;
    generated_at: string;
    status: string;
    final_message: string | null;
};

type Props = {
    dealId: string;
    customerPhone: string | null;
    customerName: string | null;
};

export function EvaDealSuggestion({ dealId, customerPhone, customerName }: Props) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [editMode, setEditMode] = useState(false);
    const [editedMessage, setEditedMessage] = useState("");

    const { data: suggestion, isLoading } = useQuery({
        queryKey: ["eva-deal-suggestion", dealId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("eva_deal_suggestions")
                .select("*")
                .eq("deal_id", dealId)
                .eq("status", "pending")
                .order("generated_at", { ascending: false })
                .limit(1)
                .maybeSingle();
            if (error) throw error;
            return data as Suggestion | null;
        },
        staleTime: 30_000,
    });

    const resolveMutation = useMutation({
        mutationFn: async (payload: {
            status: "accepted" | "edited" | "skipped";
            final_message?: string;
            sent_via?: "whatsapp" | "email" | "manual";
        }) => {
            if (!suggestion) return;
            const { error } = await supabase
                .from("eva_deal_suggestions")
                .update({
                    status: payload.status,
                    final_message: payload.final_message ?? null,
                    sent_via: payload.sent_via ?? null,
                    resolved_at: new Date().toISOString(),
                    resolved_by: user?.id ?? null,
                })
                .eq("id", suggestion.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["eva-deal-suggestion", dealId] });
        },
        onError: (err: any) => {
            toast.error("Não consegui resolver a sugestão: " + (err?.message ?? String(err)));
        },
    });

    if (isLoading) {
        return (
            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                <Skeleton className="h-24 w-full" />
            </div>
        );
    }

    if (!suggestion) return null;

    const messageToUse = editMode ? editedMessage : suggestion.message_draft;
    const slaAlert = suggestion.sla_context?.toLowerCase().includes("vencid");

    const handleSendWhatsapp = async () => {
        const final = editMode ? editedMessage : suggestion.message_draft;
        const phone = (customerPhone || "").replace(/\D/g, "");

        if (!phone) {
            toast.error("Sem telefone de WhatsApp cadastrado nesse deal");
            return;
        }

        // Abre WhatsApp Web/Desktop com mensagem pré-preenchida
        const url = `https://wa.me/${phone.startsWith("55") ? phone : "55" + phone}?text=${encodeURIComponent(final)}`;
        window.open(url, "_blank", "noopener,noreferrer");

        trackEvent("eva_suggestion_sent", { deal_id: dealId, via: "whatsapp", edited: editMode });
        resolveMutation.mutate({
            status: editMode ? "edited" : "accepted",
            final_message: final,
            sent_via: "whatsapp",
        });
        toast.success(`Mensagem aberta no WhatsApp pra ${customerName ?? "contato"}`);
    };

    const handleEdit = () => {
        setEditedMessage(suggestion.message_draft);
        setEditMode(true);
        trackEvent("eva_suggestion_edit_opened", { deal_id: dealId });
    };

    const handleSaveEdit = () => {
        setEditMode(false);
        // Não resolve ainda, só mantém edit mode off pra usuário decidir
    };

    const handleCancelEdit = () => {
        setEditMode(false);
        setEditedMessage("");
    };

    const handleSkip = () => {
        trackEvent("eva_suggestion_skipped", { deal_id: dealId });
        resolveMutation.mutate({ status: "skipped" });
        toast.success("Sugestão pulada");
    };

    return (
        <div
            className="rounded-xl overflow-hidden"
            style={{
                background: "linear-gradient(180deg, rgba(139,92,246,0.08), rgba(139,92,246,0.02))",
                border: "1px solid rgba(139,92,246,0.25)",
            }}
        >
            {/* Header */}
            <div
                className="px-5 py-3 flex items-center gap-3"
                style={{ borderBottom: "1px solid rgba(139,92,246,0.15)" }}
            >
                <EvaAvatar size={24} thinking={!slaAlert} />
                <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-[#a78bfa]">
                        Eva sugere follow-up
                    </div>
                    <div className="text-[12px] text-white/70 mt-0.5 truncate">
                        {suggestion.suggestion_text}
                    </div>
                </div>
                {slaAlert ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                        <AlertTriangle className="h-3 w-3" />
                        {suggestion.sla_context}
                    </span>
                ) : suggestion.sla_context ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {suggestion.sla_context}
                    </span>
                ) : suggestion.days_stale ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-white/5 text-white/55 border border-white/10">
                        {suggestion.days_stale}d sem touch
                    </span>
                ) : null}
            </div>

            {/* Mensagem */}
            <div className="p-5">
                {editMode ? (
                    <Textarea
                        value={editedMessage}
                        onChange={(e) => setEditedMessage(e.target.value)}
                        className="min-h-[140px] bg-black/30 border-white/10 text-white/90 text-[13px] leading-relaxed"
                        autoFocus
                    />
                ) : (
                    <div
                        className="p-4 rounded-lg text-[13px] leading-relaxed whitespace-pre-wrap"
                        style={{
                            background: "rgba(0,0,0,0.25)",
                            border: "1px solid rgba(255,255,255,0.06)",
                            color: "rgba(255,255,255,0.88)",
                        }}
                    >
                        {messageToUse}
                    </div>
                )}

                {/* Ações */}
                <div className="flex flex-wrap gap-2 mt-4">
                    {editMode ? (
                        <>
                            <Button size="sm" onClick={handleSaveEdit} className="bg-emerald-500 text-black hover:bg-emerald-400">
                                <Check className="h-3.5 w-3.5 mr-1.5" />
                                Salvar edit
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                                <X className="h-3.5 w-3.5 mr-1.5" />
                                Cancelar
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                size="sm"
                                onClick={handleSendWhatsapp}
                                disabled={resolveMutation.isPending}
                                className="bg-emerald-500 text-black hover:bg-emerald-400 font-semibold"
                            >
                                <Send className="h-3.5 w-3.5 mr-1.5" />
                                Enviar no WhatsApp
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleEdit}>
                                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                                Editar
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleSkip}
                                disabled={resolveMutation.isPending}
                                className="text-white/50 hover:text-white/75"
                            >
                                <SkipForward className="h-3.5 w-3.5 mr-1.5" />
                                Pular
                            </Button>
                        </>
                    )}
                </div>

                {suggestion.reason && (
                    <div className="mt-3 text-[11px] text-white/40">
                        {suggestion.reason} · Eva adapta o tom ao estágio, SLA e histórico do deal.
                    </div>
                )}
            </div>
        </div>
    );
}
