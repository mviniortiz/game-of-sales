import { useEffect, useRef, useState } from "react";
import { ShoppingCart, LayoutGrid, Trophy } from "lucide-react";

const NODES = [
    {
        icon: ShoppingCart,
        label: "Checkout",
        sub: "Hotmart, Kiwify, MP",
        desc: "A venda cai no seu gateway.",
    },
    {
        icon: LayoutGrid,
        label: "Pipeline",
        sub: "Deal criado automático",
        desc: "O CRM registra o deal sem clique.",
    },
    {
        icon: Trophy,
        label: "Ranking",
        sub: "Vendedor sobe posição",
        desc: "O time vê e a motivação aparece.",
    },
] as const;

export const FlowSection = () => {
    const sectionRef = useRef<HTMLElement | null>(null);
    const particleRef = useRef<SVGCircleElement | null>(null);
    const pathRef = useRef<SVGPathElement | null>(null);
    const rafRef = useRef<number | null>(null);
    const progressRef = useRef(0);
    const isVisibleRef = useRef(false);
    const [pulsingIdx, setPulsingIdx] = useState<number | null>(null);
    const lastPulseAtRef = useRef<number>(-1);

    useEffect(() => {
        const section = sectionRef.current;
        if (!section) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    isVisibleRef.current = entry.isIntersecting;
                    if (entry.isIntersecting && rafRef.current === null) {
                        rafRef.current = requestAnimationFrame(tick);
                    }
                });
            },
            { threshold: 0.15 }
        );

        observer.observe(section);

        const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        const tick = () => {
            if (!isVisibleRef.current || prefersReduced) {
                rafRef.current = null;
                return;
            }
            const path = pathRef.current;
            const particle = particleRef.current;
            if (!path || !particle) {
                rafRef.current = requestAnimationFrame(tick);
                return;
            }

            progressRef.current = (progressRef.current + 0.0022) % 1;
            const total = path.getTotalLength();
            const point = path.getPointAtLength(progressRef.current * total);
            particle.setAttribute("cx", String(point.x));
            particle.setAttribute("cy", String(point.y));

            const p = progressRef.current;
            let zone = -1;
            if (p > 0.02 && p < 0.08) zone = 0;
            else if (p > 0.47 && p < 0.53) zone = 1;
            else if (p > 0.92 && p < 0.98) zone = 2;

            if (zone !== -1 && lastPulseAtRef.current !== zone) {
                lastPulseAtRef.current = zone;
                setPulsingIdx(zone);
                window.setTimeout(() => setPulsingIdx((cur) => (cur === zone ? null : cur)), 650);
            } else if (zone === -1 && p > 0.1 && p < 0.4) {
                lastPulseAtRef.current = -1;
            } else if (zone === -1 && p > 0.55 && p < 0.9) {
                lastPulseAtRef.current = -1;
            }

            rafRef.current = requestAnimationFrame(tick);
        };

        if (!prefersReduced) {
            rafRef.current = requestAnimationFrame(tick);
        }

        return () => {
            observer.disconnect();
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };
    }, []);

    return (
        <section
            ref={sectionRef}
            className="relative py-28 px-4 sm:px-6 lg:px-8 overflow-hidden"
            style={{ background: "#06080a" }}
        >
            <div
                className="absolute inset-x-0 top-0 h-[400px] pointer-events-none"
                style={{
                    background:
                        "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(16,185,129,0.08) 0%, transparent 70%)",
                }}
            />

            <div className="relative max-w-5xl mx-auto">
                <div className="text-center mb-16 landing-fade-in-up">
                    <p
                        className="text-xs uppercase mb-4 tracking-widest"
                        style={{ fontWeight: "var(--fw-medium)", color: "rgba(255,255,255,0.35)" }}
                    >
                        Como funciona
                    </p>
                    <h2
                        className="font-heading"
                        style={{
                            fontWeight: "var(--fw-bold)",
                            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
                            lineHeight: 1.1,
                            letterSpacing: "-0.04em",
                            color: "rgba(255,255,255,0.95)",
                        }}
                    >
                        Da venda ao ranking,{" "}
                        <span className="text-emerald-400">tudo em um fluxo só.</span>
                    </h2>
                    <p
                        className="mt-4 max-w-xl mx-auto"
                        style={{ fontSize: "1.0625rem", color: "rgba(255,255,255,0.45)" }}
                    >
                        O checkout dispara o CRM. O CRM atualiza o ranking. Ninguém digita nada.
                    </p>
                </div>

                <div className="relative">
                    <svg
                        className="absolute inset-0 w-full h-full pointer-events-none hidden md:block"
                        viewBox="0 0 1000 260"
                        preserveAspectRatio="none"
                        aria-hidden
                    >
                        <defs>
                            <linearGradient id="flowStroke" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="rgba(16,185,129,0.15)" />
                                <stop offset="50%" stopColor="rgba(16,185,129,0.55)" />
                                <stop offset="100%" stopColor="rgba(16,185,129,0.15)" />
                            </linearGradient>
                            <radialGradient id="flowParticle" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="rgba(255,255,255,1)" />
                                <stop offset="40%" stopColor="rgba(110,231,183,0.9)" />
                                <stop offset="100%" stopColor="rgba(16,185,129,0)" />
                            </radialGradient>
                        </defs>
                        <path
                            ref={pathRef}
                            d="M 80 130 Q 280 40 500 130 T 920 130"
                            fill="none"
                            stroke="url(#flowStroke)"
                            strokeWidth="1.5"
                            strokeDasharray="4 6"
                            strokeLinecap="round"
                        />
                        <circle
                            ref={particleRef}
                            cx="80"
                            cy="130"
                            r="14"
                            fill="url(#flowParticle)"
                        />
                    </svg>

                    <div className="relative grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-4">
                        {NODES.map(({ icon: Icon, label, sub, desc }, idx) => {
                            const pulsing = pulsingIdx === idx;
                            return (
                                <div
                                    key={label}
                                    className={`relative rounded-2xl p-6 landing-fade-in-up ${
                                        idx === 0 ? "" : idx === 1 ? "landing-delay-100" : "landing-delay-200"
                                    }`}
                                    style={{
                                        background: "rgba(255,255,255,0.03)",
                                        boxShadow: pulsing
                                            ? "0 0 0 1px rgba(16,185,129,0.45), 0 0 48px rgba(16,185,129,0.25)"
                                            : "0 0 0 1px rgba(255,255,255,0.08)",
                                        transition: "box-shadow 300ms ease",
                                    }}
                                >
                                    {pulsing && (
                                        <span
                                            className="absolute inset-0 rounded-2xl pointer-events-none flow-shockwave"
                                            aria-hidden
                                        />
                                    )}
                                    <div className="flex items-center gap-3 mb-4">
                                        <div
                                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                                            style={{
                                                background: "rgba(16,185,129,0.12)",
                                                boxShadow: "inset 0 0 0 1px rgba(16,185,129,0.2)",
                                            }}
                                        >
                                            <Icon
                                                className="h-5 w-5 text-emerald-400"
                                                strokeWidth={1.8}
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <p
                                                className="text-[10px] uppercase tracking-widest"
                                                style={{
                                                    fontWeight: 700,
                                                    color: "rgba(16,185,129,0.9)",
                                                }}
                                            >
                                                Etapa {idx + 1}
                                            </p>
                                            <p
                                                className="text-base"
                                                style={{
                                                    fontWeight: "var(--fw-semibold)",
                                                    color: "rgba(255,255,255,0.95)",
                                                    letterSpacing: "-0.01em",
                                                }}
                                            >
                                                {label}
                                            </p>
                                        </div>
                                    </div>
                                    <p
                                        className="text-xs mb-2"
                                        style={{
                                            color: "rgba(255,255,255,0.55)",
                                            fontWeight: 500,
                                        }}
                                    >
                                        {sub}
                                    </p>
                                    <p
                                        className="text-sm leading-relaxed"
                                        style={{ color: "rgba(255,255,255,0.75)" }}
                                    >
                                        {desc}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <p
                    className="text-center text-xs mt-10 landing-fade-in-up landing-delay-300"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                >
                    Menos de 2 segundos entre o pagamento aprovado e a venda entrando no ranking.
                </p>
            </div>

            <style>{`
                @keyframes flow-shockwave-kf {
                    0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.35); }
                    100% { box-shadow: 0 0 0 22px rgba(16,185,129,0); }
                }
                .flow-shockwave {
                    border-radius: 1rem;
                    animation: flow-shockwave-kf 650ms ease-out forwards;
                }
                @media (prefers-reduced-motion: reduce) {
                    .flow-shockwave { animation: none; }
                }
            `}</style>
        </section>
    );
};
