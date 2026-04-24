import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { C, FONTS } from "./lib";

type Variant = {
    // cor principal do accent (pill, headline highlight, CTA)
    accent: string;
    accentDim: string;
    accentTextOnBg: string; // cor do texto em cima do botão accent (preto p/ verde, branco p/ violeta)
    // cor secundária pra glow / overlay da foto
    glow: string;
    // duotone overlay sobre a foto (ou null se não aplicar)
    photoOverlay?: string;
    // pill label
    pill: string;
    // headline (3 linhas, highlight é a palavra entre **asteriscos** se quiser)
    headline: { l1: string; l2Pre: string; l2Hi: string; l2Pos: string; l3: string };
    // sub (2 linhas)
    sub: { l1: string; l2Pre: string; l2Hi: string; l2Pos: string };
    // chips
    chips: string[];
    // cta label
    ctaLabel: string;
    // bloco inverso (verde sólido com texto preto)?
    inverseBlock?: boolean;
};

type Aspect = "4x5" | "1x1" | "1_91x1";

const LAYOUTS: Record<
    Aspect,
    {
        photoWidth: string;
        photoObjPos: string;
        contentTop: number;
        contentLeft: number;
        contentRight: number;
        contentBottom: number;
        gap: number;
        innerGap: number;
        pillSize: number;
        headlineSize: number;
        headlineLS: number;
        subSize: number;
        subMaxWidth: number;
        ctaPadY: number;
        ctaPadX: number;
        ctaLabelSize: number;
        chipSize: number;
        chipPadY: number;
        chipPadX: number;
        logoSize: number;
        logoLabelSize: number;
        logoTop: number;
        logoLeft: number;
        urlTop: number;
        urlRight: number;
        urlSize: number;
        glowSize: number;
        inverseHeadlineSize: number;
    }
> = {
    "4x5": {
        photoWidth: "72%",
        photoObjPos: "center 25%",
        contentTop: 170,
        contentLeft: 76,
        contentRight: 76,
        contentBottom: 76,
        gap: 32,
        innerGap: 24,
        pillSize: 14,
        headlineSize: 78,
        headlineLS: -3.5,
        subSize: 22,
        subMaxWidth: 520,
        ctaPadY: 20,
        ctaPadX: 32,
        ctaLabelSize: 30,
        chipSize: 14,
        chipPadY: 8,
        chipPadX: 14,
        logoSize: 38,
        logoLabelSize: 26,
        logoTop: 72,
        logoLeft: 76,
        urlTop: 84,
        urlRight: 76,
        urlSize: 16,
        glowSize: 700,
        inverseHeadlineSize: 74,
    },
    "1x1": {
        photoWidth: "46%",
        photoObjPos: "center 28%",
        contentTop: 140,
        contentLeft: 72,
        contentRight: 72,
        contentBottom: 72,
        gap: 26,
        innerGap: 20,
        pillSize: 13,
        headlineSize: 70,
        headlineLS: -3,
        subSize: 20,
        subMaxWidth: 560,
        ctaPadY: 18,
        ctaPadX: 28,
        ctaLabelSize: 26,
        chipSize: 13,
        chipPadY: 7,
        chipPadX: 12,
        logoSize: 34,
        logoLabelSize: 24,
        logoTop: 56,
        logoLeft: 72,
        urlTop: 64,
        urlRight: 72,
        urlSize: 15,
        glowSize: 600,
        inverseHeadlineSize: 62,
    },
    "1_91x1": {
        photoWidth: "32%",
        photoObjPos: "center 25%",
        contentTop: 100,
        contentLeft: 52,
        contentRight: 52,
        contentBottom: 48,
        gap: 18,
        innerGap: 14,
        pillSize: 11,
        headlineSize: 44,
        headlineLS: -1.8,
        subSize: 16,
        subMaxWidth: 560,
        ctaPadY: 14,
        ctaPadX: 22,
        ctaLabelSize: 20,
        chipSize: 11,
        chipPadY: 6,
        chipPadX: 10,
        logoSize: 28,
        logoLabelSize: 20,
        logoTop: 40,
        logoLeft: 52,
        urlTop: 46,
        urlRight: 52,
        urlSize: 13,
        glowSize: 420,
        inverseHeadlineSize: 40,
    },
};

