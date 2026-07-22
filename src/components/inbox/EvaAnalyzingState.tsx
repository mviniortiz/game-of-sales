import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { EvaThinkingOrb } from "@/components/eva/EvaThinkingOrb";

// Momento "EVA lendo a conversa" no Inbox. Em vez de um spinner, a EVA mostra
// que está LENDO: uma linha de varredura passa sobre uma miniatura da conversa
// (bolhas abstratas) e cada bolha acende quando a leitura cruza por ela, com um
// status que evolui. Honesto: não fabrica sinais nem números — só representa o
// ato de ler; os sinais reais aparecem no reveal do resultado (RealContent).
const STATUSES = [
    "Lendo as mensagens",
    "Identificando a intenção",
    "Avaliando temperatura e urgência",
    "Montando a leitura",
];

// Miniatura de conversa: lado (lead=esquerda, você=direita) + largura relativa.
const BUBBLES: { me: boolean; w: number }[] = [
    { me: false, w: 64 },
    { me: false, w: 44 },
    { me: true, w: 54 },
    { me: false, w: 72 },
];

export function EvaAnalyzingState() {
    const reduce = useReducedMotion();
    const [status, setStatus] = useState(0);

    useEffect(() => {
        if (reduce) return; // sem rotação de texto quando o usuário pede menos movimento
        const t = setInterval(() => setStatus((i) => (i + 1) % STATUSES.length), 1500);
        return () => clearInterval(t);
    }, [reduce]);

    return (
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-6 text-center">
            <EvaThinkingOrb
                state="searching"
                size={64}
                displaySize={56}
                theme="light"
                agentKey="qualificacao"
                className="mb-3.5"
                aria-hidden
            />
            <p className="text-[13px] font-semibold mb-4" style={{ color: "#0B1220" }}>
                EVA lendo a conversa<span className="vz-eva-dots" aria-hidden="true" />
            </p>

            {/* Miniatura da conversa sendo varrida pela leitura da EVA */}
            <div className="vz-scan-wrap" aria-hidden="true">
                {BUBBLES.map((b, i) => (
                    <div key={i} className={`vz-scan-row ${b.me ? "vz-scan-row--me" : ""}`}>
                        <span
                            className="vz-scan-bubble"
                            style={{
                                width: `${b.w}%`,
                                background: b.me ? "rgba(37,99,235,0.16)" : "rgba(13,20,33,0.07)",
                                animationDelay: `${i * 0.42}s`,
                            }}
                        />
                    </div>
                ))}
                <span className="vz-scan-line" />
            </div>

            <p
                className="vz-eva-steplabel mt-4 text-[12.5px] font-semibold"
                aria-live="polite"
                style={{ minHeight: 16 }}
            >
                {STATUSES[status]}
            </p>

            <style>{`
                .vz-scan-wrap {
                    position: relative; overflow: hidden;
                    width: 100%; max-width: 250px;
                    display: flex; flex-direction: column; gap: 8px;
                    padding: 14px; border-radius: 14px;
                    background: var(--ibx-card, #ffffff);
                    border: 1px solid var(--ibx-line, #E7E1D5);
                }
                .vz-scan-row { display: flex; }
                .vz-scan-row--me { justify-content: flex-end; }
                .vz-scan-bubble {
                    height: 12px; border-radius: 7px; display: block;
                    animation: vzScanRead 1.7s ease-in-out infinite;
                }
                @keyframes vzScanRead {
                    0%, 70%, 100% { filter: brightness(1); opacity: .82; }
                    14% { filter: brightness(1.4); opacity: 1; }
                }
                .vz-scan-line {
                    position: absolute; left: 0; right: 0; top: 0; height: 26px;
                    background: linear-gradient(180deg, rgba(37,99,235,0) 0%, rgba(37,99,235,0.18) 50%, rgba(37,99,235,0) 100%);
                    animation: vzScanSweep 1.7s ease-in-out infinite;
                }
                @keyframes vzScanSweep {
                    0% { transform: translateY(-26px); }
                    100% { transform: translateY(122px); }
                }
                .vz-eva-dots::after { content:""; animation: vzEvaDots 1.3s steps(1,end) infinite; }
                @keyframes vzEvaDots { 0%{content:""} 25%{content:"."} 50%{content:".."} 75%{content:"..."} 100%{content:""} }
                .vz-eva-steplabel {
                    background: linear-gradient(90deg, #475569 0%, #475569 38%, #2563EB 50%, #475569 62%, #475569 100%);
                    background-size: 240px 100%;
                    -webkit-background-clip: text; background-clip: text;
                    -webkit-text-fill-color: transparent;
                    animation: vzEvaShimmer 1.7s linear infinite;
                }
                @keyframes vzEvaShimmer { 0%{background-position:-120px 0} 100%{background-position:240px 0} }
                @media (prefers-reduced-motion: reduce) {
                    .vz-scan-bubble, .vz-scan-line, .vz-eva-dots::after, .vz-eva-steplabel { animation: none !important; }
                    .vz-scan-line { display: none; }
                    .vz-eva-steplabel { -webkit-text-fill-color: #475569; background: none; }
                }
            `}</style>
        </div>
    );
}
