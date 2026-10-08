// Balões da conversa com a EVA nas telas de primeiros passos e do Raio-X
// automático. "bloco" é um cartão solto no meio da conversa (ex.: o placar).
import type { ReactNode } from "react";
import { EvaBot } from "@/components/eva/EvaBot";

export type Msg = { de: "eva" | "voce" | "bloco"; texto: ReactNode };

export function Bolha({ de, children }: { de: Msg["de"]; children: ReactNode }) {
    if (de === "bloco") return <>{children}</>;
    if (de === "voce") {
        return (
            <div className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-[#0B1220] px-4 py-2.5 text-[15px] leading-snug text-white">{children}</p>
            </div>
        );
    }
    return (
        <div className="flex max-w-[92%] items-end gap-2">
            <span className="mb-0.5 shrink-0"><EvaBot size={24} still state="idle" /></span>
            <div className="rounded-2xl rounded-bl-md border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] px-4 py-2.5 text-[15px] leading-snug text-[var(--vyz-text-strong)] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                {children}
            </div>
        </div>
    );
}

export function Leitura({ conversas }: { conversas: number }) {
    return (
        <div className="flex max-w-[92%] items-end gap-2">
            <span className="mb-0.5 shrink-0"><EvaBot size={24} state="thinking" /></span>
            <div className="rounded-2xl rounded-bl-md border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] px-4 py-2.5 text-[15px] leading-snug text-[var(--vyz-text-strong)]">
                {conversas > 0 ? (
                    <>Li <span className="font-semibold tabular-nums">{conversas}</span> {conversas === 1 ? "conversa" : "conversas"} até agora…</>
                ) : (
                    <span className="text-[var(--vyz-text-muted)]">Esperando o histórico chegar…</span>
                )}
            </div>
        </div>
    );
}
