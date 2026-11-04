// Agenda: a semana na rua. Visita técnica, instalação e vistoria, cada uma com cliente,
// hora e quem vai. Hoje vem primeiro; o que já passou e ficou sem resposta pede
// "Aconteceu" ou "Não foi" na própria linha.
import { useState, type ReactNode } from "react";
import { addDays, addMonths, addWeeks, format, isSameDay, isSameMonth, isToday, parseISO } from "date-fns";
import { CaretLeft, CaretRight, Check, GoogleLogo, Plus, X } from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AgendamentoForm } from "@/components/calls/AgendamentoForm";
import { CalendarTimelineView } from "@/components/calendar/CalendarTimelineView";
import { AgendamentoDetailsModal } from "@/components/calendar/AgendamentoDetailsModal";
import { TipoTile } from "@/components/calendar/TipoTile";
import { GoogleCalendarConfigModal } from "@/components/integrations/GoogleCalendarConfigModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAgenda } from "@/hooks/useAgenda";
import {
    agruparPorDia,
    chaveDia,
    contarPorTipo,
    DIA_CURTO,
    dentro,
    diasDaGrade,
    gradeDoMes,
    MES,
    mesmoHorarioEm,
    nomeContado,
    NOME_STATUS,
    NOME_TIPO,
    ordemDaSemana,
    periodoDa,
    plural,
    porHorario,
    precisaMarcar,
    rotuloDoDia,
    rotuloPeriodo,
    semanaDe,
    statusDe,
    tipoDe,
    TIPOS,
    type Agendamento,
    type Periodo,
    type StatusAgenda,
    type VisaoAgenda,
} from "@/lib/agenda";
import { Collapse } from "@/vendor/stageshow/motion/Collapse";
import { Count } from "@/vendor/stageshow/motion/Count";
import { Swap } from "@/vendor/stageshow/motion/Swap";

type FiltroStatus = "all" | StatusAgenda;

const VISOES: { id: VisaoAgenda; nome: string }[] = [
    { id: "semana", nome: "Semana" },
    { id: "mes", nome: "Mês" },
    { id: "dia", nome: "Dia" },
];

const FILTROS: { id: FiltroStatus; nome: string }[] = [
    { id: "all", nome: "Todos" },
    { id: "agendado", nome: "Pendentes" },
    { id: "realizado", nome: "Aconteceu" },
    { id: "nao_compareceu", nome: "Não foi" },
    { id: "cancelado", nome: "Cancelados" },
];

const ANTERIOR: Record<VisaoAgenda, string> = { semana: "Semana anterior", mes: "Mês anterior", dia: "Dia anterior" };
const PROXIMO: Record<VisaoAgenda, string> = { semana: "Próxima semana", mes: "Próximo mês", dia: "Próximo dia" };

const inteiro = (n: number) => String(Math.round(n));
const N = ({ n }: { n: number }) => <Count value={n} format={inteiro} />;
const compromissos = (n: number) => plural(n, "compromisso", "compromissos");
const tomDoStatus = (s: StatusAgenda) => (s === "realizado" ? "ok" : s === "nao_compareceu" ? "ruim" : undefined);
const hora = (ag: Agendamento) => format(parseISO(ag.data_agendamento), "HH:mm");

