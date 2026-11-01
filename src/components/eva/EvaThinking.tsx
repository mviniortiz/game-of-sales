import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import "./evaThinking.css";

// A Lume trabalhando, em uma pílula: grade de pontos que acende em onda e o nome da
// etapa com um brilho correndo por cima. É o único "carregando" da Lume no app: o
// círculo girando dizia só "espera", a pílula diz o que ela está fazendo agora.
// Referência visual: componente "thinking" da bluma.design (out/2026).
//
// `etapas` gira sozinha a cada `intervalo` ms e para na última, para não fingir que
// recomeçou o trabalho. Quem sabe a etapa real passa uma lista de um item só.

const PONTOS = 9;

export function EvaThinking({
    etapas,
    intervalo = 1800,
    tempo = false,
    tamanho = "md",
    className = "",
}: {
    etapas: string[];
    intervalo?: number;
    /** Mostra há quantos segundos ela está nisso ("· 4s"). */
    tempo?: boolean;
    tamanho?: "sm" | "md";
    className?: string;
}) {
    const reduce = useReducedMotion();
    const [i, setI] = useState(0);
    const [segundos, setSegundos] = useState(0);
    const lista = etapas.length ? etapas : ["Pensando"];
    const chave = lista.join("|");

    useEffect(() => setI(0), [chave]);
    useEffect(() => {
        if (lista.length < 2 || i >= lista.length - 1) return;
        const t = setTimeout(() => setI((n) => n + 1), intervalo);
        return () => clearTimeout(t);
    }, [i, chave, intervalo, lista.length]);
    useEffect(() => {
        if (!tempo) return;
        const inicio = Date.now();
        const t = setInterval(() => setSegundos(Math.floor((Date.now() - inicio) / 1000)), 1000);
        return () => clearInterval(t);
    }, [tempo]);

    const texto = lista[Math.min(i, lista.length - 1)];

    return (
        <span
            role="status"
            aria-live="polite"
            className={`eva-thinking eva-thinking--${tamanho} ${reduce ? "eva-thinking--parado" : ""} ${className}`}
        >
            <span className="eva-thinking__grade" aria-hidden="true">
                {Array.from({ length: PONTOS }, (_, k) => (
                    // Atraso pela diagonal: a onda atravessa a grade de um canto ao outro.
                    <span key={k} style={{ animationDelay: `${((k % 3) + Math.floor(k / 3)) * 110}ms` }} />
                ))}
            </span>
            <span key={texto} className="eva-thinking__texto">{texto}</span>
            {tempo && <span className="eva-thinking__tempo" aria-hidden="true">· {segundos}s</span>}
        </span>
    );
}
