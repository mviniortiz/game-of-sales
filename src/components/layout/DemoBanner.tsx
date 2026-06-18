import { useState } from "react";
import { X } from "lucide-react";
import { whatsappUrl } from "@/config/contact";
import { WhatsappGlyph } from "@/components/icons/WhatsappGlyph";

// Banner de conversão exibido SÓ no ambiente de demo (ver useDemoMode). Faixa
// fina no topo do app: "Falar agora" abre o WhatsApp comercial já com contexto
// (qual empresa/demo). Sem botão flutuante (regra anti-CTA-flutuante). Dispensável
// na sessão. Nunca aparece pra cliente pagante.
interface DemoBannerProps {
    /** Nome da empresa/demo que o lead está explorando (vai no contexto da mensagem). */
    companyName?: string;
    number?: string;
}

export function DemoBanner({ companyName, number }: DemoBannerProps) {
    const [dismissed, setDismissed] = useState(false);
    if (dismissed) return null;

    const ctx = companyName ? ` (${companyName})` : "";
    const message = `Oi! Tô testando a demo do Vyzon${ctx} e quero conversar sobre levar pra minha agência.`;

    return (
        <div
            className="flex items-center gap-3 px-5 py-2.5"
            style={{ background: "rgba(37,99,235,0.06)", borderBottom: "1px solid #E6EDF5" }}
        >
            <p className="flex-1 min-w-0 text-[12.5px]" style={{ color: "#334155" }}>
                <span className="font-semibold" style={{ color: "#0B1220" }}>Você está explorando uma demo.</span>{" "}
                <span className="hidden sm:inline">Gostou? Vamos conversar sobre levar o Vyzon pra sua agência.</span>
            </p>
            <a
                href={whatsappUrl(message, number)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-semibold text-white transition-all hover:bg-[#1F2A3B] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
                style={{ background: "#0B1220" }}
            >
                <WhatsappGlyph size={14} />
                Falar agora
            </a>
            <button
                type="button"
                onClick={() => setDismissed(true)}
                aria-label="Dispensar"
                className="shrink-0 rounded-md p-1 transition-colors hover:bg-[rgba(13,20,33,0.05)]"
                style={{ color: "#94A3B8" }}
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
