import { useState } from "react";
import { ArrowRight, Loader2, Sparkles, Users, Clock, TrendingDown, Calendar } from "lucide-react";
import { EvaPhotoAvatar } from "./EvaPhotoAvatar";

// ─────────────────────────────────────────────────────────────────────────────
// EvaCommandBar (F4D.2.1, 2026-05-19)
//
// Camada operacional da EVA acoplada à Central da Operação. Input
// conversacional + chips de ações rápidas. NÃO é página separada, NÃO é card
// decorativo — é a entrada de comando do CRM.
//
// REGRA "EVA inside Vyzon" (memory: feedback_eva_visual_rule):
// Card branco, ring lilás sutil no avatar, selo "Preview" lilás micro,
// botão "Enviar" AZUL Vyzon, chips em superfícies neutras com hover azul.
//
// Lógica é 100% PREVIEW: submit / chip → estado "Pensando..." 1.5s → mensagem
// honesta "Análise indisponível em preview". F4D.4+ conecta com EVA real.
// ─────────────────────────────────────────────────────────────────────────────

interface Suggestion {
    label: string;
    icon: typeof Users;
    prompt: string;
}

const SUGGESTIONS: Suggestion[] = [
    { label: "Analisar leads novos", icon: Users, prompt: "Quais leads novos chegaram hoje e quais valem atenção?" },
    { label: "Criar follow-ups", icon: Clock, prompt: "Sugira follow-ups pra leads sem resposta há mais de 24h" },
    { label: "Ver gargalos do pipeline", icon: TrendingDown, prompt: "Onde o pipeline está travando esta semana?" },
    { label: "Preparar agenda de hoje", icon: Calendar, prompt: "Resumo das reuniões e prioridades de hoje" },
];

type CommandState = "idle" | "thinking" | "answered";

