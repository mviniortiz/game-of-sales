import { EvaBot } from "@/components/eva/EvaBot";
import { EvaThinking } from "@/components/eva/EvaThinking";

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
    return (
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-6 text-center">
            <EvaBot state="thinking" size={56} className="mb-4" />

            {/* Miniatura da conversa sendo varrida pela leitura da EVA */}
            <div className="vz-scan-wrap" aria-hidden="true">
                {BUBBLES.map((b, i) => (
                    <div key={i} className={`vz-scan-row ${b.me ? "vz-scan-row--me" : ""}`}>
                        <span
                            className="vz-scan-bubble"
                            style={{
                                width: `${b.w}%`,
                                background: b.me ? "rgba(21,86,192,0.16)" : "rgba(13,20,33,0.07)",
                                animationDelay: `${i * 0.42}s`,
                            }}
                        />
                    </div>
                ))}
                <span className="vz-scan-line" />
            </div>

            <EvaThinking className="mt-5" etapas={STATUSES} intervalo={1600} tempo />

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
                    background: linear-gradient(180deg, rgba(21,86,192,0) 0%, rgba(21,86,192,0.18) 50%, rgba(21,86,192,0) 100%);
                    animation: vzScanSweep 1.7s ease-in-out infinite;
                }
                @keyframes vzScanSweep {
                    0% { transform: translateY(-26px); }
                    100% { transform: translateY(122px); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .vz-scan-bubble, .vz-scan-line { animation: none !important; }
                    .vz-scan-line { display: none; }
                }
            `}</style>
        </div>
    );
}
