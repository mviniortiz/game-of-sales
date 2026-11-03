import { Camera, CheckCheck, ChevronLeft, Mic, Phone as Telefone, Plus, SendHorizontal, Sticker, Video } from "lucide-react";
import { Stage } from "@/vendor/stageshow/stage";
import { Notification, Phone } from "@/vendor/stageshow/phone";
import { Bubble, Stamp, Thread } from "@/vendor/stageshow/messages";
import { Swap } from "@/vendor/stageshow/motion/Swap";
import { Collapse } from "@/vendor/stageshow/motion/Collapse";
import { Avatar } from "@/vendor/stageshow/parts/Avatar";
import type { Act } from "@/vendor/stageshow/act";
import { EvaBot } from "@/components/eva/EvaBot";
import { horaRelogio } from "./horaDoDia";
import "./cenaAprovacao.css";

// A aprovação pelo WhatsApp, contada no painel escuro do login. Feita com o
// kit Stageshow (src/vendor/stageshow), a partir do exemplo "messages".
//   0. Abre no resultado: a conversa com a Lume e, ao lado, a do Carlos.
//   1. A conversa do Carlos sai, a Lume digita e o aviso chega no WhatsApp do
//      dono (texto real de buildDraftMessage, _shared/whatsappApproval.ts).
//   2. O dono toca no campo, digita 1 e envia: nada sai antes disso.
//   3. A Lume confirma com o texto real da resposta ao 1.
//   4. A conversa do Carlos volta: a mensagem saiu do número do dono e ele
//      responde (a resposta do cliente é ilustrativa, a mesma do reel).
// Na coluna estreita (compacta) não cabe o satélite sem cobrir o 1: a
// resposta do Carlos chega como banner do iOS sobre o topo da conversa.
//
// O loop sai em volta da âncora: o celular fica, a conversa do Carlos e as
// três mensagens saem juntas, da última para a primeira, enquanto a Lume já
// digita o próximo aviso. Começo e fim são o mesmo quadro, o resultado.

type Cena = {
    lume: "online" | "digitando";
    aviso: boolean;
    campo: string;
    um: boolean;
    confirma: boolean;
    carlos: boolean;
    carlosDigita: boolean;
    resposta: boolean;
    saindo: boolean;
};

// Começo, miniatura e movimento reduzido são o mesmo quadro: o resultado.
const inicio: Cena = {
    lume: "online",
    aviso: true,
    campo: "",
    um: true,
    confirma: true,
    carlos: true,
    carlosDigita: false,
    resposta: true,
    saindo: false,
};

const LEAD = "Carlos";
const SUGERIDA = "Oi, Carlos, conseguiu olhar a proposta? Se ajudar, te mando a simulação com financiamento.";
// buildDraftMessage, com as linhas em branco do original
const AVISO = [
    "Lume [A2] rascunho pronto",
    "",
    `Lead: ${LEAD}`,
    "Por que agora: 2 dias sem resposta depois da proposta",
    "",
    SUGERIDA,
    "",
    "Responda 1 para enviar, 2 para descartar, ou escreva o texto corrigido.",
].join("\n");
// Resposta ao "1" (whatsappApproval.ts, linha 779). No chat do dono consigo
// mesmo o replyOwner ainda põe "Lume " na frente; pelo número oficial sai assim.
const CONFIRMA = `Sai em 20 segundos para ${LEAD}. Mande "desfazer" para cancelar.`;
const RESPOSTA = "Oi! Vi sim, me manda a simulação.";
const DESCANSO = { x: 250, y: 470 };

async function roteiro(a: Act<Cena>) {
    // O resultado segura na tela (é o que quem acabou de chegar vê primeiro)
    await a.wait(2000);
    a.mark("proximo");
    // Chega coisa nova: a Lume digita, e o que a volta trouxe sai de uma vez
    await a.set({ carlos: false, saindo: true, lume: "digitando" });
    await a.wait(560);
    // Tudo já invisível: a conversa recomeça vazia, sem transição
    await a.snap({ aviso: false, um: false, confirma: false, resposta: false, saindo: false });
    await a.wait(700);
    a.mark("aviso");
    await a.set({ lume: "online", aviso: true });
    // Tempo de leitura do aviso
    await a.wait(2800);
    a.mark("um");
    await a.click("campo");
    await a.type("campo", "1");
    await a.wait(420);
    await a.click("enviar");
    // O campo esvazia no mesmo passo em que a bolha nasce dele
    await a.set({ um: true, campo: "" });
    await a.wait(700);
    await a.set({ lume: "digitando" });
    await a.wait(900);
    a.mark("confirma");
    await a.set({ lume: "online", confirma: true });
    await a.wait(1400);
    if (a.layout === "wide") {
        a.mark("carlos");
        await a.set({ carlos: true });
        await a.wait(1300);
        await a.set({ carlosDigita: true });
        await a.wait(1100);
        a.mark("resposta");
        await a.set({ carlosDigita: false, resposta: true });
    } else {
        a.mark("resposta");
        await a.set({ carlos: true, resposta: true });
    }
    await a.move(DESCANSO);
    // O resultado segura; a próxima volta começa nele
    await a.wait(1300);
}

