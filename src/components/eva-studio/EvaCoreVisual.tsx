// EVA.STUDIO.1.1 — EvaCoreVisual (light, reativo ao estado da EVA)
// A EVA como entidade abstrata: núcleo vivo de plasma/energia, NÃO um avatar.
// Protagonista visual: glow amplo e suave, anéis visíveis, linhas CURVAS de
// conexão, breathing lento. Reage ao estado: idle · analyzing · configuring ·
// ready · attention. CSS + SVG inline (sem imagem/canvas/three/lottie/neon/
// robô/cérebro/circuito). Respeita prefers-reduced-motion (estático, mas o
// estado segue legível por cor + badge).

export type EvaCoreState = "idle" | "analyzing" | "configuring" | "ready" | "attention";

interface EvaCoreVisualProps {
    className?: string;
    state?: EvaCoreState;
    showStatus?: boolean;
}

const STATE_BADGE: Record<EvaCoreState, { text: string; color: string; bg: string; border: string } | null> = {
    idle: null,
    analyzing: { text: "Analisando", color: "#7C3AED", bg: "#F5F3FF", border: "rgba(124,58,237,0.22)" },
    configuring: { text: "Configurando", color: "#2563EB", bg: "#EFF4FF", border: "rgba(37,99,235,0.22)" },
    ready: { text: "Sincronizada", color: "#16A34A", bg: "#ECFDF3", border: "rgba(22,163,74,0.22)" },
    attention: { text: "Atenção", color: "#B45309", bg: "#FFFBEB", border: "rgba(217,119,6,0.25)" },
};

// 16 conexões curvas saindo do núcleo (raio 21 → 48), simétricas e arqueadas.
const CONNECTIONS = Array.from({ length: 16 }).map((_, i) => {
    const a = (i / 16) * Math.PI * 2;
    const sx = 50 + 21 * Math.cos(a), sy = 50 + 21 * Math.sin(a);
    const ex = 50 + 48 * Math.cos(a), ey = 50 + 48 * Math.sin(a);
    const mx = 50 + 35 * Math.cos(a), my = 50 + 35 * Math.sin(a);
    const perp = a + Math.PI / 2;
    const off = 4.5;
    const cx = mx + off * Math.cos(perp), cy = my + off * Math.sin(perp);
    return { d: `M ${sx.toFixed(2)} ${sy.toFixed(2)} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${ex.toFixed(2)} ${ey.toFixed(2)}`, delay: i * 0.14 };
});

