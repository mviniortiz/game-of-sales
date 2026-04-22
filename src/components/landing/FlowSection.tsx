import { useEffect, useRef, useState } from "react";
import { Check, ArrowRight, TrendingUp, Workflow } from "lucide-react";

type Stage = 0 | 1 | 2;

export const FlowSection = () => {
    const sectionRef = useRef<HTMLElement | null>(null);
    const rafRef = useRef<number | null>(null);
    const isVisibleRef = useRef(false);
    const [activeStage, setActiveStage] = useState<Stage>(0);

    useEffect(() => {
        const section = sectionRef.current;
        if (!section) return;
        const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    isVisibleRef.current = entry.isIntersecting;
                    if (entry.isIntersecting && rafRef.current === null && !prefersReduced) {
                        lastTickRef.current = performance.now();
                        rafRef.current = requestAnimationFrame(tick);
                    }
                });
            },
            { threshold: 0.2 }
        );
        observer.observe(section);

        const lastTickRef = { current: performance.now() };
        const STAGE_MS = 1600;

        const tick = (now: number) => {
            if (!isVisibleRef.current) {
                rafRef.current = null;
                return;
            }
            if (now - lastTickRef.current >= STAGE_MS) {
                lastTickRef.current = now;
                setActiveStage((s) => ((s + 1) % 3) as Stage);
            }
            rafRef.current = requestAnimationFrame(tick);
        };

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
            style={{ background: "var(--vyz-bg)" }}
        >
            <div
                className="absolute inset-x-0 top-0 h-[400px] pointer-events-none"
                style={{
                    background:
                        "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(0,227,122,0.08) 0%, transparent 70%)",
                }}
            />

            <div className="relative max-w-6xl mx-auto">
                <div className="text-center mb-16 landing-fade-in-up">
                    <div className="inline-flex items-center gap-2 mb-4">
                        <Workflow className="h-3.5 w-3.5 text-emerald-400" strokeWidth={2.5} />
                        <span
                            className="text-xs uppercase tracking-widest"
                            style={{ fontWeight: 600, color: "rgba(0,227,122,0.9)", letterSpacing: "0.12em" }}
                        >
                            Como funciona
                        </span>
                    </div>
                    <h2
                        className="font-heading"
                        style={{
                            fontWeight: 700,
                            fontSize: "clamp(1.85rem, 4.5vw, 2.75rem)",
                            lineHeight: 1.08,
                            letterSpacing: "-0.04em",
                            color: "rgba(255,255,255,0.95)",
                        }}
                    >
                        Da venda ao ranking,{" "}
                        <span
                            style={{
                                background: "linear-gradient(135deg, #00E37A, #33FF9E)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                            }}
                        >
                            em menos de 2 segundos
                        </span>
                        .
                    </h2>
                    <p
                        className="mt-4 max-w-xl mx-auto"
                        style={{ fontSize: "1.0625rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}
                    >
                        O checkout dispara o CRM. O CRM atualiza o ranking. Ninguém digita nada.
                    </p>
                </div>

                <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-5 md:gap-3 items-stretch">
                    <StageCard
                        index={0}
                        active={activeStage === 0}
                        eyebrow="Etapa 1 · Checkout"
                        title="Venda aprovada"
                    >
                        <CheckoutMock active={activeStage === 0} />
                    </StageCard>

                    <MobileConnector active={activeStage === 1} latency="~180 ms" />
                    <Connector active={activeStage === 1} latency="~180 ms" />

                    <StageCard
                        index={1}
                        active={activeStage === 1}
                        eyebrow="Etapa 2 · Pipeline"
                        title="Deal criado automático"
                    >
                        <PipelineMock active={activeStage === 1} />
                    </StageCard>

                    <MobileConnector active={activeStage === 2} latency="~120 ms" />
                    <Connector active={activeStage === 2} latency="~120 ms" />

                    <StageCard
                        index={2}
                        active={activeStage === 2}
                        eyebrow="Etapa 3 · Ranking"
                        title="Vendedor sobe posição"
                    >
                        <RankingMock active={activeStage === 2} />
                    </StageCard>
                </div>

                <div className="mt-10 flex items-center justify-center gap-2 landing-fade-in-up landing-delay-300">
                    <span
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
                        style={{
                            background: "rgba(0,227,122,0.08)",
                            boxShadow: "0 0 0 1px rgba(0,227,122,0.2)",
                            color: "rgba(110,231,183,0.95)",
                            fontWeight: 600,
                        }}
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 flow-ping" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                        </span>
                        Menos de 2s do pagamento ao ranking atualizado
                    </span>
                </div>
            </div>

            <style>{`
                @keyframes flow-ping-kf {
                    0% { transform: scale(1); opacity: 0.6; }
                    100% { transform: scale(2.4); opacity: 0; }
                }
                .flow-ping { animation: flow-ping-kf 1.6s ease-out infinite; }

                @keyframes flow-connector-dash {
                    to { stroke-dashoffset: -14; }
                }
                .flow-connector-line { animation: flow-connector-dash 0.8s linear infinite; }
                .flow-connector-line-vertical { animation: flow-connector-dash 0.8s linear infinite; }

                @keyframes flow-slide-in {
                    0% { opacity: 0; transform: translateY(-6px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .flow-new-row { animation: flow-slide-in 500ms cubic-bezier(0.16,1,0.3,1); }

                @keyframes flow-bump-up {
                    0% { transform: translateY(18px); opacity: 0.4; }
                    60% { transform: translateY(-3px); opacity: 1; }
                    100% { transform: translateY(0); opacity: 1; }
                }
                .flow-rank-up { animation: flow-bump-up 600ms cubic-bezier(0.22,1,0.36,1); }

                @media (prefers-reduced-motion: reduce) {
                    .flow-ping, .flow-connector-line, .flow-connector-line-vertical, .flow-new-row, .flow-rank-up { animation: none; }
                }
            `}</style>
        </section>
    );
};

// ────────────────────────────────────────────────────────────

function StageCard({
    index,
    active,
    eyebrow,
    title,
    children,
}: {
    index: number;
    active: boolean;
    eyebrow: string;
    title: string;
    children: React.ReactNode;
}) {
    const delay = index === 0 ? "" : index === 1 ? "landing-delay-100" : "landing-delay-200";
    return (
        <div
            className={`relative rounded-2xl p-5 sm:p-6 landing-fade-in-up ${delay}`}
            style={{
                background: "rgba(255,255,255,0.03)",
                boxShadow: active
                    ? "0 0 0 1px rgba(0,227,122,0.45), 0 0 0 4px rgba(0,227,122,0.08), 0 20px 40px -20px rgba(0,227,122,0.35)"
                    : "0 0 0 1px rgba(255,255,255,0.08)",
                transition: "box-shadow 500ms ease",
            }}
        >
            <div className="flex items-center justify-between mb-4">
                <p
                    className="text-[10px] uppercase tracking-widest"
                    style={{
                        fontWeight: 700,
                        color: active ? "rgba(0,227,122,0.95)" : "rgba(0,227,122,0.55)",
                        letterSpacing: "0.12em",
                        transition: "color 300ms ease",
                    }}
                >
                    {eyebrow}
                </p>
                {active && (
                    <span
                        className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-full"
                        style={{
                            background: "rgba(0,227,122,0.12)",
                            color: "rgba(110,231,183,1)",
                            fontWeight: 700,
                        }}
                    >
                        <span className="w-1 h-1 rounded-full bg-emerald-400" />
                        ativo
                    </span>
                )}
            </div>
            <p
                className="text-base mb-4"
                style={{
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.95)",
                    letterSpacing: "-0.01em",
                }}
            >
                {title}
            </p>
            <div className="relative">{children}</div>
        </div>
    );
}

function Connector({ active, latency }: { active: boolean; latency: string }) {
    return (
        <div className="hidden md:flex flex-col items-center justify-center gap-2 px-1">
            <svg width="64" height="14" viewBox="0 0 64 14" fill="none" aria-hidden>
                <line
                    x1="0"
                    y1="7"
                    x2="54"
                    y2="7"
                    stroke={active ? "rgba(0,227,122,0.7)" : "rgba(255,255,255,0.15)"}
                    strokeWidth="1.5"
                    strokeDasharray="3 4"
                    strokeLinecap="round"
                    className={active ? "flow-connector-line" : ""}
                    style={{ transition: "stroke 400ms ease" }}
                />
                <path
                    d="M 52 2 L 62 7 L 52 12"
                    fill="none"
                    stroke={active ? "rgba(0,227,122,0.9)" : "rgba(255,255,255,0.2)"}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ transition: "stroke 400ms ease" }}
                />
            </svg>
            <span
                className="text-[10px]"
                style={{
                    fontWeight: 600,
                    color: active ? "rgba(110,231,183,0.9)" : "rgba(255,255,255,0.3)",
                    fontVariantNumeric: "tabular-nums",
                    transition: "color 400ms ease",
                }}
            >
                {latency}
            </span>
        </div>
    );
}

