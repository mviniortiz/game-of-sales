import React, { useState, useEffect, useMemo } from "react";
import {
    Bot, PanelRightOpen, PanelRightClose, User, Phone, Brain, TrendingUp, Target,
    AlertCircle, Sparkles, Loader2, ChevronRight, Plus, Clock, History,
    Flame, Snowflake, ThermometerSun, Zap, Copy, ArrowRight, StickyNote,
    DollarSign, FileText, ClipboardList, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { SidebarSection } from "./SidebarSection";
import { RegisterSaleForm } from "./RegisterSaleForm";
import { CreateProposalForm } from "./CreateProposalForm";
import { useCrmLookup, updateDealStage, addNoteToDeal } from "./useCrmLookup";
import { PIPELINE_STAGES, getStageInfo, tempColor } from "./helpers";

const TempIcon = ({ temp }: { temp: string }) => {
    if (temp === "quente") return <Flame className="w-3.5 h-3.5" />;
    if (temp === "frio") return <Snowflake className="w-3.5 h-3.5" />;
    return <ThermometerSun className="w-3.5 h-3.5" />;
};

export const CopilotSidebar = ({
    chat,
    messages,
    aiThinking,
    aiSuggestion,
    remaining,
    rateLimited,
    onAnalyze,
    onUseDraft,
    sidebarOpen,
    onToggle,
    containerClassName,
}: {
    chat: { id: string; name: string; phone?: string; profilePicUrl?: string; isGroup: boolean } | undefined;
    messages: Array<{ text: string; sender: "me" | "lead" }>;
    aiThinking: boolean;
    aiSuggestion: any;
    remaining: number | null;
    rateLimited: boolean;
    onAnalyze: () => void;
    onUseDraft: () => void;
    sidebarOpen: boolean;
    onToggle: () => void;
    containerClassName?: string;
}) => {
    const { user, companyId } = useAuth();
    const { activeCompanyId } = useTenant();
    const { deal, loading: crmLoading, searched: crmSearched, refresh: refreshCrm } = useCrmLookup(chat?.phone);
    const [stageUpdating, setStageUpdating] = useState(false);
    const [noteText, setNoteText] = useState("");
    const [addingNote, setAddingNote] = useState(false);
    const [showCreateDeal, setShowCreateDeal] = useState(false);
    const [newDealTitle, setNewDealTitle] = useState("");
    const [newDealValue, setNewDealValue] = useState("");
    const [creatingDeal, setCreatingDeal] = useState(false);
    const [showSaleForm, setShowSaleForm] = useState(false);
    const [showProposalForm, setShowProposalForm] = useState(false);

    useEffect(() => {
        setShowCreateDeal(false);
        setNewDealTitle("");
        setNewDealValue("");
        setNoteText("");
        setShowSaleForm(false);
        setShowProposalForm(false);
    }, [chat?.id]);

    const handleStageChange = async (newStage: string) => {
        if (!deal) return;
        setStageUpdating(true);
        try {
            await updateDealStage(deal.id, newStage);
            toast.success("Estagio atualizado!");
            refreshCrm();
        } catch {
            toast.error("Erro ao atualizar estagio");
        } finally {
            setStageUpdating(false);
        }
    };

    const handleMoveNext = async () => {
        if (!deal) return;
        const idx = PIPELINE_STAGES.findIndex(s => s.id === deal.stage);
        if (idx < 0 || idx >= PIPELINE_STAGES.length - 2) return;
        await handleStageChange(PIPELINE_STAGES[idx + 1].id);
    };

    const handleAddNote = async () => {
        if (!deal || !noteText.trim()) return;
        setAddingNote(true);
        try {
            await addNoteToDeal(deal.id, noteText.trim());
            toast.success("Nota adicionada!");
            setNoteText("");
            refreshCrm();
        } catch {
            toast.error("Erro ao adicionar nota");
        } finally {
            setAddingNote(false);
        }
    };

    const handleCreateDeal = async () => {
        if (!chat || !user) return;
        const title = newDealTitle.trim() || `Lead - ${chat.name}`;
        const value = parseFloat(newDealValue.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;

        setCreatingDeal(true);
        try {
            const { error } = await supabase.from("deals").insert({
                title,
                value,
                customer_name: chat.name,
                customer_phone: chat.phone || null,
                customer_email: null,
                stage: "lead" as any,
                probability: 10,
                position: 0,
                user_id: user.id,
                company_id: activeCompanyId || companyId || null,
                is_hot: false,
            });
            if (error) throw error;
            toast.success("Lead criado no CRM!");
            setShowCreateDeal(false);
            setNewDealTitle("");
            setNewDealValue("");
            refreshCrm();
        } catch {
            toast.error("Erro ao criar lead");
        } finally {
            setCreatingDeal(false);
        }
    };

    const noteHistory = useMemo(() => {
        if (!deal?.notes) return [];
        const entries = deal.notes.split(/\n\n/).filter(Boolean).slice(-5).reverse();
        return entries.map(entry => {
            const match = entry.match(/^\[(.+?)\]\s*(.+)$/s);
            if (match) return { date: match[1], text: match[2] };
            return { date: "", text: entry };
        });
    }, [deal?.notes]);

    const stageInfo = deal ? getStageInfo(deal.stage) : null;
    const currentStageIdx = deal ? PIPELINE_STAGES.findIndex(s => s.id === deal.stage) : -1;
    const canMoveNext = deal && currentStageIdx >= 0 && currentStageIdx < PIPELINE_STAGES.length - 2;

    // ─── Collapsed state ───
    if (!sidebarOpen) {
        return (
            <div className={`${containerClassName || 'hidden lg:flex'} flex-col items-center py-4 px-1.5 border-l border-white/[0.04] bg-card/40`}>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 transition-all" onClick={onToggle}>
                                <PanelRightOpen className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs">Abrir Eva</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        );
    }

    // ─── Empty / Group state ───
    if (!chat || chat.isGroup) {
        return (
            <div className={`${containerClassName || 'hidden lg:flex'} w-[360px] shrink-0 flex-col border-l border-white/[0.04] bg-card/40 backdrop-blur-md`}>
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.04]">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/10">
                            <Bot className="w-4 h-4 text-emerald-500" />
                        </div>
                        <span className="text-[13px] font-bold text-emerald-500">Eva</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground" onClick={onToggle}>
                        <PanelRightClose className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center">
                        <div className="h-16 w-16 rounded-2xl bg-emerald-500/5 flex items-center justify-center mx-auto mb-4">
                            <Bot className="w-8 h-8 text-emerald-500/20" />
                        </div>
                        <p className="text-[12px] text-muted-foreground/50 font-medium">
                            {chat?.isGroup ? "Análise não disponível para grupos" : "Selecione uma conversa"}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Full sidebar ───
    return (
        <div className={`${containerClassName || 'hidden lg:flex'} w-[360px] shrink-0 flex-col border-l border-white/[0.04] bg-card/40 backdrop-blur-md overflow-hidden`}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04] shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 shadow-sm shadow-emerald-500/10">
                        <Bot className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                        <span className="text-[13px] font-bold text-emerald-500">Eva</span>
                        <span className="text-[9px] text-muted-foreground/60 ml-1.5 font-medium">Assistente de Vendas</span>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground" onClick={onToggle}>
                    <PanelRightClose className="h-4 w-4" />
                </Button>
            </div>

            <ScrollArea className="flex-1">
                <div className="flex flex-col">
                    {/* 1. LEAD IDENTITY */}
                    <SidebarSection title="Contato" icon={User} defaultOpen={true}>
                        <div className="flex items-start gap-3">
                            <Avatar className="h-12 w-12 ring-2 ring-emerald-500/10 shrink-0">
                                {chat.profilePicUrl && <AvatarImage src={chat.profilePicUrl} />}
                                <AvatarFallback className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 text-emerald-500 font-bold text-[12px]">
                                    {chat.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-[14px] font-bold text-foreground truncate">{chat.name}</h3>
                                {chat.phone && (
                                    <p className="text-[11px] text-muted-foreground/70 flex items-center gap-1 mt-0.5">
                                        <Phone className="w-3 h-3" /> {chat.phone}
                                    </p>
                                )}
                                <div className="flex flex-wrap gap-1.5 mt-2.5">
                                    {aiSuggestion?.temperature && (
                                        <Badge variant="outline" className={`text-[9px] font-bold gap-0.5 h-5 ${tempColor(aiSuggestion.temperature)}`}>
                                            <TempIcon temp={aiSuggestion.temperature} />
                                            {aiSuggestion.temperature?.charAt(0).toUpperCase() + aiSuggestion.temperature?.slice(1)}
                                        </Badge>
                                    )}
                                    {aiSuggestion?.sentiment && aiSuggestion.sentiment !== "Limite diário atingido" && (
                                        <Badge variant="outline" className="text-[9px] font-bold border-violet-500/30 text-violet-400 bg-violet-500/10 gap-0.5 h-5">
                                            <Brain className="w-3 h-3" />
                                            {aiSuggestion.sentiment}
                                        </Badge>
                                    )}
                                    {aiSuggestion?.stage && (
                                        <Badge variant="outline" className="text-[9px] font-bold border-emerald-500/30 text-emerald-400 bg-emerald-500/10 gap-0.5 h-5">
                                            <TrendingUp className="w-3 h-3" />
                                            {aiSuggestion.stage}
                                        </Badge>
                                    )}
                                    {deal && (
                                        <Badge variant="outline" className="text-[9px] font-bold border-emerald-500/30 text-emerald-400 bg-emerald-500/10 gap-0.5 h-5">
                                            <Target className="w-3 h-3" />
                                            CRM
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                    </SidebarSection>

                    {/* 2. CRM ACTIONS */}
                    <SidebarSection title="Acoes CRM" icon={ClipboardList} defaultOpen={true}
                        badge={deal ? (
                            <Badge variant="outline" className="text-[8px] h-4 px-1.5 font-bold border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                                Vinculado
                            </Badge>
                        ) : crmSearched ? (
                            <Badge variant="outline" className="text-[8px] h-4 px-1.5 font-bold border-amber-500/30 text-amber-400 bg-amber-500/10">
                                Novo
                            </Badge>
                        ) : null}
                    >
                        {crmLoading ? (
                            <div className="flex items-center gap-2 py-3 justify-center">
                                <Loader2 className="w-4 h-4 animate-spin text-emerald-500/50" />
                                <span className="text-[11px] text-muted-foreground/60">Buscando no CRM...</span>
                            </div>
                        ) : deal ? (
                            <div className="space-y-3">
                                {/* Deal Card */}
                                <div className="rounded-xl bg-gradient-to-br from-card/80 to-card/40 border border-white/[0.06] overflow-hidden">
                                    <div className="px-3 pt-3 pb-2">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <h4 className="text-[13px] font-bold text-foreground truncate">{deal.title}</h4>
                                                    {deal.is_hot && (
                                                        <span className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/20">
                                                            <Flame className="w-3 h-3 text-orange-400" />
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="text-[15px] font-extrabold text-emerald-400 leading-none shrink-0">
                                                {deal.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            {stageInfo && (
                                                <Badge variant="outline" className={`text-[9px] font-bold h-5 ${stageInfo.bgColor} ${stageInfo.color} ${stageInfo.borderColor}`}>
                                                    {stageInfo.title}
                                                </Badge>
                                            )}
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-14 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${deal.probability >= 70 ? 'bg-emerald-500' : deal.probability >= 40 ? 'bg-amber-500' : 'bg-emerald-500/60'}`}
                                                        style={{ width: `${deal.probability}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] font-bold text-foreground/60">{deal.probability}%</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-3 py-2 border-t border-white/[0.03] space-y-1.5">
                                        {deal.customer_phone && (
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                                                <span className="text-[10px] text-muted-foreground/60">{deal.customer_phone}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                                            <span className="text-[10px] text-muted-foreground/60">
                                                Criado em {new Date(deal.created_at).toLocaleDateString("pt-BR")}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="px-3 py-2 border-t border-white/[0.03] flex gap-2">
                                        <Button size="sm" variant="outline"
                                            className="flex-1 h-7 text-[10px] font-bold border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 gap-1"
                                            onClick={() => { setShowSaleForm(true); setShowProposalForm(false); }}>
                                            <DollarSign className="w-3 h-3" /> Venda
                                        </Button>
                                        <Button size="sm" variant="outline"
                                            className="flex-1 h-7 text-[10px] font-bold border-blue-500/20 text-blue-400 hover:bg-blue-500/10 gap-1"
                                            onClick={() => { setShowProposalForm(true); setShowSaleForm(false); }}>
                                            <FileText className="w-3 h-3" /> Proposta
                                        </Button>
                                        <Button size="sm" variant="outline"
                                            className="h-7 w-7 p-0 border-white/10 text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/5"
                                            onClick={() => window.open(`/deals/${deal.id}`, '_blank')} title="Ver no Pipeline">
                                            <ArrowRight className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>

                                {showSaleForm && (
                                    <RegisterSaleForm phone={chat.phone || ""} companyId={activeCompanyId || companyId || null}
                                        onClose={() => setShowSaleForm(false)} onSuccess={refreshCrm} />
                                )}
                                {showProposalForm && (
                                    <CreateProposalForm contactName={chat.name} onClose={() => setShowProposalForm(false)} />
                                )}

                                {/* Stage Selector */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider flex items-center gap-1">
                                        <TrendingUp className="w-3 h-3" /> Mover no Kanban
                                    </label>
                                    <div className="flex gap-0.5 mb-1.5">
                                        {PIPELINE_STAGES.map((s, idx) => (
                                            <button key={s.id} onClick={() => handleStageChange(s.id)} disabled={stageUpdating}
                                                className={`flex-1 h-1.5 rounded-full transition-all ${
                                                    idx <= currentStageIdx
                                                        ? s.id === "closed_lost" ? "bg-rose-500" : "bg-emerald-500"
                                                        : "bg-white/[0.06]"
                                                } hover:opacity-80`}
                                                title={s.title} />
                                        ))}
                                    </div>
                                    <Select value={deal.stage} onValueChange={handleStageChange} disabled={stageUpdating}>
                                        <SelectTrigger className="h-8 bg-background/60 border-white/[0.06] text-[11px] text-foreground">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card border-white/10">
                                            {PIPELINE_STAGES.map(s => (
                                                <SelectItem key={s.id} value={s.id} className="text-foreground focus:bg-white/5 text-[11px]">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${s.bgColor.replace('/10', '')} ${s.color}`} />
                                                        {s.title}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {canMoveNext && (
                                    <Button size="sm" variant="outline"
                                        className="w-full h-7 text-[10px] font-bold border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 gap-1"
                                        onClick={handleMoveNext} disabled={stageUpdating}>
                                        <ChevronRight className="w-3 h-3" />
                                        Avancar para {PIPELINE_STAGES[currentStageIdx + 1]?.title}
                                    </Button>
                                )}

                                {/* Add Note */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider flex items-center gap-1">
                                        <StickyNote className="w-3 h-3" /> Adicionar Nota
                                    </label>
                                    <div className="flex gap-1.5">
                                        <Input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Escreva uma nota..."
                                            className="h-7 text-[11px] bg-background/60 border-white/[0.06] text-foreground placeholder:text-muted-foreground/40 flex-1"
                                            onKeyDown={(e) => e.key === "Enter" && handleAddNote()} />
                                        <Button size="icon" variant="ghost"
                                            className="h-7 w-7 text-emerald-500 hover:bg-emerald-500/10 shrink-0"
                                            onClick={handleAddNote} disabled={addingNote || !noteText.trim()}>
                                            {addingNote ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : crmSearched ? (
                            <div className="space-y-3">
                                <div className="rounded-xl bg-background/20 border border-dashed border-white/[0.08] p-3 text-center">
                                    <Target className="w-6 h-6 text-muted-foreground/20 mx-auto mb-2" />
                                    <p className="text-[11px] text-muted-foreground/60 font-medium mb-0.5">Contato não encontrado no CRM</p>
                                    <p className="text-[10px] text-muted-foreground/40">Crie um lead para acompanhar</p>
                                </div>

                                {!showCreateDeal ? (
                                    <Button size="sm"
                                        className="w-full h-8 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 shadow-sm shadow-emerald-500/20"
                                        onClick={() => { setShowCreateDeal(true); setNewDealTitle(`Lead - ${chat.name}`); }}>
                                        <Plus className="w-3.5 h-3.5" />
                                        Adicionar ao CRM
                                    </Button>
                                ) : (
                                    <div className="space-y-2 rounded-xl bg-background/30 border border-white/[0.06] p-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <Input value={newDealTitle} onChange={(e) => setNewDealTitle(e.target.value)} placeholder="Título do deal"
                                            className="h-8 text-[11px] bg-background/60 border-white/[0.06] text-foreground placeholder:text-muted-foreground/40" />
                                        <Input value={newDealValue} onChange={(e) => setNewDealValue(e.target.value)} placeholder="Valor (R$)"
                                            className="h-8 text-[11px] bg-background/60 border-white/[0.06] text-foreground placeholder:text-muted-foreground/40" />
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px] border-white/10 text-muted-foreground"
                                                onClick={() => setShowCreateDeal(false)}>Cancelar</Button>
                                            <Button size="sm" className="flex-1 h-7 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
                                                onClick={handleCreateDeal} disabled={creatingDeal}>
                                                {creatingDeal ? <Loader2 className="w-3 h-3 animate-spin" /> : "Criar Lead"}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 py-2 justify-center">
                                <span className="text-[11px] text-muted-foreground/40">Aguardando dados...</span>
                            </div>
                        )}
                    </SidebarSection>

                    {/* 3. AI ANALYSIS */}
                    <SidebarSection title="Análise Eva" icon={Brain} defaultOpen={true}
                        badge={remaining !== null ? (
                            <Badge variant="outline" className={`text-[8px] h-4 px-1.5 font-bold ${remaining <= 2 ? "border-orange-500/30 text-orange-400 bg-orange-500/10" : "border-white/10 text-muted-foreground/60"}`}>
                                {remaining}/10
                            </Badge>
                        ) : null}
                    >
                        {/* Analyze Button — Redesigned */}
                        <button
                            className={`w-full h-10 rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 mb-3 transition-all ${
                                aiThinking
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : rateLimited
                                    ? "bg-muted/30 text-muted-foreground/50 cursor-not-allowed border border-white/[0.04]"
                                    : "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:from-emerald-500 hover:to-emerald-400 active:scale-[0.98]"
                            }`}
                            onClick={onAnalyze}
                            disabled={aiThinking || rateLimited}
                        >
                            {aiThinking ? (
                                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Eva analisando...</>
                            ) : rateLimited ? (
                                <><AlertCircle className="w-3.5 h-3.5" /> Limite atingido (10/dia)</>
                            ) : (
                                <><Sparkles className="w-3.5 h-3.5" /> Analisar com Eva</>
                            )}
                        </button>

                        {/* Analysis Results */}
                        {aiSuggestion && !aiThinking && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                {/* Sentiment */}
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={`text-[9px] font-bold gap-0.5 ${tempColor(aiSuggestion.temperature)}`}>
                                        <TempIcon temp={aiSuggestion.temperature} />
                                        {aiSuggestion.sentiment}
                                    </Badge>
                                </div>

                                {/* Next Action */}
                                {aiSuggestion.nextAction && (
                                    <div className="flex items-start gap-2 bg-emerald-500/8 border border-emerald-500/15 rounded-xl px-3 py-2.5">
                                        <Target className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                        <span className="text-[10px] font-bold text-emerald-400 leading-tight">{aiSuggestion.nextAction}</span>
                                    </div>
                                )}

                                {/* Strategy */}
                                {aiSuggestion.strategy?.length > 0 && (
                                    <div className="space-y-1.5">
                                        <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider">Estrategia</span>
                                        {aiSuggestion.strategy.map((s: string, i: number) => (
                                            <div key={i} className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/10 rounded-xl px-3 py-2">
                                                <Zap className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" />
                                                <span className="text-[10px] text-blue-300/80 font-medium leading-tight">{s}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Objections */}
                                {aiSuggestion.objections?.length > 0 && (
                                    <div className="space-y-1.5">
                                        <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3 text-orange-400" />
                                            Objecoes ({aiSuggestion.objections.length})
                                        </span>
                                        {aiSuggestion.objections.map((obj: string, i: number) => (
                                            <p key={i} className="text-[10px] text-orange-300/60 pl-3 border-l-2 border-orange-500/20 leading-snug">{obj}</p>
                                        ))}
                                    </div>
                                )}

                                {/* Draft Message */}
                                {aiSuggestion.draft && (
                                    <div className="space-y-1.5">
                                        <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider">Mensagem sugerida</span>
                                        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/15 rounded-xl p-3">
                                            <p className="text-[11px] text-foreground/75 leading-relaxed italic mb-2.5">"{aiSuggestion.draft}"</p>
                                            <div className="flex gap-1.5">
                                                <Button size="sm" variant="ghost"
                                                    className="h-6 px-2 text-[9px] text-muted-foreground hover:text-foreground gap-1"
                                                    onClick={() => navigator.clipboard.writeText(aiSuggestion.draft)}>
                                                    <Copy className="w-3 h-3" /> Copiar
                                                </Button>
                                                <Button size="sm"
                                                    className="h-6 px-3 text-[9px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-1"
                                                    onClick={onUseDraft}>
                                                    Usar <ArrowRight className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Empty state */}
                        {!aiSuggestion && !aiThinking && (
                            <div className="text-center py-4">
                                <div className="h-12 w-12 rounded-xl bg-emerald-500/5 flex items-center justify-center mx-auto mb-3">
                                    <Bot className="w-6 h-6 text-emerald-500/15" />
                                </div>
                                <p className="text-[10px] text-muted-foreground/40 font-medium">
                                    Clique em "Analisar com Eva" para insights sobre esta conversa
                                </p>
                            </div>
                        )}
                    </SidebarSection>

                    {/* 4. HISTÓRICO */}
                    {deal && noteHistory.length > 0 && (
                        <SidebarSection title="Histórico" icon={History} defaultOpen={false}>
                            <div className="space-y-2">
                                {noteHistory.map((entry, i) => (
                                    <div key={i} className="flex items-start gap-2 text-[10px]">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/30 mt-1.5 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            {entry.date && (
                                                <span className="text-muted-foreground/40 text-[9px] flex items-center gap-1 mb-0.5">
                                                    <Clock className="w-2.5 h-2.5" /> {entry.date}
                                                </span>
                                            )}
                                            <p className="text-foreground/60 leading-snug break-words">{entry.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </SidebarSection>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
};
