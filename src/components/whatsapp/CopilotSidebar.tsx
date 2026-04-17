import React, { useState, useEffect, useMemo } from "react";
import {
    Sparkles, PanelRightOpen, PanelRightClose, Phone, Brain, TrendingUp, Target,
    AlertCircle, Loader2, ChevronRight, Plus, Clock, History,
    Flame, Snowflake, ThermometerSun, Zap, Copy, ArrowRight, StickyNote,
    DollarSign, FileText, ClipboardList, SendHorizonal, Wand2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
    if (temp === "quente") return <Flame className="w-3 h-3" />;
    if (temp === "frio") return <Snowflake className="w-3 h-3" />;
    return <ThermometerSun className="w-3 h-3" />;
};

// EVA AVATAR — minimalist mark (no gradient/glow)
const EvaAvatar = ({ size = "md", pulse = false }: { size?: "sm" | "md" | "lg"; pulse?: boolean }) => {
    const dim = size === "sm" ? "h-6 w-6" : size === "lg" ? "h-9 w-9" : "h-7 w-7";
    const icon = size === "sm" ? "w-3 h-3" : size === "lg" ? "w-4 h-4" : "w-3.5 h-3.5";
    return (
        <div className={`${dim} shrink-0 rounded-md bg-violet-500/10 border border-violet-500/25 flex items-center justify-center ${pulse ? 'animate-pulse' : ''}`}>
            <Sparkles className={`${icon} text-violet-300`} strokeWidth={2} />
        </div>
    );
};

