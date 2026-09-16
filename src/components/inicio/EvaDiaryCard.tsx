// EvaDiaryCard — "O dia da EVA" no /inicio.
//
// O produto passou a agir sozinho (abrir card, mover etapa, agendar retomada) e
// nada disso aparecia na tela. Sem registro visível, autonomia vira susto. Este
// card responde três perguntas na ordem em que a pessoa faz: o que ela fez, o
// que está esperando de mim, e o que ela nunca vai fazer sem mim.
import { EvaNode } from "@/components/landing/EvaNode";
import { useState } from "react";
import { WhatsappLogo, ArrowRight, CaretDown } from "@phosphor-icons/react";
import { useEvaDiary } from "@/hooks/useEvaDiary";

const HORA = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

/** O que a EVA faz quando ainda não fez nada. Escrito no futuro, porque é
 *  promessa, e nomeando a ação exata, porque promessa vaga assusta mais que
 *  silêncio. */
const VAI_FAZER = [
    "Ler cada conversa que chegar no seu WhatsApp",
    "Abrir a oportunidade no funil quando o lead esquentar",
    "Agendar a retomada de quem pediu para falar depois",
    "Escrever a próxima mensagem e mandar no seu WhatsApp para você aprovar",
];

export function EvaDiaryCard() {
    const diary = useEvaDiary();
    const [traceAberto, setTraceAberto] = useState(false);

    if (diary.loading) {
        return (
            <section
                aria-busy="true"
                className="rounded-[var(--vyz-radius)] h-[184px] animate-pulse"
                style={{
                    background: "var(--vyz-surface-1)",
                    border: "1px solid var(--vyz-border-subtle)",
                }}
            />
        );
    }

    const temRascunho = diary.rascunhos.length > 0;

    return (
        <section
            className="rounded-[var(--vyz-radius)] overflow-hidden"
            style={{
                background: "var(--vyz-surface-1)",
                border: "1px solid var(--vyz-border-subtle)",
                boxShadow: "var(--vyz-shadow-panel)",
            }}
        >
            {/* Cabeçalho */}
            <div
                className="px-5 sm:px-6 pt-5 pb-4 flex items-baseline gap-3"
                style={{ borderBottom: "1px solid var(--vyz-border-subtle)" }}
            >
                <EvaNode size={14} color="var(--vyz-eva)" className="translate-y-[2px] shrink-0" />
                <h2
                    className="text-[15px] font-semibold tracking-tight"
                    style={{ color: "var(--vyz-text-strong)" }}
                >
                    O dia da EVA
                </h2>
                {diary.primeiraAcao && (
                    <span
                        className="text-[11.5px] font-mono ml-auto tabular-nums"
                        style={{ color: "var(--vyz-text-muted)" }}
                    >
                        desde {HORA.format(diary.primeiraAcao)}
                    </span>
                )}
            </div>

            {/* Corpo: o que fez, ou o que vai fazer */}
            <div className="px-5 sm:px-6 py-4">
                {diary.trabalhou ? (
                    <ul className="flex flex-col gap-2.5">
                        {diary.linhas.map((linha) => (
                            <li key={linha.chave} className="flex items-baseline gap-3">
                                <span
                                    className="text-[13.5px] leading-snug"
                                    style={{ color: "var(--vyz-text-primary)" }}
                                >
                                    {linha.texto}
                                </span>
                                {linha.detalhe && (
                                    <span
                                        className="text-[12px] leading-snug truncate ml-auto text-right"
                                        style={{ color: "var(--vyz-text-muted)" }}
                                    >
                                        {linha.detalhe}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <>
                        <p className="text-[13px] mb-3" style={{ color: "var(--vyz-text-muted)" }}>
                            Ainda não fiz nada hoje. Quando as conversas chegarem, é isto que eu faço:
                        </p>
                        <ul className="flex flex-col gap-2">
                            {VAI_FAZER.map((item) => (
                                <li key={item} className="flex items-baseline gap-2.5">
                                    <span
                                        aria-hidden
                                        className="h-[3px] w-[3px] rounded-full shrink-0 translate-y-[-3px]"
                                        style={{ background: "var(--vyz-eva)" }}
                                    />
                                    <span
                                        className="text-[13px] leading-snug"
                                        style={{ color: "var(--vyz-text-primary)" }}
                                    >
                                        {item}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>

            {/* Como ela chegou nisso. Fica fechado: quem confia não precisa
                abrir, e quem desconfia precisa poder conferir. Os passos são os
                mesmos que ficam gravados em agent_steps, não uma narrativa
                escrita depois. */}
            {diary.trabalhou && diary.traces.length > 0 && (
                <div style={{ borderTop: "1px solid var(--vyz-border-subtle)" }}>
                    <button
                        type="button"
                        onClick={() => setTraceAberto((v) => !v)}
                        aria-expanded={traceAberto}
                        className="w-full px-5 sm:px-6 py-2.5 flex items-center gap-2 text-left"
                    >
                        <CaretDown
                            size={11}
                            weight="bold"
                            style={{
                                color: "var(--vyz-text-muted)",
                                transform: traceAberto ? "rotate(0deg)" : "rotate(-90deg)",
                                transition: "transform 160ms var(--vyz-ease)",
                            }}
                            aria-hidden
                        />
                        <span className="text-[12px]" style={{ color: "var(--vyz-text-muted)" }}>
                            {traceAberto ? "Esconder o passo a passo" : "Ver como ela chegou nisso"}
                        </span>
                        <span className="ml-auto text-[11.5px] font-mono tabular-nums" style={{ color: "var(--vyz-text-muted)" }}>
                            {diary.traces.length}
                        </span>
                    </button>

                    {traceAberto && (
                        <ul className="px-5 sm:px-6 pb-4 flex flex-col gap-3">
                            {diary.traces.map((t) => (
                                <li key={t.runId}>
                                    <p className="text-[11.5px] font-semibold mb-1" style={{ color: "var(--vyz-text-primary)" }}>
                                        {HORA.format(t.hora)}
                                        {t.sobre ? ` · ${t.sobre}` : ""}
                                    </p>
                                    <ol className="flex flex-col gap-0.5">
                                        {t.passos.map((p) => (
                                            <li
                                                key={p.ordem}
                                                className="flex items-baseline gap-2 text-[11.5px]"
                                                style={{ color: "var(--vyz-text-muted)" }}
                                            >
                                                <span className="font-mono tabular-nums" style={{ color: "var(--vyz-eva)" }}>
                                                    {String(p.ordem).padStart(2, "0")}
                                                </span>
                                                <span>{p.texto}</span>
                                                {p.duracaoMs != null && (
                                                    <span className="ml-auto font-mono tabular-nums text-[11px]">
                                                        {p.duracaoMs}ms
                                                    </span>
                                                )}
                                            </li>
                                        ))}
                                    </ol>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {/* Esperando você */}
            {temRascunho && (
                <div
                    className="px-5 sm:px-6 py-3.5"
                    style={{
                        background: "var(--vyz-accent-soft-4)",
                        borderTop: "1px solid var(--vyz-border-subtle)",
                    }}
                >
                    <div className="flex items-center gap-2.5 mb-2">
                        <WhatsappLogo size={15} weight="fill" style={{ color: "var(--vyz-accent)" }} />
                        <span
                            className="text-[12.5px] font-semibold"
                            style={{ color: "var(--vyz-accent-text)" }}
                        >
                            {diary.rascunhos.length === 1
                                ? "1 mensagem esperando você aprovar"
                                : `${diary.rascunhos.length} mensagens esperando você aprovar`}
                        </span>
                    </div>
                    <ul className="flex flex-col gap-1">
                        {diary.rascunhos.map((r) => (
                            <li
                                key={r.id}
                                className="flex items-baseline gap-2 text-[12.5px]"
                                style={{ color: "var(--vyz-text-primary)" }}
                            >
                                {r.codigo && (
                                    <span
                                        className="font-mono text-[11px] px-1.5 py-[1px] rounded"
                                        style={{
                                            background: "var(--vyz-surface-2)",
                                            border: "1px solid var(--vyz-border-subtle)",
                                            color: "var(--vyz-text-muted)",
                                        }}
                                    >
                                        {r.codigo}
                                    </span>
                                )}
                                <span className="truncate">{r.quem}</span>
                                <span
                                    className="ml-auto text-[11.5px] shrink-0"
                                    style={{ color: "var(--vyz-text-muted)" }}
                                >
                                    {r.noWhatsapp ? "no seu WhatsApp" : "preparando"}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <p className="text-[11.5px] mt-2.5" style={{ color: "var(--vyz-text-muted)" }}>
                        Responda <strong style={{ color: "var(--vyz-text-primary)" }}>1</strong> no WhatsApp para enviar,
                        2 para descartar, ou escreva o texto corrigido.
                    </p>
                </div>
            )}

            {/* O contrato. Fica sempre, inclusive quando ela não fez nada: é a
                linha que responde "onde eu estou me metendo". */}
            <div
                className="px-5 sm:px-6 py-3 flex items-center gap-2"
                style={{ borderTop: "1px solid var(--vyz-border-subtle)" }}
            >
                <ArrowRight size={11} weight="bold" style={{ color: "var(--vyz-text-muted)" }} aria-hidden />
                <p className="text-[12px]" style={{ color: "var(--vyz-text-muted)" }}>
                    O que eu nunca faço: falar com o lead sem você aprovar.
                </p>
            </div>
        </section>
    );
}
