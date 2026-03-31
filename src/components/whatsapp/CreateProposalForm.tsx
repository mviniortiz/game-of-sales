import React, { useState } from "react";
import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const CreateProposalForm = ({ contactName, onClose }: {
    contactName: string;
    onClose: () => void;
}) => {
    const [title, setTitle] = useState(`Proposta - ${contactName}`);
    const [value, setValue] = useState("");
    const [description, setDescription] = useState("");

    const handleSubmit = () => {
        toast.success("Proposta criada! (Em breve: integração completa)");
        onClose();
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
            <Button size="sm" className="w-full h-8 text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white gap-1.5" onClick={handleSubmit}>
                <FileText className="w-3 h-3" /> Criar Proposta
            </Button>
        </div>
    );
};
