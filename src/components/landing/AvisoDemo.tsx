import { Bubble, Stamp, Thread } from "@/vendor/stageshow/messages";
import { Phone } from "@/vendor/stageshow/phone";
import { Stage } from "@/vendor/stageshow/stage";
import type { Act } from "@/vendor/stageshow/act";
import { Clock } from "lucide-react";
import { EvaBot, type EvaBotState } from "@/components/eva/EvaBot";
import "./avisoDemo.css";

// O aviso no WhatsApp do dono, no formato da aprovação real
// (_shared/whatsappApproval.ts), simplificado para "responda 1" sem o código
// curto nem nome interno. A EVA lê, acha a proposta parada, o aviso chega, o dono
// responde 1 e a mensagem sai. Dados de exemplo. Feito com o kit Stageshow.
type Cena = { eva: EvaBotState; selo: boolean; aviso: boolean; um: boolean; enviada: boolean };

const inicio: Cena = { eva: "idle", selo: false, aviso: false, um: false, enviada: false };
// Movimento reduzido e miniatura veem a história inteira.
const poster: Cena = { eva: "happy", selo: true, aviso: true, um: true, enviada: true };

async function roteiro(a: Act<Cena>) {
    await a.wait(800);
    await a.set({ eva: "thinking" });
    await a.wait(1200);
    await a.set({ eva: "alert", selo: true });
    await a.wait(500);
    await a.set({ aviso: true });
    await a.wait(2800);
    await a.set({ um: true, eva: "talking" });
    await a.wait(1300);
    await a.set({ enviada: true, eva: "happy" });
}

export default function AvisoDemo() {
    return (
        <Stage
            width={420}
            height={600}
            compact={{ below: 400, width: 343, height: 600 }}
            initial={inicio}
            poster={poster}
            script={roteiro}
            play="once"
            className="ad-stage"
        >
            {(s, _rect, layout) => (
                <div className="ad-cena">
                    <span className="ad-eva">
                        <EvaBot size={150} state={s.eva} />
                    </span>
                    <div className="ad-selo" data-show={s.selo ? "" : undefined}>
                        <Clock aria-hidden="true" />
                        <span>
                            <strong>2 dias sem resposta</strong>
                            Residência Oliveira
                        </span>
                    </div>
                    <Phone width={layout === "compact" ? 318 : 360} className="ad-phone" wallpaper="#efeae2" time="9:02">
                        <div className="ad-topo">
                            <span className="ad-avatar">V</span>
                            <span>
                                <b>Aviso do Vyzon</b>
                                <small>no seu WhatsApp</small>
                            </span>
                        </div>
                        <Thread className="ad-thread">
                            <Stamp>Exemplo · Quarta</Stamp>
                            {s.aviso && (
                                <Bubble from="them">
                                    <span className="ad-aviso">
                                        <b>Mensagem pronta para o Carlos</b>
                                        <small>Proposta de R$ 24.900 sem resposta há 2 dias</small>
                                        <span className="ad-rascunho">
                                            Oi, Carlos, conseguiu olhar a proposta? Se ajudar, te mando a simulação com financiamento pra comparar com a sua conta de luz.
                                        </span>
                                        <small>Responda 1 e ela sai do seu número.</small>
                                    </span>
                                </Bubble>
                            )}
                            {s.um && <Bubble from="me">1</Bubble>}
                            {s.enviada && <Bubble from="them">Enviada para o Carlos.</Bubble>}
                        </Thread>
                    </Phone>
                </div>
            )}
        </Stage>
    );
}
