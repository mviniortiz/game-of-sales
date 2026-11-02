import { useMemo } from "react";

// Curva de geração de um dia de sol (o sino que todo integrador lê no inversor),
// preenchida até a hora de agora, com o sol em cima da curva. Fica atrás do
// cartão de login. Cor sólida do token --vyz-sol, sem brilho.
const W = 1000;
const BASE = 300;
const PICO = 70;
const LARGURA = 185;

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
export function fracaoDoDia(agora = new Date()): number | null {
    const h = agora.getHours() + agora.getMinutes() / 60;
    if (h < 6 || h >= 18) return null;
    return (h - 6) / 12;
}

export function saudacao(agora = new Date()): string {
    const h = agora.getHours();
    if (h >= 5 && h < 12) return "Bom dia.";
    if (h >= 12 && h < 18) return "Boa tarde.";
    return "Boa noite.";
}

export function SolDoDia() {
    const t = useMemo(() => fracaoDoDia(agora()), []);
    const sx = t === null ? null : t * W;

    return (
        <div className="vz-sol" aria-hidden>
            <svg className="vz-sol__svg" viewBox={`0 0 ${W} ${BASE + 1}`} width="1000" height="301" preserveAspectRatio="none">
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
            {/* Rótulos em HTML: o SVG estica na largura e distorceria o texto. */}
            {["6h", "12h", "18h"].map((h, i) => (
                <span key={h} className="vz-sol__hora" style={{ left: `${i * 50}%` }} data-lado={i}>
                    {h}
                </span>
            ))}
            {sx !== null && (
                <span
                    className="vz-sol__astro"
                    style={{ left: `${(sx / W) * 100}%`, top: `calc(24px + (100% - 52px) * ${(yEm(sx) / (BASE + 1)).toFixed(4)})` }}
                />
            )}
        </div>
    );
}
