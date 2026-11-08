import { CaretDown } from "@phosphor-icons/react";
import { APP_EVENTS, trackApp } from "@/lib/appAnalytics";
import "./mostrarMais.css";

/** Botão no fim de uma lista longa: "Mostrar mais 30 · 18 de 120 ainda escondidos". */
export function MostrarMais({
    restante,
    passo,
    total,
    onClick,
    className = "",
}: {
    restante: number;
    passo: number;
    total: number;
    onClick: () => void;
    className?: string;
}) {
    if (restante <= 0) return null;
    const proximos = Math.min(passo, restante);
    return (
        <button
            type="button"
            className={`vz-mais ${className}`}
            onClick={() => {
                trackApp(APP_EVENTS.LIST_MORE_SHOWN, { ja_visiveis: total - restante, total });
                onClick();
            }}
        >
            <CaretDown size={14} weight="bold" aria-hidden />
            Mostrar mais {proximos}
            <span>
                · {total - restante} de {total}
            </span>
        </button>
    );
}
