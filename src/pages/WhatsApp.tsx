import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, Search, MoreVertical, Phone, Video, Paperclip, Smile, Send, Mic, QrCode, Zap, Target, CheckCircle2, DollarSign, Clock, Sparkles, Brain, MessageSquareQuote, TrendingUp, AlertCircle, RefreshCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { WhatsappConfigModal } from "@/components/integrations/WhatsappConfigModal";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { useEvolutionIntegration } from "@/hooks/useEvolutionAPI";

// AI Logic is kept client-side for now as requested for the MVP, 
// using generic mock logic while we prepare the real LLM endpoint
export const useCopilot = () => {
    const [aiThinking, setAiThinking] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<any>(null);

    const getAiAnalysis = async (chatTextContext: string) => {
        setAiThinking(true);
        setAiSuggestion(null);
        // Simulando a ida no modelo de IA
        await new Promise(resolve => setTimeout(resolve, 1500));

        if (chatTextContext.length > 50) {
            setAiSuggestion({
                sentiment: "Objeção de Preço",
                strategy: ["Não dê desconto imediato. Foque no ROI.", "Destaque funcionalidades exclusivas do plano Pro."],
                draft: "Compreendo! O concorrente tem um plano inicial atrativo. Porém, o Game of Sales unifica disparos e automações no mesmo plano, o que vale muito mais a pena. Quer ver os números reais de economia?"
            });
        } else {
            setAiSuggestion({
                sentiment: "Neutro / Positivo",
                strategy: ["Mantenha reciprocidade.", "Avance o lead para o próximo estágio do funil."],
                draft: "Perfeito! Próximo passo então seria enviarmos o contrato. Diga-me quando estiver com tudo em mãos."
            });
        }
        setAiThinking(false);
    };

    return { aiThinking, aiSuggestion, getAiAnalysis, setAiSuggestion };
};

