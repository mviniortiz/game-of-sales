import React, { useState } from "react";
import { FileText, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { updateDealStage, addNoteToDeal } from "./useCrmLookup";
import type { CrmDeal } from "./helpers";

export const CreateProposalForm = ({ contactName, phone, deal, onPersisted, onClose }: {
    contactName: string;
    phone?: string;
    /** Deal já vinculado a este contato (lookup por telefone). Null = cria novo. */
    deal: CrmDeal | null;
    onPersisted?: () => void;
    onClose: () => void;
}) => {
    const { user, companyId } = useAuth();
    const { activeCompanyId } = useTenant();
    const [title, setTitle] = useState(`Proposta - ${contactName}`);
    const [value, setValue] = useState("");
    const [description, setDescription] = useState("");
    const [saving, setSaving] = useState(false);

    const parseValue = () =>
        parseFloat(value.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;

    const handleSubmit = async () => {
        if (!user) return;
        const effectiveCompanyId = activeCompanyId || companyId || null;
        const parsedValue = parseValue();

        setSaving(true);
        try {
            let dealId = deal?.id ?? null;

            if (dealId) {
                // Deal existente: move pra Proposta e registra valor/descrição.
                await updateDealStage(dealId, "proposal");
                if (parsedValue > 0 || description.trim()) {
                    const patch: Record<string, unknown> = {};
                    if (parsedValue > 0) patch.value = parsedValue;
                    if (title.trim()) patch.title = title.trim();
                    const { error: patchErr } = await supabase
                        .from("deals")
                        .update(patch)
                        .eq("id", dealId);
                    if (patchErr) throw patchErr;
                }
                if (description.trim()) {
                    await addNoteToDeal(dealId, `Proposta: ${description.trim()}`);
                }
            } else {
                // Sem deal: cria direto no estágio Proposta.
                const { data: created, error: insertErr } = await supabase
                    .from("deals")
                    .insert({
                        title: title.trim() || `Proposta - ${contactName}`,
                        value: parsedValue,
                        customer_name: contactName,
                        customer_phone: phone || null,
                        customer_email: null,
                        stage: "proposal" as never,
                        probability: 55,
                        position: 0,
                        user_id: user.id,
                        company_id: effectiveCompanyId,
                        is_hot: false,
                    })
                    .select("id")
                    .single();
                if (insertErr) throw insertErr;
                dealId = created.id;
                if (description.trim()) {
                    await addNoteToDeal(dealId!, `Proposta: ${description.trim()}`);
                }
            }

            toast.success(
                deal
                    ? "Deal movido para Proposta"
                    : "Proposta criada no pipeline",
            );
            onPersisted?.();
            onClose();
        } catch {
            toast.error("Erro ao salvar proposta no pipeline");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-2.5 rounded-xl bg-blue-500/5 border border-blue-500/20 p-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-blue-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Criar Proposta
                </span>
                <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground" onClick={onClose}>
                    <X className="w-3 h-3" />
                </Button>
            </div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título da proposta"
                className="h-8 text-[11px] bg-background/60 border-white/10 text-foreground placeholder:text-muted-foreground/50" />
            <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Valor (R$)"
                className="h-8 text-[11px] bg-background/60 border-white/10 text-foreground placeholder:text-muted-foreground/50" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição da proposta" rows={3}
                className="w-full text-[11px] bg-background/60 border border-white/10 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500/50" />
            <Button size="sm" disabled={saving} className="w-full h-8 text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white gap-1.5" onClick={handleSubmit}>
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                {saving ? "Salvando..." : deal ? "Mover deal para Proposta" : "Criar Proposta"}
            </Button>
        </div>
    );
};
