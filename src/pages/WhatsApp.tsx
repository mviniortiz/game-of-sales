import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { MessageCircle, Search, Phone, Send, QrCode, Target, CheckCircle2, Sparkles, Brain, TrendingUp, AlertCircle, RefreshCcw, Loader2, Settings2, Users, ChevronDown, Flame, Snowflake, ThermometerSun, Zap, Copy, ArrowRight, User, StickyNote, PanelRightOpen, PanelRightClose, Plus, ChevronRight, Bot, Paperclip, Mic, Reply, DollarSign, FileText, ClipboardList, X, Clock, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";


import { useEvolutionIntegration } from "@/hooks/useEvolutionAPI";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Pipeline stage definitions (mirrors CRM.tsx) ─────────────────────────
const PIPELINE_STAGES = [
    { id: "lead", title: "Lead", color: "text-gray-400", bgColor: "bg-gray-500/10", borderColor: "border-gray-500/30" },
    { id: "qualification", title: "Qualificacao", color: "text-blue-400", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30" },
    { id: "proposal", title: "Proposta", color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/30" },
    { id: "negotiation", title: "Negociacao", color: "text-amber-400", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/30" },
    { id: "closed_won", title: "Ganho", color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/30" },
    { id: "closed_lost", title: "Perdido", color: "text-rose-400", bgColor: "bg-rose-500/10", borderColor: "border-rose-500/30" },
];

const getStageInfo = (stageId: string) => PIPELINE_STAGES.find(s => s.id === stageId) || PIPELINE_STAGES[0];

// ─── Quick Responses for sales ──────────────────────────────────────────────
const QUICK_RESPONSES = [
    { label: "Saudacao", text: "Ola! Tudo bem? Como posso te ajudar hoje? \u{1F60A}" },
    { label: "Agradecimento", text: "Obrigado pelo seu contato! Fico a disposicao." },
    { label: "Follow-up", text: "Oi! Tudo bem? Estou passando para saber se conseguiu analisar nossa proposta." },
    { label: "Agendar Call", text: "Que tal agendarmos uma call rapida para eu te explicar melhor? Tenho horarios disponiveis amanha." },
    { label: "Enviar Proposta", text: "Vou preparar uma proposta personalizada para voce. Me confirma o melhor email para envio?" },
    { label: "Encerramento", text: "Foi um prazer conversar com voce! Qualquer duvida, estou a disposicao. Tenha um otimo dia! \u{1F64F}" },
];

// ─── AI Sales Copilot — calls GPT-4o-mini via Edge Function (10 analyses/day limit)
export const useCopilot = () => {
    const [aiThinking, setAiThinking] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<any>(null);
    const [remaining, setRemaining] = useState<number | null>(null);
    const [rateLimited, setRateLimited] = useState(false);

    const getAiAnalysis = async (
        chatTextContext: string,
        messages?: Array<{ text: string; sender: "me" | "lead" }>,
        contactName?: string,
        contactPhone?: string,
    ) => {
        if (rateLimited) return;

        setAiThinking(true);
        setAiSuggestion(null);

        try {
            const msgArray = messages || chatTextContext.split("\n").map((line) => {
                const isMe = line.startsWith("[Vendedor]") || line.startsWith("Eu:");
                return {
                    text: line.replace(/^\[(Vendedor|Lead)\]:\s*/, "").replace(/^(Eu|Lead):\s*/, ""),
                    sender: isMe ? "me" as const : "lead" as const,
                };
            }).filter((m) => m.text.trim());

            const { data, error } = await supabase.functions.invoke("whatsapp-copilot", {
                body: {
                    messages: msgArray,
                    contactName: contactName || "Lead",
                    contactPhone: contactPhone || null,
                },
            });

            if (data?.code === "RATE_LIMITED" || data?.remaining === 0) {
                setRateLimited(true);
                setRemaining(0);
                setAiSuggestion({
                    sentiment: "Limite diario atingido",
                    temperature: "morno",
                    strategy: ["Voce usou todas as 10 analises de hoje.", "O limite reseta amanha automaticamente."],
                    draft: "",
                    objections: [],
                    nextAction: "Aguardar reset do limite amanha",
                });
                return;
            }

            if (error || !data?.analysis) {
                console.error("[useCopilot] error:", error || data?.error);
                setAiSuggestion({
                    sentiment: "Analise indisponivel",
                    temperature: "morno",
                    strategy: ["Tente novamente em alguns segundos."],
                    draft: "",
                    objections: [],
                    nextAction: "Aguardar resposta do lead",
                });
                return;
            }

            setAiSuggestion(data.analysis);
            if (data.remaining !== undefined) {
                setRemaining(data.remaining);
            }
        } catch (err) {
            console.error("[useCopilot] unexpected error:", err);
            setAiSuggestion({
                sentiment: "Erro ao analisar",
                temperature: "morno",
                strategy: ["Servico de IA temporariamente indisponivel."],
                draft: "",
                objections: [],
                nextAction: "Tentar novamente",
            });
        } finally {
            setAiThinking(false);
        }
    };

    return { aiThinking, aiSuggestion, getAiAnalysis, setAiSuggestion, remaining, rateLimited };
};

// ─── Temperature helpers ────────────────────────────────────────────────────
const TempIcon = ({ temp }: { temp: string }) => {
    if (temp === "quente") return <Flame className="w-3.5 h-3.5" />;
    if (temp === "frio") return <Snowflake className="w-3.5 h-3.5" />;
    return <ThermometerSun className="w-3.5 h-3.5" />;
};

const tempColor = (temp: string) => {
    if (temp === "quente") return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    if (temp === "frio") return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    return "bg-amber-500/15 text-amber-400 border-amber-500/30";
};

// ─── CRM Deal lookup hook ───────────────────────────────────────────────────
interface CrmDeal {
    id: string;
    title: string;
    value: number;
    stage: string;
    customer_name: string;
    customer_phone: string | null;
    notes: string | null;
    is_hot: boolean | null;
    probability: number;
    created_at: string;
    user_id: string;
}

const useCrmLookup = (phone: string | undefined | null) => {
    const [deal, setDeal] = useState<CrmDeal | null>(null);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const lastPhoneRef = useRef<string>("");

    const searchDeal = useCallback(async (phoneToSearch: string) => {
        if (!phoneToSearch) { setDeal(null); setSearched(false); return; }

        // Normalize phone: remove all non-digits
        const digits = phoneToSearch.replace(/\D/g, "");
        if (digits.length < 8) { setDeal(null); setSearched(true); return; }

        setLoading(true);
        try {
            // Search deals by customer_phone (partial match: phone may contain country code variations)
            const { data, error } = await supabase
                .from("deals")
                .select("*")
                .or(`customer_phone.ilike.%${digits.slice(-8)}%,customer_phone.ilike.%${digits}%`)
                .order("created_at", { ascending: false })
                .limit(1);

            if (error) {
                console.error("[CRM lookup]", error);
                setDeal(null);
            } else {
                setDeal(data && data.length > 0 ? data[0] as CrmDeal : null);
            }
        } catch (err) {
            console.error("[CRM lookup] unexpected:", err);
            setDeal(null);
        } finally {
            setLoading(false);
            setSearched(true);
        }
    }, []);

    // Auto-search when phone changes
    useEffect(() => {
        const digits = (phone || "").replace(/\D/g, "");
        if (digits === lastPhoneRef.current) return;
        lastPhoneRef.current = digits;
        setSearched(false);
        setDeal(null);
        if (digits.length >= 8) {
            searchDeal(digits);
        }
    }, [phone, searchDeal]);

    const refresh = useCallback(() => {
        const digits = (phone || "").replace(/\D/g, "");
        if (digits.length >= 8) searchDeal(digits);
    }, [phone, searchDeal]);

    return { deal, loading, searched, refresh };
};

// ─── Update deal stage ──────────────────────────────────────────────────────
const updateDealStage = async (dealId: string, newStage: string) => {
    const probMap: Record<string, number> = {
        lead: 10, qualification: 25, proposal: 55, negotiation: 80, closed_won: 100, closed_lost: 0,
    };
    const { error } = await supabase
        .from("deals")
        .update({ stage: newStage as any, probability: probMap[newStage] ?? 10 })
        .eq("id", dealId);
    if (error) throw error;
};

// ─── Add note to deal ───────────────────────────────────────────────────────
const addNoteToDeal = async (dealId: string, note: string) => {
    // Append to existing notes
    const { data: existing } = await supabase
        .from("deals")
        .select("notes")
        .eq("id", dealId)
        .single();

    const currentNotes = existing?.notes || "";
    const timestamp = new Date().toLocaleString("pt-BR");
    const updatedNotes = currentNotes
        ? `${currentNotes}\n\n[${timestamp}] ${note}`
        : `[${timestamp}] ${note}`;

    const { error } = await supabase
        .from("deals")
        .update({ notes: updatedNotes })
        .eq("id", dealId);
    if (error) throw error;
};

// ═══════════════════════════════════════════════════════════════════════════
// Collapsible Section component for the sidebar
// ═══════════════════════════════════════════════════════════════════════════
const SidebarSection = ({ title, icon: Icon, children, defaultOpen = true, badge }: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    defaultOpen?: boolean;
    badge?: React.ReactNode;
}) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-white/5 last:border-b-0">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-2 min-w-0">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">{title}</span>
                    {badge}
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${open ? "" : "-rotate-90"}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-200 ${open ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}>
                <div className="px-4 pb-3">{children}</div>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// REGISTER SALE MINI FORM
// ═══════════════════════════════════════════════════════════════════════════
const RegisterSaleForm = ({ phone, companyId, onClose, onSuccess }: {
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
        if (!product.trim()) { toast.error("Informe o produto/servico"); return; }
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
            console.error("[RegisterSale]", err);
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
            <Input
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="Produto / Servico"
                className="h-8 text-[11px] bg-background/60 border-white/10 text-foreground placeholder:text-muted-foreground/50"
            />
            <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Valor (R$)"
                className="h-8 text-[11px] bg-background/60 border-white/10 text-foreground placeholder:text-muted-foreground/50"
            />
            <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observacoes (opcional)"
                rows={2}
                className="w-full text-[11px] bg-background/60 border border-white/10 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
            <Button
                size="sm"
                className="w-full h-8 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5"
                onClick={handleSubmit}
                disabled={saving}
            >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <DollarSign className="w-3 h-3" />}
                Registrar
            </Button>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// CREATE PROPOSAL MINI FORM
// ═══════════════════════════════════════════════════════════════════════════
const CreateProposalForm = ({ contactName, onClose }: {
    contactName: string;
    onClose: () => void;
}) => {
    const [title, setTitle] = useState(`Proposta - ${contactName}`);
    const [value, setValue] = useState("");
    const [description, setDescription] = useState("");

    const handleSubmit = () => {
        toast.success("Proposta criada! (Em breve: integracao completa)");
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
            <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titulo da proposta"
                className="h-8 text-[11px] bg-background/60 border-white/10 text-foreground placeholder:text-muted-foreground/50"
            />
            <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Valor (R$)"
                className="h-8 text-[11px] bg-background/60 border-white/10 text-foreground placeholder:text-muted-foreground/50"
            />
            <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descricao da proposta"
                rows={3}
                className="w-full text-[11px] bg-background/60 border border-white/10 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            />
            <Button
                size="sm"
                className="w-full h-8 text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white gap-1.5"
                onClick={handleSubmit}
            >
                <FileText className="w-3 h-3" /> Criar Proposta
            </Button>
        </div>
    );
};


// ═══════════════════════════════════════════════════════════════════════════
// AI COPILOT SIDEBAR (right panel)
// ═══════════════════════════════════════════════════════════════════════════
const CopilotSidebar = ({
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
}) => {
    const { user } = useAuth();
    const { currentTenant } = useTenant();
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

    // Reset create deal form when chat changes
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
        if (idx < 0 || idx >= PIPELINE_STAGES.length - 2) return; // Don't auto-advance past negotiation
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
                stage: "lead" as any,
                probability: 10,
                position: 0,
                user_id: user.id,
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

    // Parse notes for history display
    const noteHistory = useMemo(() => {
        if (!deal?.notes) return [];
        const entries = deal.notes.split(/\n\n/).filter(Boolean).slice(-5).reverse();
        return entries.map(entry => {
            const match = entry.match(/^\[(.+?)\]\s*(.+)$/s);
            if (match) return { date: match[1], text: match[2] };
            return { date: "", text: entry };
        });
    }, [deal?.notes]);

    if (!sidebarOpen) {
        return (
            <div className="hidden lg:flex flex-col items-center py-3 px-1 border-l border-white/5 bg-card/60">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-primary" onClick={onToggle}>
                                <PanelRightOpen className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs">Abrir Eva</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        );
    }

    if (!chat || chat.isGroup) {
        return (
            <div className="hidden lg:flex w-[350px] shrink-0 flex-col border-l border-white/5 bg-card/60 backdrop-blur-md">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-primary" />
                        <span className="text-[13px] font-bold text-primary">Eva</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground" onClick={onToggle}>
                        <PanelRightClose className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center">
                        <Bot className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-[12px] text-muted-foreground/60 font-medium">
                            {chat?.isGroup ? "Analise nao disponivel para grupos" : "Selecione uma conversa"}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const stageInfo = deal ? getStageInfo(deal.stage) : null;
    const currentStageIdx = deal ? PIPELINE_STAGES.findIndex(s => s.id === deal.stage) : -1;
    const canMoveNext = deal && currentStageIdx >= 0 && currentStageIdx < PIPELINE_STAGES.length - 2;

    return (
        <div className="hidden lg:flex w-[350px] shrink-0 flex-col border-l border-white/5 bg-card/60 backdrop-blur-md overflow-hidden">
            {/* ─── Header ─── */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                        <Bot className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div>
                        <span className="text-[13px] font-bold text-primary">Eva</span>
                        <span className="text-[9px] text-muted-foreground ml-1.5">Especialista Virtual</span>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground" onClick={onToggle}>
                    <PanelRightClose className="h-4 w-4" />
                </Button>
            </div>

            <ScrollArea className="flex-1">
                <div className="flex flex-col">
                    {/* 1. LEAD IDENTITY CARD */}
                    <SidebarSection title="Identificacao" icon={User} defaultOpen={true}>
                        <div className="flex items-start gap-3">
                            <Avatar className="h-12 w-12 ring-2 ring-white/10 shrink-0">
                                {chat.profilePicUrl && <AvatarImage src={chat.profilePicUrl} />}
                                <AvatarFallback className="bg-primary/20 text-primary font-bold text-[12px]">
                                    {chat.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-[14px] font-bold text-foreground truncate">{chat.name}</h3>
                                {chat.phone && (
                                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                        <Phone className="w-3 h-3" /> {chat.phone}
                                    </p>
                                )}
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {aiSuggestion?.temperature && (
                                        <Badge variant="outline" className={`text-[9px] font-bold gap-0.5 h-5 ${tempColor(aiSuggestion.temperature)}`}>
                                            <TempIcon temp={aiSuggestion.temperature} />
                                            {aiSuggestion.temperature?.charAt(0).toUpperCase() + aiSuggestion.temperature?.slice(1)}
                                        </Badge>
                                    )}
                                    {aiSuggestion?.sentiment && aiSuggestion.sentiment !== "Limite diario atingido" && (
                                        <Badge variant="outline" className="text-[9px] font-bold border-violet-500/30 text-violet-400 bg-violet-500/10 gap-0.5 h-5">
                                            <Brain className="w-3 h-3" />
                                            {aiSuggestion.sentiment}
                                        </Badge>
                                    )}
                                    {aiSuggestion?.stage && (
                                        <Badge variant="outline" className="text-[9px] font-bold border-primary/30 text-primary bg-primary/10 gap-0.5 h-5">
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

                    {/* 2. CRM ACTIONS PANEL */}
                    <SidebarSection title="Acoes CRM" icon={ClipboardList} defaultOpen={true}
                        badge={deal ? (
                            <Badge variant="outline" className="text-[8px] h-4 px-1 font-bold border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                                Vinculado
                            </Badge>
                        ) : crmSearched ? (
                            <Badge variant="outline" className="text-[8px] h-4 px-1 font-bold border-orange-500/30 text-orange-400 bg-orange-500/10">
                                Novo
                            </Badge>
                        ) : null}
                    >
                        {crmLoading ? (
                            <div className="flex items-center gap-2 py-3 justify-center">
                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                <span className="text-[11px] text-muted-foreground">Buscando no CRM...</span>
                            </div>
                        ) : deal ? (
                            <div className="space-y-3">
                                {/* Deal Info */}
                                <div className="rounded-xl bg-background/40 border border-white/5 p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[12px] font-bold text-foreground truncate flex-1">{deal.title}</h4>
                                        {deal.is_hot && <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] text-muted-foreground">Valor</span>
                                        <span className="text-[12px] font-bold text-emerald-400">
                                            {deal.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] text-muted-foreground">Estagio</span>
                                        {stageInfo && (
                                            <Badge variant="outline" className={`text-[9px] font-bold ${stageInfo.bgColor} ${stageInfo.color} ${stageInfo.borderColor}`}>
                                                {stageInfo.title}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] text-muted-foreground">Probabilidade</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${deal.probability}%` }} />
                                            </div>
                                            <span className="text-[11px] font-bold text-foreground">{deal.probability}%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons Grid */}
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-[10px] font-bold border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 gap-1"
                                        onClick={() => { setShowSaleForm(true); setShowProposalForm(false); }}
                                    >
                                        <DollarSign className="w-3 h-3" /> Registrar Venda
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-[10px] font-bold border-blue-500/20 text-blue-400 hover:bg-blue-500/10 gap-1"
                                        onClick={() => { setShowProposalForm(true); setShowSaleForm(false); }}
                                    >
                                        <FileText className="w-3 h-3" /> Criar Proposta
                                    </Button>
                                </div>

                                {/* Register Sale Form */}
                                {showSaleForm && (
                                    <RegisterSaleForm
                                        phone={chat.phone || ""}
                                        companyId={currentTenant?.id || null}
                                        onClose={() => setShowSaleForm(false)}
                                        onSuccess={refreshCrm}
                                    />
                                )}

                                {/* Create Proposal Form */}
                                {showProposalForm && (
                                    <CreateProposalForm
                                        contactName={chat.name}
                                        onClose={() => setShowProposalForm(false)}
                                    />
                                )}

                                {/* Stage Selector - Visual Pipeline */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                        <TrendingUp className="w-3 h-3" /> Mover no Kanban
                                    </label>
                                    <div className="flex gap-0.5 mb-1.5">
                                        {PIPELINE_STAGES.map((s, idx) => (
                                            <button
                                                key={s.id}
                                                onClick={() => handleStageChange(s.id)}
                                                disabled={stageUpdating}
                                                className={`flex-1 h-1.5 rounded-full transition-all ${
                                                    idx <= currentStageIdx
                                                        ? s.id === "closed_lost" ? "bg-rose-500" : "bg-primary"
                                                        : "bg-white/10"
                                                } hover:opacity-80`}
                                                title={s.title}
                                            />
                                        ))}
                                    </div>
                                    <Select
                                        value={deal.stage}
                                        onValueChange={handleStageChange}
                                        disabled={stageUpdating}
                                    >
                                        <SelectTrigger className="h-8 bg-background/60 border-white/10 text-[11px] text-foreground">
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

                                {/* Quick Advance */}
                                {canMoveNext && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full h-7 text-[10px] font-bold border-primary/30 text-primary hover:bg-primary/10 gap-1"
                                        onClick={handleMoveNext}
                                        disabled={stageUpdating}
                                    >
                                        <ChevronRight className="w-3 h-3" />
                                        Avancar para {PIPELINE_STAGES[currentStageIdx + 1]?.title}
                                    </Button>
                                )}

                                {/* Add Note */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                        <StickyNote className="w-3 h-3" /> Adicionar Nota
                                    </label>
                                    <div className="flex gap-1.5">
                                        <Input
                                            value={noteText}
                                            onChange={(e) => setNoteText(e.target.value)}
                                            placeholder="Escreva uma nota..."
                                            className="h-7 text-[11px] bg-background/60 border-white/10 text-foreground placeholder:text-muted-foreground/50 flex-1"
                                            onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                                        />
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 text-primary hover:bg-primary/10 shrink-0"
                                            onClick={handleAddNote}
                                            disabled={addingNote || !noteText.trim()}
                                        >
                                            {addingNote ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : crmSearched ? (
                            <div className="space-y-3">
                                <div className="rounded-xl bg-background/30 border border-dashed border-white/10 p-3 text-center">
                                    <Target className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                                    <p className="text-[11px] text-muted-foreground font-medium mb-0.5">Contato nao encontrado no CRM</p>
                                    <p className="text-[10px] text-muted-foreground/60">Crie um lead para acompanhar este contato</p>
                                </div>

                                {!showCreateDeal ? (
                                    <Button
                                        size="sm"
                                        className="w-full h-8 text-[11px] font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                                        onClick={() => {
                                            setShowCreateDeal(true);
                                            setNewDealTitle(`Lead - ${chat.name}`);
                                        }}
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Adicionar ao CRM
                                    </Button>
                                ) : (
                                    <div className="space-y-2 rounded-xl bg-background/40 border border-white/10 p-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <Input
                                            value={newDealTitle}
                                            onChange={(e) => setNewDealTitle(e.target.value)}
                                            placeholder="Titulo do deal"
                                            className="h-8 text-[11px] bg-background/60 border-white/10 text-foreground placeholder:text-muted-foreground/50"
                                        />
                                        <Input
                                            value={newDealValue}
                                            onChange={(e) => setNewDealValue(e.target.value)}
                                            placeholder="Valor (R$)"
                                            className="h-8 text-[11px] bg-background/60 border-white/10 text-foreground placeholder:text-muted-foreground/50"
                                        />
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="flex-1 h-7 text-[10px] border-white/10 text-muted-foreground"
                                                onClick={() => setShowCreateDeal(false)}
                                            >
                                                Cancelar
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="flex-1 h-7 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
                                                onClick={handleCreateDeal}
                                                disabled={creatingDeal}
                                            >
                                                {creatingDeal ? <Loader2 className="w-3 h-3 animate-spin" /> : "Criar Lead"}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 py-2 justify-center">
                                <span className="text-[11px] text-muted-foreground/60">Aguardando dados...</span>
                            </div>
                        )}
                    </SidebarSection>

                    {/* 3. AI ANALYSIS (ON-DEMAND) */}
                    <SidebarSection title="Analise Eva" icon={Brain} defaultOpen={true}
                        badge={remaining !== null ? (
                            <Badge variant="outline" className={`text-[8px] h-4 px-1 font-bold ${remaining <= 2 ? "border-orange-500/30 text-orange-400" : "border-white/10 text-muted-foreground"}`}>
                                {remaining}/10
                            </Badge>
                        ) : null}
                    >
                        {/* Analyze Button */}
                        <Button
                            size="sm"
                            className={`w-full h-9 text-[11px] font-bold gap-2 mb-3 transition-all ${
                                aiThinking ? "bg-primary/20 text-primary" :
                                rateLimited ? "bg-muted text-muted-foreground cursor-not-allowed" :
                                "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30"
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
                        </Button>

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
                                    <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-2">
                                        <Target className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                                        <span className="text-[10px] font-bold text-emerald-400 leading-tight">{aiSuggestion.nextAction}</span>
                                    </div>
                                )}

                                {/* Strategy */}
                                {aiSuggestion.strategy?.length > 0 && (
                                    <div className="space-y-1.5">
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Estrategia</span>
                                        {aiSuggestion.strategy.map((s: string, i: number) => (
                                            <div key={i} className="flex items-start gap-1.5 bg-blue-500/8 border border-blue-500/15 rounded-lg px-2.5 py-1.5">
                                                <Zap className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" />
                                                <span className="text-[10px] text-blue-300/90 font-medium leading-tight">{s}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Objections */}
                                {aiSuggestion.objections?.length > 0 && (
                                    <div className="space-y-1.5">
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3 text-orange-400" />
                                            Objecoes ({aiSuggestion.objections.length})
                                        </span>
                                        {aiSuggestion.objections.map((obj: string, i: number) => (
                                            <p key={i} className="text-[10px] text-orange-300/70 pl-3 border-l-2 border-orange-500/30 leading-snug">{obj}</p>
                                        ))}
                                    </div>
                                )}

                                {/* Draft Message */}
                                {aiSuggestion.draft && (
                                    <div className="space-y-1.5">
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Mensagem sugerida</span>
                                        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-2.5">
                                            <p className="text-[11px] text-foreground/80 leading-relaxed italic mb-2">"{aiSuggestion.draft}"</p>
                                            <div className="flex gap-1.5">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-6 px-2 text-[9px] text-muted-foreground hover:text-foreground gap-1"
                                                    onClick={() => navigator.clipboard.writeText(aiSuggestion.draft)}
                                                >
                                                    <Copy className="w-3 h-3" /> Copiar
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="h-6 px-3 text-[9px] font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1"
                                                    onClick={onUseDraft}
                                                >
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
                            <div className="text-center py-3">
                                <Bot className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                                <p className="text-[10px] text-muted-foreground/50 font-medium">
                                    Clique em "Analisar com Eva" para receber insights sobre esta conversa
                                </p>
                            </div>
                        )}
                    </SidebarSection>

                    {/* 4. HISTORICO */}
                    {deal && noteHistory.length > 0 && (
                        <SidebarSection title="Historico" icon={History} defaultOpen={false}>
                            <div className="space-y-2">
                                {noteHistory.map((entry, i) => (
                                    <div key={i} className="flex items-start gap-2 text-[10px]">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-1.5 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            {entry.date && (
                                                <span className="text-muted-foreground/60 text-[9px] flex items-center gap-1 mb-0.5">
                                                    <Clock className="w-2.5 h-2.5" /> {entry.date}
                                                </span>
                                            )}
                                            <p className="text-foreground/70 leading-snug break-words">{entry.text}</p>
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


// ═══════════════════════════════════════════════════════════════════════════
// MAIN WhatsApp PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const WhatsApp = () => {
    const {
        config, connecting, connected,
        qrCodeBase64, error, clearError, connect, logout,
        chats, fetchChats, refreshConnection, isLoadingChats, isLoadingMessages,
        selectedChatMessages, fetchMessages, sendMessage,
        targetUserId, setTargetUser, fetchInstances,
    } = useEvolutionIntegration();

    const { user, isAdmin, isSuperAdmin } = useAuth();
    const canViewOthers = isAdmin || isSuperAdmin;

    // Seller instances list for admin selector
    const [sellerInstances, setSellerInstances] = useState<Array<{ userId: string; name: string; avatarUrl: string | null; role: string; connected: boolean }>>([]);
    const [loadingSellers, setLoadingSellers] = useState(false);

    useEffect(() => {
        if (!canViewOthers) return;
        setLoadingSellers(true);
        fetchInstances().then((sellers) => {
            setSellerInstances(sellers);
            setLoadingSellers(false);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canViewOthers]);

    const handleSellerChange = (value: string) => {
        const sellerId = value === "mine" ? null : value;
        setTargetUser(sellerId);
        setSelectedChatId(null);
    };

    const viewingSellerName = targetUserId
        ? sellerInstances.find(s => s.userId === targetUserId)?.name || "Vendedor"
        : null;

    const { aiThinking, aiSuggestion, getAiAnalysis, setAiSuggestion, remaining, rateLimited } = useCopilot();

    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [inputText, setInputText] = useState("");
    const [justConnected, setJustConnected] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [chatFilter, setChatFilter] = useState<"all" | "unread" | "groups">("all");
    const [showQuickReplies, setShowQuickReplies] = useState(false);
    const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
    const prevConnectedRef = useRef(false);
    const quickRepliesRef = useRef<HTMLDivElement>(null);

    // Close quick replies on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (quickRepliesRef.current && !quickRepliesRef.current.contains(e.target as Node)) {
                setShowQuickReplies(false);
            }
        };
        if (showQuickReplies) document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [showQuickReplies]);

    // Connection success animation
    useEffect(() => {
        if (connected && !prevConnectedRef.current) {
            setJustConnected(true);
            const timer = setTimeout(() => setJustConnected(false), 3000);
            return () => clearTimeout(timer);
        }
        prevConnectedRef.current = connected;
    }, [connected]);

    const scrollRef = useRef<HTMLDivElement>(null);
    const selectedChatData = chats.find(c => c.id === selectedChatId);

    // CRM lookup for selected chat (for header badges)
    const { deal: headerDeal } = useCrmLookup(selectedChatData?.phone);

    const filteredChats = useMemo(() => {
        let filtered = chats;

        // Apply tab filter
        if (chatFilter === "unread") {
            filtered = filtered.filter(c => c.unreadCount > 0);
        } else if (chatFilter === "groups") {
            filtered = filtered.filter(c => c.isGroup);
        }

        // Apply search
        const term = searchTerm.trim().toLowerCase();
        if (term) {
            filtered = filtered.filter((chat) =>
                chat.name?.toLowerCase().includes(term) ||
                chat.phone?.toLowerCase().includes(term) ||
                chat.lastMessage?.text?.toLowerCase().includes(term)
            );
        }

        return filtered;
    }, [chats, searchTerm, chatFilter]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [selectedChatMessages]);

    // Poll messages
    const selectedChatIdRef = useRef(selectedChatId);
    selectedChatIdRef.current = selectedChatId;

    useEffect(() => {
        if (!connected || !selectedChatId) return;
        fetchMessages(selectedChatId, false);
        const interval = setInterval(() => {
            const chatId = selectedChatIdRef.current;
            if (chatId) fetchMessages(chatId, true);
        }, 10000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connected, selectedChatId]);

    // Auto-select first chat
    const hasAutoSelected = useRef(false);
    useEffect(() => {
        if (!connected || chats.length === 0) {
            hasAutoSelected.current = false;
            return;
        }
        if (hasAutoSelected.current) return;
        if (selectedChatId && chats.some((chat) => chat.id === selectedChatId)) return;
        const firstChat = chats[0];
        if (!firstChat) return;
        hasAutoSelected.current = true;
        clearError();
        setSelectedChatId(firstChat.id);
        fetchMessages(firstChat.id, false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connected, chats.length]);

    const handleSelectChat = (id: string) => {
        clearError();
        setSelectedChatId(id);
        setAiSuggestion(null);
        fetchMessages(id, false);
    };

    // ON-DEMAND AI analysis (no auto-trigger)
    const handleAnalyze = () => {
        if (rateLimited || aiThinking || !selectedChatId) return;
        const chat = chats.find(c => c.id === selectedChatId);
        if (chat?.isGroup) return;
        const msgs = selectedChatMessages.map(m => ({ text: m.text, sender: m.sender }));
        getAiAnalysis("", msgs, chat?.name || "Lead", chat?.phone || "");
    };

    const handleSend = async () => {
        if (!inputText.trim() || !selectedChatId) return;
        await sendMessage(selectedChatId, inputText);
        setInputText("");
        fetchChats();
    };

    const handleUseDraft = () => {
        if (aiSuggestion?.draft) {
            setInputText(aiSuggestion.draft);
        }
    };

    const handleQuickReply = (text: string) => {
        setInputText(text);
        setShowQuickReplies(false);
    };

    const handleEvaSuggest = () => {
        if (!selectedChatData?.isGroup) {
            handleAnalyze();
        }
    };

    // Count helpers for filter tabs
    const unreadCount = useMemo(() => chats.filter(c => c.unreadCount > 0).length, [chats]);
    const groupCount = useMemo(() => chats.filter(c => c.isGroup).length, [chats]);

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-theme(spacing.16))] w-full bg-background overflow-hidden relative font-sans">
            {/* ─── Left Panel (Chat List) ─── */}
            <div className={`w-full lg:w-[30%] lg:min-w-[320px] lg:max-w-[420px] h-[38vh] lg:h-full border-r-0 lg:border-r border-b lg:border-b-0 border-white/5 flex flex-col bg-card/60 backdrop-blur-md z-20 shadow-xl transition-all duration-300 ${!connected ? 'opacity-90 grayscale-[20%]' : ''}`}>
                {/* Header */}
                <div className="h-[72px] flex items-center justify-between px-4 lg:px-5 shrink-0 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 ring-2 ring-primary/20 shadow-sm">
                            <AvatarFallback className="bg-primary/10 text-primary">
                                <WhatsAppIcon className="h-5 w-5 text-emerald-500" />
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="font-bold text-[15px] text-foreground tracking-tight">Inbox CRM</span>
                            {connected ? (
                                <div className="flex flex-col">
                                    <span className="text-[11px] text-emerald-500 flex items-center gap-1.5 font-semibold tracking-wide mt-0.5">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </span>
                                        Conectado
                                    </span>
                                    <button onClick={logout} className="text-left text-[9px] text-muted-foreground hover:text-red-400 underline decoration-white/20 hover:decoration-red-400/30 transition-colors mt-0.5">
                                        Desconectar
                                    </button>
                                </div>
                            ) : (
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium tracking-wide">
                                    <span className="relative flex h-2 w-2 rounded-full bg-muted-foreground/50"></span>
                                    Desconectado
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground" onClick={refreshConnection} disabled={connecting}>
                            <RefreshCcw className={`h-4 w-4 ${connecting ? "animate-spin" : ""}`} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground" onClick={() => setIsConfigModalOpen(true)}>
                            <Settings2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Admin Seller Selector */}
                {canViewOthers && (
                    <div className="px-3 pt-3 pb-1 shrink-0">
                        <Select value={targetUserId || "mine"} onValueChange={handleSellerChange}>
                            <SelectTrigger className="h-9 bg-muted/40 border-white/5 text-[13px] font-medium rounded-xl">
                                <div className="flex items-center gap-2">
                                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                    <SelectValue placeholder="Meu WhatsApp" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="mine">
                                    <span className="flex items-center gap-2">
                                        Meu WhatsApp
                                    </span>
                                </SelectItem>
                                {sellerInstances
                                    .filter(s => s.userId !== user?.id)
                                    .map(seller => (
                                        <SelectItem key={seller.userId} value={seller.userId}>
                                            <span className="flex items-center gap-2">
                                                {seller.name}
                                                {seller.connected && (
                                                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                )}
                                            </span>
                                        </SelectItem>
                                    ))}
                                {loadingSellers && (
                                    <div className="flex items-center justify-center py-2 text-muted-foreground text-xs">
                                        <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Carregando...
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                        {viewingSellerName && (
                            <div className="mt-1.5 flex items-center gap-1.5 px-1">
                                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20 font-semibold">
                                    <User className="h-3 w-3 mr-1" />
                                    Visualizando: {viewingSellerName}
                                </Badge>
                            </div>
                        )}
                    </div>
                )}

                {/* Search */}
                <div className="px-3 pt-3 pb-2 shrink-0">
                    <div className="bg-muted/40 rounded-xl flex items-center px-3 h-10 border border-white/5 focus-within:border-primary/50 transition-all">
                        <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
                        <Input placeholder="Buscar contato..." className="bg-transparent border-0 focus-visible:ring-0 text-[13px] placeholder:text-muted-foreground/60 p-0 h-auto font-medium" disabled={!connected} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </div>

                {/* Filter Tabs */}
                {connected && (
                    <div className="flex items-center gap-1 px-3 pb-2 shrink-0">
                        <button
                            onClick={() => setChatFilter("all")}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                                chatFilter === "all"
                                    ? "bg-primary/15 text-primary border border-primary/20"
                                    : "text-muted-foreground hover:bg-white/5 border border-transparent"
                            }`}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => setChatFilter("unread")}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                                chatFilter === "unread"
                                    ? "bg-primary/15 text-primary border border-primary/20"
                                    : "text-muted-foreground hover:bg-white/5 border border-transparent"
                            }`}
                        >
                            Nao lidos
                            {unreadCount > 0 && (
                                <span className="bg-primary/20 text-primary text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setChatFilter("groups")}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                                chatFilter === "groups"
                                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                                    : "text-muted-foreground hover:bg-white/5 border border-transparent"
                            }`}
                        >
                            Grupos
                            {groupCount > 0 && (
                                <span className="bg-emerald-500/15 text-emerald-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                                    {groupCount}
                                </span>
                            )}
                        </button>
                    </div>
                )}

                {/* Chat List */}
                <div className="flex-1 overflow-y-auto no-scrollbar py-1 px-2">
                    {connected ? (
                        isLoadingChats ? (
                            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Carregando...
                            </div>
                        ) : filteredChats.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm text-center px-4">
                                <MessageCircle className="w-8 h-8 text-muted-foreground/20 mb-3" />
                                <p className="text-[12px] font-medium">{searchTerm ? "Nenhum resultado encontrado." : chatFilter === "unread" ? "Nenhuma mensagem nao lida." : chatFilter === "groups" ? "Nenhum grupo encontrado." : "Nenhuma conversa."}</p>
                            </div>
                        ) : filteredChats.map((chat) => (
                            <div
                                key={chat.id}
                                onClick={() => handleSelectChat(chat.id)}
                                className={`flex items-center px-3 py-3 rounded-xl transition-all cursor-pointer mb-1 relative group ${selectedChatId === chat.id
                                    ? 'bg-primary/10 border border-primary/20 shadow-sm'
                                    : chat.unreadCount > 0
                                        ? 'hover:bg-white/5 border border-transparent bg-white/[0.02]'
                                        : 'hover:bg-white/5 border border-transparent'
                                    }`}
                            >
                                {selectedChatId === chat.id && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[50%] w-1 bg-primary rounded-r-full"></div>
                                )}

                                <div className="relative">
                                    <Avatar className="h-11 w-11 shrink-0 border border-white/10">
                                        {chat.profilePicUrl && <AvatarImage src={chat.profilePicUrl} />}
                                        <AvatarFallback className={`font-bold text-[12px] ${chat.isGroup ? 'bg-emerald-500/20 text-emerald-400' : 'bg-primary/20 text-primary'}`}>
                                            {chat.isGroup ? <Users className="h-4 w-4" /> : chat.name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    {/* Online indicator for unread */}
                                    {chat.unreadCount > 0 && (
                                        <div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary border-2 border-card" />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0 ml-3 flex flex-col justify-center">
                                    <div className="flex justify-between items-center mb-0.5 gap-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            {chat.isGroup && <Users className="h-3 w-3 text-emerald-400 shrink-0" />}
                                            <h3 className={`text-[13.5px] font-bold truncate ${chat.unreadCount > 0 ? 'text-foreground' : 'text-foreground/80'}`}>{chat.name}</h3>
                                        </div>
                                        <span className={`text-[10px] font-semibold shrink-0 ${chat.unreadCount > 0 ? 'text-primary' : 'text-muted-foreground/60'}`}>{chat.lastMessage?.time || ""}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {chat.lastMessage?.isMe && <CheckCircle2 className="w-3 h-3 text-blue-500 shrink-0" />}
                                        <p className={`text-[12px] truncate flex-1 ${chat.unreadCount > 0 ? 'text-foreground/70 font-medium' : 'text-muted-foreground'}`}>{chat.lastMessage?.text || "..."}</p>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {chat.unreadCount > 0 && (
                                                <span className="bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                                    {chat.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-center h-full">
                            <WhatsAppIcon className="w-8 h-8 text-muted-foreground/20 mb-3" />
                            <p className="text-[12px] text-muted-foreground/60 font-medium">Conecte seu WhatsApp para ver conversas</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Main Chat Area ─── */}
            <div className="flex-1 flex flex-col relative w-full h-[62vh] lg:h-full bg-background z-10 transition-all duration-500">
                <div className="absolute inset-0 z-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '28px 28px' }}></div>

                {/* Connection success overlay */}
                {justConnected && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-xl animate-in fade-in duration-300">
                        <div className="flex flex-col items-center animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-700">
                            <div className="h-24 w-24 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 relative">
                                <div className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping"></div>
                                <CheckCircle2 className="h-12 w-12 text-emerald-500 relative z-10" />
                            </div>
                            <h2 className="text-2xl font-black text-emerald-500 tracking-tight mb-2">Conectado!</h2>
                            <p className="text-muted-foreground text-[14px] font-medium">WhatsApp sincronizado com sucesso</p>
                        </div>
                    </div>
                )}

                {!connected ? (
                    /* ─── QR Code / Connect ─── */
                    <div className="flex-1 flex flex-col items-center justify-center p-8 z-10 relative">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"></div>

                        {qrCodeBase64 ? (
                            <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-500 relative z-10">
                                <div className="bg-white p-6 rounded-3xl shadow-2xl shadow-emerald-500/10 mb-8 relative border-4 border-emerald-500/20">
                                    <img src={qrCodeBase64.startsWith('data:image') ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`} alt="QR Code WhatsApp" className="w-[260px] h-[260px] object-contain" />
                                </div>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                    </div>
                                    <h3 className="text-xl font-extrabold tracking-tight">Aguardando leitura</h3>
                                </div>
                                <p className="text-[14px] text-muted-foreground text-center font-medium max-w-[320px] leading-relaxed">
                                    Abra o WhatsApp no celular, va em <strong>Dispositivos conectados</strong> e escaneie o codigo.
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="h-24 w-24 rounded-[2rem] bg-emerald-500/10 flex items-center justify-center mb-8 border border-emerald-500/20 shadow-[0_0_60px_rgba(16,185,129,0.15)] relative overflow-hidden group">
                                    <WhatsAppIcon className="h-12 w-12 text-emerald-500 relative z-10" />
                                </div>
                                <h3 className="text-2xl font-extrabold mb-3 tracking-tight">Conectar WhatsApp</h3>
                                <p className="text-[15px] text-muted-foreground mb-8 leading-relaxed max-w-[380px] text-center font-medium">
                                    Gere o QR Code para conectar seu WhatsApp ao Game of Sales.
                                </p>
                                {error && (
                                    <p className="text-red-400 text-[12px] font-bold mb-6 bg-red-400/10 py-2.5 px-5 rounded-xl flex items-center gap-2 max-w-[360px] text-center border border-red-500/20">
                                        <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                                    </p>
                                )}
                                <Button onClick={connect} disabled={connecting} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-xl shadow-emerald-500/25 h-14 px-10 rounded-2xl text-[16px] transition-all hover:-translate-y-0.5">
                                    {connecting ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" />Gerando QR Code...</>) : (<><QrCode className="mr-2 h-5 w-5" />Ativar WhatsApp Hub</>)}
                                </Button>
                            </div>
                        )}
                    </div>
                ) : !selectedChatData ? (
                    /* ─── No chat selected ─── */
                    <div className="flex-1 flex flex-col items-center justify-center p-8 z-10 relative">
                        <div className="h-28 w-28 rounded-[2rem] bg-card border border-white/10 flex items-center justify-center mb-8 shadow-2xl relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-emerald-500/20 opacity-60"></div>
                            <WhatsAppIcon className="h-14 w-14 text-emerald-500 relative z-10 opacity-80" />
                            <Sparkles className="h-6 w-6 text-primary absolute top-4 right-4 animate-pulse z-10" />
                        </div>
                        <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-white/40 mb-3 text-center tracking-tight">Inbox AI</h1>
                        <p className="text-muted-foreground/80 text-center max-w-sm text-[14px] leading-relaxed font-medium">Selecione uma conversa e use a Eva para analisar leads sob demanda.</p>
                    </div>
                ) : (
                    /* ─── Active Chat ─── */
                    <>
                        {/* Chat Header - Enhanced */}
                        <div className="bg-card/90 backdrop-blur-xl border-b border-white/5 flex flex-col z-10 shrink-0 shadow-sm">
                            <div className="min-h-[64px] flex items-center px-4 sm:px-5 justify-between gap-3 py-2">
                                <div className="flex items-center gap-3 min-w-0">
                                    <Avatar className="h-10 w-10 ring-2 ring-white/10">
                                        {selectedChatData.profilePicUrl && <AvatarImage src={selectedChatData.profilePicUrl} />}
                                        <AvatarFallback className={`font-bold ${selectedChatData.isGroup ? 'bg-emerald-500/20 text-emerald-400' : 'bg-primary/20 text-primary'}`}>
                                            {selectedChatData.isGroup ? <Users className="h-5 w-5" /> : selectedChatData.name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {selectedChatData.isGroup && <Users className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                                            <h2 className="text-[15px] font-bold text-foreground truncate">{selectedChatData.name}</h2>
                                            {/* Deal stage badge in header */}
                                            {headerDeal && (
                                                <Badge variant="outline" className={`text-[9px] font-bold h-5 shrink-0 ${getStageInfo(headerDeal.stage).bgColor} ${getStageInfo(headerDeal.stage).color} ${getStageInfo(headerDeal.stage).borderColor}`}>
                                                    {getStageInfo(headerDeal.stage).title}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-muted-foreground flex items-center gap-2 font-medium">
                                            {selectedChatData.isGroup ? (
                                                <span className="text-emerald-400/70">Grupo</span>
                                            ) : selectedChatData.phone ? (
                                                <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {selectedChatData.phone}</span>
                                            ) : null}
                                        </p>
                                    </div>
                                </div>

                                {/* Header Actions */}
                                <div className="hidden lg:flex items-center gap-2 shrink-0">
                                    {/* Quick Action Buttons */}
                                    {!selectedChatData.isGroup && !headerDeal && (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold border-primary/20 text-primary hover:bg-primary/10 gap-1">
                                                        <Plus className="w-3 h-3" /> Adicionar ao CRM
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom" className="text-xs">Criar lead no pipeline</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}
                                    {headerDeal && (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 gap-1">
                                                        <Target className="w-3 h-3" /> Ver no Pipeline
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom" className="text-xs">Abrir deal no CRM</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}

                                    {/* Temperature + AI Badges */}
                                    {!selectedChatData.isGroup && aiSuggestion && !aiThinking && (
                                        <Badge variant="outline" className={`text-[10px] font-bold gap-1 ${tempColor(aiSuggestion.temperature)}`}>
                                            <TempIcon temp={aiSuggestion.temperature} />
                                            {aiSuggestion.temperature?.charAt(0).toUpperCase() + aiSuggestion.temperature?.slice(1)}
                                        </Badge>
                                    )}
                                    {!selectedChatData.isGroup && aiThinking && (
                                        <Badge variant="outline" className="text-[10px] font-bold border-primary/30 text-primary bg-primary/10 gap-1 animate-pulse">
                                            <Loader2 className="w-3 h-3 animate-spin" /> Eva...
                                        </Badge>
                                    )}
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-primary" onClick={() => setSidebarOpen(!sidebarOpen)}>
                                                    {sidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" className="text-xs">{sidebarOpen ? "Fechar Eva" : "Abrir Eva"}</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>
                        </div>

                        {/* Messages Area - Enhanced */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 sm:p-5 z-10 flex flex-col gap-3 sm:gap-4 scroll-smooth relative">
                            {isLoadingMessages ? (
                                <div className="flex-1 flex items-center justify-center opacity-70">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" /> Carregando mensagens...
                                    </div>
                                </div>
                            ) : selectedChatMessages.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center opacity-50 mt-10">
                                    <MessageCircle className="w-12 h-12 text-muted-foreground mb-4" />
                                    <p className="text-[14px] font-medium text-muted-foreground">Nenhuma mensagem encontrada.</p>
                                </div>
                            ) : selectedChatMessages.map((msgLine, i) => {
                                const msgDate = new Date(msgLine.timestamp * 1000);
                                const prevDate = i > 0 ? new Date(selectedChatMessages[i - 1].timestamp * 1000) : null;
                                const showDateSep = !prevDate || msgDate.toDateString() !== prevDate.toDateString();
                                const today = new Date();
                                const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
                                const dateLabel = msgDate.toDateString() === today.toDateString() ? "Hoje"
                                    : msgDate.toDateString() === yesterday.toDateString() ? "Ontem"
                                    : msgDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
                                const isMe = msgLine.sender === 'me';
                                const msgId = msgLine.id || String(i);
                                const isAudio = msgLine.text?.startsWith("[audio") || msgLine.text?.includes("ptt") || msgLine.text?.includes("audio");
                                return (
                                    <React.Fragment key={msgId}>
                                        {showDateSep && (
                                            <div className="flex justify-center my-4">
                                                <span className="text-[10px] uppercase font-black tracking-[0.15em] px-5 py-1.5 rounded-full bg-card/80 backdrop-blur-md text-muted-foreground border border-white/10 shadow-sm">
                                                    {dateLabel}
                                                </span>
                                            </div>
                                        )}
                                        <div
                                            className={`flex max-w-[88%] sm:max-w-[70%] ${isMe ? 'self-end' : 'group'} relative`}
                                            onMouseEnter={() => !isMe && setHoveredMsgId(msgId)}
                                            onMouseLeave={() => setHoveredMsgId(null)}
                                        >
                                            {!isMe && (
                                                <Avatar className="h-7 w-7 ring-1 ring-white/5 mr-2.5 mt-auto opacity-70 group-hover:opacity-100 transition-opacity shrink-0">
                                                    {selectedChatData.profilePicUrl && <AvatarImage src={selectedChatData.profilePicUrl} />}
                                                    <AvatarFallback className="bg-card text-muted-foreground text-[9px] font-bold">
                                                        {(msgLine.senderName || selectedChatData.name || "?").substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                            )}
                                            <div className={`relative px-4 py-3 shadow-sm transition-all ${isMe
                                                ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-sm'
                                                : 'bg-card border border-white/5 rounded-2xl rounded-bl-sm hover:border-white/10'
                                                }`}>
                                                {!isMe && selectedChatData.isGroup && msgLine.senderName && (
                                                    <p className="text-[10px] font-bold text-emerald-400 mb-1">{msgLine.senderName}</p>
                                                )}
                                                {/* Audio message indicator */}
                                                {isAudio ? (
                                                    <div className={`flex items-center gap-2 ${isMe ? 'text-white' : 'text-foreground/90'}`}>
                                                        <Mic className="w-4 h-4" />
                                                        <div className="flex items-center gap-1">
                                                            <div className="flex gap-0.5">
                                                                {[...Array(12)].map((_, j) => (
                                                                    <div key={j} className={`w-0.5 rounded-full ${isMe ? 'bg-white/60' : 'bg-foreground/30'}`} style={{ height: `${4 + Math.random() * 12}px` }} />
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <span className={`text-[11px] font-medium ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>Audio</span>
                                                    </div>
                                                ) : (
                                                    <p className={`text-[14px] leading-relaxed ${isMe ? 'text-white' : 'text-foreground/90'}`}>
                                                        {msgLine.text}
                                                    </p>
                                                )}
                                                <div className="flex items-center justify-end mt-1.5 gap-1">
                                                    <span className={`text-[9px] font-semibold ${isMe ? 'text-primary-foreground/60' : 'text-muted-foreground/50'}`}>
                                                        {msgLine.time}
                                                    </span>
                                                    {isMe && <CheckCircle2 className="w-3 h-3 text-blue-300 opacity-80" />}
                                                </div>
                                            </div>
                                            {/* Quick reply button on hover for lead messages */}
                                            {!isMe && hoveredMsgId === msgId && (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button
                                                                onClick={() => setInputText(`> "${msgLine.text.substring(0, 60)}${msgLine.text.length > 60 ? '...' : ''}"\n\n`)}
                                                                className="absolute -right-2 top-1 h-6 w-6 rounded-full bg-card border border-white/10 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-all shadow-lg animate-in fade-in zoom-in-90 duration-150"
                                                            >
                                                                <Reply className="w-3 h-3" />
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" className="text-[10px]">Responder</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        </div>

                        {/* Input Area - Enhanced */}
                        <div className="bg-card/95 backdrop-blur-2xl border-t border-white/5 p-3 sm:p-4 z-10 shrink-0">
                            <div className="flex items-end gap-2 sm:gap-3">
                                {/* Attachment button */}
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 shrink-0">
                                                <Paperclip className="h-5 w-5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="text-xs">Anexar arquivo (em breve)</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>

                                {/* Quick Responses button */}
                                <div className="relative" ref={quickRepliesRef}>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={`h-10 w-10 rounded-xl shrink-0 transition-colors ${showQuickReplies ? 'text-amber-400 bg-amber-500/10' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
                                                    onClick={() => setShowQuickReplies(!showQuickReplies)}
                                                >
                                                    <Zap className="h-5 w-5" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="text-xs">Respostas rapidas</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>

                                    {/* Quick Replies Dropdown */}
                                    {showQuickReplies && (
                                        <div className="absolute bottom-full mb-2 left-0 w-72 bg-card/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
                                            <div className="px-3 py-2 border-b border-white/5">
                                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                                    <Zap className="w-3 h-3 text-amber-400" /> Respostas Rapidas
                                                </span>
                                            </div>
                                            <div className="max-h-64 overflow-y-auto">
                                                {QUICK_RESPONSES.map((qr, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleQuickReply(qr.text)}
                                                        className="w-full text-left px-3 py-2.5 hover:bg-white/5 transition-colors border-b border-white/[0.03] last:border-b-0"
                                                    >
                                                        <span className="text-[10px] font-bold text-primary block mb-0.5">{qr.label}</span>
                                                        <span className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">{qr.text}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Main Input */}
                                <div className="flex-1 bg-muted/40 rounded-2xl border border-white/5 flex items-center px-4 py-1 focus-within:border-primary/50 focus-within:bg-muted/60 transition-all">
                                    <Input
                                        placeholder="Digite uma mensagem..."
                                        className="bg-transparent border-0 focus-visible:ring-0 text-[14px] p-0 min-h-[44px] text-foreground placeholder:text-muted-foreground/60 font-medium"
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                    />
                                </div>

                                {/* Eva Suggest button */}
                                {!selectedChatData.isGroup && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={`h-10 w-10 rounded-xl shrink-0 transition-colors ${aiThinking ? 'text-primary animate-pulse bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-primary/10'}`}
                                                    onClick={handleEvaSuggest}
                                                    disabled={aiThinking || rateLimited}
                                                >
                                                    <Bot className="h-5 w-5" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="text-xs">Eva: sugerir resposta</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}

                                {/* Send button */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-10 w-10 rounded-xl shrink-0 transition-all ${inputText.trim() ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20' : 'text-primary hover:bg-primary/10'}`}
                                    onClick={handleSend}
                                >
                                    <Send className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ─── Eva AI Copilot Sidebar (right) ─── */}
            {connected && (
                <CopilotSidebar
                    chat={selectedChatData}
                    messages={selectedChatMessages.map(m => ({ text: m.text, sender: m.sender }))}
                    aiThinking={aiThinking}
                    aiSuggestion={aiSuggestion}
                    remaining={remaining}
                    rateLimited={rateLimited}
                    onAnalyze={handleAnalyze}
                    onUseDraft={handleUseDraft}
                    sidebarOpen={sidebarOpen}
                    onToggle={() => setSidebarOpen(!sidebarOpen)}
                />
            )}

            {/* Config Modal */}
            <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <WhatsAppIcon className="h-5 w-5 text-emerald-500" />
                            Conexao WhatsApp
                        </DialogTitle>
                        <DialogDescription>
                            Configuracao da conexao gerenciada pelo servidor.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="rounded-xl border border-white/10 bg-card/60 p-4 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Instancia</span>
                                <Badge variant="outline" className="border-white/10 bg-white/5 text-foreground">{config.instanceName}</Badge>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Modo</span>
                                <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15">Gerenciado</Badge>
                            </div>
                        </div>
                        {error && (
                            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>
                        )}
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsConfigModalOpen(false)}>Fechar</Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={async () => { clearError(); await refreshConnection(); setIsConfigModalOpen(false); }}>
                            Atualizar status
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
export default WhatsApp;