export const EvaCoreVisual = ({ className = "", state = "idle", showStatus = true }: EvaCoreVisualProps) => {
    const badge = STATE_BADGE[state];

    return (
        <div
            className={`relative ${className}`}
            style={{ aspectRatio: "1 / 1" }}
            data-eva-state={state}
            role="img"
            aria-label={`Núcleo de inteligência da EVA — estado: ${state}`}
        >
            <style>{`
                @keyframes evaMorphA {
                    0%,100% { border-radius:58% 42% 55% 45%/50% 58% 42% 50%; transform:rotate(0deg) scale(1); }
                    33%     { border-radius:45% 55% 48% 52%/60% 45% 55% 40%; transform:rotate(120deg) scale(1.05); }
                    66%     { border-radius:52% 48% 42% 58%/45% 52% 48% 55%; transform:rotate(240deg) scale(0.97); }
                }
                @keyframes evaMorphB {
                    0%,100% { border-radius:50% 50% 45% 55%/55% 45% 55% 45%; transform:rotate(0deg) scale(1.02); }
                    50%     { border-radius:55% 45% 58% 42%/42% 58% 45% 55%; transform:rotate(-180deg) scale(0.95); }
                }
                @keyframes evaBreathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.045)} }
                @keyframes evaSpin    { to { transform: rotate(360deg); } }
                @keyframes evaSpinRev { to { transform: rotate(-360deg); } }
                @keyframes evaPulse   { 0%,100%{opacity:.55} 50%{opacity:.85} }
                @keyframes evaFloat       { 0%,100%{transform:translateY(0);opacity:.14} 50%{transform:translateY(-6px);opacity:.42} }
                @keyframes evaFloatStrong { 0%,100%{transform:translateY(0);opacity:.5} 50%{transform:translateY(-10px);opacity:.95} }
                @keyframes evaConnSoft { 0%,100%{opacity:.35} 50%{opacity:.62} }
                @keyframes evaConn     { 0%,100%{opacity:.15} 50%{opacity:1} }

                .eva-breathe { animation: evaBreathe 6.5s ease-in-out infinite; }
                .eva-core-a { animation: evaMorphA 16s ease-in-out infinite; }
                .eva-core-b { animation: evaMorphB 20s ease-in-out infinite; }
                .eva-ring-1 { animation: evaSpin 42s linear infinite; }
                .eva-ring-2 { animation: evaSpinRev 60s linear infinite; }
                .eva-ring-3 { animation: evaSpin 90s linear infinite; }
                .eva-halo   { animation: evaPulse 7s ease-in-out infinite; }
                .eva-particle { animation: evaFloat 8s ease-in-out infinite; }
                .eva-conn   { animation: evaConnSoft 5s ease-in-out infinite; transition: opacity .4s ease; }

                [data-eva-state="analyzing"] .eva-ring-1 { animation-duration: 13s; }
                [data-eva-state="analyzing"] .eva-ring-2 { animation-duration: 19s; }
                [data-eva-state="analyzing"] .eva-halo   { animation-duration: 4s; }
                [data-eva-state="analyzing"] .eva-particle,
                [data-eva-state="configuring"] .eva-particle { animation: evaFloatStrong 4.5s ease-in-out infinite; }

                [data-eva-state="configuring"] .eva-ring-1 { animation-duration: 24s; }
                [data-eva-state="configuring"] .eva-ring-2 { animation-duration: 34s; }
                [data-eva-state="configuring"] .eva-conn   { animation: evaConn 2.4s ease-in-out infinite; }

                [data-eva-state="ready"] .eva-halo   { background: radial-gradient(circle, rgba(16,185,129,0.22) 0%, rgba(34,211,238,0.12) 42%, transparent 70%); }
                [data-eva-state="ready"] .eva-ring-1 { border-color: rgba(16,185,129,0.28); }
                [data-eva-state="ready"] .eva-ring-2 { border-color: rgba(34,211,238,0.26); }

                [data-eva-state="attention"] .eva-ring-1 { border-color: rgba(217,119,6,0.5); border-style: solid; animation-duration: 80s; }
                [data-eva-state="attention"] .eva-halo   { background: radial-gradient(circle, rgba(217,119,6,0.13) 0%, transparent 66%); }

                @media (prefers-reduced-motion: reduce) {
                    .eva-breathe,.eva-core-a,.eva-core-b,.eva-ring-1,.eva-ring-2,.eva-ring-3,.eva-halo,.eva-particle,.eva-conn { animation: none !important; }
                }
            `}</style>

            {/* halo amplo — wrapper centraliza, filho só anima opacidade */}
            <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden="true">
                <div
                    className="eva-halo"
                    style={{
                        width: "112%",
                        height: "112%",
                        background: "radial-gradient(circle, rgba(124,58,237,0.34) 0%, rgba(37,99,235,0.20) 38%, rgba(34,211,238,0.08) 56%, transparent 74%)",
                        filter: "blur(14px)",
                    }}
                />
            </div>

            {/* anéis orbitais — wrapper centraliza, filhos giram em torno do próprio centro */}
            <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
                <div className="eva-ring-3 rounded-full" style={{ gridArea: "1 / 1", width: "100%", height: "100%", border: "1px solid rgba(124,58,237,0.18)" }} />
                <div className="eva-ring-1 rounded-full" style={{ gridArea: "1 / 1", width: "88%", height: "88%", border: "2px solid rgba(124,58,237,0.44)" }} />
                <div className="eva-ring-2 rounded-full" style={{ gridArea: "1 / 1", width: "66%", height: "66%", border: "1.5px dashed rgba(37,99,235,0.42)" }} />
            </div>

            {/* linhas curvas de conexão */}
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
                <defs>
                    <radialGradient id="evaLineLight" cx="50%" cy="50%" r="50%">
                        <stop offset="38%" stopColor="rgba(124,58,237,0)" />
                        <stop offset="100%" stopColor="rgba(124,58,237,0.48)" />
                    </radialGradient>
                </defs>
                {CONNECTIONS.map((c, i) => (
                    <path key={i} className="eva-conn" d={c.d} fill="none" stroke="url(#evaLineLight)" strokeWidth="0.7" strokeLinecap="round" style={{ animationDelay: `${c.delay}s` }} />
                ))}
            </svg>

            {/* núcleo — wrapper centraliza, filho respira em torno do próprio centro */}
            <div className="absolute inset-0 grid place-items-center">
              <div className="eva-breathe relative" style={{ width: "68%", height: "68%" }}>
                {/* base: esfera de plasma com volume */}
                <div
                    className="eva-core-a absolute inset-0"
                    style={{
                        background: "radial-gradient(circle at 38% 31%, #CDBEFE 0%, #A78BFA 20%, #7C3AED 47%, #2F4FE0 80%, #1D4ED8 100%)",
                        boxShadow: "0 20px 60px rgba(124,58,237,0.5), 0 8px 140px rgba(37,99,235,0.3), inset 0 4px 16px rgba(255,255,255,0.48), inset 0 -16px 38px rgba(29,78,216,0.45)",
                        filter: "blur(0.3px)",
                    }}
                />
                {/* plasma ciano fluido */}
                <div
                    className="eva-core-b absolute inset-0"
                    style={{
                        background: "radial-gradient(circle at 70% 73%, rgba(45,212,238,0.9) 0%, rgba(56,120,255,0.42) 42%, transparent 70%)",
                        mixBlendMode: "screen",
                        filter: "blur(2px)",
                    }}
                />
                {/* corrente de luz violeta (vida interna) */}
                <div
                    className="eva-core-b absolute inset-0"
                    style={{
                        background: "radial-gradient(circle at 30% 64%, rgba(167,139,250,0.55) 0%, transparent 54%)",
                        mixBlendMode: "screen",
                        filter: "blur(3px)",
                        animationDelay: "-7s",
                    }}
                />
                {/* highlight especular principal (vidro) */}
                <div
                    className="absolute"
                    aria-hidden="true"
                    style={{
                        left: "27%", top: "17%", width: "30%", height: "25%", borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.35) 45%, transparent 72%)",
                        filter: "blur(2px)",
                    }}
                />
                {/* micro brilho */}
                <div
                    className="absolute"
                    aria-hidden="true"
                    style={{
                        left: "60%", top: "31%", width: "7%", height: "6%", borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(255,255,255,0.85) 0%, transparent 70%)",
                        filter: "blur(1px)",
                    }}
                />
              </div>
            </div>

            {/* partículas */}
            {[
                { l: "20%", t: "28%", d: "0s", c: "#7C3AED" },
                { l: "80%", t: "26%", d: "1.4s", c: "#2563EB" },
                { l: "74%", t: "76%", d: "2.1s", c: "#7C3AED" },
                { l: "26%", t: "74%", d: "3.2s", c: "#2563EB" },
                { l: "50%", t: "12%", d: "0.8s", c: "#A78BFA" },
            ].map((p, i) => (
                <span
                    key={i}
                    className="eva-particle absolute rounded-full"
                    aria-hidden="true"
                    style={{ left: p.l, top: p.t, width: 3.5, height: 3.5, background: p.c, opacity: 0.32, animationDelay: p.d }}
                />
            ))}

            {/* selo de status */}
            {showStatus && badge && (
                <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 z-10">
                    <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap"
                        style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, boxShadow: "0 1px 2px rgba(11,18,32,0.04)" }}
                    >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: badge.color }} />
                        {badge.text}
                    </span>
                </div>
            )}
        </div>
    );
};

export default EvaCoreVisual;
