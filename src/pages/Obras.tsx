// Obras: do fechamento à usina ligada. Mostra em que etapa cada obra está e com quem
// ela está parada, que é o que o dono perde de vista depois da venda.
import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, Circle, WarningCircle } from "@phosphor-icons/react";
import { EvaBot } from "@/components/eva/EvaBot";
import {
    diasNaEtapa,
    ETAPAS_OBRA,
    NOME_COM_QUEM,
    NOME_ETAPA,
    travada,
    useObras,
    type ComQuem,
    type Obra,
} from "@/hooks/useObras";
import { Swap } from "@/vendor/stageshow/motion/Swap";

const kwpTexto = (o: Obra) => (o.system_kwp != null ? `${String(o.system_kwp).replace(".", ",")} kWp` : "kWp não informado");
const diasTexto = (n: number) => (n === 1 ? "1 dia" : `${n} dias`);

function Etapas({ obra }: { obra: Obra }) {
    const atual = ETAPAS_OBRA.indexOf(obra.etapa);
    return (
        <span className="vp-etapas" aria-hidden="true">
            {ETAPAS_OBRA.map((e, i) => (
                <i key={e} data-feita={i < atual || obra.etapa === "ligada" || undefined} data-agora={(i === atual && obra.etapa !== "ligada") || undefined} data-trava={(i === atual && travada(obra)) || undefined} />
            ))}
        </span>
    );
}

function Painel({ obra }: { obra: Obra }) {
    const { alterar, marcarDocumento } = useObras();
    const indice = ETAPAS_OBRA.indexOf(obra.etapa);
    const proxima = ETAPAS_OBRA[indice + 1];
    const parada = travada(obra);

    return (
        <aside id="obra-painel" className="vp-painel" aria-label={`Obra de ${obra.cliente}`}>
            <div className="vp-painel__topo">
                <EvaBot size={56} state={parada ? "alert" : obra.etapa === "ligada" ? "happy" : "idle"} />
                <div>
                    <b><Swap id={obra.id}>{obra.cliente}</Swap></b>
                    <span><Swap id={`${obra.id}-${obra.etapa}`}>{NOME_ETAPA[obra.etapa]}</Swap></span>
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

export default function Obras() {
    const { query } = useObras();
    const [aba, setAba] = useState<"andamento" | "ligadas">("andamento");
    const [abertaId, setAbertaId] = useState<string | null>(null);

    const todas = query.data ?? [];
    const andamento = todas.filter((o) => o.etapa !== "ligada");
    const ligadas = todas.filter((o) => o.etapa === "ligada");
    const visiveis = aba === "andamento" ? andamento : ligadas;
    const aberta = visiveis.find((o) => o.id === abertaId) ?? visiveis[0] ?? null;
    const travadas = andamento.filter(travada).length;
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
                <div role="tablist" aria-label="Situação" className="vp-segmento">
                    <button type="button" role="tab" aria-selected={aba === "andamento"} onClick={() => setAba("andamento")}>Em andamento<em>{andamento.length}</em></button>
                    <button type="button" role="tab" aria-selected={aba === "ligadas"} onClick={() => setAba("ligadas")}>Ligadas<em>{ligadas.length}</em></button>
                </div>
            </header>

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
                        {visiveis.map((o) => {
                            const parada = travada(o);
                            return (
                                <button key={o.id} type="button" className="vp-obra" data-aberta={aberta?.id === o.id || undefined} onClick={() => abrir(o.id)}>
                                    <span className="vp-fila__cliente"><b>{o.cliente}</b><span>{kwpTexto(o)}</span></span>
                                    <span className="vp-obra__etapa"><Etapas obra={o} />{NOME_ETAPA[o.etapa]}</span>
                                    <span className="vp-obra__nota">
                                        <b data-trava={parada || undefined}>
                                            {parada && <WarningCircle size={15} weight="fill" aria-hidden />}
                                            {o.nota || NOME_ETAPA[o.etapa]}
                                        </b>
                                        <span>Com {NOME_COM_QUEM[o.com_quem]} há {diasTexto(diasNaEtapa(o))}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </section>
                    {aberta && <Painel obra={aberta} />}
                </div>
            )}
        </div>
    );
}
