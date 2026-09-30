// EVA.STUDIO.7 — EvaStudioRules
// Bloco discreto que mostra as regras aplicadas via EVA Studio orientando a
// sugestão da EVA. Reutilizável (EvaPanel/Inbox/Deal). Só leitura: NÃO envia
// mensagem, não move estágio, não aplica tag, não altera oportunidade.
import { ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useEvaStudioRules } from "@/hooks/useEvaStudioRules";

export function EvaStudioRules({ className = "", max = 3 }: { className?: string; max?: number }) {
    const { rules, loading } = useEvaStudioRules();
    if (loading) return null;

    const shown = rules.slice(0, max);
    // Sem regra configurada não há o que mostrar: a caixa virava propaganda do Studio em todo card.
    if (shown.length === 0) return null;

    return (
        <details className={`group rounded-xl border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] px-3.5 py-2.5 ${className}`}>
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[12.5px] font-semibold text-[var(--vyz-text-strong)] [&::-webkit-details-marker]:hidden">
                <ShieldCheck className="h-3.5 w-3.5 text-[var(--vyz-eva)]" aria-hidden />
                Como a EVA decide neste card
                <span className="ml-auto text-[11px] font-medium text-[var(--vyz-text-muted)] group-open:hidden">Ver regras</span>
            </summary>
            <ul className="mt-2 space-y-1">
                {shown.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11.5px] leading-snug text-[var(--vyz-text-strong)]">
                        <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-[var(--vyz-text-soft)]" aria-hidden />
                        <span>{r}</span>
                    </li>
                ))}
            </ul>
            <p className="mt-2 text-[10.5px] text-[var(--vyz-text-soft)]">
                Regras do <Link to="/eva-studio" className="underline underline-offset-2">EVA Studio</Link>.
            </p>
        </details>
    );
}

export default EvaStudioRules;
