// A aba Lume: o que ela fez, o que aprendeu e até onde vai. O ajuste fino (ensinar,
// provar, regras) continua no Lume Studio, um clique adiante.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "@phosphor-icons/react";
import { EvaDiaryCard } from "@/components/inicio/EvaDiaryCard";
import { EvaBot, type EvaBotState } from "@/components/eva/EvaBot";
import type { ContextSuggestion, SuggestionResolution } from "@/components/eva-studio/GuidedContextBuilder";
import { useEvaDiary } from "@/hooks/useEvaDiary";
import { useQuoteBoard } from "@/hooks/useQuoteBoard";
import { OPEN_QUOTE_STATES } from "@/lib/quoteText";
import { useReducedMotion } from "@/vendor/stageshow/reduced-motion";

// Enquanto a aba está aberta a Lume mostra o que sabe fazer, do jeito do palco da home.
const CICLO: EvaBotState[] = ["idle", "thinking", "alert", "talking", "happy"];

export function EvaVisaoGeral({
    aprendeu,
    aoResolver,
}: {
    aprendeu: ContextSuggestion | null;
    aoResolver: (s: ContextSuggestion, r: SuggestionResolution) => void;
}) {
    const diary = useEvaDiary();
    const { query } = useQuoteBoard(30, null);
    const reduzido = useReducedMotion();
    const [i, setI] = useState(0);

    useEffect(() => {
        if (reduzido) return;
        const t = window.setInterval(() => setI((v) => (v + 1) % CICLO.length), 2400);
        return () => window.clearInterval(t);
    }, [reduzido]);

    const items = query.data?.items ?? [];
    const numeros = [
        { n: items.filter((q) => OPEN_QUOTE_STATES.includes(q.state)).length, texto: "orçamentos acompanhados" },
        { n: diary.enviados.length, texto: "rascunhos aprovados desde ontem" },
        { n: query.data?.totals.recovered_count ?? 0, texto: "fecharam depois da retomada" },
    ];

    return (
        <div className="vp-tela">
            <header className="vp-cabeca">
                <div>
                    <h1 className="vp-titulo">Lume</h1>
                    <p className="vp-sub">O que ela faz, o que ela sabe e até onde vai</p>
                </div>
                <Link to="/eva-studio?ajustar=1" className="vp-botao vp-botao--quieto">
                    Ajustar a Lume
                    <ArrowRight size={14} weight="bold" aria-hidden />
                </Link>
            </header>

            <div className="vp-eva">
                <section className="vp-eva__palco" aria-label="O trabalho da Lume">
                    <div className="vp-eva__bot">
                        <EvaBot size={300} state={reduzido ? "idle" : CICLO[i]} />
                    </div>
                    <div className="vp-eva__numeros">
                        {numeros.map((c) => (
                            <div key={c.texto}>
                                <b>{c.n}</b>
                                <span>{c.texto}</span>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="vp-coluna">
                    {aprendeu && (
                        <section className="vp-cartao" aria-label="Aprendeu nas conversas">
                            <div className="vp-rotulo">Aprendeu nas conversas</div>
                            <p className="vp-aprendeu">{aprendeu.statement}</p>
                            <div className="vp-acoes vp-acoes--linha" style={{ flex: "none" }}>
                                <button type="button" className="vp-botao" onClick={() => aoResolver(aprendeu, { action: "confirm" })}>
                                    <Check size={15} weight="bold" aria-hidden />
                                    Está certo
                                </button>
                                <Link to="/eva-studio?ajustar=1" className="vp-botao vp-botao--quieto">Corrigir</Link>
                            </div>
                        </section>
                    )}
                    <section className="vp-cartao" aria-label="Limites">
                        <div className="vp-rotulo">Limites</div>
                        <ul className="vp-limites">
                            <li><b>Nada sai sem o seu 1</b></li>
                            <li>Até 5 avisos por dia no seu WhatsApp</li>
                            <li>Rascunho sem resposta expira em 48 horas</li>
                        </ul>
                    </section>
                    <section className="vp-cartao" aria-label="Como ela trabalha">
                        <div className="vp-rotulo">Como ela trabalha</div>
                        <div className="vp-sozinha">
                            <p><span>Sozinha</span>Lê as conversas, organiza os orçamentos e atualiza o funil</p>
                            <p><span>Com o seu ok</span>Toda mensagem que vai para o cliente</p>
                        </div>
                    </section>
                    <EvaDiaryCard diary={diary} />
                </div>
            </div>
        </div>
    );
}
