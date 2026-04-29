import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

// Componente reutilizável pra seções "narrativa + imagem conceitual" da Vyzon.
// Uma imagem por seção (Ritmo Comercial, Segunda-feira, War Room, Eva).
// Aspect ratio 16:9 (1600x900) — define width/height pra evitar CLS.
//
// Acessibilidade: alt descritivo obrigatório porque as imagens explicam
// conceitos. Conteúdo principal sempre em HTML real (h2/p/ul) — a imagem
// reforça, não substitui a mensagem.

export type IdentityImageSectionProps = {
    id?: string;
    eyebrow: string;
    title: ReactNode;
    body: string;
    extra?: string;
    bullets?: string[];
    image: { src: string; alt: string };
    /** Cor de acento da seção (Eva = roxo, War Room = azul, demais = emerald) */
    accent?: "emerald" | "blue" | "violet";
    /** "right" (default) ou "left" — onde a imagem aparece em desktop */
    imageSide?: "left" | "right";
    /** CTA opcional, discreto, com âncora pra demo */
    cta?: { label: string; href: string };
};

const ACCENT = {
    emerald: { color: "#00E37A", soft: "rgba(0,227,122,0.10)", border: "rgba(0,227,122,0.22)", text: "rgba(0,227,122,0.9)" },
    blue: { color: "#1556C0", soft: "rgba(21,86,192,0.10)", border: "rgba(21,86,192,0.30)", text: "rgba(80,140,240,0.95)" },
    violet: { color: "#A855F7", soft: "rgba(168,85,247,0.10)", border: "rgba(168,85,247,0.30)", text: "rgba(196,148,255,0.95)" },
};

export const IdentityImageSection = ({
    id,
    eyebrow,
    title,
    body,
    extra,
    bullets,
    image,
    accent = "emerald",
    imageSide = "right",
    cta,
}: IdentityImageSectionProps) => {
    const a = ACCENT[accent];
    const orderTextLg = imageSide === "right" ? "lg:order-1" : "lg:order-2";
    const orderImageLg = imageSide === "right" ? "lg:order-2" : "lg:order-1";

    return (
        <section
            id={id}
            className="relative overflow-hidden py-24 sm:py-28 px-4 sm:px-6 lg:px-8"
            style={{ background: "var(--vyz-bg)" }}
        >
            <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-[400px] pointer-events-none"
                style={{
                    background: `radial-gradient(ellipse 60% 50% at 50% 0%, ${a.soft} 0%, transparent 70%)`,
                }}
            />

            <div className="relative max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
                {/* Texto */}
                <div className={`order-2 ${orderTextLg}`}>
                    <p
                        className="text-[11px] sm:text-xs mb-4 inline-block px-3 py-1 rounded-full"
                        style={{
                            fontWeight: 600,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            background: a.soft,
                            border: `1px solid ${a.border}`,
                            color: a.text,
                        }}
                    >
                        {eyebrow}
                    </p>
                    <h2
                        className="font-heading"
                        style={{
                            fontWeight: 700,
                            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
                            lineHeight: 1.12,
                            letterSpacing: "-0.035em",
                            color: "rgba(255,255,255,0.95)",
                        }}
                    >
                        {title}
                    </h2>
                    <p
                        className="mt-5 text-[15px] sm:text-base"
                        style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.65 }}
                    >
                        {body}
                    </p>
                    {extra && (
                        <p
                            className="mt-3 text-[14px]"
                            style={{ color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}
                        >
                            {extra}
                        </p>
                    )}
                    {bullets && bullets.length > 0 && (
                        <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {bullets.map((b) => (
                                <li
                                    key={b}
                                    className="flex items-start gap-2.5 text-[14px]"
                                    style={{ color: "rgba(255,255,255,0.78)" }}
                                >
                                    <span
                                        className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                                        style={{ background: a.color }}
                                        aria-hidden="true"
                                    />
                                    <span>{b}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                    {cta && (
                        <p className="mt-7">
                            <a
                                href={cta.href}
                                className="inline-flex items-center gap-1.5 text-[14px] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 rounded"
                                style={{ color: a.color, fontWeight: 600 }}
                            >
                                {cta.label}
                                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
                            </a>
                        </p>
                    )}
                </div>

                {/* Imagem */}
                <div className={`order-1 ${orderImageLg}`}>
                    <figure
                        className="rounded-2xl overflow-hidden"
                        style={{
                            border: `1px solid ${a.border}`,
                            boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 24px 60px -20px ${a.soft.replace("0.10", "0.45")}`,
                            background: "rgba(255,255,255,0.02)",
                        }}
                    >
                        <img
                            src={image.src}
                            alt={image.alt}
                            width={1600}
                            height={900}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-auto block"
                        />
                    </figure>
                </div>
            </div>
        </section>
    );
};

export default IdentityImageSection;
