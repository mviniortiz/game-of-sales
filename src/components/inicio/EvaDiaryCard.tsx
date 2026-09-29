// EvaDiaryCard — "O que a EVA fez" no /inicio.
//
// O produto age sozinho no interno (abre card, move etapa, agenda retomada) e
// escreve rascunhos. Sem registro visível, autonomia vira susto. A seção mostra
// o trabalho em linha do tempo com hora, o que está esperando o dono aprovar,
// o passo a passo para quem quiser conferir e o que ela nunca faz sem ele.
import { useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import type { EvaDiary } from "@/hooks/useEvaDiary";

const HORA = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

function quando(d: Date): string {
    const hoje = new Date();
    const ontem = new Date(hoje);
    ontem.setDate(hoje.getDate() - 1);
    const dia = d.toDateString() === hoje.toDateString() ? "hoje" : d.toDateString() === ontem.toDateString() ? "ontem" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    return `${dia} ${HORA.format(d)}`;
}

/** O que a EVA faz quando ainda não fez nada. Nomeia a ação exata, porque
 *  promessa vaga assusta mais que silêncio. */
const VAI_FAZER = [
    "Ler cada conversa que chegar no seu WhatsApp",
    "Abrir a oportunidade no funil quando o lead esquentar",
    "Agendar a retomada de quem pediu para falar depois",
    "Escrever a próxima mensagem e mandar no seu WhatsApp para você aprovar",
];

export function EvaDiaryCard({ diary }: { diary: EvaDiary }) {
    const [traceAberto, setTraceAberto] = useState(false);

    return (
        <section aria-labelledby="eva-fez" className="flex min-w-0 flex-col gap-3">
            <h2 id="eva-fez" className="text-[16px] font-semibold text-[var(--vyz-text-primary)]">O que a EVA fez</h2>

            {diary.rascunhos.length > 0 && (
                <div className="rounded-[12px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] px-4 py-3">
                    <p className="flex items-center gap-2 text-[13.5px] font-semibold text-[var(--vyz-text-primary)]">
                        <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-[#6d28d9]" />
                        {diary.rascunhos.length === 1
                            ? "1 mensagem esperando você aprovar"
                            : `${diary.rascunhos.length} mensagens esperando você aprovar`}
                    </p>
                    <ul className="mt-1.5 flex flex-col gap-1 pl-[15px]">
                        {diary.rascunhos.map((r) => (
                            <li key={r.id} className="flex items-baseline gap-2 text-[13px] text-[var(--vyz-text)]">
                                <span className="truncate">{r.quem}</span>
                                <span className="ml-auto shrink-0 text-[12px] text-[var(--vyz-text-muted)]">
                                    {r.noWhatsapp ? (
                                        <>
                                            código <strong className="font-mono text-[var(--vyz-text-primary)]">{r.codigo}</strong> no seu WhatsApp
                                        </>
                                    ) : (
                                        "preparando"
                                    )}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <p className="mt-2 pl-[15px] text-[12px] text-[var(--vyz-text-muted)]">
                        Responda <strong className="text-[var(--vyz-text-primary)]">1</strong> no WhatsApp para enviar, 2 para descartar, ou escreva o texto corrigido.
                    </p>
                </div>
            )}

            {diary.loading ? (
                <div aria-busy="true" aria-label="Carregando o que a EVA fez" className="h-[132px] rounded-[12px] bg-[var(--vyz-surface-3)] motion-safe:animate-pulse" />
            ) : diary.eventos.length > 0 ? (
                <ol className="flex flex-col">
                    {diary.eventos.map((e) => (
                        <li
                            key={e.id}
                            className="grid grid-cols-[88px_10px_minmax(0,1fr)] items-baseline gap-3 border-b border-[var(--vyz-border)] py-2.5 text-[14px] leading-snug text-[var(--vyz-text-primary)]"
                        >
                            <span className="text-[12.5px] tabular-nums text-[var(--vyz-text-muted)]">{quando(e.quando)}</span>
                            <span aria-hidden className={`h-[7px] w-[7px] rounded-full ${e.rascunho ? "bg-[#6d28d9]" : "bg-[var(--vyz-border-strong)]"}`} />
                            <span>{e.texto}</span>
                        </li>
                    ))}
                </ol>
            ) : (
                <div className="rounded-[12px] border border-dashed border-[var(--vyz-border-strong)] px-4 py-3.5">
                    <p className="text-[13.5px] text-[var(--vyz-text-muted)]">Ainda não fiz nada desde ontem. Quando as conversas chegarem, é isto que eu faço:</p>
                    <ul className="mt-2 flex flex-col gap-1.5">
                        {VAI_FAZER.map((item) => (
                            <li key={item} className="flex items-baseline gap-2.5 text-[13.5px] text-[var(--vyz-text-primary)]">
                                <span aria-hidden className="h-[4px] w-[4px] shrink-0 -translate-y-[2px] rounded-full bg-[#6d28d9]" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Como ela chegou nisso. Fica fechado: quem confia não precisa abrir,
                e quem desconfia precisa poder conferir. Os passos são os que ficam
                gravados em agent_steps, não uma narrativa escrita depois. */}
            {diary.traces.length > 0 && (
                <div>
                    <button
                        type="button"
                        onClick={() => setTraceAberto((v) => !v)}
                        aria-expanded={traceAberto}
                        className="flex items-center gap-2 rounded-md py-1 text-left text-[12.5px] text-[var(--vyz-text-muted)] outline-none hover:text-[var(--vyz-text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)]"
                    >
                        <CaretDown
                            size={11}
                            weight="bold"
                            style={{ transform: traceAberto ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 160ms var(--vyz-ease)" }}
                            aria-hidden
                        />
                        {traceAberto ? "Esconder o passo a passo" : "Ver como ela chegou nisso"}
                        <span className="font-mono tabular-nums">{diary.traces.length}</span>
                    </button>
                    {traceAberto && (
                        <ul className="mt-2 flex flex-col gap-3">
                            {diary.traces.map((t) => (
                                <li key={t.runId}>
                                    <p className="mb-1 text-[12px] font-semibold text-[var(--vyz-text-primary)]">
                                        {HORA.format(t.hora)}
                                        {t.sobre ? ` · ${t.sobre}` : ""}
                                    </p>
                                    <ol className="flex flex-col gap-0.5">
                                        {t.passos.map((p) => (
                                            <li key={p.ordem} className="flex items-baseline gap-2 text-[12px] text-[var(--vyz-text-muted)]">
                                                <span className="font-mono tabular-nums text-[#6d28d9]">{String(p.ordem).padStart(2, "0")}</span>
                                                <span>{p.texto}</span>
                                                {p.duracaoMs != null && <span className="ml-auto font-mono text-[11px] tabular-nums">{p.duracaoMs}ms</span>}
                                            </li>
                                        ))}
                                    </ol>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {/* O contrato. Fica sempre, inclusive quando ela não fez nada. */}
            <p className="text-[12.5px] text-[var(--vyz-text-muted)]">Ela nunca fala com o cliente sem o seu ok.</p>
        </section>
    );
}