export function EvaCommandBar() {
    const [value, setValue] = useState("");
    const [state, setState] = useState<CommandState>("idle");
    const [lastPrompt, setLastPrompt] = useState<string>("");

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        const text = value.trim();
        if (!text || state === "thinking") return;

        setLastPrompt(text);
        setValue("");
        setState("thinking");

        // PREVIEW_F4D: simula análise. F4D.4 conecta IA real.
        window.setTimeout(() => {
            setState("answered");
        }, 1400);
    };

    const handleSuggestion = (suggestion: Suggestion) => {
        if (state === "thinking") return;
        setLastPrompt(suggestion.prompt);
        setValue("");
        setState("thinking");
        window.setTimeout(() => {
            setState("answered");
        }, 1400);
    };

    const reset = () => {
        setState("idle");
        setLastPrompt("");
        setValue("");
    };

    return (
        <div
            className="rounded-2xl relative overflow-hidden"
            style={{
                background: "#FFFFFF",
                border: "1px solid #D9E2EC",
                boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 10px 30px rgba(15,23,42,0.045)",
            }}
        >
            {/* Top accent line lilás muito sutil — assinatura EVA */}
            <div
                className="absolute top-0 inset-x-0 h-px pointer-events-none"
                style={{
                    background: "linear-gradient(90deg, transparent, rgba(124,58,237,0.32) 50%, transparent)",
                }}
            />

            <div className="px-6 sm:px-8 pt-6 sm:pt-7 pb-5 sm:pb-7">
                {/* Header com avatar + título + selo (F4A.4: avatar lg) */}
                <div className="flex items-start gap-5 mb-5">
                    <EvaPhotoAvatar size="lg" ring="subtle" thinking={state === "thinking"} />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                            <h3
                                className="font-semibold text-[18px] sm:text-[20px]"
                                style={{ color: "#0B1220", letterSpacing: "-0.018em" }}
                            >
                                EVA Comercial
                            </h3>
                            <span
                                className="inline-flex items-center gap-1 text-[10px] uppercase px-2 py-0.5 rounded"
                                style={{
                                    background: "rgba(124,58,237,0.10)",
                                    color: "#6D28D9",
                                    fontWeight: 700,
                                    letterSpacing: "0.08em",
                                }}
                            >
                                <Sparkles className="h-2.5 w-2.5" />
                                IA Comercial
                            </span>
                            <span
                                className="inline-flex items-center text-[10px] uppercase px-2 py-0.5 rounded"
                                style={{
                                    background: "rgba(124,58,237,0.06)",
                                    color: "#6D28D9",
                                    fontWeight: 600,
                                    letterSpacing: "0.06em",
                                }}
                            >
                                Preview
                            </span>
                        </div>
                        <p className="text-[13.5px]" style={{ color: "#475569" }}>
                            Pergunte sobre leads, conversas, pipeline e próximos passos.
                        </p>
                    </div>
                </div>

                {/* Estado: Idle → input + suggestions */}
                {state === "idle" && (
                    <>
                        <form onSubmit={handleSubmit} className="relative mb-4">
                            <input
                                type="text"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                placeholder="Pergunte para a EVA ou peça uma ação…"
                                className="w-full h-14 pl-5 pr-36 rounded-xl text-[14.5px] outline-none transition-colors"
                                style={{
                                    background: "#F4F7FB",
                                    border: "1px solid #D9E2EC",
                                    color: "#0B1220",
                                }}
                            />
                            <button
                                type="submit"
                                disabled={!value.trim()}
                                className="absolute right-2 top-2 h-10 inline-flex items-center gap-1.5 text-[13.5px] font-semibold px-4 rounded-lg text-white transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{
                                    background: "linear-gradient(135deg, #2563EB, #4A8CE8)",
                                    boxShadow: "0 6px 16px -4px rgba(37,99,235,0.45), 0 1px 0 rgba(255,255,255,0.20) inset",
                                }}
                            >
                                Enviar
                                <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                        </form>

                        <div className="flex items-center gap-2 flex-wrap">
                            <span
                                className="text-[11px] uppercase shrink-0 mr-1"
                                style={{
                                    color: "#94A3B8",
                                    fontWeight: 700,
                                    letterSpacing: "0.1em",
                                }}
                            >
                                Sugestões
                            </span>
                            {SUGGESTIONS.map((s) => {
                                const Icon = s.icon;
                                return (
                                    <button
                                        key={s.label}
                                        onClick={() => handleSuggestion(s)}
                                        className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-[13px] transition-colors"
                                        style={{
                                            background: "#F8FAFC",
                                            border: "1px solid #E2E8F0",
                                            color: "#475569",
                                            fontWeight: 500,
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = "rgba(37,99,235,0.06)";
                                            e.currentTarget.style.borderColor = "rgba(37,99,235,0.22)";
                                            e.currentTarget.style.color = "#1D4ED8";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = "#F8FAFC";
                                            e.currentTarget.style.borderColor = "#E2E8F0";
                                            e.currentTarget.style.color = "#475569";
                                        }}
                                    >
                                        <Icon className="h-3.5 w-3.5" />
                                        {s.label}
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* Estado: Thinking */}
                {state === "thinking" && (
                    <div
                        className="rounded-xl px-4 py-4 flex items-center gap-3"
                        style={{
                            background: "linear-gradient(135deg, rgba(124,58,237,0.04), rgba(37,99,235,0.03))",
                            border: "1px solid rgba(124,58,237,0.16)",
                        }}
                    >
                        <Loader2 className="h-4 w-4 animate-spin shrink-0" style={{ color: "#6D28D9" }} />
                        <div className="flex-1 min-w-0">
                            <p
                                className="text-[11px] uppercase mb-0.5"
                                style={{
                                    color: "#6D28D9",
                                    fontWeight: 700,
                                    letterSpacing: "0.08em",
                                }}
                            >
                                EVA analisando…
                            </p>
                            <p className="text-[12.5px] truncate" style={{ color: "#0B1220" }}>
                                {lastPrompt}
                            </p>
                        </div>
                    </div>
                )}

                {/* Estado: Answered (Preview — placeholder honesto) */}
                {state === "answered" && (
                    <div
                        className="rounded-xl px-4 py-4 flex items-start gap-3"
                        style={{
                            background: "#F8FAFC",
                            border: "1px solid #E2E8F0",
                        }}
                    >
                        <EvaPhotoAvatar size="xs" ring="subtle" />
                        <div className="flex-1 min-w-0">
                            <p
                                className="text-[11px] uppercase mb-1"
                                style={{
                                    color: "#94A3B8",
                                    fontWeight: 700,
                                    letterSpacing: "0.08em",
                                }}
                            >
                                Resposta EVA · Preview
                            </p>
                            <p
                                className="text-[13px] mb-1"
                                style={{ color: "#0B1220", fontWeight: 500, lineHeight: 1.5 }}
                            >
                                Em breve a EVA vai responder &quot;{lastPrompt}&quot; com base nos seus dados reais de pipeline, WhatsApp e CRM.
                            </p>
                            <p className="text-[11.5px]" style={{ color: "#64748B", lineHeight: 1.55 }}>
                                Esta interface é uma prévia da camada conversacional do Vyzon. A análise por IA com dados reais entra em produção em breve.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={reset}
                            className="text-[11.5px] font-medium shrink-0 transition-colors hover:text-[#1D4ED8]"
                            style={{ color: "#2563EB" }}
                        >
                            Nova pergunta
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
