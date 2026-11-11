// O palco amarelo de Hoje: o rascunho que espera o 1 do dono. Quando ele responde no
// WhatsApp o rascunho sai da fila, e o palco conta que a mensagem saiu do número dele.
import { useEffect, useRef, useState } from "react";
import { EvaBot, type EvaBotState } from "@/components/eva/EvaBot";
import type { RascunhoPendente } from "@/hooks/useEvaDiary";
import { Swap } from "@/vendor/stageshow/motion/Swap";

export function PalcoEva({
    rascunho,
    enviados,
    acompanhando,
    carregando,
}: {
    rascunho: RascunhoPendente | null;
    enviados: string[];
    acompanhando: number;
    carregando: boolean;
}) {
    const anterior = useRef<RascunhoPendente | null>(null);
    const [saiu, setSaiu] = useState<RascunhoPendente | null>(null);

    useEffect(() => {
        const antes = anterior.current;
        if (rascunho) {
            setSaiu(null);
        } else if (antes && enviados.includes(antes.id)) {
            setSaiu(antes);
        }
        anterior.current = rascunho;
    }, [rascunho, enviados]);

    // Carregando: esqueleto entre o palco calmo (sem rascunho) e o com rascunho,
    // pra mudar pouco de altura quando o dado chega. O Início segura "Pedem você"
    // até aqui responder, então a lista não pula depois de aparecer.
    if (carregando)
        return (
            <section className="vp-palco" data-calmo aria-busy="true" aria-label="Carregando">
                <p className="vp-palco__rotulo">{"\u00a0"}</p>
                <div className="vp-palco__titulo">{"\u00a0"}</div>
                <p className="vp-palco__motivo">{"\u00a0"}</p>
                <p className="vp-balao" style={{ minHeight: "4em" }} />
            </section>
        );

    const atual = rascunho ?? saiu;
    const estado: EvaBotState = rascunho ? "alert" : saiu ? "happy" : "idle";
    const rotulo = rascunho
        ? rascunho.noWhatsapp
            ? "Falta o seu 1 no WhatsApp"
            : "Já vai para o seu WhatsApp"
        : saiu
          ? "Saiu do seu número"
          : "Nada esperando o seu 1";

    return (
        <section className="vp-palco" data-calmo={!atual || undefined} aria-live="polite">
            <span className="vp-sentada" style={{ ["--vp-eva" as string]: "120px" }}>
                <EvaBot size={120} state={estado} />
            </span>
            <p className="vp-palco__rotulo">
                <Swap id={rotulo}>{rotulo}</Swap>
            </p>
            {atual ? (
                <>
                    <div className="vp-palco__titulo">{atual.quem}</div>
                    {atual.porque && <p className="vp-palco__motivo">{atual.porque}</p>}
                    {atual.texto && <p className="vp-balao">{atual.texto}</p>}
                </>
            ) : (
                <>
                    <div className="vp-palco__titulo">
                        {acompanhando > 0 ? `De olho em ${acompanhando} ${acompanhando === 1 ? "orçamento" : "orçamentos"}` : "De olho no seu WhatsApp"}
                    </div>
                    <p className="vp-palco__motivo">No 2º dia sem resposta, a mensagem para chamar de volta chega aqui e no seu WhatsApp.</p>
                </>
            )}
        </section>
    );
}
