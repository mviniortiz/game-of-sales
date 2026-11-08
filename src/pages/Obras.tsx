// Obras: do fechamento à usina ligada. Mostra em que etapa cada obra está e com quem
// ela está parada, que é o que o dono perde de vista depois da venda.
import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, Circle, SlidersHorizontal, WarningCircle, X } from "@phosphor-icons/react";
import { EvaBot } from "@/components/eva/EvaBot";
import {
    diasNaEtapa,
    ETAPAS_OBRA,
    NOME_COM_QUEM,
    NOME_ETAPA,
    PRAZO_PADRAO,
    prazoDa,
    travada,
    useObras,
    type ComQuem,
    type EtapaComPrazo,
    type Obra,
    type PrazosObra,
} from "@/hooks/useObras";
import { Swap } from "@/vendor/stageshow/motion/Swap";
import { useMostrarMais } from "@/hooks/useMostrarMais";
import { MostrarMais } from "@/components/ui/MostrarMais";

const kwpTexto = (o: Obra) => (o.system_kwp != null ? `${String(o.system_kwp).replace(".", ",")} kWp` : "kWp não informado");
const diasTexto = (n: number) => (n === 1 ? "1 dia" : `${n} dias`);

function Etapas({ obra, prazos }: { obra: Obra; prazos: PrazosObra | null }) {
    const atual = ETAPAS_OBRA.indexOf(obra.etapa);
    return (
        <span className="vp-etapas" aria-hidden="true">
            {ETAPAS_OBRA.map((e, i) => (
                <i key={e} data-feita={i < atual || obra.etapa === "ligada" || undefined} data-agora={(i === atual && obra.etapa !== "ligada") || undefined} data-trava={(i === atual && travada(obra, prazos)) || undefined} />
            ))}
        </span>
    );
}

function Painel({ obra, prazos }: { obra: Obra; prazos: PrazosObra | null }) {
    const { alterar, marcarDocumento } = useObras();
    const indice = ETAPAS_OBRA.indexOf(obra.etapa);
    const proxima = ETAPAS_OBRA[indice + 1];
    const parada = travada(obra, prazos);
    const prazo = prazoDa(obra.etapa, prazos);

    return (
        <aside id="obra-painel" className="vp-painel" aria-label={`Obra de ${obra.cliente}`}>
            <div className="vp-painel__topo">
                <EvaBot size={56} state={parada ? "alert" : obra.etapa === "ligada" ? "happy" : "idle"} />
                <div>
                    <b><Swap id={obra.id}>{obra.cliente}</Swap></b>
                    <span><Swap id={`${obra.id}-${obra.etapa}`}>{NOME_ETAPA[obra.etapa]}</Swap></span>
                    {prazo != null && (
                        <span data-trava={parada || undefined}>
                            {diasTexto(diasNaEtapa(obra))} nesta etapa, você espera {diasTexto(prazo)}
                        </span>
                    )}
                </div>
            </div>

            <div className="vp-rotulo">Documentos</div>
            <ul className="vp-docs">
                {obra.documentos.map((d) => (
                    <li key={d.id}>
                        <button type="button" aria-pressed={d.recebido} onClick={() => marcarDocumento.mutate({ id: d.id, recebido: !d.recebido })}>
                            {d.recebido ? <CheckCircle size={18} weight="fill" aria-hidden /> : <Circle size={18} aria-hidden />}
                            {d.nome}
                        </button>
                    </li>
                ))}
            </ul>

            <label className="vp-campo">
                <span className="vp-rotulo">Com quem está</span>
                <select value={obra.com_quem} onChange={(e) => alterar.mutate({ id: obra.id, com_quem: e.target.value as ComQuem })}>
                    {(Object.keys(NOME_COM_QUEM) as ComQuem[]).map((c) => (
                        <option key={c} value={c}>{NOME_COM_QUEM[c].replace(/^(o|a) /, "").replace(/^./, (l) => l.toUpperCase())}</option>
                    ))}
                </select>
            </label>

            <label className="vp-campo">
                <span className="vp-rotulo">O que falta</span>
                <input key={obra.id} defaultValue={obra.nota ?? ""} placeholder="Ex.: falta a procuração com firma" onBlur={(e) => e.target.value !== (obra.nota ?? "") && alterar.mutate({ id: obra.id, nota: e.target.value || null })} />
            </label>

            <div className="vp-acoes">
                {proxima && (
                    <button type="button" className="vp-botao" disabled={alterar.isPending} onClick={() => alterar.mutate({ id: obra.id, etapa: proxima })}>
                        Avançar para {NOME_ETAPA[proxima]}
                    </button>
                )}
                {obra.deal_id && <Link to={`/deals/${obra.deal_id}`} className="vp-botao vp-botao--quieto">Abrir ficha do cliente</Link>}
            </div>
        </aside>
    );
}