// ── Uma linha da semana ───────────────────────────────────────────────────────
function Linha({
    ag,
    agora,
    mostrarEquipe,
    aoAbrir,
    aoMarcar,
}: {
    ag: Agendamento;
    agora: Date;
    mostrarEquipe: boolean;
    aoAbrir: (ag: Agendamento) => void;
    aoMarcar: (ag: Agendamento, s: StatusAgenda) => void;
}) {
    const tipo = tipoDe(ag);
    const status = statusDe(ag.status);
    const estado = precisaMarcar(ag, agora) ? "marcar" : status;
    const detalhe = [NOME_TIPO[tipo], mostrarEquipe && ag.seller_name ? ag.seller_name : null].filter(Boolean).join(" · ");

    let fim: ReactNode = null;
    if (estado === "marcar") {
        fim = (
            <span className="vp-agenda-acoes">
                <button type="button" className="vp-agenda-acao" data-tom="ok" aria-label={`${ag.cliente_nome}: aconteceu`} onClick={() => aoMarcar(ag, "realizado")}>
                    <Check size={14} weight="bold" aria-hidden />
                    Aconteceu
                </button>
                <button type="button" className="vp-agenda-acao" data-tom="ruim" aria-label={`${ag.cliente_nome}: não foi`} onClick={() => aoMarcar(ag, "nao_compareceu")}>
                    <X size={14} weight="bold" aria-hidden />
                    Não foi
                </button>
            </span>
        );
    } else if (estado !== "agendado") {
        fim = (
            <span className="vp-chip" data-tom={tomDoStatus(status)}>
                {NOME_STATUS[status]}
            </span>
        );
    }

    return (
        <div className="vp-agenda-item" data-status={status} data-marcar={estado === "marcar" || undefined}>
            <time dateTime={ag.data_agendamento}>{hora(ag)}</time>
            <TipoTile tipo={tipo} />
            <button type="button" className="vp-agenda-item__abrir" onClick={() => aoAbrir(ag)}>
                <b>{ag.cliente_nome}</b>
                <span>{detalhe}</span>
            </button>
            {fim !== null ? (
                <span className="vp-agenda-item__fim">
                    <Swap id={estado}>{fim}</Swap>
                </span>
            ) : null}
        </div>
    );
}

// ── Lista por dia (semana; no celular, também o mês) ──────────────────────────
function ListaDias({
    itens,
    periodo,
    passa,
    cronologica = false,
    vazio,
    mostrarEquipe,
    aoAbrir,
    aoMarcar,
}: {
    itens: Agendamento[];
    periodo: Periodo;
    passa: (ag: Agendamento) => boolean;
    cronologica?: boolean;
    vazio: string;
    mostrarEquipe: boolean;
    aoAbrir: (ag: Agendamento) => void;
    aoMarcar: (ag: Agendamento, s: StatusAgenda) => void;
}) {
    const agora = new Date();
    const chaveHoje = chaveDia(agora);
    const grupos = agruparPorDia(itens);
    const ordem = cronologica ? { adiante: grupos, passados: [], temHoje: false } : ordemDaSemana(grupos, periodo, agora);
    const algum = itens.some(passa);

    const dia = (g: (typeof grupos)[number], passou: boolean) => {
        const visiveis = g.itens.filter(passa).length;
        const ehHoje = g.chave === chaveHoje;
        // Hoje fica na tela mesmo vazio, desde que a semana tenha alguma coisa.
        const aberto = ehHoje && ordem.temHoje ? algum : visiveis > 0;
        const rotulo = rotuloDoDia(g.dia, agora);
        return (
            <Collapse key={g.chave} open={aberto}>
                <section className="vp-agenda-dia" data-hoje={ehHoje || undefined} data-passou={passou || undefined} aria-label={rotulo}>
                    <h2 className="vp-agenda-dia__titulo">
                        {rotulo}
                        {visiveis > 0 && (
                            <em>
                                <N n={visiveis} />
                            </em>
                        )}
                    </h2>
                    <div className="vp-agenda-dia__lista">
                        {g.itens.map((ag) => (
                            <Collapse key={ag.id} open={passa(ag)}>
                                <Linha ag={ag} agora={agora} mostrarEquipe={mostrarEquipe} aoAbrir={aoAbrir} aoMarcar={aoMarcar} />
                            </Collapse>
                        ))}
                        {ehHoje && (
                            <Collapse open={visiveis === 0}>
                                <p className="vp-agenda-dia__nada">Nada marcado para hoje.</p>
                            </Collapse>
                        )}
                    </div>
                </section>
            </Collapse>
        );
    };

    const passadosVisiveis = ordem.passados.some((g) => g.itens.some(passa));
    return (
        <div className="vp-agenda-semana">
            <Collapse open={!algum}>
                <div className="vp-vazio">{vazio}</div>
            </Collapse>
            {ordem.adiante.map((g) => dia(g, cronologica && g.dia < agora && !isSameDay(g.dia, agora)))}
            {ordem.passados.length > 0 && (
                <Collapse open={passadosVisiveis}>
                    <div className="vp-agenda-antes">Antes, nesta semana</div>
                </Collapse>
            )}
            {ordem.passados.map((g) => dia(g, true))}
        </div>
    );
}

