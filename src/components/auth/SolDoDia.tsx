import { useMemo } from "react";

// Curva de geração de um dia de sol (o sino que todo integrador lê no inversor),
// pintada em amarelo até a hora de agora, com o sol marcado em cima dela. Vive
// no painel escuro do login. Cor sólida do token --vyz-sol, sem brilho.
const W = 1000;
const BASE = 300;
const PICO = 40;
const LARGURA = 190;

const yEm = (x: number) => BASE - (BASE - PICO) * Math.exp(-(((x - W / 2) / LARGURA) ** 2));

const CURVA = (() => {
    const pts: string[] = [];
    for (let i = 0; i <= 80; i++) {
        const x = (i / 80) * W;
        pts.push(`${x.toFixed(1)},${yEm(x).toFixed(1)}`);
    }
    return `M${pts.join(" L")}`;
})();
const AREA = `${CURVA} L${W},${BASE} L0,${BASE} Z`;
const HORAS = ["6h", "9h", "12h", "15h", "18h"];

/** Agora; em dev, ?hora=14.5 fixa a hora pra conferir o desenho. */
export function agora(): Date {
    const d = new Date();
    if (import.meta.env.DEV && typeof window !== "undefined") {
        const h = Number(new URLSearchParams(window.location.search).get("hora"));
        if (Number.isFinite(h) && h > 0) d.setHours(Math.floor(h), Math.round((h % 1) * 60), 0, 0);
    }
    return d;
}

/** Fração do dia solar (6h às 18h) na hora local; fora disso, null. */
export function fracaoDoDia(d: Date): number | null {
    const h = d.getHours() + d.getMinutes() / 60;
    if (h < 6 || h >= 18) return null;
    return (h - 6) / 12;
}

/** "14h30" */
export const horaCurta = (d: Date) => `${d.getHours()}h${String(d.getMinutes()).padStart(2, "0")}`;

export function SolDoDia({ quando }: { quando: Date }) {
    const t = useMemo(() => fracaoDoDia(quando), [quando]);
    const sx = t === null ? null : t * W;
    // Altura do sol em fração do gráfico, para posicionar o marcador em HTML.
    const sy = sx === null ? 0 : yEm(sx) / BASE;

    return (
        <div className="vz-sol" aria-hidden>
            <div className="vz-sol__grafico">
                <svg viewBox={`0 0 ${W} ${BASE}`} width="1000" height="300" preserveAspectRatio="none">
                    <defs>
                        <clipPath id="vz-sol-ate-agora">
                            <rect className="vz-sol__corte" x="0" y="0" width={sx ?? 0} height={BASE} />
                        </clipPath>
                    </defs>
                    <path d={AREA} className="vz-sol__area" />
                    {sx !== null && <path d={AREA} className="vz-sol__gerado" clipPath="url(#vz-sol-ate-agora)" />}
                    <path d={CURVA} className="vz-sol__linha" vectorEffect="non-scaling-stroke" />
                    <line x1="0" y1={BASE} x2={W} y2={BASE} className="vz-sol__chao" vectorEffect="non-scaling-stroke" />
                </svg>
                {sx !== null && (
                    <span className="vz-sol__astro" style={{ left: `${(sx / W) * 100}%`, top: `${sy * 100}%` }}>
                        <span className="vz-sol__agora">agora</span>
                    </span>
                )}
            </div>
            <div className="vz-sol__horas">
                {HORAS.map((h) => <span key={h}>{h}</span>)}
            </div>
        </div>
    );
}