function MobileConnector({ active, latency }: { active: boolean; latency: string }) {
    return (
        <div className="md:hidden flex items-center justify-center gap-3 py-1" aria-hidden>
            <svg width="14" height="36" viewBox="0 0 14 36" fill="none">
                <line
                    x1="7"
                    y1="0"
                    x2="7"
                    y2="26"
                    stroke={active ? "rgba(0,227,122,0.7)" : "rgba(255,255,255,0.15)"}
                    strokeWidth="1.5"
                    strokeDasharray="3 4"
                    strokeLinecap="round"
                    className={active ? "flow-connector-line-vertical" : ""}
                    style={{ transition: "stroke 400ms ease" }}
                />
                <path
                    d="M 2 24 L 7 34 L 12 24"
                    fill="none"
                    stroke={active ? "rgba(0,227,122,0.9)" : "rgba(255,255,255,0.2)"}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ transition: "stroke 400ms ease" }}
                />
            </svg>
            <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{
                    fontWeight: 600,
                    color: active ? "rgba(110,231,183,0.95)" : "rgba(255,255,255,0.35)",
                    background: active ? "rgba(0,227,122,0.08)" : "rgba(255,255,255,0.03)",
                    boxShadow: active
                        ? "0 0 0 1px rgba(0,227,122,0.2)"
                        : "0 0 0 1px rgba(255,255,255,0.06)",
                    fontVariantNumeric: "tabular-nums",
                    transition: "all 400ms ease",
                }}
            >
                {latency}
            </span>
        </div>
    );
}

