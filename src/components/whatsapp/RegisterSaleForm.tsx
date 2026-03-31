import React, { useState } from "react";
import { DollarSign, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";
import { toast } from "sonner";

export const RegisterSaleForm = ({ phone, companyId, onClose, onSuccess }: {
    phone: string;
    companyId: string | null;
    onClose: () => void;
    onSuccess: () => void;
}) => {
    const [product, setProduct] = useState("");
    const [value, setValue] = useState("");
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);

    const handleSubmit = async () => {
        if (!product.trim()) { toast.error("Informe o produto/serviço"); return; }
        const numValue = parseFloat(value.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
        if (numValue <= 0) { toast.error("Informe um valor valido"); return; }

        setSaving(true);
        try {
            const { error } = await supabase.from("sales" as any).insert({
                product_name: product.trim(),
                value: numValue,
                notes: notes.trim() || null,
                customer_phone: phone,
                company_id: companyId,
            } as any);
            if (error) throw error;
            toast.success("Venda registrada com sucesso!");
            onSuccess();
            onClose();
        } catch (err: any) {
            logger.error("[RegisterSale]", err);
            toast.error("Erro ao registrar venda");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" /> Registrar Venda
                </span>
                <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground" onClick={onClose}>
                    <X className="w-3 h-3" />
                </Button>
            </div>
            <Input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Produto / Serviço"
                className="h-8 text-[11px] bg-background/60 border-white/10 text-foreground placeholder:text-muted-foreground/50" />
            <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Valor (R$)"
                className="h-8 text-[11px] bg-background/60 border-white/10 text-foreground placeholder:text-muted-foreground/50" />
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações (opcional)" rows={2}
                className="w-full text-[11px] bg-background/60 border border-white/10 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500/50" />
            <Button size="sm" className="w-full h-8 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5" onClick={handleSubmit} disabled={saving}>
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <DollarSign className="w-3 h-3" />}
                Registrar
            </Button>
        </div>
    );
};