const BaseFounderHero: React.FC<{ v: Variant; aspect?: Aspect }> = ({ v, aspect = "4x5" }) => {
    const textOnAccent = v.accentTextOnBg;
    const L = LAYOUTS[aspect];

    return (
        <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
            {/* Foto founder */}
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: L.photoWidth,
                    zIndex: 1,
                }}
            >
                <Img
                    src={staticFile("avatar/founder/founder-04.png")}
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: L.photoObjPos,
                        filter: v.photoOverlay ? "grayscale(1) contrast(1.1)" : "none",
                    }}
                />
                {/* Duotone overlay (se ativo) */}
                {v.photoOverlay && (
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            background: v.photoOverlay,
                            mixBlendMode: "color",
                        }}
                    />
                )}
                {/* Fade esquerdo */}
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        background: `linear-gradient(90deg, ${C.bg} 0%, rgba(6,8,10,0.6) 20%, transparent 55%)`,
                    }}
                />
                {/* Fade inferior */}
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        background: `linear-gradient(180deg, transparent 55%, rgba(6,8,10,0.85) 100%)`,
                    }}
                />
            </div>

            {/* Glow atrás da foto */}
            <div
                style={{
                    position: "absolute",
                    top: "20%",
                    right: "-15%",
                    width: L.glowSize,
                    height: L.glowSize,
                    background: `radial-gradient(circle, ${v.glow} 0%, transparent 60%)`,
                    borderRadius: "50%",
                    filter: "blur(80px)",
                    zIndex: 0,
                }}
            />

            {/* Dot grid */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: `radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)`,
                    backgroundSize: "36px 36px",
                    maskImage: "radial-gradient(ellipse at 30% 50%, black 30%, transparent 80%)",
                    WebkitMaskImage: "radial-gradient(ellipse at 30% 50%, black 30%, transparent 80%)",
                    zIndex: 0,
                }}
            />

            {/* Logo */}
            <div
                style={{
                    position: "absolute",
                    top: L.logoTop,
                    left: L.logoLeft,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    zIndex: 10,
                }}
            >
                <Img
                    src={staticFile("logo.png")}
                    style={{
                        width: L.logoSize,
                        height: L.logoSize,
                        objectFit: "contain",
                        filter: `drop-shadow(0 0 12px ${v.accent}88)`,
                    }}
                />
                <span
                    style={{
                        fontFamily: FONTS.heading,
                        fontWeight: 800,
                        fontSize: L.logoLabelSize,
                        color: C.text,
                        letterSpacing: "-0.03em",
                    }}
                >
                    Vyzon
                </span>
            </div>

            {/* vyzon.com.br top-right */}
            <div
                style={{
                    position: "absolute",
                    top: L.urlTop,
                    right: L.urlRight,
                    fontFamily: FONTS.sans,
                    fontSize: L.urlSize,
                    fontWeight: 600,
                    color: C.text2,
                    letterSpacing: 0.5,
                    zIndex: 10,
                }}
            >
                vyzon.com.br
            </div>

            {/* Conteúdo */}
            <div
                style={{
                    position: "absolute",
                    left: L.contentLeft,
                    right: L.contentRight,
                    top: L.contentTop,
                    bottom: L.contentBottom,
                    display: "flex",
                    flexDirection: "column",
                    gap: L.gap,
                    zIndex: 10,
                }}
            >
                {/* Bloco headline */}
                {v.inverseBlock ? (
                    <div
                        style={{
                            alignSelf: "flex-start",
                            background: v.accent,
                            padding: "28px 32px",
                            borderRadius: 20,
                            maxWidth: 620,
                            boxShadow: `0 30px 80px -20px ${v.accent}88`,
                        }}
                    >
                        <div
                            style={{
                                fontFamily: FONTS.sans,
                                fontSize: L.pillSize - 1,
                                fontWeight: 800,
                                color: textOnAccent,
                                textTransform: "uppercase",
                                letterSpacing: 2.5,
                                opacity: 0.7,
                                marginBottom: 14,
                            }}
                        >
                            {v.pill}
                        </div>
                        <div
                            style={{
                                fontFamily: FONTS.heading,
                                fontSize: L.inverseHeadlineSize,
                                fontWeight: 800,
                                color: textOnAccent,
                                lineHeight: 0.98,
                                letterSpacing: L.headlineLS,
                            }}
                        >
                            {v.headline.l1}
                            <br />
                            {v.headline.l2Pre}
                            <span style={{ fontStyle: "italic", textDecoration: "underline", textDecorationThickness: 4 }}>
                                {v.headline.l2Hi}
                            </span>
                            {v.headline.l2Pos}
                            <br />
                            {v.headline.l3}
                        </div>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: L.innerGap, maxWidth: 640 }}>
                        {/* Pill */}
                        <div
                            style={{
                                display: "inline-flex",
                                alignSelf: "flex-start",
                                alignItems: "center",
                                gap: 10,
                                padding: "10px 18px",
                                borderRadius: 999,
                                background: `${v.accent}22`,
                                border: `1px solid ${v.accent}55`,
                                fontFamily: FONTS.sans,
                                fontSize: L.pillSize,
                                fontWeight: 700,
                                color: v.accent,
                                letterSpacing: 2,
                                textTransform: "uppercase",
                            }}
                        >
                            <span
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    background: v.accent,
                                    boxShadow: `0 0 12px ${v.accent}`,
                                }}
                            />
                            {v.pill}
                        </div>

                        {/* Headline */}
                        <div
                            style={{
                                fontFamily: FONTS.heading,
                                fontSize: L.headlineSize,
                                fontWeight: 800,
                                color: C.text,
                                lineHeight: 0.98,
                                letterSpacing: L.headlineLS,
                            }}
                        >
                            {v.headline.l1}
                            <br />
                            {v.headline.l2Pre}
                            <span style={{ color: v.accent }}>{v.headline.l2Hi}</span>
                            {v.headline.l2Pos}
                            <br />
                            {v.headline.l3}
                        </div>
                    </div>
                )}

                {/* Subheadline — só se não for inverseBlock */}
                {!v.inverseBlock && (
                    <div
                        style={{
                            fontFamily: FONTS.sans,
                            fontSize: L.subSize,
                            fontWeight: 500,
                            color: C.text2,
                            lineHeight: 1.4,
                            maxWidth: L.subMaxWidth,
                        }}
                    >
                        {v.sub.l1}
                        <br />
                        {v.sub.l2Pre}
                        <span style={{ color: C.text, fontWeight: 700 }}>{v.sub.l2Hi}</span>
                        {v.sub.l2Pos}
                    </div>
                )}

                {/* CTA */}
                <div style={{ display: "flex", flexDirection: "column", gap: L.innerGap - 6 }}>
                    {/* Chips */}
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {v.chips.map((t) => (
                            <div
                                key={t}
                                style={{
                                    padding: `${L.chipPadY}px ${L.chipPadX}px`,
                                    borderRadius: 999,
                                    background: "rgba(255,255,255,0.05)",
                                    border: `1px solid ${C.border}`,
                                    fontFamily: FONTS.sans,
                                    fontSize: L.chipSize,
                                    fontWeight: 600,
                                    color: C.text2,
                                }}
                            >
                                {t}
                            </div>
                        ))}
                    </div>

                    {/* Button */}
                    <div
                        style={{
                            alignSelf: "flex-start",
                            padding: `${L.ctaPadY}px ${L.ctaPadX}px`,
                            borderRadius: 18,
                            background: `linear-gradient(135deg, ${v.accent} 0%, ${v.accentDim} 100%)`,
                            boxShadow: `0 24px 60px -16px ${v.accent}aa, 0 0 50px ${v.accent}44`,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 14,
                        }}
                    >
                        <div
                            style={{
                                fontFamily: FONTS.heading,
                                fontSize: L.ctaLabelSize,
                                fontWeight: 800,
                                color: textOnAccent,
                                letterSpacing: -1,
                            }}
                        >
                            {v.ctaLabel}
                        </div>
                        <div
                            style={{
                                fontFamily: FONTS.sans,
                                fontSize: L.ctaLabelSize - 6,
                                fontWeight: 800,
                                color: textOnAccent,
                            }}
                        >
                            →
                        </div>
                    </div>
                </div>
            </div>
        </AbsoluteFill>
    );
};