// ── Mock 1: Checkout ──────────────────────────────────────────

function CheckoutMock({ active }: { active: boolean }) {
    const gateways = [
        { name: "Hotmart", letter: "H", bg: "rgba(244,114,22,0.15)", fg: "rgba(251,146,60,1)" },
        { name: "Kiwify", letter: "K", bg: "rgba(34,197,94,0.15)", fg: "rgba(74,222,128,1)" },
        { name: "MP", letter: "M", bg: "rgba(59,130,246,0.15)", fg: "rgba(96,165,250,1)" },
    ];
    return (
        <div
            className="rounded-xl p-4"
            style={{
                background: "rgba(0,0,0,0.35)",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
            }}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                    {gateways.map((g) => (
                        <div
                            key={g.name}
                            className="h-6 px-2 rounded-md flex items-center gap-1"
                            style={{ background: g.bg }}
                        >
                            <span
                                className="text-[9px]"
                                style={{ color: g.fg, fontWeight: 800, letterSpacing: "0.04em" }}
                            >
                                {g.letter}
                            </span>
                        </div>
                    ))}
                </div>
                <span
                    className="text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded"
                    style={{
                        background: active ? "rgba(0,227,122,0.15)" : "rgba(255,255,255,0.05)",
                        color: active ? "rgba(110,231,183,1)" : "rgba(255,255,255,0.4)",
                        fontWeight: 700,
                        transition: "all 400ms ease",
                    }}
                >
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    aprovado
                </span>
            </div>

            <div className="mb-2">
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>
                    Mentoria 3.0 · PIX
                </p>
                <p
                    className="mt-0.5"
                    style={{
                        fontWeight: 800,
                        fontSize: "1.5rem",
                        color: "rgba(255,255,255,0.95)",
                        letterSpacing: "-0.03em",
                        fontVariantNumeric: "tabular-nums",
                    }}
                >
                    R$ 1.497<span style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.95rem" }}>,00</span>
                </p>
            </div>

            <div className="flex items-center justify-between pt-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Lucas Medeiros
                </p>
                <p
                    className="text-[10px]"
                    style={{ color: "rgba(255,255,255,0.35)", fontVariantNumeric: "tabular-nums" }}
                >
                    agora
                </p>
            </div>
        </div>
    );
}