const Meta = ({ hora, lida }: { hora: string; lida?: boolean }) => (
    <span className="vz-cena__meta">
        {hora}
        {lida !== undefined && <CheckCheck className="vz-cena__tique" data-lida={lida || undefined} aria-hidden />}
    </span>
);

export default function CenaAprovacao({ quando }: { quando: Date }) {
    const hora = horaRelogio(quando);
    return (
        <Stage<Cena>
            width={488}
            height={520}
            compact={{ below: 420, width: 358, height: 382 }}
            initial={inicio}
            poster={inicio}
            script={roteiro}
            cursor={{ at: DESCANSO, style: "touch" }}
            className="vz-cena"
        >
            {(s, _rect, layout) => {
                return (
                    <div className="vz-cena__quadro" data-saindo={s.saindo || undefined}>
                        <Phone width={layout === "compact" ? 296 : 330} className="vz-cena__fone" time={hora}>
                            <div className="vz-cena__topo">
                                <ChevronLeft className="vz-cena__voltar" aria-hidden />
                                <span className="vz-cena__lume">
                                    <EvaBot size={36} state={s.lume === "digitando" ? "talking" : "idle"} />
                                </span>
                                <span className="vz-cena__quem">
                                    <b>Lume</b>
                                    <Swap id={s.lume} className="vz-cena__status">
                                        {s.lume === "digitando" ? "digitando…" : "online"}
                                    </Swap>
                                </span>
                                <Video className="vz-cena__acao" aria-hidden />
                                <Telefone className="vz-cena__acao" aria-hidden />
                            </div>

                            <Thread className="vz-cena__conversa">
                                {s.aviso && <Stamp className="vz-cena__dia">Hoje</Stamp>}
                                {s.aviso && (
                                    <Bubble from="them" className="vz-cena__msg">
                                        <span className="vz-cena__texto">{AVISO}</span>
                                        <Meta hora={hora} />
                                    </Bubble>
                                )}
                                {s.um && (
                                    <Bubble from="me" source="campo" className="vz-cena__msg">
                                        <span className="vz-cena__texto">1</span>
                                        <Meta hora={hora} lida />
                                    </Bubble>
                                )}
                                {s.confirma && (
                                    <Bubble from="them" className="vz-cena__msg">
                                        <span className="vz-cena__texto">{CONFIRMA}</span>
                                        <Meta hora={hora} />
                                    </Bubble>
                                )}
                            </Thread>

                            <div className="vz-cena__compor">
                                <Plus className="vz-cena__icone" aria-hidden />
                                <span className="vz-cena__campo" data-target="campo">
                                    <span className="vz-cena__digitado">{s.campo}</span>
                                    <Sticker className="vz-cena__icone vz-cena__icone--leve" aria-hidden />
                                </span>
                                <span className="vz-cena__fim" data-cheio={s.campo ? "" : undefined}>
                                    <span className="vz-cena__vazio">
                                        <Camera className="vz-cena__icone" aria-hidden />
                                        <Mic className="vz-cena__icone" aria-hidden />
                                    </span>
                                    <span className="vz-cena__enviar" data-target="enviar">
                                        <SendHorizontal aria-hidden />
                                    </span>
                                </span>
                            </div>

                            {layout === "compact" && s.resposta && (
                                <Notification
                                    banner
                                    className="vz-cena__banner"
                                    data-sai={s.carlos ? undefined : ""}
                                    icon={<Avatar name={LEAD} size={38} />}
                                    title={LEAD}
                                    time="agora"
                                    body={RESPOSTA}
                                />
                            )}
                        </Phone>

                        {layout === "wide" && (
                            <div className="vz-cena__carlos" data-show={s.carlos || undefined}>
                                <div className="vz-cena__carlos-topo">
                                    <Avatar name={LEAD} size={28} />
                                    <span className="vz-cena__quem">
                                        <b>{LEAD}</b>
                                        <Swap id={s.carlosDigita ? "d" : "o"} className="vz-cena__status">
                                            {s.carlosDigita ? "digitando…" : "online"}
                                        </Swap>
                                    </span>
                                </div>
                                <Thread className="vz-cena__conversa vz-cena__conversa--carlos">
                                    <Bubble from="me" className="vz-cena__msg">
                                        <span className="vz-cena__texto">{SUGERIDA}</span>
                                        <Meta hora={hora} lida={s.resposta || s.carlosDigita} />
                                    </Bubble>
                                    <span className="vz-cena__selo">Saiu do seu número</span>
                                    {/* A resposta abre a própria altura: o cartão cresce com ela */}
                                    <Collapse open={s.resposta} reveal="drop" from="below" className="vz-cena__resposta">
                                        <div className="vz-cena__bolha-carlos">
                                            <span className="vz-cena__texto">{RESPOSTA}</span>
                                            <Meta hora={hora} />
                                        </div>
                                    </Collapse>
                                </Thread>
                            </div>
                        )}
                    </div>
                );
            }}
        </Stage>
    );
}