const WhatsApp = () => {
    const {
        config, updateConfig, connecting, connected,
        qrCodeBase64, error, connect, logout,
        chats, fetchChats,
        selectedChatMessages, fetchMessages, sendMessage
    } = useEvolutionIntegration();

    const { aiThinking, aiSuggestion, getAiAnalysis, setAiSuggestion } = useCopilot();

    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [showAIAssistant, setShowAIAssistant] = useState(true);
    const [inputText, setInputText] = useState("");
    const [apiUrl, setApiUrl] = useState(config.apiUrl);
    const [apiKey, setApiKey] = useState(config.apiKey);
    const [instanceName, setInstanceName] = useState(config.instanceName);

    const scrollRef = useRef<HTMLDivElement>(null);
    const selectedChatData = chats.find(c => c.id === selectedChatId);

    // Auto-scroll para mensagens novas
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [selectedChatMessages]);

    // Poll current chat messages
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (connected && selectedChatId) {
            fetchMessages(selectedChatId);
            interval = setInterval(() => {
                fetchMessages(selectedChatId);
                fetchChats(); // Refresh unread count essentially
            }, 6000);
        }
        return () => clearInterval(interval);
    }, [connected, selectedChatId]);

    // Ao clicar num chat, geramos a análise da IA imediatamente (efeito UAU pro cliente)
    const handleSelectChat = (id: string) => {
        setSelectedChatId(id);
        setShowAIAssistant(true);
        // fetch initial immediately
        fetchMessages(id);
        // Triggers AI on an arbitrary context (simulate taking messages text)
        getAiAnalysis(id + " context simulado");
    };

    const handleSend = () => {
        if (!inputText.trim() || !selectedChatId) return;
        sendMessage(selectedChatId, inputText);
        setInputText("");
    };

    const handleUseDraft = () => {
        if (aiSuggestion?.draft) {
            setInputText(aiSuggestion.draft);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Quente': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
            case 'Morno': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'Frio': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'Fechado': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        }
    };

    return (
        <div className="flex h-[calc(100vh-theme(spacing.16))] w-full bg-background overflow-hidden relative font-sans">
            {/* Sidebar (Chat List) */}
            <div className={`w-[30%] min-w-[320px] max-w-[420px] border-r border-white/5 flex flex-col bg-card/60 backdrop-blur-md z-20 shadow-xl transition-all duration-300 ${!connected ? 'opacity-90 grayscale-[20%]' : ''}`}>
                <div className="h-[72px] flex items-center justify-between px-5 shrink-0 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 ring-2 ring-primary/20 shadow-sm">
                            <AvatarImage src="https://i.pravatar.cc/150?u=dev" />
                            <AvatarFallback className="bg-primary/10 text-primary">Me</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="font-bold text-[15px] text-foreground tracking-tight">Inbox Hub</span>
                            {connected ? (
                                <div className="flex flex-col">
                                    <span className="text-[11px] text-emerald-500 flex items-center gap-1.5 font-semibold tracking-wide mt-1">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </span>
                                        Sessão Ativa: {config.instanceName}
                                    </span>
                                    <button onClick={logout} className="text-left text-[9px] text-muted-foreground hover:text-red-400 underline decoration-white/20 hover:decoration-red-400/30 transition-colors mt-0.5">
                                        Desconectar Dispositivo
                                    </button>
                                </div>
                            ) : (
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium tracking-wide">
                                    <span className="relative flex h-2 w-2 rounded-full bg-muted-foreground/50"></span>
                                    Aguardando Conexão
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-b border-white/5 shrink-0 flex flex-col gap-3">
                    <div className="bg-muted/40 rounded-xl flex items-center px-3 h-11 border border-white/5 focus-within:border-primary/50 focus-within:bg-muted/60 transition-all shadow-inner">
                        <Search className="h-[18px] w-[18px] text-muted-foreground mr-3 shrink-0" />
                        <Input
                            placeholder="Buscar leads por nome, tag ou número..."
                            className="bg-transparent border-0 focus-visible:ring-0 text-[13px] placeholder:text-muted-foreground/70 p-0 h-auto font-medium"
                            disabled={!connected}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar py-2 px-3">
                    {connected ? (
                        chats.map((chat) => (
                            <div
                                key={chat.id}
                                onClick={() => handleSelectChat(chat.id)}
                                className={`flex items-start px-3 py-3.5 rounded-2xl transition-all cursor-pointer mb-2 relative group overflow-hidden ${selectedChatId === chat.id
                                    ? 'bg-primary/10 border border-primary/20 shadow-[inset_0_0_20px_rgba(124,58,237,0.05)]'
                                    : 'hover:bg-white/5 border border-transparent hover:border-white/5'
                                    }`}
                            >
                                {selectedChatId === chat.id && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[60%] w-1 bg-primary rounded-r-full shadow-[0_0_12px_rgba(124,58,237,0.8)]"></div>
                                )}

                                <Avatar className="h-12 w-12 shrink-0 shadow-sm border border-white/10" >
                                    <AvatarImage src={chat.profilePicUrl || `https://i.pravatar.cc/150?u=${chat.id}`} />
                                    <AvatarFallback className="bg-primary/20 text-primary font-bold">{chat.name.substring(0, 2)}</AvatarFallback>
                                </Avatar>

                                <div className="flex-1 min-w-0 ml-3.5 flex flex-col justify-center">
                                    <div className="flex justify-between items-start mb-1 gap-2">
                                        <h3 className="text-[14.5px] font-bold truncate text-foreground leading-none">{chat.name}</h3>
                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                            <span className={`text-[10px] font-bold tracking-wide ${chat.unreadCount > 0 ? 'text-primary' : 'text-muted-foreground/70'}`}>{chat.lastMessage?.time || ""}</span>
                                            {chat.unreadCount > 0 && (
                                                <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm">
                                                    {chat.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center mb-2.5">
                                        {chat.lastMessage?.isMe && (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 mr-1 shrink-0" />
                                        )}
                                        <p className="text-[12.5px] text-muted-foreground truncate mr-2 flex-1 font-medium">{chat.lastMessage?.text || "..."}</p>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <span className={`text-[9.5px] px-2 py-0.5 rounded-md border font-bold uppercase tracking-wider ${getStatusColor(chat.status || 'Morno')}`}>
                                            {chat.status}
                                        </span>
                                        <span className={`text-[9.5px] px-2 py-0.5 rounded-md border border-white/10 bg-white/5 text-muted-foreground font-bold flex items-center gap-1 uppercase tracking-wider`}>
                                            {chat.term}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center p-6 mt-4 w-full h-full relative z-10">
                            {(!config.apiUrl || !config.apiKey) ? (
                                <div className="w-full max-w-sm flex flex-col items-center bg-card border border-white/10 p-6 rounded-3xl shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                                    <WhatsAppIcon className="h-10 w-10 text-emerald-500 mb-4 relative z-10" />
                                    <h3 className="text-xl font-extrabold mb-1 tracking-tight text-center relative z-10">Conectar Servidor</h3>
                                    <p className="text-[13px] text-muted-foreground mb-6 text-center leading-relaxed font-medium relative z-10">Configure as credenciais da Evolution API para iniciar o hub 1:1.</p>
                                    <div className="w-full space-y-4 relative z-10">
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest pl-1">URL da API</label>
                                            <Input placeholder="https://api.evolution.example" value={apiUrl} onChange={e => setApiUrl(e.target.value)} className="bg-background border-white/10" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Global API Key</label>
                                            <Input type="password" placeholder="D8XF..." value={apiKey} onChange={e => setApiKey(e.target.value)} className="bg-background border-white/10" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Nome da Instância</label>
                                            <Input placeholder="sales_inbox" value={instanceName} onChange={e => setInstanceName(e.target.value)} className="bg-background border-white/10" />
                                        </div>
                                        <Button
                                            onClick={() => updateConfig(apiUrl, apiKey, instanceName)}
                                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-xl shadow-primary/25 h-11 w-full rounded-xl transition-all w-full mt-2"
                                        >
                                            Salvar & Prosseguir
                                        </Button>
                                    </div>
                                </div>
                            ) : qrCodeBase64 ? (
                                <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="bg-white p-4 rounded-3xl shadow-2xl mb-6 relative group overflow-hidden border-8 border-white/5">
                                        <div className="absolute inset-0 bg-primary/10 blur-xl scale-150 group-hover:bg-primary/20 transition-all pointer-events-none z-0"></div>
                                        <img src={qrCodeBase64.startsWith('data:image/png;base64,') ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`} alt="QR Code WhatsApp" className="w-[200px] h-[200px] object-contain relative z-10 mix-blend-multiply" />
                                    </div>
                                    <h3 className="text-[18px] font-extrabold tracking-tight mb-2 flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin text-emerald-500" /> Aguardando Leitura
                                    </h3>
                                    <p className="text-[14px] text-muted-foreground text-center font-medium max-w-[250px] leading-relaxed">Escaneie o código com seu WhatsApp para ativar o Motor de Vendas.</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <div className="h-20 w-20 rounded-[28px] bg-emerald-500/10 flex items-center justify-center mb-6 border border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.15)] relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full scale-150 group-hover:bg-emerald-500/30 transition-all"></div>
                                        <WhatsAppIcon className="h-10 w-10 text-emerald-500 relative z-10" />
                                    </div>
                                    <h3 className="text-xl font-extrabold mb-3 tracking-tight">Motor Web Desativado</h3>
                                    <p className="text-[14px] text-muted-foreground mb-8 leading-relaxed max-w-[280px] text-center font-medium">Faça login com seu celular para sincronizar as conversas.</p>
                                    {error && <p className="text-red-400 text-[12px] font-bold mb-4 bg-red-400/10 py-2 px-4 rounded-lg flex items-center gap-2 max-w-[300px] text-center"><AlertCircle className="w-4 h-4 shrink-0" /> {error}</p>}
                                    <Button
                                        onClick={connect}
                                        disabled={connecting}
                                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-xl shadow-emerald-500/25 h-12 px-8 rounded-xl w-full max-w-[280px] text-[15px] transition-all"
                                    >
                                        {connecting ? (
                                            <>
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                Gerando QR Code...
                                            </>
                                        ) : (
                                            <>
                                                <QrCode className="mr-2 h-5 w-5" />
                                                Ativar WhatsApp Hub
                                            </>
                                        )}
                                    </Button>
                                    <button onClick={() => updateConfig('', '', '')} className="mt-4 text-[11px] font-bold text-muted-foreground hover:text-foreground underline decoration-white/20 hover:decoration-white/60 transition-colors uppercase tracking-widest">
                                        Reconfigurar API
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className={`flex-1 flex flex-col relative w-full h-full bg-background z-10 border-r border-white/5 transition-opacity duration-300 ${!connected ? 'opacity-50 pointer-events-none grayscale-[50%]' : ''}`}>
                <div className="absolute inset-0 z-0 opacity-[0.02] pointer-events-none mix-blend-screen"
                    style={{ backgroundImage: 'radial-gradient(circle at center, white 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}>
                </div>

                {!selectedChatData ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 z-10 relative">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
                        <div className="h-28 w-28 rounded-[2rem] bg-card border border-white/10 flex items-center justify-center mb-8 shadow-2xl relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-emerald-500/20 opacity-60"></div>
                            <WhatsAppIcon className="h-14 w-14 text-emerald-500 relative z-10 opacity-80" />
                            <Sparkles className="h-6 w-6 text-primary absolute top-4 right-4 animate-pulse z-10" />
                        </div>
                        <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-white/40 mb-4 text-center tracking-tight">
                            Inbox AI
                        </h1>
                        <p className="text-muted-foreground/80 text-center max-w-sm text-[15px] leading-relaxed font-medium">
                            Selecione um lead ao lado para iniciar. O Copilot assumirá a análise.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="h-[72px] bg-card/90 backdrop-blur-xl border-b border-white/5 flex items-center px-6 z-10 justify-between shrink-0 shadow-sm">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-11 w-11 ring-2 ring-white/10 shadow-md">
                                    <AvatarImage src={selectedChatData.profilePicUrl || `https://i.pravatar.cc/150?u=${selectedChatData.id}`} />
                                </Avatar>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-3 mb-0.5">
                                        <h2 className="text-[16px] font-bold text-foreground leading-tight tracking-tight">{selectedChatData.name}</h2>
                                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-[18px] border-emerald-500/30 text-emerald-500 bg-emerald-500/10 font-bold uppercase tracking-widest shadow-sm">Online</Badge>
                                    </div>
                                    <p className="text-[12px] text-muted-foreground flex items-center gap-2 font-medium">
                                        <span className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-muted-foreground/70" /> {selectedChatData.phone}</span>
                                        <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                        <span className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-primary" /> Score: {selectedChatData.score}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant={showAIAssistant ? "default" : "secondary"}
                                                size="sm"
                                                onClick={() => setShowAIAssistant(!showAIAssistant)}
                                                className={`h-10 px-4 gap-2 rounded-xl transition-all shadow-sm ${showAIAssistant
                                                    ? 'bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 font-bold'
                                                    : 'bg-muted/50 text-muted-foreground hover:bg-muted/80 hover:text-foreground border border-white/5 font-semibold'
                                                    }`}
                                            >
                                                <Brain className="w-4.5 h-4.5" />
                                                <span className="hidden sm:inline">Copilot Auto</span>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="font-semibold text-xs py-1.5 px-3">Ativar/Desativar IA Lateral</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>

                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 z-10 flex flex-col gap-5 scroll-smooth relative">
                            <div className="flex justify-center mb-4 sticky top-2 z-20">
                                <span className="text-[10.5px] uppercase font-black tracking-[0.2em] px-5 py-2 rounded-full bg-background/80 backdrop-blur-md text-muted-foreground border border-white/10 shadow-lg">
                                    Hoje
                                </span>
                            </div>

                            {selectedChatMessages.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center opacity-50 mt-10">
                                    <MessageCircle className="w-12 h-12 text-muted-foreground mb-4" />
                                    <p className="text-[14px] font-medium text-muted-foreground">Nenhuma mensagem encontrada aqui ainda.</p>
                                </div>
                            ) : selectedChatMessages.map((msgLine, i) => {
                                const isMe = msgLine.sender === 'me';
                                return (
                                    <div key={msgLine.id || i} className={`flex max-w-[75%] ${isMe ? 'self-end' : 'group'}`}>
                                        {!isMe && (
                                            <Avatar className="h-8 w-8 ring-2 ring-white/5 mr-3 mt-auto opacity-70 group-hover:opacity-100 transition-opacity shrink-0">
                                                <AvatarImage src={selectedChatData.profilePicUrl || `https://i.pravatar.cc/150?u=${selectedChatData.id}`} />
                                            </Avatar>
                                        )}
                                        <div className={`relative px-5 py-3.5 shadow-md ${isMe
                                            ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-sm shadow-primary/20'
                                            : 'bg-card border border-white/5 rounded-2xl rounded-bl-sm shadow-black/20'
                                            }`}>
                                            <p className={`text-[14.5px] leading-relaxed font-medium ${isMe ? 'text-white' : 'text-foreground/90'}`}>
                                                {msgLine.text}
                                            </p>
                                            <div className="flex items-center justify-end mt-2 gap-1.5">
                                                <span className={`text-[10px] font-bold ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground/60'}`}>
                                                    {msgLine.time}
                                                </span>
                                                {isMe && (
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-300 opacity-90" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Input Area */}
                        <div className="bg-card/95 backdrop-blur-2xl border-t border-white/5 p-4 z-10 flex flex-col gap-3 shrink-0 rounded-tl-xl shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
                            <div className="flex items-end gap-3">
                                <div className="flex gap-1 mb-1 bg-muted/30 p-1 rounded-xl border border-white/5">
                                    <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground rounded-lg shrink-0">
                                        <Smile className="h-[22px] w-[22px]" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground rounded-lg shrink-0">
                                        <Paperclip className="h-[22px] w-[22px]" />
                                    </Button>
                                </div>

                                <div className="flex-1 bg-muted/40 rounded-2xl border border-white/5 flex items-center px-4 py-1.5 focus-within:border-primary/50 focus-within:bg-muted/60 focus-within:shadow-[0_0_0_4px_rgba(124,58,237,0.1)] transition-all">
                                    <Input
                                        placeholder="Digite uma mensagem..."
                                        className="bg-transparent border-0 focus-visible:ring-0 text-[15px] p-0 min-h-[48px] text-foreground placeholder:text-muted-foreground/60 font-medium"
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={`h-10 w-10 ml-2 rounded-xl shrink-0 transition-colors ${inputText.trim() ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20' : 'text-primary hover:text-primary hover:bg-primary/10'}`}
                                        onClick={handleSend}
                                    >
                                        <Send className="h-[20px] w-[20px]" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* AI Sales Copilot Sidebar */}
            {selectedChatData && showAIAssistant && (
                <div className="w-[30%] min-w-[340px] max-w-[420px] border-l border-white/5 bg-[#0a0f14]/90 backdrop-blur-2xl flex flex-col z-20 shadow-[-20px_0_40px_rgba(0,0,0,0.3)] relative">
                    <div className="absolute top-0 right-0 w-full h-[400px] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent pointer-events-none blur-3xl opacity-60"></div>

                    <div className="h-[72px] flex items-center px-6 shrink-0 border-b border-white/5 relative z-10 bg-card/40">
                        <div className="flex items-center gap-3 w-full">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/30 to-purple-600/30 border border-primary/30 shadow-[inset_0_2px_10px_rgba(255,255,255,0.1)] flex items-center justify-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-primary/20 scale-150 rotate-45 group-hover:rotate-90 transition-transform duration-1000"></div>
                                <Brain className="w-5 h-5 text-white relative z-10" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-extrabold text-[15.5px] bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80 tracking-tight leading-none mb-1">Cérebro IA</h3>
                                {aiThinking ? (
                                    <p className="text-[11.5px] text-primary font-bold flex items-center gap-1.5 opacity-80 animate-pulse uppercase tracking-wider">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Processando DDC...
                                    </p>
                                ) : (
                                    <p className="text-[11.5px] text-emerald-400 font-bold flex items-center gap-1.5 uppercase tracking-wider">
                                        <Sparkles className="w-3 h-3" /> Análise Finalizada
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar p-6 flex flex-col gap-6 relative z-10">
                        {aiThinking ? (
                            <div className="flex flex-col items-center justify-center h-full text-center opacity-50 space-y-4">
                                <Brain className="w-12 h-12 text-primary animate-pulse" />
                                <p className="text-sm font-semibold text-muted-foreground">Lendo funil e conversas passadas...</p>
                            </div>
                        ) : aiSuggestion ? (
                            <>
                                {/* Analysis Card */}
                                <div className="space-y-3 opacity-0 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-forwards" style={{ animationDelay: '100ms' }}>
                                    <div className="flex items-center gap-2 text-[11px] font-black text-muted-foreground uppercase tracking-widest px-1">
                                        <TrendingUp className="w-4 h-4 text-primary" /> Raio-X Cognitivo
                                    </div>
                                    <div className="bg-card/60 backdrop-blur-md border border-white/10 rounded-[24px] p-5 shadow-lg relative overflow-hidden">
                                        <div className="flex items-center justify-between mb-4 relative z-10">
                                            <span className="text-[14px] font-bold text-foreground/90">Tom Detectado</span>
                                            <Badge variant="outline" className={`border-0 font-bold tracking-wide shadow-inner ${aiSuggestion.sentiment.includes('Objeção') ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                                {aiSuggestion.sentiment}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                {/* Strategy Card */}
                                <div className="space-y-3 opacity-0 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-forwards" style={{ animationDelay: '200ms' }}>
                                    <div className="flex items-center gap-2 text-[11px] font-black text-muted-foreground uppercase tracking-widest px-1">
                                        <AlertCircle className="w-4 h-4 text-blue-400" /> Tática de Fechamento
                                    </div>
                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-[24px] p-5 shadow-lg">
                                        <ul className="space-y-3.5">
                                            {aiSuggestion.strategy.map((strat: string, i: number) => (
                                                <li key={i} className="flex items-start gap-3 text-[13.5px] text-blue-100/90 font-medium leading-relaxed">
                                                    <div className="mt-0.5 shrink-0 bg-blue-500/20 p-1 rounded-full border border-blue-500/30 shadow-inner">
                                                        <CheckCircle2 className="w-3 h-3 text-blue-400" />
                                                    </div>
                                                    <span>{strat}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {/* Auto-Draft Card */}
                                <div className="space-y-3 opacity-0 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-forwards" style={{ animationDelay: '300ms' }}>
                                    <div className="flex items-center justify-between text-[11px] font-black text-muted-foreground uppercase tracking-widest px-1">
                                        <div className="flex items-center gap-2">
                                            <MessageSquareQuote className="w-4 h-4 text-primary" /> Texto Mágico Gerado
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:bg-primary/20 hover:text-primary rounded-lg transition-colors" onClick={() => getAiAnalysis(selectedChatId + " update")}>
                                            <RefreshCcw className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                    <div className="bg-gradient-to-b from-primary/10 to-primary/5 border border-primary/20 rounded-[24px] p-1.5 shadow-xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                                        <div className="bg-card/90 backdrop-blur-md rounded-[20px] p-5 text-[14px] text-foreground/95 leading-[1.6] shadow-sm font-medium relative z-10 border border-white/5">
                                            <div className="relative z-10 italic">"{aiSuggestion.draft}"</div>
                                        </div>
                                        <div className="flex p-3 gap-3 relative z-10">
                                            <Button
                                                onClick={handleUseDraft}
                                                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl h-12 shadow-[0_4px_20px_rgba(124,58,237,0.4)] transition-transform hover:-translate-y-0.5 text-[14px]"
                                            >
                                                <Input className="hidden" /> {/* Force type matching */}
                                                <span>Usar este texto</span>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
};

export default WhatsApp;