// ── Mock 2: Pipeline ──────────────────────────────────────────

function PipelineMock({ active }: { active: boolean }) {
    const columns = [
        { name: "Novo", count: 8 },
        { name: "Contato", count: 5 },
        { name: "Pago", count: 3, highlight: true },
    ];
    return (
        <div
            className="rounded-xl p-3"
            style={{
                background: "rgba(0,0,0,0.35)",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
            }}
        >
            <div className="grid grid-cols-3 gap-1.5">
                {columns.map((col) => (
                    <div key={col.name} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between px-1">
                            <span
                                className="text-[9px] uppercase tracking-wider"
                                style={{
                                    fontWeight: 700,
                                    color: col.highlight && active ? "rgba(0,227,122,0.9)" : "rgba(255,255,255,0.4)",
                                    letterSpacing: "0.08em",
                                }}
                            >
                                {col.name}
                            </span>
                            <span
                                className="text-[9px] px-1 rounded"
                                style={{
                                    background: "rgba(255,255,255,0.05)",
                                    color: "rgba(255,255,255,0.5)",
                                    fontWeight: 600,
                                    fontVariantNumeric: "tabular-nums",
                                }}
                            >
                                {col.count}
                            </span>
                        </div>

                        {col.highlight ? (
                            <>
                                <div
                                    key={active ? "new" : "stale"}
                                    className={active ? "flow-new-row" : ""}
                                    style={{
                                        padding: "8px 8px",
                                        borderRadius: 8,
                                        background: active ? "rgba(0,227,122,0.1)" : "rgba(255,255,255,0.03)",
                                        borderLeft: `2px solid ${active ? "rgba(0,227,122,0.8)" : "rgba(255,255,255,0.1)"}`,
                                        transition: "background 400ms ease, border-color 400ms ease",
                                    }}
                                >
                                    <p
                                        className="text-[10px] mb-0.5"
                                        style={{
                                            color: active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.5)",
                                            fontWeight: 600,
                                        }}
                                    >
                                        Lucas M.
                                    </p>
                                    <p
                                        className="text-[9px]"
                                        style={{
                                            color: active ? "rgba(110,231,183,1)" : "rgba(255,255,255,0.35)",
                                            fontWeight: 700,
                                            fontVariantNumeric: "tabular-nums",
                                        }}
                                    >
                                        R$ 1.497
                                    </p>
                                </div>
                                <SkeletonRow opacity={0.5} />
                                <SkeletonRow opacity={0.35} />
                            </>
                        ) : (
                            <>
                                <SkeletonRow opacity={0.55} />
                                <SkeletonRow opacity={0.4} />
                                <SkeletonRow opacity={0.25} />
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function SkeletonRow({ opacity }: { opacity: number }) {
    return (
        <div
            style={{
                padding: "8px 8px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.03)",
                borderLeft: "2px solid rgba(255,255,255,0.08)",
                opacity,
            }}
        >
            <div
                style={{
                    height: 6,
                    width: "70%",
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.12)",
                    marginBottom: 4,
                }}
            />
            <div
                style={{
                    height: 5,
                    width: "40%",
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.08)",
                }}
            />
        </div>
    );
}

// ── Mock 3: Ranking ───────────────────────────────────────────

function RankingMock({ active }: { active: boolean }) {
    const rows = active
        ? [
              { pos: 1, name: "Lucas M.", score: "R$ 42.8k", delta: 1, hl: true },
              { pos: 2, name: "Ana P.", score: "R$ 38.1k", delta: -1 },
              { pos: 3, name: "Rafa S.", score: "R$ 29.4k", delta: 0 },
          ]
        : [
              { pos: 1, name: "Ana P.", score: "R$ 38.1k", delta: 0 },
              { pos: 2, name: "Lucas M.", score: "R$ 41.3k", delta: 0 },
              { pos: 3, name: "Rafa S.", score: "R$ 29.4k", delta: 0 },
          ];

    return (
        <div
            className="rounded-xl p-3"
            style={{
                background: "rgba(0,0,0,0.35)",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
            }}
        >
            <div className="flex flex-col gap-1.5">
                {rows.map((r) => (
                    <div
                        key={`${r.pos}-${r.name}`}
                        className={r.hl && active ? "flow-rank-up" : ""}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "8px 10px",
                            borderRadius: 8,
                            background: r.hl && active ? "rgba(0,227,122,0.1)" : "rgba(255,255,255,0.03)",
                            boxShadow: r.hl && active ? "inset 0 0 0 1px rgba(0,227,122,0.3)" : "none",
                            transition: "background 500ms ease",
                        }}
                    >
                        <span
                            className="flex items-center justify-center text-[10px]"
                            style={{
                                width: 18,
                                height: 18,
                                borderRadius: 999,
                                background:
                                    r.pos === 1
                                        ? "rgba(250,204,21,0.18)"
                                        : r.pos === 2
                                        ? "rgba(255,255,255,0.08)"
                                        : "rgba(255,255,255,0.05)",
                                color:
                                    r.pos === 1
                                        ? "rgba(250,204,21,1)"
                                        : r.pos === 2
                                        ? "rgba(255,255,255,0.7)"
                                        : "rgba(255,255,255,0.55)",
                                fontWeight: 800,
                                fontVariantNumeric: "tabular-nums",
                            }}
                        >
                            {r.pos}
                        </span>
                        <span
                            className="flex-1 text-[11px] truncate"
                            style={{
                                color: r.hl && active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.7)",
                                fontWeight: 600,
                            }}
                        >
                            {r.name}
                        </span>
                        <span
                            className="text-[10px]"
                            style={{
                                color: r.hl && active ? "rgba(110,231,183,1)" : "rgba(255,255,255,0.45)",
                                fontVariantNumeric: "tabular-nums",
                                fontWeight: 700,
                            }}
                        >
                            {r.score}
                        </span>
                        {r.delta > 0 && active && (
                            <span
                                className="flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded"
                                style={{
                                    background: "rgba(0,227,122,0.15)",
                                    color: "rgba(110,231,183,1)",
                                    fontWeight: 800,
                                }}
                            >
                                <TrendingUp className="h-2.5 w-2.5" strokeWidth={3} />+{r.delta}
                            </span>
                        )}
                        {r.delta < 0 && active && (
                            <span
                                className="text-[9px] px-1 py-0.5 rounded"
                                style={{
                                    background: "rgba(255,255,255,0.04)",
                                    color: "rgba(255,255,255,0.35)",
                                    fontWeight: 700,
                                }}
                            >
                                {r.delta}
                            </span>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-1 justify-end mt-2">
                <ArrowRight
                    className="h-2.5 w-2.5"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                    strokeWidth={2.5}
                />
                <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>
                    ver ranking completo
                </span>
            </div>
        </div>
    );
}