// ── Mês ───────────────────────────────────────────────────────────────────────
function Mes({
    data,
    itens,
    compacto,
    aoAbrirDia,
    aoAbrir,
    aoRemarcar,
}: {
    data: Date;
    itens: Agendamento[];
    compacto: boolean;
    aoAbrirDia: (d: Date) => void;
    aoAbrir: (ag: Agendamento) => void;
    aoRemarcar: (ag: Agendamento, novaData: Date) => void;
}) {
    const [arrastando, setArrastando] = useState<string | null>(null);
    const [alvo, setAlvo] = useState<string | null>(null);
    const porDia = new Map(agruparPorDia(itens).map((g) => [g.chave, g.itens]));
    const dias = diasDaGrade(gradeDoMes(data));
    const soltar = (dia: Date) => {
        const ag = itens.find((a) => a.id === arrastando);
        if (ag) aoRemarcar(ag, mesmoHorarioEm(ag.data_agendamento, dia));
        setArrastando(null);
        setAlvo(null);
    };

    return (
        <div className="vp-agenda-mes" data-compacto={compacto || undefined}>
            <div className="vp-agenda-mes__cab" aria-hidden="true">
                {DIA_CURTO.map((d) => (
                    <span key={d}>{compacto ? d[0].toUpperCase() : d}</span>
                ))}
            </div>
            <div className="vp-agenda-mes__grade">
                {dias.map((dia) => {
                    const chave = chaveDia(dia);
                    const doDia = porDia.get(chave) ?? [];
                    const fora = !isSameMonth(dia, data);
                    const nome = `${rotuloDoDia(dia)}, ${doDia.length ? `${doDia.length} ${compromissos(doDia.length)}` : "nada marcado"}`;
                    if (compacto) {
                        const tipos = [...new Set(doDia.map(tipoDe))].slice(0, 3);
                        return (
                            <button
                                key={chave}
                                type="button"
                                className="vp-agenda-mes__dia"
                                data-fora={fora || undefined}
                                data-hoje={isToday(dia) || undefined}
                                onClick={() => aoAbrirDia(dia)}
                                aria-label={nome}
                            >
                                <span className="vp-agenda-mes__num">{dia.getDate()}</span>
                                <span className="vp-agenda-pontos">
                                    {tipos.map((t) => (
                                        <i key={t} data-tipo={t} />
                                    ))}
                                </span>
                            </button>
                        );
                    }
                    const mostra = doDia.slice(0, 3);
                    return (
                        <div
                            key={chave}
                            className="vp-agenda-mes__dia"
                            data-fora={fora || undefined}
                            data-hoje={isToday(dia) || undefined}
                            data-alvo={alvo === chave || undefined}
                            onDragOver={(e) => {
                                if (!arrastando) return;
                                e.preventDefault();
                                e.dataTransfer.dropEffect = "move";
                                if (alvo !== chave) setAlvo(chave);
                            }}
                            onDragLeave={(e) => {
                                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setAlvo((a) => (a === chave ? null : a));
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                soltar(dia);
                            }}
                        >
                            <button type="button" className="vp-agenda-mes__num" onClick={() => aoAbrirDia(dia)} aria-label={`Abrir ${nome}`}>
                                {dia.getDate()}
                            </button>
                            {mostra.map((ag) => (
                                <button
                                    key={ag.id}
                                    type="button"
                                    className="vp-agenda-mes__ev"
                                    data-tipo={tipoDe(ag)}
                                    data-status={statusDe(ag.status)}
                                    data-arrastando={arrastando === ag.id || undefined}
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.effectAllowed = "move";
                                        e.dataTransfer.setData("text/plain", ag.id);
                                        setArrastando(ag.id);
                                    }}
                                    onDragEnd={() => {
                                        setArrastando(null);
                                        setAlvo(null);
                                    }}
                                    onClick={() => aoAbrir(ag)}
                                    title="Arraste para outro dia para remarcar"
                                >
                                    <i aria-hidden="true" />
                                    <time>{hora(ag)}</time>
                                    <span>{ag.cliente_nome}</span>
                                </button>
                            ))}
                            {doDia.length > 3 && (
                                <button type="button" className="vp-agenda-mes__mais" onClick={() => aoAbrirDia(dia)}>
                                    mais {doDia.length - 3}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Calendário pequeno do lado ────────────────────────────────────────────────
function MiniMes({
    data,
    visao,
    itens,
    aoEscolher,
    aoMudarMes,
}: {
    data: Date;
    visao: VisaoAgenda;
    itens: Agendamento[];
    aoEscolher: (d: Date) => void;
    aoMudarMes: (delta: number) => void;
}) {
    const porDia = new Map(agruparPorDia(itens).map((g) => [g.chave, g.itens]));
    const semana = semanaDe(data);
    const nomeMes = MES[data.getMonth()];
    return (
        <div className="vp-agenda-mini">
            <div className="vp-agenda-mini__cab">
                <b>
                    <Swap id={`${data.getFullYear()}-${data.getMonth()}`}>
                        {nomeMes[0].toUpperCase() + nomeMes.slice(1)} de {data.getFullYear()}
                    </Swap>
                </b>
                <span>
                    <button type="button" className="vp-icone vp-icone--chico" aria-label="Mês anterior" onClick={() => aoMudarMes(-1)}>
                        <CaretLeft size={14} weight="bold" aria-hidden />
                    </button>
                    <button type="button" className="vp-icone vp-icone--chico" aria-label="Próximo mês" onClick={() => aoMudarMes(1)}>
                        <CaretRight size={14} weight="bold" aria-hidden />
                    </button>
                </span>
            </div>
            <div className="vp-agenda-mini__grade">
                {DIA_CURTO.map((d, i) => (
                    <span key={i} className="vp-agenda-mini__sem" aria-hidden="true">
                        {d[0].toUpperCase()}
                    </span>
                ))}
                {diasDaGrade(gradeDoMes(data)).map((dia) => {
                    const chave = chaveDia(dia);
                    const doDia = porDia.get(chave) ?? [];
                    const tipos = [...new Set(doDia.map(tipoDe))].slice(0, 3);
                    const naSemana = visao === "semana" && dentro({ data_agendamento: dia.toISOString() }, semana);
                    const escolhido = visao === "dia" && isSameDay(dia, data);
                    return (
                        <button
                            key={chave}
                            type="button"
                            className="vp-agenda-mini__dia"
                            data-fora={!isSameMonth(dia, data) || undefined}
                            data-hoje={isToday(dia) || undefined}
                            data-semana={naSemana || undefined}
                            data-inicio={(naSemana && dia.getDay() === 0) || undefined}
                            data-fim={(naSemana && dia.getDay() === 6) || undefined}
                            data-escolhido={escolhido || undefined}
                            aria-pressed={escolhido || naSemana}
                            aria-label={`${rotuloDoDia(dia)} de ${MES[dia.getMonth()]}, ${doDia.length ? `${doDia.length} ${compromissos(doDia.length)}` : "nada marcado"}`}
                            onClick={() => aoEscolher(dia)}
                        >
                            <span>{dia.getDate()}</span>
                            <span className="vp-agenda-pontos">
                                {tipos.map((t) => (
                                    <i key={t} data-tipo={t} />
                                ))}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function Calendario() {
    const isMobile = useIsMobile();
    const [visao, setVisao] = useState<VisaoAgenda>("semana");
    const [data, setData] = useState(() => new Date());
    const [vendedor, setVendedor] = useState("all");
    const [filtro, setFiltro] = useState<FiltroStatus>("all");
    const [aberto, setAberto] = useState<Agendamento | null>(null);
    const [novoAberto, setNovoAberto] = useState(false);
    const [googleAberto, setGoogleAberto] = useState(false);

    const agenda = useAgenda({ data, vendedor });
    const agora = new Date();
    const periodo = periodoDa(visao, data);
    const chavePeriodo = `${visao}-${chaveDia(periodo.inicio)}`;
    const temHoje = agora >= periodo.inicio && agora <= periodo.fim;

    const passa = (ag: Agendamento) => filtro === "all" || statusDe(ag.status) === filtro;
    const noPeriodo = agenda.agendamentos.filter((ag) => dentro(ag, periodo)).sort(porHorario);
    const visiveis = noPeriodo.filter(passa);
    const visiveisHoje = visiveis.filter((ag) => isSameDay(parseISO(ag.data_agendamento), agora)).length;
    const contagem = contarPorTipo(visiveis);

    const andar = (delta: number) =>
        setData((d) => (visao === "semana" ? addWeeks(d, delta) : visao === "mes" ? addMonths(d, delta) : addDays(d, delta)));
    const abrirDia = (d: Date) => {
        setData(d);
        setVisao("dia");
    };

    let sub: ReactNode;
    if (visao === "semana" && temHoje) {
        sub = (
            <>
                <N n={visiveisHoje} /> {compromissos(visiveisHoje)} hoje, <N n={visiveis.length} /> nesta semana
            </>
        );
    } else {
        const onde = visao === "semana" ? "nesta semana" : visao === "mes" ? "neste mês" : temHoje ? "hoje" : "neste dia";
        sub = (
            <>
                <N n={visiveis.length} /> {compromissos(visiveis.length)} {onde}
            </>
        );
    }

    const rotuloConta =
        visao === "semana" ? (temHoje ? "Esta semana" : "Nesta semana") : visao === "mes" ? "Neste mês" : temHoje ? "Hoje" : "Neste dia";
    const vazio =
        filtro === "all"
            ? visao === "mes"
                ? "Nada marcado neste mês."
                : visao === "dia"
                  ? "Nada marcado neste dia."
                  : "Nada marcado nesta semana."
            : "Nada com esse filtro aqui.";

    const listaProps = { passa, mostrarEquipe: agenda.showingTeam, aoAbrir: setAberto, aoMarcar: agenda.marcar };

    let corpo: ReactNode;
    if (agenda.erro) {
        corpo = <div className="vp-vazio">Não consegui carregar a agenda agora. Tente de novo em instantes.</div>;
    } else if (agenda.carregando) {
        corpo = (
            <div className="vp-vazio" aria-busy="true">
                Carregando a agenda
            </div>
        );
    } else if (visao === "semana") {
        corpo = <ListaDias {...listaProps} itens={noPeriodo} periodo={periodo} vazio={vazio} />;
    } else if (visao === "mes") {
        corpo = (
            <>
                <Mes
                    data={data}
                    itens={agenda.agendamentos.filter(passa)}
                    compacto={isMobile}
                    aoAbrirDia={abrirDia}
                    aoAbrir={setAberto}
                    aoRemarcar={agenda.remarcar}
                />
                {isMobile && <ListaDias {...listaProps} itens={noPeriodo} periodo={periodo} vazio={vazio} cronologica />}
            </>
        );
    } else {
        corpo =
            visiveis.length === 0 ? (
                <div className="vp-vazio">{vazio}</div>
            ) : (
                <CalendarTimelineView date={data} agendamentos={visiveis} onEventClick={setAberto} showSellerName={agenda.showingTeam} />
            );
    }

    return (
        <div className="vp-tela vp-agenda-tela pb-16">
            <header className="vp-cabeca">
                <div>
                    <h1 className="vp-titulo">Agenda</h1>
                    <p className="vp-sub">
                        <Swap id={chavePeriodo}>{sub}</Swap>
                    </p>
                </div>
                <div className="vp-cabeca__acoes vp-agenda-acoes-cab">
                    <div role="tablist" aria-label="Visão" className="vp-segmento">
                        {VISOES.map((v) => (
                            <button key={v.id} type="button" role="tab" aria-selected={visao === v.id} onClick={() => setVisao(v.id)}>
                                {v.nome}
                            </button>
                        ))}
                    </div>
                    <button type="button" className="vp-botao" aria-label="Novo compromisso" onClick={() => setNovoAberto(true)}>
                        <Plus size={16} weight="bold" aria-hidden />
                        <span>
                            Novo<span className="vp-agenda-novo__resto"> compromisso</span>
                        </span>
                    </button>
                </div>
            </header>

            <div className="vp-agenda-barra">
                <div className="vp-agenda-nav">
                    <button type="button" className="vp-icone" aria-label={ANTERIOR[visao]} onClick={() => andar(-1)}>
                        <CaretLeft size={16} weight="bold" aria-hidden />
                    </button>
                    <button type="button" className="vp-icone" aria-label={PROXIMO[visao]} onClick={() => andar(1)}>
                        <CaretRight size={16} weight="bold" aria-hidden />
                    </button>
                    <b className="vp-agenda-periodo" aria-live="polite">
                        <Swap id={chavePeriodo}>{rotuloPeriodo(visao, data, agora)}</Swap>
                    </b>
                    {!temHoje && (
                        <button type="button" className="vp-botao vp-botao--quieto vp-botao--chico" onClick={() => setData(new Date())}>
                            Hoje
                        </button>
                    )}
                </div>
                <div className="vp-agenda-filtros">
                    <div role="radiogroup" aria-label="Situação" className="vp-segmento vp-agenda-chips">
                        {FILTROS.map((f) => (
                            <button key={f.id} type="button" role="radio" aria-checked={filtro === f.id} onClick={() => setFiltro(f.id)}>
                                {f.nome}
                            </button>
                        ))}
                    </div>
                    {agenda.canSeeTeam && (
                        <select className="vp-agenda-select" aria-label="Vendedor" value={vendedor} onChange={(e) => setVendedor(e.target.value)}>
                            <option value="all">Todo o time</option>
                            {agenda.sellers.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.nome}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            <div className="vp-agenda-grade" data-visao={visao}>
                <div className="vp-agenda-corpo" key={chavePeriodo}>
                    {corpo}
                </div>

                <aside className="vp-agenda-lado" aria-label="Resumo da agenda">
                    {visao !== "mes" && (
                        <MiniMes
                            data={data}
                            visao={visao}
                            itens={agenda.agendamentos.filter(passa)}
                            aoEscolher={setData}
                            aoMudarMes={(delta) => setData((d) => addMonths(d, delta))}
                        />
                    )}
                    <div className="vp-agenda-conta">
                        <div className="vp-rotulo">{rotuloConta}</div>
                        <ul>
                            {[...TIPOS, ...(contagem.outro > 0 ? (["outro"] as const) : [])].map((t) => (
                                <li key={t} data-zero={contagem[t] === 0 || undefined}>
                                    <TipoTile tipo={t} pequeno />
                                    <N n={contagem[t]} />
                                    <span>{nomeContado(t, contagem[t])}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <button type="button" className="vp-agenda-google" onClick={() => setGoogleAberto(true)}>
                        <GoogleLogo size={18} weight="bold" aria-hidden />
                        <span>
                            <b>Google Agenda</b>
                            <span>{agenda.googleConnected ? "Conectado. Sincroniza quando você abre a agenda." : "Traga os eventos do seu Google."}</span>
                        </span>
                        <CaretRight size={14} weight="bold" aria-hidden />
                    </button>
                </aside>
            </div>

            <Dialog open={novoAberto} onOpenChange={setNovoAberto}>
                <DialogContent className="vp-dialogo bg-card border-border max-w-[95vw] md:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Novo compromisso</DialogTitle>
                    </DialogHeader>
                    <AgendamentoForm
                        onSuccess={() => {
                            setNovoAberto(false);
                            agenda.recarregar();
                        }}
                    />
                </DialogContent>
            </Dialog>

            <AgendamentoDetailsModal agendamento={aberto} open={!!aberto} onClose={() => setAberto(null)} onUpdate={agenda.recarregar} />

            <GoogleCalendarConfigModal
                open={googleAberto}
                onClose={() => setGoogleAberto(false)}
                onSaved={() => {
                    agenda.setGoogleConnected(true);
                    agenda.recarregar();
                }}
            />
        </div>
    );
}
