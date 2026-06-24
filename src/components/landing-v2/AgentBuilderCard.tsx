import { useState } from "react";
import { ButtonV2 } from "./ButtonV2";
import { AgentBuilderModal } from "./AgentBuilderModal";
import { trackBehavior, LANDING_EVENTS } from "@/lib/analytics";

// LP.6 (v2) — card "Crie um agente especialista". O lead cola a URL do PRÓPRIO
// site e clica "Criar agente": abre o AgentBuilderModal (upload de material +
// e-mail de trabalho → edge `generate-demo-agent` gera o blueprint e captura o
// lead). Não cria ambiente nem envia nada — prévia revisável (assistida).
interface AgentBuilderCardProps {
    onCTAClick: () => void;
}

function Glyph({ lines }: { lines: [number, number][] }) {
    return (
        <svg viewBox="0 0 64 64" className="absolute inset-0 m-auto h-[46px] w-[46px]" aria-hidden="true">
            <g stroke="#0d1421" strokeWidth="3.4" strokeLinecap="round" opacity="0.62">
                {lines.map(([y, len], i) => (
                    <line key={i} x1={20} y1={y} x2={20 + len} y2={y} />
                ))}
            </g>
        </svg>
    );
}

export const AgentBuilderCard = ({ onCTAClick }: AgentBuilderCardProps) => {
    const [url, setUrl] = useState("");
    const [open, setOpen] = useState(false);

    const start = () => {
        if (!url.trim()) return;
        trackBehavior(LANDING_EVENTS.AGENT_BUILDER_START, {});
        setOpen(true);
    };

    return (
        <div
            className="vz-soft-card flex h-full flex-col rounded-[28px] p-7 sm:p-9"
            style={{ background: "var(--lp-white)", border: "1px solid var(--lp-line)" }}
        >
            <h3 className="lp-display" style={{ fontSize: "1.6rem", lineHeight: 1.12, letterSpacing: "-0.02em", color: "var(--lp-ink)" }}>
                Monte um agente especialista em minutos
            </h3>
            <p className="mt-3 max-w-md" style={{ fontSize: "0.975rem", lineHeight: 1.55, color: "rgba(5,5,5,0.62)" }}>
                Cole o site da sua agência e a EVA monta um agente de qualificação com o seu contexto — serviços, ICP e tom de voz.
            </p>

            <div className="relative my-8" style={{ height: 240 }}>
                <div className="vz-agent-orb vz-orb-a" style={{ width: 132, height: 132, left: "calc(50% - 104px)", top: 26, background: "radial-gradient(circle at 32% 26%, #DCEBFF 0%, #2563EB 64%)" }}>
                    <Glyph lines={[[26, 24], [34, 14], [42, 20]]} />
                </div>
                <div className="vz-agent-orb vz-orb-b" style={{ width: 144, height: 144, left: "calc(50% - 14px)", top: 50, background: "radial-gradient(circle at 32% 26%, #D6F6FF 0%, #06B6D4 64%)" }}>
                    <Glyph lines={[[28, 18], [36, 24]]} />
                </div>
                <div className="vz-agent-orb vz-orb-c" style={{ width: 120, height: 120, left: "calc(50% - 58px)", top: 104, background: "radial-gradient(circle at 34% 28%, #D6FBEC 0%, #10B981 64%)" }}>
                    <Glyph lines={[[27, 22], [35, 12], [43, 16]]} />
                </div>
            </div>

            <div className="mt-auto border-t pt-6" style={{ borderColor: "var(--lp-line)" }}>
                <p className="text-[13px]" style={{ color: "var(--lp-ink-55)" }}>
                    Comece pelo site da sua agência.
                </p>
                <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-center">
                    <input
                        className="vz-input-light vz-agent-field flex-1"
                        placeholder="ex: suaagencia.com.br"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && start()}
                        aria-label="Site da sua agência"
                    />
                    <ButtonV2 onClick={start} variant="primary" disabled={!url.trim()}>
                        Criar agente
                    </ButtonV2>
                </div>
            </div>

            <AgentBuilderModal open={open} onClose={() => setOpen(false)} url={url} onScheduleDemo={onCTAClick} />
        </div>
    );
};