// ============ VARIANTES ============

// V0 — Green brand (matches SlideFounderHero copy)
export const FounderHeroGreen: React.FC<{ aspect?: Aspect }> = ({ aspect }) => (
    <BaseFounderHero
        aspect={aspect}
        v={{
            accent: "#00E37A",
            accentDim: "#00B266",
            accentTextOnBg: "#06080a",
            glow: "rgba(0,227,122,0.22)",
            pill: "Pra quem vende",
            headline: {
                l1: "Parei de",
                l2Pre: "perder ",
                l2Hi: "venda",
                l2Pos: "",
                l3: "no esquecimento.",
            },
            sub: {
                l1: "Pipeline, WhatsApp e IA no mesmo lugar.",
                l2Pre: "O ",
                l2Hi: "Vyzon",
                l2Pos: " cobra o lead por mim.",
            },
            chips: ["14 dias grátis", "Sem cartão", "Pipeline + WhatsApp + IA"],
            ctaLabel: "Testar agora",
        }}
    />
);

// V1 — Blue enterprise (#1556C0 no lugar do verde)
export const FounderHeroBlue: React.FC<{ aspect?: Aspect }> = ({ aspect }) => (
    <BaseFounderHero
        aspect={aspect}
        v={{
            accent: "#1556C0",
            accentDim: "#0F3F8F",
            accentTextOnBg: "#ffffff",
            glow: "rgba(21,86,192,0.30)",
            pill: "Pra quem vende B2B",
            headline: {
                l1: "Pipeline",
                l2Pre: "com ",
                l2Hi: "método",
                l2Pos: ",",
                l3: "não com sorte.",
            },
            sub: {
                l1: "Previsibilidade de receita,",
                l2Pre: "sem depender da ",
                l2Hi: "memória",
                l2Pos: " do time.",
            },
            chips: ["14 dias grátis", "Sem cartão", "Setup em 1 dia"],
            ctaLabel: "Começar agora",
        }}
    />
);

