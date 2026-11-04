// Dia da agenda em horas: cada compromisso no seu horário, com o tipo na cor.
// A faixa de horas encolhe ao dia (das 7h às 19h, alargando se houver algo fora).
import { useEffect, useState } from "react";
import { format, isToday, parseISO } from "date-fns";
import { NOME_STATUS, NOME_TIPO, porHorario, statusDe, tipoDe, type Agendamento } from "@/lib/agenda";
import { TipoTile } from "./TipoTile";

const ALTURA_HORA = 60; // px por hora
const DURACAO_MIN = 50; // duração mostrada de cada compromisso

interface Props {
    date: Date;
    agendamentos: Agendamento[];
    onEventClick: (ag: Agendamento) => void;
    showSellerName: boolean;
}

const horaDe = (ag: Agendamento) => {
    const d = parseISO(ag.data_agendamento);
    return d.getHours() + d.getMinutes() / 60;
};

/** Compromissos que se encostam dividem a largura, cada um na sua coluna. */
function emColunas(ags: Agendamento[]) {
    const colunas: number[] = []; // fim (em horas) do último de cada coluna
    const posicao = new Map<string, number>();
    for (const ag of ags) {
        const inicio = horaDe(ag);
        let c = colunas.findIndex((fim) => fim <= inicio);
        if (c === -1) c = colunas.push(0) - 1;
        colunas[c] = inicio + DURACAO_MIN / 60;
        posicao.set(ag.id, c);
    }
    return { total: Math.max(1, colunas.length), posicao };
}

function useAgora(ativo: boolean) {
    const [agora, setAgora] = useState(() => new Date());
    useEffect(() => {
        if (!ativo) return;
        const t = setInterval(() => setAgora(new Date()), 60_000);
        return () => clearInterval(t);
    }, [ativo]);
    return agora;
}

export function CalendarTimelineView({ date, agendamentos, onEventClick, showSellerName }: Props) {
    const doDia = [...agendamentos].sort(porHorario);
    const ehHoje = isToday(date);
    const agora = useAgora(ehHoje);

    const primeira = doDia.length ? Math.floor(horaDe(doDia[0])) : 7;
    const ultima = doDia.length ? Math.ceil(horaDe(doDia[doDia.length - 1]) + DURACAO_MIN / 60) : 19;
    const de = Math.min(7, primeira);
    const ate = Math.max(19, ultima);
    const horas = Array.from({ length: ate - de }, (_, i) => de + i);
    const { total, posicao } = emColunas(doDia);
    const horaAgora = agora.getHours() + agora.getMinutes() / 60;

    return (
        <div className="vp-agenda-horas" style={{ height: (ate - de) * ALTURA_HORA }}>
            {horas.map((h, i) => (
                <div key={h} className="vp-agenda-horas__linha" style={{ top: i * ALTURA_HORA }}>
                    <span>{String(h).padStart(2, "0")}h</span>
                </div>
            ))}

            {ehHoje && horaAgora >= de && horaAgora <= ate && (
                <div className="vp-agenda-horas__agora" style={{ top: (horaAgora - de) * ALTURA_HORA }} aria-hidden="true" />
            )}

            <div className="vp-agenda-horas__eventos">
                {doDia.map((ag) => {
                    const coluna = posicao.get(ag.id) ?? 0;
                    const status = statusDe(ag.status);
                    const tipo = tipoDe(ag);
                    const detalhe = [NOME_TIPO[tipo], showSellerName && ag.seller_name ? ag.seller_name : null].filter(Boolean).join(" · ");
                    return (
                        <button
                            key={ag.id}
                            type="button"
                            className="vp-agenda-bloco"
                            data-tipo={tipo}
                            data-status={status}
                            onClick={() => onEventClick(ag)}
                            style={{
                                top: (horaDe(ag) - de) * ALTURA_HORA + 2,
                                height: (DURACAO_MIN / 60) * ALTURA_HORA - 4,
                                left: `${(coluna / total) * 100}%`,
                                width: `calc(${100 / total}% - 6px)`,
                            }}
                        >
                            <TipoTile tipo={tipo} pequeno />
                            <span className="vp-agenda-bloco__meio">
                                <b>
                                    <time>{format(parseISO(ag.data_agendamento), "HH:mm")}</time> {ag.cliente_nome}
                                </b>
                                <span>{detalhe}</span>
                            </span>
                            {status !== "agendado" && (
                                <span className="vp-chip" data-tom={status === "realizado" ? "ok" : status === "nao_compareceu" ? "ruim" : undefined}>
                                    {NOME_STATUS[status]}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