const ETAPAS_COM_PRAZO = ETAPAS_OBRA.filter((e): e is EtapaComPrazo => e !== "ligada");

function PainelPrazos({ prazos, salvando, onSalvar }: { prazos: PrazosObra | null; salvando: boolean; onSalvar: (p: PrazosObra) => void }) {
    const [valores, setValores] = useState<Record<EtapaComPrazo, string>>(() =>
        Object.fromEntries(ETAPAS_COM_PRAZO.map((e) => [e, String(prazoDa(e, prazos))])) as Record<EtapaComPrazo, string>,
    );
    const invalido = ETAPAS_COM_PRAZO.some((e) => !(Number(valores[e]) >= 1 && Number(valores[e]) <= 365));
    return (
        <section id="obras-prazos" className="vp-cartao vp-prazos" aria-label="Prazo de cada etapa">
            <div className="vp-rotulo">Quantos dias você espera em cada etapa</div>
            <p className="vp-sub">
                Passou disso, a obra aparece como travada e a Lume te avisa no WhatsApp, em dia útil às 9h. Os números de partida são só uma sugestão: use os da sua operação.
            </p>
            <form
                onSubmit={(ev) => {
                    ev.preventDefault();
                    if (!invalido) onSalvar(Object.fromEntries(ETAPAS_COM_PRAZO.map((e) => [e, Math.round(Number(valores[e]))])) as PrazosObra);
                }}
            >
                <div className="vp-prazos__grade">
                    {ETAPAS_COM_PRAZO.map((e) => (
                        <label key={e} className="vp-campo">
                            <span className="vp-rotulo">{NOME_ETAPA[e]}</span>
                            <span className="vp-prazos__dias">
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    min={1}
                                    max={365}
                                    value={valores[e]}
                                    onChange={(ev) => setValores((v) => ({ ...v, [e]: ev.target.value }))}
                                />
                                <span>dias</span>
                            </span>
                        </label>
                    ))}
                </div>
                <div className="vp-acoes vp-acoes--linha">
                    <button type="submit" className="vp-botao" disabled={invalido || salvando}>{salvando ? "Salvando…" : "Salvar prazos"}</button>
                    <button
                        type="button"
                        className="vp-botao vp-botao--quieto"
                        onClick={() => setValores(Object.fromEntries(ETAPAS_COM_PRAZO.map((e) => [e, String(PRAZO_PADRAO[e])])) as Record<EtapaComPrazo, string>)}
                    >
                        Voltar aos números de partida
                    </button>
                    {invalido && <span className="vp-prazos__erro">Use de 1 a 365 dias.</span>}
                </div>
            </form>
        </section>
    );
}

