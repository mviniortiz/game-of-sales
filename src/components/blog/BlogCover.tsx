import { Check, Clock, FileText } from "lucide-react";
import { Stage } from "@/vendor/stageshow/stage";
import { Bubble, Thread } from "@/vendor/stageshow/messages";
import { Bar, Window } from "@/vendor/stageshow/window";
import type { Act } from "@/vendor/stageshow/act";
import { EvaBot, type EvaBotState } from "@/components/eva/EvaBot";
import type { BlogCover as Cover } from "@/data/landing/blogPosts";
import "./blogCover.css";

// Capa do post feita com o kit Stageshow (Benji Taylor, MIT; src/vendor/stageshow):
// um objeto do dia a dia do integrador (a conversa, o aviso da Lume, a proposta,
// a lista de propostas, um prompt) sobre um fundo chapado do sistema Lume em campo.
// Poucas palavras reais, o resto é preenchimento. Na lista do blog é uma foto
// parada; no post ela toca uma vez quando aparece (play="once"), e quem prefere
// menos movimento vê direto o quadro final.
const W = 576;
const H = 324;

type Cena = { passo: number; eva: EvaBotState };
const FINAL: Cena = { passo: 9, eva: "happy" };

async function roteiroConversa(a: Act<Cena>) {
    await a.wait(700);
    await a.set({ passo: 2 });
    await a.wait(900);
    await a.set({ passo: 9 });
}

async function roteiroAviso(a: Act<Cena>) {
    await a.wait(500);
    await a.set({ eva: "thinking" });
    await a.wait(1100);
    await a.set({ passo: 1, eva: "alert" });
    await a.wait(2200);
    await a.set({ passo: 9, eva: "happy" });
}

// Comparativo: as duas primeiras formas de follow-up já estão na tela; a do
// Vyzon entra por último e a Lume reage.
async function roteiroComparativo(a: Act<Cena>) {
    await a.wait(600);
    await a.set({ eva: "thinking" });
    await a.wait(900);
    await a.set({ passo: 9, eva: "happy" });
}

export function BlogCover({ cover, animate = false }: { cover: Cover; animate?: boolean }) {
    const script = !animate
        ? undefined
        : cover.kind === "conversa"
          ? roteiroConversa
          : cover.kind === "aviso"
            ? roteiroAviso
            : cover.kind === "comparativo"
              ? roteiroComparativo
              : undefined;
    const inicio: Cena = script ? { passo: cover.kind === "conversa" ? 1 : 0, eva: "idle" } : FINAL;

    return (
        <div className={`vbc vbc--${cover.plate}`} aria-hidden="true">
            <Stage width={W} height={H} initial={inicio} poster={FINAL} script={script} play="once" fill className="vbc-stage">
                {(s) => <Objeto cover={cover} s={s} />}
            </Stage>
        </div>
    );
}

