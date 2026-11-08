import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { EvaBot } from "@/components/eva/EvaBot";
import { marcarTermos, termosPorGrupo, type GrupoTermo } from "@/lib/eva/leituraTermos";
import type { MessageLine } from "@/hooks/useEvolutionAPI";
import "./evaLeitura.css";

// A Lume lendo ESTA conversa. As últimas mensagens de verdade aparecem numa
// miniatura e a leitura passa por cada uma, da esquerda pra direita. Quando
// passa por um valor, um prazo ou um "achei caro", a palavra fica marcada, e
// a etapa de baixo mostra o que ela achou. Tudo vem do texto escrito: nada de
// sinal inventado. A leitura de verdade (a análise) chega depois, no resultado.

const LINHA_MS = 950; // tempo de leitura de uma mensagem
const ETAPA_MS = 650; // respiro entre uma etapa e outra depois da leitura
const MAX_LINHAS = 4;

const MIDIA: Record<string, string> = {
    image: "Foto",
    video: "Vídeo",
    audio: "Áudio",
    sticker: "Figurinha",
    document: "Arquivo",
};

const ETAPAS: { grupo: GrupoTermo | null; rotulo: string }[] = [
    { grupo: "valor", rotulo: "Valor, consumo e conta de luz" },
    { grupo: "prazo", rotulo: "Prazo e forma de pagamento" },
    { grupo: "decisao", rotulo: "Se quer fechar ou travou" },
];

function textoDa(m: MessageLine): string {
    const t = (m.text || "").trim();
    if (t) return t.replace(/\s+/g, " ");
    return m.mediaType ? MIDIA[m.mediaType] ?? "Mídia" : "";
}

export function EvaAnalyzingState({ messages = [] }: { messages?: MessageLine[] }) {
    const reduce = useReducedMotion();

    const todas = useMemo(() => messages.map(textoDa).filter(Boolean), [messages]);
    const linhas = useMemo(
        () =>
            messages
                .filter((m) => textoDa(m))
                .slice(-MAX_LINHAS)
                .map((m) => ({ id: m.id, eu: m.sender === "me", trechos: marcarTermos(textoDa(m)) })),
        [messages],
    );
    const achados = useMemo(() => termosPorGrupo(todas), [todas]);

    // Linha do tempo: lê as linhas, depois fecha uma etapa por vez. A última
    // ("Escrevendo a leitura") fica ativa até a análise voltar.
    const fimLeitura = Math.max(1, linhas.length) * LINHA_MS;
    const [passo, setPasso] = useState(0); // 0 = lendo; k = etapa k ativa; ETAPAS.length + 1 = escrevendo
    const [segundos, setSegundos] = useState(0);

    useEffect(() => {
        const ts = Array.from({ length: ETAPAS.length + 1 }, (_, k) =>
            setTimeout(() => setPasso(k + 1), fimLeitura + k * ETAPA_MS),
        );
        const inicio = Date.now();
        const relogio = setInterval(() => setSegundos(Math.floor((Date.now() - inicio) / 1000)), 1000);
        return () => {
            ts.forEach(clearTimeout);
            clearInterval(relogio);
        };
    }, [fimLeitura]);

    const lidas = passo > 0;
    const statusAtual =
        passo === 0
            ? `Lendo ${todas.length} ${todas.length === 1 ? "mensagem" : "mensagens"}`
            : passo <= ETAPAS.length
              ? ETAPAS[passo - 1].rotulo
              : "Escrevendo a leitura";

    return (
        <div className={`lume-leitura ${reduce ? "lume-leitura--parada" : ""}`}>
            <div className="lume-leitura__topo">
                <EvaBot state="thinking" size={36} />
                <div className="lume-leitura__titulo">
                    <p>Lume lendo a conversa</p>
                    <p className="lume-leitura__sub" aria-hidden="true">
                        {segundos}s
                    </p>
                </div>
            </div>

            {/* Miniatura com as mensagens de verdade; a leitura revela a cópia em tinta por cima. */}
            {linhas.length > 0 && (
                <div className="lume-leitura__conversa" aria-hidden="true">
                    {linhas.map((l, i) => (
                        <div key={l.id} className={`lume-leitura__linha ${l.eu ? "lume-leitura__linha--eu" : ""}`}>
                            <span className="lume-leitura__bolha">
                                <span className="lume-leitura__base">{l.trechos.map((t) => t.texto).join("")}</span>
                                <span
                                    className="lume-leitura__lido"
                                    style={{ animationDelay: `${i * LINHA_MS}ms`, animationDuration: `${LINHA_MS - 120}ms` }}
                                >
                                    {l.trechos.map((t, k) =>
                                        t.grupo ? (
                                            <mark key={k} className="lume-leitura__termo">
                                                {t.texto}
                                            </mark>
                                        ) : (
                                            <span key={k}>{t.texto}</span>
                                        ),
                                    )}
                                </span>
                            </span>
                        </div>
                    ))}
                </div>
            )}

            <ol className="lume-leitura__etapas">
                <Etapa feita={lidas} ativa={!lidas} rotulo={`Ler ${todas.length} ${todas.length === 1 ? "mensagem" : "mensagens"}`} />
                {ETAPAS.map((e, k) => (
                    <Etapa
                        key={e.rotulo}
                        feita={passo > k + 1}
                        ativa={passo === k + 1}
                        visivel={lidas}
                        rotulo={e.rotulo}
                        termos={e.grupo ? achados[e.grupo] : []}
                    />
                ))}
                <Etapa ativa={passo > ETAPAS.length} visivel={passo > ETAPAS.length} rotulo="Escrevendo a leitura" />
            </ol>

            <span className="sr-only" role="status" aria-live="polite">
                {statusAtual}
            </span>
        </div>
    );
}

function Etapa({
    rotulo,
    feita = false,
    ativa = false,
    visivel = true,
    termos = [],
}: {
    rotulo: string;
    feita?: boolean;
    ativa?: boolean;
    visivel?: boolean;
    termos?: string[];
}) {
    return (
        <li className="lume-leitura__etapa" data-estado={feita ? "feita" : ativa ? "ativa" : "espera"} data-visivel={visivel}>
            <span className="lume-leitura__marca" aria-hidden="true">
                {feita ? <Check strokeWidth={3} /> : <span className="lume-leitura__ponto" />}
            </span>
            <span className="lume-leitura__rotulo">
                {rotulo}
                {feita && termos.length > 0 && (
                    <span className="lume-leitura__achados">
                        {termos.slice(0, 3).map((t) => (
                            <span key={t} className="lume-leitura__achado">
                                {t}
                            </span>
                        ))}
                    </span>
                )}
            </span>
        </li>
    );
}
