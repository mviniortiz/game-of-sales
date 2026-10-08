import { useEffect, useRef, useState, type ReactNode } from "react";
import "./evaBot.css";

// A EVA como ícone vivo (no jeito do Grok Bot): corpo redondo e dois olhos que
// mudam de forma conforme o que ela está fazendo. Tudo em CSS, sem imagem.
//   idle      esperando, respira, pisca e olha em volta
//   thinking  lendo as conversas, olhos varrem de um lado pro outro
//   alert     achou proposta parada, pulinho e ponto âmbar
//   talking   escrevendo a retomada
//   happy     retomada enviada ou negócio fechado, olhos em arco
export type EvaBotState = "idle" | "thinking" | "alert" | "talking" | "happy";

export function EvaBot({
    state = "idle",
    size = 40,
    still = false,
    className = "",
    label,
}: {
    state?: EvaBotState;
    size?: number;
    /** Sem loop: para listas com muitos itens. */
    still?: boolean;
    className?: string;
    /** Texto para leitor de tela; sem ele o ícone é decorativo. */
    label?: string;
}) {
    return (
        <span
            className={`eva-bot ${className}`}
            data-state={state}
            data-still={still || undefined}
            style={{ ["--s" as string]: `${size}px` }}
            role={label ? "img" : undefined}
            aria-label={label}
            aria-hidden={label ? undefined : true}
        >
            <span className="eva-bot__dot" />
            <span className="eva-bot__eyes">
                <span className="eva-bot__eye" />
                <span className="eva-bot__eye" />
            </span>
        </span>
    );
}

export type EvaBotStep = { state: EvaBotState; text: string };

/** A EVA passando pelo trabalho dela, com a legenda de cada estado. Só anda
 *  enquanto está na tela; com movimento reduzido, fica no primeiro passo. */
export function EvaBotStage({ steps, size = 120, interval = 2400, renderText }: {
    steps: EvaBotStep[];
    size?: number;
    interval?: number;
    renderText: (text: string) => ReactNode;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [i, setI] = useState(0);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
        io.observe(el);
        return () => io.disconnect();
    }, []);

    useEffect(() => {
        if (!visible) return;
        const id = window.setInterval(() => setI((n) => (n + 1) % steps.length), interval);
        return () => window.clearInterval(id);
    }, [visible, steps.length, interval]);

    const step = steps[i];
    return (
        <div ref={ref} className="flex flex-col items-center gap-5">
            <div className="flex flex-col items-center">
                <EvaBot state={step.state} size={size} />
                <span className="eva-bot-floor" style={{ ["--s" as string]: `${size}px` }} aria-hidden />
            </div>
            <div aria-live="polite">{renderText(step.text)}</div>
        </div>
    );
}
