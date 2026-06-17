import type { ReactNode } from "react";
import { Rise } from "../animation/Rise";

interface ChapterHeaderProps {
    /** Índice do capítulo, ex.: "01" */
    num: string;
    /** Label mono do capítulo, ex.: "o que trava a operação" */
    kicker: string;
    /** Headline (pode conter <span className="lpx-serif"> para o acento) */
    title: ReactNode;
    /** Lede curto abaixo da headline */
    lede?: ReactNode;
    /** Banda escura (ink) inverte as cores de texto/regra */
    dark?: boolean;
    /** Conteúdo extra (CTA, etc.) abaixo do lede */
    children?: ReactNode;
    /** Largura máxima da headline */
    maxWidth?: number;
}

/**
 * Cabeçalho de capítulo do redesign — kicker numerado sobre regra-base,
 * headline Satoshi com acento serif e lede. Unifica o ritmo editorial de
 * todas as seções (resolve o desbalanço de composição do layout antigo).
 */
export const ChapterHeader = ({
    num,
    kicker,
    title,
    lede,
    dark = false,
    children,
    maxWidth = 760,
}: ChapterHeaderProps) => {
    const ink = dark ? "#FAF9F5" : "var(--lp-ink)";
    const muted = dark ? "rgba(250,249,245,0.66)" : "var(--lp-ink-70)";
    const ruleColor = dark ? "rgba(250,249,245,0.18)" : "var(--lp-line)";
    const numColor = dark ? "#7FA8E8" : "var(--lp-blue)";

    return (
        <Rise>
            <div className="mb-10 sm:mb-14">
                <div
                    className="flex items-baseline gap-3 sm:gap-4 pb-3 sm:pb-4 mb-7 sm:mb-9"
                    style={{ borderBottom: `1px solid ${ruleColor}` }}
                >
                    <span className="lpx-kicker-num" style={{ color: numColor }}>
                        {num}
                    </span>
                    <span
                        className="lp-mono"
                        style={{ color: dark ? "rgba(250,249,245,0.55)" : "var(--lp-ink-55)" }}
                    >
                        {kicker}
                    </span>
                </div>

                <h2
                    className="lpx-h"
                    style={{
                        fontSize: "clamp(2rem, 5.2vw, 3.5rem)",
                        color: ink,
                        maxWidth,
                    }}
                >
                    {title}
                </h2>

                {lede && (
                    <p
                        className="mt-5 sm:mt-6"
                        style={{
                            fontSize: "clamp(1rem, 1.9vw, 1.1875rem)",
                            lineHeight: 1.62,
                            color: muted,
                            maxWidth: 620,
                            fontWeight: 400,
                        }}
                    >
                        {lede}
                    </p>
                )}

                {children && <div className="mt-8">{children}</div>}
            </div>
        </Rise>
    );
};