const buildEvaSpeech = (suggestion: any, leadName: string): string => {
    if (!suggestion) return "";
    const firstName = leadName.split(" ")[0] || leadName;
    const temp = suggestion.temperature;
    const tempTxt = temp === "quente" ? "tá quente" : temp === "frio" ? "tá meio fria" : "tá morna";
    const next = suggestion.nextAction ? ` Acho que o melhor passo agora é ${String(suggestion.nextAction).toLowerCase().replace(/\.$/, "")}.` : "";
    return `Olhei a conversa com ${firstName} — ela ${tempTxt}.${next}`;
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
    const [askInput, setAskInput] = useState("");

    useEffect(() => {
        setShowCreateDeal(false);
        setNewDealTitle("");
        setNewDealValue("");
        setNoteText("");
        setShowSaleForm(false);
        setShowProposalForm(false);
        setAskInput("");
    }, [chat?.id]);

    const handleStageChange = async (newStage: string) => {
        if (!deal) return;
        setStageUpdating(true);
        try {
            await updateDealStage(deal.id, newStage);
            toast.success("Estágio atualizado");
            refreshCrm();
        } catch {
            toast.error("Erro ao atualizar estágio");
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
            toast.success("Nota adicionada");
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
            toast.success("Lead criado no CRM");
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

    const handleAskEva = () => {
        if (!askInput.trim()) return;
        toast.info("Em breve você poderá conversar direto com a Eva", {
            description: "Por enquanto, use 'Analisar com Eva' para insights desta conversa.",
        });
        setAskInput("");
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

    const evaSpeech = useMemo(
        () => (aiSuggestion && chat ? buildEvaSpeech(aiSuggestion, chat.name) : ""),
        [aiSuggestion, chat?.name]
    );

    // ─── Collapsed state ───
    if (!sidebarOpen) {
        return (
            <div className={`${containerClassName || 'hidden md:flex'} flex-col items-center py-3 px-2 border-l border-border bg-background`}>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-white/[0.04] transition-colors" onClick={onToggle}>
                                <PanelRightOpen className="h-4 w-4" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-[10px]">Abrir Eva</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        );
    }

    // ─── Empty / Group state ───
    if (!chat || chat.isGroup) {
        return (
            <div className={`${containerClassName || 'hidden md:flex'} w-[320px] shrink-0 flex-col border-l border-border bg-background`}>
                <div className="flex items-center justify-between px-4 h-14 border-b border-border shrink-0">
                    <div className="flex items-center gap-2">
                        <EvaAvatar size="sm" />
                        <div className="flex flex-col leading-none">
                            <span className="text-[12px] font-semibold text-foreground tracking-tight">Eva</span>
                            <span className="text-[10px] text-muted-foreground/50 mt-0.5">copiloto</span>
                        </div>
                    </div>
                    <button className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-white/[0.04] transition-colors" onClick={onToggle}>
                        <PanelRightClose className="h-4 w-4" />
                    </button>
                </div>
                <div className="flex-1 flex items-center justify-center p-6">
                    <p className="text-[12px] text-muted-foreground/60 text-center max-w-[220px] leading-relaxed">
                        {chat?.isGroup
                            ? "Ainda não analiso grupos — abre uma conversa 1:1."
                            : "Selecione uma conversa para análise."}
                    </p>
                </div>
            </div>
        );
    }

    // ─── Full sidebar ───
    return (
        <div className={`${containerClassName || 'hidden md:flex'} w-[320px] shrink-0 flex-col border-l border-border bg-background overflow-hidden`}>
            {/* ── Header: Eva brand ── */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                    <EvaAvatar size="sm" pulse={aiThinking} />
                    <div className="flex flex-col leading-none">
                        <span className="text-[12px] font-semibold text-foreground tracking-tight">Eva</span>
                        <span className="text-[10px] text-muted-foreground/50 mt-0.5">
                            {aiThinking ? "analisando..." : "copiloto"}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {remaining !== null && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/[0.03] border ${remaining <= 2 ? "border-orange-500/25 text-orange-400" : "border-border text-muted-foreground/70"}`}>
                            {remaining}/10
                        </span>
                    )}
                    <button className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-white/[0.04] transition-colors" onClick={onToggle}>
                        <PanelRightClose className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="flex flex-col">
                    {/* ── Lead identity ── */}
                    <div className="px-4 py-3 border-b border-border">
                        <div className="flex items-center gap-2.5">
                            <Avatar className="h-9 w-9 rounded-md shrink-0">
                                {chat.profilePicUrl && <AvatarImage src={chat.profilePicUrl} className="rounded-md" />}
                                <AvatarFallback className="bg-white/[0.04] text-muted-foreground text-[11px] font-semibold rounded-md">
                                    {chat.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-[13px] font-semibold text-foreground truncate tracking-tight leading-tight">{chat.name}</h3>
                                {chat.phone && (
                                    <p className="text-[10.5px] text-muted-foreground/60 truncate flex items-center gap-1 mt-0.5">
                                        <Phone className="w-2.5 h-2.5" /> {chat.phone}
                                    </p>
                                )}
                            </div>
                        </div>
                        {(aiSuggestion?.temperature || deal || stageInfo) && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {aiSuggestion?.temperature && (
                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] flex items-center gap-1 ${tempColor(aiSuggestion.temperature).split(' ').filter(c => c.startsWith('text-')).join(' ') || 'text-muted-foreground'}`}>
                                        <TempIcon temp={aiSuggestion.temperature} />
                                        {aiSuggestion.temperature?.charAt(0).toUpperCase() + aiSuggestion.temperature?.slice(1)}
                                    </span>
                                )}
                                {deal && (
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] text-emerald-400 flex items-center gap-1">
                                        <Target className="w-2.5 h-2.5" />
                                        {deal.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                                    </span>
                                )}
                                {stageInfo && (
                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] flex items-center gap-1 ${stageInfo.color}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${stageInfo.bgColor.replace('/10', '/70')}`} />
                                        {stageInfo.title}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Eva hero ── */}
                    <div className="px-4 py-3.5 border-b border-border">
                        {aiSuggestion && !aiThinking && evaSpeech && (
                            <div className="flex items-start gap-2 mb-3">
                                <EvaAvatar size="sm" />
                                <p className="flex-1 text-[12px] text-foreground/85 leading-[1.5] pt-0.5">
                                    {evaSpeech}
                                </p>
                            </div>
                        )}

                        {aiThinking && (
                            <div className="flex items-center gap-2 mb-3">
                                <EvaAvatar size="sm" pulse />
                                <span className="text-[11px] text-violet-300/70 italic pt-0.5">Deixa eu ler essa conversa...</span>
                            </div>
                        )}

                        {!aiSuggestion && !aiThinking && (
                            <div className="flex items-start gap-2 mb-3">
                                <EvaAvatar size="sm" />
                                <p className="flex-1 text-[12px] text-foreground/75 leading-[1.5] pt-0.5">
                                    Oi! Quer que eu analise essa conversa?
                                </p>
                            </div>
                        )}

                        {/* Draft */}
                        {aiSuggestion?.draft && !aiThinking && (
                            <div className="rounded-md bg-violet-500/[0.04] border border-violet-500/20 p-2.5">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <Wand2 className="w-3 h-3 text-violet-300" />
                                    <span className="text-[9.5px] font-semibold text-violet-300/80 uppercase tracking-wider">Sugestão</span>
                                </div>
                                <p className="text-[12px] text-foreground/85 leading-[1.5] mb-2.5">
                                    "{aiSuggestion.draft}"
                                </p>
                                <div className="flex gap-1.5">
                                    <button
                                        className="flex-1 h-7 rounded-md text-[11px] font-medium bg-violet-500/90 text-white hover:bg-violet-500 transition-colors flex items-center justify-center gap-1.5"
                                        onClick={onUseDraft}
                                    >
                                        <SendHorizonal className="w-3 h-3" /> Usar mensagem
                                    </button>
                                    <button
                                        className="h-7 w-7 rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-white/[0.04] transition-colors flex items-center justify-center"
                                        onClick={() => {
                                            navigator.clipboard.writeText(aiSuggestion.draft);
                                            toast.success("Copiado");
                                        }}
                                        title="Copiar"
                                    >
                                        <Copy className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Analyze trigger */}
                        {!aiSuggestion && (
                            <button
                                className={`w-full h-8 rounded-md text-[11.5px] font-medium flex items-center justify-center gap-1.5 transition-colors ${
                                    aiThinking
                                        ? "bg-violet-500/5 text-violet-300 border border-violet-500/20"
                                        : rateLimited
                                        ? "bg-white/[0.02] text-muted-foreground/50 cursor-not-allowed border border-border"
                                        : "bg-violet-500/90 text-white hover:bg-violet-500"
                                }`}
                                onClick={onAnalyze}
                                disabled={aiThinking || rateLimited}
                            >
                                {aiThinking ? (
                                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analisando...</>
                                ) : rateLimited ? (
                                    <><AlertCircle className="w-3.5 h-3.5" /> Limite atingido (10/dia)</>
                                ) : (
                                    <><Sparkles className="w-3.5 h-3.5" /> Analisar com Eva</>
                                )}
                            </button>
                        )}

                        {aiSuggestion && !aiThinking && !rateLimited && (
                            <button
                                className="mt-2 w-full h-6 rounded-md text-[10.5px] text-muted-foreground/60 hover:text-foreground hover:bg-white/[0.04] transition-colors flex items-center justify-center gap-1.5"
                                onClick={onAnalyze}
                            >
                                <Sparkles className="w-3 h-3" /> Reanalisar
                            </button>
                        )}
                    </div>

                    {/* ── Insights ── */}
                    {aiSuggestion && !aiThinking && (
                        <SidebarSection title="Insights" icon={Brain} defaultOpen={false}>
                            <div className="space-y-2">
                                {aiSuggestion.nextAction && (
                                    <div className="flex items-start gap-2 rounded-md bg-white/[0.02] border border-border px-2.5 py-2">
                                        <Target className="w-3 h-3 text-violet-300 shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <span className="text-[9.5px] font-semibold text-muted-foreground/60 uppercase tracking-wider block mb-0.5">Próximo passo</span>
                                            <span className="text-[11px] text-foreground/85 leading-snug">{aiSuggestion.nextAction}</span>
                                        </div>
                                    </div>
                                )}

                                {aiSuggestion.strategy?.length > 0 && (
                                    <div className="space-y-1">
                                        <span className="text-[9.5px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Estratégia</span>
                                        {aiSuggestion.strategy.map((s: string, i: number) => (
                                            <div key={i} className="flex items-start gap-2 rounded-md bg-white/[0.02] border border-border px-2.5 py-1.5">
                                                <Zap className="w-3 h-3 text-violet-300/70 shrink-0 mt-0.5" />
                                                <span className="text-[10.5px] text-foreground/70 leading-snug">{s}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {aiSuggestion.objections?.length > 0 && (
                                    <div className="space-y-1">
                                        <span className="text-[9.5px] font-semibold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3 text-orange-400" />
                                            Objeções
                                        </span>
                                        {aiSuggestion.objections.map((obj: string, i: number) => (
                                            <p key={i} className="text-[10.5px] text-orange-300/70 pl-2.5 border-l-2 border-orange-500/20 leading-snug">{obj}</p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </SidebarSection>
                    )}

                    {/* ── CRM Actions ── */}
                    <SidebarSection
                        title="CRM"
                        icon={ClipboardList}
                        defaultOpen={false}
                        badge={deal ? (
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                Vinculado
                            </span>
                        ) : crmSearched ? (
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                Novo
                            </span>
                        ) : null}
                    >
                        {crmLoading ? (
                            <div className="flex items-center gap-2 py-3 justify-center">
                                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground/50" />
                                <span className="text-[11px] text-muted-foreground/60">Buscando...</span>
                            </div>
                        ) : deal ? (
                            <div className="space-y-2.5">
                                {/* Deal Card */}
                                <div className="rounded-md bg-white/[0.02] border border-border overflow-hidden">
                                    <div className="px-2.5 pt-2.5 pb-2">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <h4 className="text-[12.5px] font-semibold text-foreground truncate tracking-tight">{deal.title}</h4>
                                                    {deal.is_hot && <Flame className="w-3 h-3 text-orange-400 shrink-0" />}
                                                </div>
                                            </div>
                                            <span className="text-[13px] font-bold text-emerald-400 tabular-nums shrink-0">
                                                {deal.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            {stageInfo && (
                                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] flex items-center gap-1 ${stageInfo.color}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${stageInfo.bgColor.replace('/10', '/70')}`} />
                                                    {stageInfo.title}
                                                </span>
                                            )}
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-12 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${deal.probability >= 70 ? 'bg-emerald-500' : deal.probability >= 40 ? 'bg-amber-500' : 'bg-emerald-500/60'}`}
                                                        style={{ width: `${deal.probability}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] font-medium text-muted-foreground/60 tabular-nums">{deal.probability}%</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-2.5 py-1.5 border-t border-border space-y-1">
                                        {deal.customer_phone && (
                                            <div className="flex items-center gap-1.5">
                                                <Phone className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                                                <span className="text-[10px] text-muted-foreground/60">{deal.customer_phone}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                                            <span className="text-[10px] text-muted-foreground/60">
                                                {new Date(deal.created_at).toLocaleDateString("pt-BR")}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="px-2.5 py-1.5 border-t border-border flex gap-1">
                                        <button
                                            className="flex-1 h-7 rounded-md text-[10.5px] font-medium text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/[0.06] transition-colors flex items-center justify-center gap-1"
                                            onClick={() => { setShowSaleForm(true); setShowProposalForm(false); }}>
                                            <DollarSign className="w-3 h-3" /> Venda
                                        </button>
                                        <button
                                            className="flex-1 h-7 rounded-md text-[10.5px] font-medium text-muted-foreground hover:text-blue-400 hover:bg-blue-500/[0.06] transition-colors flex items-center justify-center gap-1"
                                            onClick={() => { setShowProposalForm(true); setShowSaleForm(false); }}>
                                            <FileText className="w-3 h-3" /> Proposta
                                        </button>
                                        <button
                                            className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors flex items-center justify-center"
                                            onClick={() => window.open(`/deals/${deal.id}`, '_blank')} title="Pipeline">
                                            <ArrowRight className="w-3 h-3" />
                                        </button>
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
                                    <label className="text-[9.5px] font-semibold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1">
                                        <TrendingUp className="w-3 h-3" /> Pipeline
                                    </label>
                                    <div className="flex gap-0.5 mb-1">
                                        {PIPELINE_STAGES.map((s, idx) => (
                                            <button key={s.id} onClick={() => handleStageChange(s.id)} disabled={stageUpdating}
                                                className={`flex-1 h-1 rounded-full transition-opacity ${
                                                    idx <= currentStageIdx
                                                        ? s.id === "closed_lost" ? "bg-rose-500/70" : "bg-emerald-500/70"
                                                        : "bg-white/[0.06]"
                                                } hover:opacity-80`}
                                                title={s.title} />
                                        ))}
                                    </div>
                                    <Select value={deal.stage} onValueChange={handleStageChange} disabled={stageUpdating}>
                                        <SelectTrigger className="h-7 bg-white/[0.02] border-border text-[11px] text-foreground rounded-md">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-popover border-border">
                                            {PIPELINE_STAGES.map(s => (
                                                <SelectItem key={s.id} value={s.id} className="text-foreground focus:bg-white/[0.04] text-[11px]">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${s.bgColor.replace('/10', '/70')}`} />
                                                        {s.title}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {canMoveNext && (
                                    <button
                                        className="w-full h-7 rounded-md text-[10.5px] font-medium text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/[0.06] border border-border transition-colors flex items-center justify-center gap-1"
                                        onClick={handleMoveNext} disabled={stageUpdating}>
                                        <ChevronRight className="w-3 h-3" />
                                        Avançar para {PIPELINE_STAGES[currentStageIdx + 1]?.title}
                                    </button>
                                )}

                                {/* Add Note */}
                                <div className="space-y-1.5">
                                    <label className="text-[9.5px] font-semibold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1">
                                        <StickyNote className="w-3 h-3" /> Nota
                                    </label>
                                    <div className="flex gap-1">
                                        <Input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Escreva uma nota..."
                                            className="h-7 text-[11px] bg-white/[0.02] border-border text-foreground placeholder:text-muted-foreground/40 flex-1 rounded-md"
                                            onKeyDown={(e) => e.key === "Enter" && handleAddNote()} />
                                        <button
                                            className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors flex items-center justify-center shrink-0 disabled:opacity-40"
                                            onClick={handleAddNote} disabled={addingNote || !noteText.trim()}>
                                            {addingNote ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : crmSearched ? (
                            <div className="space-y-2.5">
                                <div className="rounded-md bg-white/[0.02] border border-dashed border-border p-3 text-center">
                                    <p className="text-[11px] text-muted-foreground/60 mb-0.5">Contato não está no CRM</p>
                                    <p className="text-[10px] text-muted-foreground/40">Crie um lead para acompanhar</p>
                                </div>

                                {!showCreateDeal ? (
                                    <button
                                        className="w-full h-7 rounded-md text-[11px] font-medium bg-emerald-500/90 text-white hover:bg-emerald-500 transition-colors flex items-center justify-center gap-1"
                                        onClick={() => { setShowCreateDeal(true); setNewDealTitle(`Lead - ${chat.name}`); }}>
                                        <Plus className="w-3.5 h-3.5" />
                                        Adicionar ao CRM
                                    </button>
                                ) : (
                                    <div className="space-y-2 rounded-md bg-white/[0.02] border border-border p-2.5">
                                        <Input value={newDealTitle} onChange={(e) => setNewDealTitle(e.target.value)} placeholder="Título do deal"
                                            className="h-7 text-[11px] bg-white/[0.02] border-border text-foreground placeholder:text-muted-foreground/40 rounded-md" />
                                        <Input value={newDealValue} onChange={(e) => setNewDealValue(e.target.value)} placeholder="Valor (R$)"
                                            className="h-7 text-[11px] bg-white/[0.02] border-border text-foreground placeholder:text-muted-foreground/40 rounded-md" />
                                        <div className="flex gap-1.5">
                                            <button
                                                className="flex-1 h-7 rounded-md text-[10.5px] text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors border border-border"
                                                onClick={() => setShowCreateDeal(false)}>Cancelar</button>
                                            <button
                                                className="flex-1 h-7 rounded-md text-[10.5px] font-medium bg-emerald-500/90 text-white hover:bg-emerald-500 transition-colors flex items-center justify-center disabled:opacity-60"
                                                onClick={handleCreateDeal} disabled={creatingDeal}>
                                                {creatingDeal ? <Loader2 className="w-3 h-3 animate-spin" /> : "Criar Lead"}
                                            </button>
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

                    {/* ── Histórico ── */}
                    {deal && noteHistory.length > 0 && (
                        <SidebarSection title="Histórico" icon={History} defaultOpen={false}>
                            <div className="space-y-2">
                                {noteHistory.map((entry, i) => (
                                    <div key={i} className="flex items-start gap-2 text-[10.5px]">
                                        <div className="w-1 h-1 rounded-full bg-violet-500/50 mt-1.5 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            {entry.date && (
                                                <span className="text-muted-foreground/40 text-[9.5px] flex items-center gap-1 mb-0.5">
                                                    <Clock className="w-2.5 h-2.5" /> {entry.date}
                                                </span>
                                            )}
                                            <p className="text-foreground/65 leading-snug break-words">{entry.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </SidebarSection>
                    )}

                    <div className="h-2" />
                </div>
            </ScrollArea>

            {/* ── Ask Eva ── */}
            <div className="shrink-0 px-3 py-2.5 border-t border-border">
                <div className="flex items-center gap-1.5 rounded-md bg-white/[0.02] border border-border focus-within:border-violet-500/30 transition-colors px-2.5 py-1">
                    <Sparkles className="w-3 h-3 text-violet-400/70 shrink-0" />
                    <input
                        type="text"
                        value={askInput}
                        onChange={(e) => setAskInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAskEva()}
                        placeholder="Pergunte à Eva..."
                        className="flex-1 bg-transparent text-[11.5px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none py-1"
                    />
                    {askInput.trim() && (
                        <button
                            onClick={handleAskEva}
                            className="h-5 w-5 rounded bg-violet-500/90 text-white flex items-center justify-center hover:bg-violet-500 transition-colors shrink-0"
                        >
                            <SendHorizonal className="w-2.5 h-2.5" />
                        </button>
                    )}
                </div>
                <p className="text-[9.5px] text-muted-foreground/40 text-center mt-1.5">
                    Em breve — Eva aprendendo com você
                </p>
            </div>
        </div>
    );
};
