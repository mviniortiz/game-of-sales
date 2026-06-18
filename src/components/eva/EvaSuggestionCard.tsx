import type { ReactNode } from "react";

// Vyzon UI alignment — EvaSuggestionCard
// Cartão reutilizável da sugestão da EVA, alinhado à DNA da landing: off-white,
// borda fina, radius suave, calmo. SEM tags coloridas (quente/urgência/fit),
// sem ícone de robô, sem neon. Acento azul só no selo da EVA. Sempre reforça
// que o humano aprova. Estados: loading (skeleton) e normal.
interface EvaSuggestionCardProps {
    /** Texto sugerido pela EVA (resposta ou próxima ação). */
    suggestion: string;
    /** Contexto opcional, em texto mudo (não chips). Ex: "primeiro contato · interesse em planos · agência". */
    context?: string;
    /** Rótulo do cartão. Default: "Sugestão da EVA". */
    label?: string;
    onUse?: () => void;
    onEdit?: () => void;
    loading?: boolean;
    className?: string;
    /** Conteúdo extra opcional abaixo das ações. */
    footer?: ReactNode;
}

const card: React.CSSProperties = {
    background: "#FFFFFF",
    border: "1px solid #E6EDF5",
    borderRadius: 18,
    boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
};

export function EvaSuggestionCard({ suggestion, context, label = "Sugestão da EVA", onUse, onEdit, loading, className = "", footer }: EvaSuggestionCardProps) {
    if (loading) {
        return (
            <div className={`eva-suggestion-card p-5 ${className}`} style={card} aria-busy="true">
                <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#CBD5E1" }} />
                    <span className="h-3 w-24 rounded-full" style={{ background: "#EEF2F7" }} />
                </div>
                <div className="mt-4 space-y-2">
                    <span className="block h-3.5 w-full rounded-full" style={{ background: "#F1F5F9" }} />
                    <span className="block h-3.5 w-4/5 rounded-full" style={{ background: "#F1F5F9" }} />
                </div>
                <div className="mt-5 flex gap-2.5">
                    <span className="h-9 w-32 rounded-full" style={{ background: "#EEF2F7" }} />
                    <span className="h-9 w-20 rounded-full" style={{ background: "#F1F5F9" }} />
                </div>
            </div>
        );
    }

    return (
        <div className={`eva-suggestion-card p-5 ${className}`} style={card}>
            <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold" style={{ color: "#334155" }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#2563EB" }} aria-hidden="true" />
                    {label}
                </span>
                <span className="text-[11.5px]" style={{ color: "#94A3B8" }}>Você aprova antes de enviar</span>
            </div>

            <p className="mt-3 text-[14px]" style={{ color: "#0B1220", lineHeight: 1.55 }}>
                {suggestion}
            </p>

            {context && (
                <p className="mt-3 text-[12.5px]" style={{ color: "#64748B", lineHeight: 1.5 }}>
                    Contexto: {context}
                </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
                <button
                    type="button"
                    onClick={onUse}
                    className="inline-flex h-9 items-center rounded-full bg-[#0B1220] px-4 text-[13px] font-semibold text-white transition-all hover:bg-[#1F2A3B] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
                >
                    Usar sugestão
                </button>
                <button
                    type="button"
                    onClick={onEdit}
                    className="inline-flex h-9 items-center rounded-full border border-[#E6EDF5] px-4 text-[13px] font-medium text-[#334155] transition-all hover:bg-[rgba(13,20,33,0.03)] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
                >
                    Editar
                </button>
            </div>

            {footer && <div className="mt-4">{footer}</div>}
        </div>
    );
}