// V2 — Duotone verde sobre foto preto&branco
export const FounderHeroDuotone: React.FC<{ aspect?: Aspect }> = ({ aspect }) => (
    <BaseFounderHero
        aspect={aspect}
        v={{
            accent: "#00E37A",
            accentDim: "#00B266",
            accentTextOnBg: "#06080a",
            glow: "rgba(0,227,122,0.35)",
            photoOverlay: "linear-gradient(135deg, #00E37A 0%, #1556C0 100%)",
            pill: "Time de vendas",
            headline: {
                l1: "Menos",
                l2Pre: "",
                l2Hi: "planilha",
                l2Pos: ".",
                l3: "Mais fechamento.",
            },
            sub: {
                l1: "Toda conversa no pipeline,",
                l2Pre: "todo lead com ",
                l2Hi: "próximo passo",
                l2Pos: ".",
            },
            chips: ["WhatsApp nativo", "IA que cobra", "14 dias grátis"],
            ctaLabel: "Testar agora",
        }}
    />
);

// V3 — Color block inverse (bloco verde sólido, texto preto)
export const FounderHeroBlock: React.FC<{ aspect?: Aspect }> = ({ aspect }) => (
    <BaseFounderHero
        aspect={aspect}
        v={{
            accent: "#00E37A",
            accentDim: "#00B266",
            accentTextOnBg: "#06080a",
            glow: "rgba(0,227,122,0.22)",
            pill: "Pra quem vende",
            headline: {
                l1: "Seu CRM",
                l2Pre: "virou ",
                l2Hi: "cemitério",
                l2Pos: "",
                l3: "de leads.",
            },
            sub: {
                l1: "",
                l2Pre: "",
                l2Hi: "",
                l2Pos: "",
            },
            chips: ["14 dias grátis", "Sem cartão", "Pipeline + WhatsApp + IA"],
            ctaLabel: "Trazer à vida",
            inverseBlock: true,
        }}
    />
);

// V4 — Violet accent (#8B5CF6) — mais "tech/premium"
export const FounderHeroViolet: React.FC<{ aspect?: Aspect }> = ({ aspect }) => (
    <BaseFounderHero
        aspect={aspect}
        v={{
            accent: "#8B5CF6",
            accentDim: "#6D28D9",
            accentTextOnBg: "#ffffff",
            glow: "rgba(139,92,246,0.30)",
            pill: "IA que fecha venda",
            headline: {
                l1: "Seu SDR",
                l2Pre: "não precisa ",
                l2Hi: "dormir",
                l2Pos: ".",
                l3: "O nosso também.",
            },
            sub: {
                l1: "Eva aborda lead em 30s,",
                l2Pre: "qualifica e ",
                l2Hi: "agenda reunião",
                l2Pos: " sozinha.",
            },
            chips: ["IA nativa", "14 dias grátis", "Sem setup"],
            ctaLabel: "Conhecer a Eva",
        }}
    />
);
