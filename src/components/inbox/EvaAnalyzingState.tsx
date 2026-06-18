import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { EvaOrb } from "@/components/landing-v2/EvaOrb";

// Momento "EVA analisando a conversa" no Inbox.
// Em vez de um spinner estático, a EVA mostra os passos reais da leitura,
// progredindo um a um. Os 3 primeiros avançam por tempo; o último ("Montando
// a leitura") fica ativo até a análise real retornar e a tela trocar pro
// resultado. Honesto: descreve o que o copiloto avalia, sem fabricar números.
const STEPS = [
    "Lendo as mensagens",
    "Identificando a intenção",
    "Avaliando temperatura e urgência",
    "Montando a leitura",
];

export function EvaAnalyzingState() {
    const [active, setActive] = useState(0);

    useEffect(() => {
        if (active >= STEPS.length - 1) return; // último passo segura até a análise real terminar
        const t = setTimeout(() => setActive((i) => Math.min(i + 1, STEPS.length - 1)), 1150);
        return () => clearTimeout(t);
    }, [active]);

    return (
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-6 text-center">
            <EvaOrb variant="blue" state="analyzing" size={76} className="mb-4" />
            <p className="text-[13px] font-semibold mb-4" style={{ color: "#0B1220" }}>
                EVA analisando a conversa<span className="vz-eva-dots" aria-hidden="true" />
            </p>

            <ul className="w-full max-w-[248px] space-y-2.5 text-left">
                {STEPS.map((label, i) => {
                    const done = i < active;
                    const isActive = i === active;
                    return (
                        <li
                            key={label}
                            className="flex items-center gap-2.5 vz-eva-step"
                            style={{ opacity: done || isActive ? 1 : 0.42, transition: "opacity .45s ease" }}
                        >
                            <span
                                className="grid place-items-center shrink-0 rounded-full"
                                style={{
                                    width: 18,
                                    height: 18,
                                    background: done ? "rgba(37,99,235,0.10)" : "transparent",
                                    border: done ? "none" : `1.5px solid ${isActive ? "#2563EB" : "#CBD5E1"}`,
                                }}
                            >
                                {done ? (
                                    <Check size={11} strokeWidth={3} style={{ color: "#2563EB" }} />
                                ) : isActive ? (
                                    <span className="vz-eva-dot rounded-full" style={{ width: 7, height: 7, background: "#2563EB" }} />
                                ) : null}
                            </span>
                            <span
                                className={isActive ? "vz-eva-steplabel" : ""}
                                style={{
                                    fontSize: 12.5,
                                    fontWeight: isActive ? 600 : 500,
                                    color: done ? "#475569" : isActive ? "#0B1220" : "#94A3B8",
                                }}
                            >
                                {label}
                            </span>
                        </li>
                    );
                })}
            </ul>

            <style>{`
                @keyframes vzEvaDot { 0%,100%{transform:scale(0.62);opacity:.5} 50%{transform:scale(1);opacity:1} }
                .vz-eva-dot { animation: vzEvaDot 1.1s ease-in-out infinite; }
                @keyframes vzEvaShimmer { 0%{background-position:-120px 0} 100%{background-position:240px 0} }
                .vz-eva-steplabel {
                    background: linear-gradient(90deg, #0B1220 0%, #0B1220 38%, #2563EB 50%, #0B1220 62%, #0B1220 100%);
                    background-size: 240px 100%;
                    -webkit-background-clip: text; background-clip: text;
                    -webkit-text-fill-color: transparent;
                    animation: vzEvaShimmer 1.7s linear infinite;
                }
                .vz-eva-dots::after { content:""; animation: vzEvaDots 1.3s steps(1,end) infinite; }
                @keyframes vzEvaDots { 0%{content:""} 25%{content:"."} 50%{content:".."} 75%{content:"..."} 100%{content:""} }
                @keyframes vzEvaStepIn { from{opacity:0;transform:translateY(3px)} to{opacity:1;transform:none} }
                .vz-eva-step { animation: vzEvaStepIn .4s ease both; }
                @media (prefers-reduced-motion: reduce) {
                    .vz-eva-dot, .vz-eva-steplabel, .vz-eva-dots::after, .vz-eva-step { animation: none !important; }
                    .vz-eva-steplabel { -webkit-text-fill-color: #0B1220; background: none; }
                }
            `}</style>
        </div>
    );
}