export default function Obras() {
    const { query, prazos, salvarPrazos } = useObras();
    const [prazosAbertos, setPrazosAbertos] = useState(false);
    const [aba, setAba] = useState<"andamento" | "ligadas">("andamento");
    const [abertaId, setAbertaId] = useState<string | null>(null);

    const todas = query.data ?? [];
    const andamento = todas.filter((o) => o.etapa !== "ligada");
    const ligadas = todas.filter((o) => o.etapa === "ligada");
    const visiveis = aba === "andamento" ? andamento : ligadas;
    const aberta = visiveis.find((o) => o.id === abertaId) ?? visiveis[0] ?? null;
    const lote = useMostrarMais(visiveis, 30, aba);
    const travadas = andamento.filter((o) => travada(o, prazos)).length;
    // No celular o painel fica abaixo da lista: leva a pessoa até ele.
    const abrir = (id: string) => {
        setAbertaId(id);
        if (window.matchMedia("(max-width: 1023px)").matches) {
            requestAnimationFrame(() => document.getElementById("obra-painel")?.scrollIntoView({ block: "start" }));
        }
    };

    return (
        <div className="vp-tela pb-16">
            <header className="vp-cabeca">
                <div>
                    <h1 className="vp-titulo">Obras</h1>
                    <p className="vp-sub">{andamento.length} em andamento, {travadas} {travadas === 1 ? "travada" : "travadas"}</p>
                </div>
                <div className="vp-cabeca__acoes">
                <button
                    type="button"
                    className="vp-botao vp-botao--quieto"
                    aria-expanded={prazosAbertos}
                    aria-controls="obras-prazos"
                    onClick={() => setPrazosAbertos((v) => !v)}
                >
                    {prazosAbertos ? <X size={15} aria-hidden /> : <SlidersHorizontal size={15} aria-hidden />}
                    {prazosAbertos ? "Fechar prazos" : "Prazos"}
                </button>
                <div role="tablist" aria-label="Situação" className="vp-segmento">
                    <button type="button" role="tab" aria-selected={aba === "andamento"} onClick={() => setAba("andamento")}>Em andamento<em>{andamento.length}</em></button>
                    <button type="button" role="tab" aria-selected={aba === "ligadas"} onClick={() => setAba("ligadas")}>Ligadas<em>{ligadas.length}</em></button>
                </div>
                </div>
            </header>

            {prazosAbertos && (
                <PainelPrazos
                    prazos={prazos}
                    salvando={salvarPrazos.isPending}
                    onSalvar={(p) => salvarPrazos.mutate(p, { onSuccess: () => setPrazosAbertos(false) })}
                />
            )}

            {query.isError ? (
                <div className="vp-vazio">Não consegui carregar as obras agora. Tente de novo em instantes.</div>
            ) : query.isLoading ? (
                <div className="vp-vazio" aria-busy="true">Carregando as obras</div>
            ) : visiveis.length === 0 ? (
                <div className="vp-vazio">
                    {aba === "andamento" ? "Nenhuma obra em andamento. Quando um cliente fechar no funil, ele aparece aqui." : "Nenhuma obra ligada ainda."}
                </div>
            ) : (
                <div className="vp-orca">
                    <section className="vp-tabela" aria-label="Obras">
                        <div className="vp-obra__cab" aria-hidden="true"><span>Cliente</span><span>Etapa</span><span>O que falta</span></div>
                        {lote.visiveis.map((o) => {
                            const parada = travada(o, prazos);
                            const prazo = prazoDa(o.etapa, prazos);
                            return (
                                <button key={o.id} type="button" className="vp-obra" data-aberta={aberta?.id === o.id || undefined} onClick={() => abrir(o.id)}>
                                    <span className="vp-fila__cliente"><b>{o.cliente}</b><span>{kwpTexto(o)}</span></span>
                                    <span className="vp-obra__etapa"><Etapas obra={o} prazos={prazos} />{NOME_ETAPA[o.etapa]}</span>
                                    <span className="vp-obra__nota">
                                        <b data-trava={parada || undefined}>
                                            {parada && <WarningCircle size={15} weight="fill" aria-hidden />}
                                            {o.nota || NOME_ETAPA[o.etapa]}
                                        </b>
                                        <span>Com {NOME_COM_QUEM[o.com_quem]} há {diasTexto(diasNaEtapa(o))}{prazo != null ? `, você espera ${diasTexto(prazo)}` : ""}</span>
                                    </span>
                                </button>
                            );
                        })}
                        <MostrarMais restante={lote.restante} passo={lote.passo} total={lote.total} onClick={lote.mostrarMais} />
                    </section>
                    {aberta && <Painel obra={aberta} prazos={prazos} />}
                </div>
            )}
        </div>
    );
}