function Objeto({ cover, s }: { cover: Cover; s: Cena }) {
    switch (cover.kind) {
        case "conversa":
            return (
                <>
                    <div className="vbc-chat" style={{ left: 128, width: 320 }}>
                        <div className="vbc-chat__topo">
                            <span className="vbc-avatar vbc-avatar--cliente">{cover.contato.charAt(0)}</span>
                            <span>
                                <b>{cover.contato}</b>
                                <Bar w={52} h={5} tone={2} />
                            </span>
                        </div>
                        <Thread className="vbc-thread">
                            {cover.mensagens.slice(0, s.passo >= 9 ? undefined : s.passo).map((m, i) => (
                                <Bubble key={i} from={m.de === "voce" ? "me" : "them"}>
                                    {m.texto}
                                </Bubble>
                            ))}
                        </Thread>
                    </div>
                    {cover.selo && (
                        <div className="vbc-selo" style={{ left: 448 - 104, top: 40 - 22 }}>
                            <Clock aria-hidden="true" />
                            <span>{cover.selo}</span>
                        </div>
                    )}
                </>
            );
        case "aviso":
            return (
                <>
                    <div className="vbc-chat vbc-chat--aviso" style={{ left: 48, width: 404 }}>
                        <div className="vbc-chat__topo">
                            <span className="vbc-avatar">L</span>
                            <span>
                                <b>Lume</b>
                                <small>assistente do Vyzon</small>
                            </span>
                        </div>
                        <Thread className="vbc-thread">
                            {s.passo >= 1 && (
                                <Bubble from="them">
                                    <span className="vbc-aviso">
                                        <b>Mensagem pronta para {cover.cliente}</b>
                                        <small>{cover.resumo}</small>
                                        <span className="vbc-rascunho">{cover.texto}</span>
                                        <small>Responda 1 e ela sai do seu número.</small>
                                    </span>
                                </Bubble>
                            )}
                            {s.passo >= 9 && <Bubble from="me">1</Bubble>}
                        </Thread>
                    </div>
                    <span className="vbc-eva" style={{ left: 426, top: 74 }}>
                        <EvaBot size={124} state={s.eva} label="Lume" />
                    </span>
                </>
            );
        case "proposta":
            return (
                <>
                    <div className="vbc-doc" style={{ left: 148, width: 280 }}>
                        <Bar w={58} h={9} tone={2} r={3} />
                        <p className="vbc-doc__titulo">{cover.titulo}</p>
                        <dl className="vbc-doc__linhas">
                            {cover.linhas.map(([k, v]) => (
                                <div key={k}>
                                    <dt>{k}</dt>
                                    <dd>{v}</dd>
                                </div>
                            ))}
                        </dl>
                        <div className="vbc-doc__destaque">
                            <span>{cover.destaque[0]}</span>
                            <b>{cover.destaque[1]}</b>
                        </div>
                        <Bar w={180} h={6} tone={2} />
                        <Bar w={140} h={6} tone={2} />
                    </div>
                    <div className="vbc-arquivo" style={{ left: 428 - 96, top: 10 }}>
                        <span className="vbc-arquivo__ico">
                            <FileText aria-hidden="true" />
                        </span>
                        <span>
                            <b>Proposta.pdf</b>
                            <small>3 páginas · PDF</small>
                        </span>
                    </div>
                </>
            );
        case "lista":
            return (
                <>
                    <div className="vbc-lista" style={{ left: 108, top: 96, width: 360 }}>
                        <div className="vbc-lista__topo">
                            <b>Propostas acompanhadas</b>
                            <span className="vbc-carimbo vbc-carimbo--espera">{cover.total}</span>
                        </div>
                        <ul>
                            {cover.itens.map((it) => (
                                <li key={it.cliente}>
                                    <span className="vbc-lista__cliente">
                                        <b>{it.cliente}</b>
                                        <Bar w={84} h={5} tone={2} />
                                    </span>
                                    <span className="vbc-lista__valor">
                                        <b>{it.valor}</b>
                                        <span className={`vbc-carimbo vbc-carimbo--${it.estado}`}>{it.status}</span>
                                    </span>
                                </li>
                            ))}
                            <li aria-hidden="true">
                                <span className="vbc-lista__cliente">
                                    <Bar w={120} h={7} tone={3} />
                                    <Bar w={84} h={5} tone={2} />
                                </span>
                                <Bar w={64} h={7} tone={3} />
                            </li>
                        </ul>
                    </div>
                    <span className="vbc-eva" style={{ left: 468 - 112, top: 96 - 78 }}>
                        <EvaBot size={84} state="alert" label="Lume" />
                    </span>
                </>
            );
        case "comparativo": {
            const ultima = cover.linhas.length - 1;
            return (
                <>
                    <div className="vbc-lista vbc-compara" style={{ left: 108, top: 92, width: 360 }}>
                        <div className="vbc-lista__topo">
                            <b>{cover.titulo}</b>
                            <Bar w={56} h={6} tone={2} />
                        </div>
                        <ul>
                            {cover.linhas.map((l, i) => (
                                <li
                                    key={i}
                                    className={l.estado === "ok" ? "vbc-compara__vyzon" : undefined}
                                    data-on={i < ultima || s.passo >= 9 || undefined}
                                >
                                    <span className="vbc-lista__cliente">
                                        {l.nome ? <b>{l.nome}</b> : <Bar w={96} h={8} tone={3} />}
                                        <Bar w={l.nome ? 120 : 72} h={5} tone={2} />
                                    </span>
                                    <span className={`vbc-carimbo vbc-carimbo--${l.estado}`}>
                                        {l.estado === "ok" && <Check aria-hidden="true" />}
                                        {l.status}
                                    </span>
                                </li>
                            ))}
                            <li aria-hidden="true" data-on>
                                <span className="vbc-lista__cliente">
                                    <Bar w={110} h={8} tone={3} />
                                    <Bar w={72} h={5} tone={2} />
                                </span>
                                <Bar w={70} h={14} tone={2} r={6} />
                            </li>
                        </ul>
                    </div>
                    <span className="vbc-eva" style={{ left: 468 - 106, top: 92 - 76 }}>
                        <EvaBot size={84} state={s.eva} label="Lume" />
                    </span>
                </>
            );
        }
        case "prompt":
            return (
                <Window title="Assistente" className="vbc-janela" style={{ position: "absolute", left: 96, top: 40, width: 384, height: 330 }}>
                    <Thread app="chat" className="vbc-thread vbc-thread--chat">
                        <Bubble from="me">{cover.pergunta}</Bubble>
                        <Bubble from="them">
                            <span className="vbc-resposta">
                                {cover.resposta.map((l) => (
                                    <span key={l}>{l}</span>
                                ))}
                                <Bar w={220} h={6} tone={2} />
                                <Bar w={170} h={6} tone={2} />
                            </span>
                        </Bubble>
                    </Thread>
                </Window>
            );
    }
}

export default BlogCover;
