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
    const has = shown.length > 0;

    return (
        <div className={`rounded-xl p-3.5 ${className}`} style={{ background: "#F5F3FF", border: "1px solid rgba(124,58,237,0.18)" }}>
            <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" style={{ color: "#7C3AED" }} />
                <p className="text-[12px] font-semibold" style={{ color: "#4C1D95" }}>Regras usadas pela EVA</p>
            </div>

            {has ? (
                <>
                    <p className="text-[11.5px] mt-1 leading-snug" style={{ color: "#6D28D9" }}>
                        A EVA está usando regras configuradas no EVA Studio para orientar esta sugestão.
                    </p>
                    <ul className="mt-2 space-y-1">
                        {shown.map((r, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-[11.5px] leading-snug" style={{ color: "#4C1D95" }}>
                                <span className="mt-[5px] w-1 h-1 rounded-full shrink-0" style={{ background: "#7C3AED" }} />
                                <span>{r}</span>
                            </li>
                        ))}
                    </ul>
                    <p className="text-[10.5px] mt-2" style={{ color: "#94A3B8" }}>
                        Baseado no contexto da empresa e nas regras aplicadas no EVA Studio.
                    </p>
                </>
            ) : (
                <p className="text-[11.5px] mt-1 leading-snug" style={{ color: "#6D28D9" }}>
                    Configure regras no{" "}
                    <Link to="/eva-studio" className="font-semibold underline underline-offset-2">EVA Studio</Link>{" "}
                    para orientar melhor as sugestões da EVA.
                </p>
            )}
        </div>
    );
}

export default EvaStudioRules;
