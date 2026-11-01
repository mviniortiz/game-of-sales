// Pedem você: a fila do dia, uma linha por coisa. Resolver e adiar ficam na própria
// linha; responder leva à conversa.
import { useNavigate } from "react-router-dom";
import { CalendarBlank, CaretRight, Check, Clock, Receipt, WhatsappLogo, type Icon } from "@phosphor-icons/react";
import type { DailyPriority } from "@/hooks/useCommandCenterData";
import type { QuoteItem } from "@/hooks/useQuoteBoard";
import { brl, quoteName, stateLine } from "@/lib/quoteText";
import { Collapse } from "@/vendor/stageshow/motion/Collapse";

const MAX_LINHAS = 5;

const ICONE: Record<DailyPriority["source"], Icon> = {
    conversation: WhatsappLogo,
    deal: Receipt,
    eva: Receipt,
    calendar: CalendarBlank,
};

type Linha = {
    id: string;
    titulo: string;
    detalhe: string;
    acao: string;
    href: string | null;
    Icone: Icon;
    sol: boolean;
    prioridade?: string;
};

function daPrioridade(p: DailyPriority): Linha {
    return {
        id: p.id,
        titulo: p.contactName ? `${p.contactName} ${p.source === "conversation" ? "espera resposta" : ""}`.trim() : p.title,
        detalhe: p.description || p.reason,
        acao: p.actionLabel,
        href: p.href,
        Icone: ICONE[p.source],
        sol: p.priority === "critical" || p.priority === "high",
        prioridade: p.id,
    };
}

function doOrcamento(q: QuoteItem): Linha {
    return {
        id: q.id,
        titulo: `${quoteName(q)} espera resposta`,
        detalhe: q.amount != null ? `${stateLine(q)} · ${brl(q.amount)}` : stateLine(q),
        acao: "Responder",
        href: q.conversation_id ? `/inbox?conversationId=${q.conversation_id}` : q.deal_id ? `/deals/${q.deal_id}` : null,
        Icone: WhatsappLogo,
        sol: false,
    };
}

export function PedemVoce({
    prioridades,
    orcamentos,
    carregando,
    diaResolvido,
    aoResolver,
    aoAdiar,
}: {
    prioridades: DailyPriority[];
    orcamentos: QuoteItem[];
    carregando: boolean;
    diaResolvido: boolean;
    aoResolver: (id: string) => void;
    aoAdiar: (id: string) => void;
}) {
    const navigate = useNavigate();
    const cobertas = new Set(prioridades.map((p) => p.conversationId).filter(Boolean));
    const linhas = [
        ...prioridades.map(daPrioridade),
        ...orcamentos.filter((q) => q.state === "your_turn" && !(q.conversation_id && cobertas.has(q.conversation_id))).map(doOrcamento),
    ].slice(0, MAX_LINHAS);

    return (
        <section className="vp-lista" aria-label="Pedem você">
            <div className="vp-rotulo">Pedem você</div>
            {carregando ? (
                <div className="vp-vazio" aria-busy="true">Carregando sua fila</div>
            ) : linhas.length === 0 ? (
                <div className="vp-vazio">
                    {diaResolvido ? "Você resolveu tudo o que tinha para hoje." : "Nada esperando por você agora."}
                </div>
            ) : (
                linhas.map((l) => (
                    <Collapse key={l.id} open>
                        <div className="vp-linha">
                            <span className="vp-linha__tile" data-tom={l.sol ? "sol" : undefined}>
                                <l.Icone size={18} weight="fill" aria-hidden />
                            </span>
                            <span className="vp-linha__meio">
                                <b>{l.titulo}</b>
                                <span>{l.detalhe}</span>
                            </span>
                            {l.prioridade && (
                                <span className="vp-linha__acoes">
                                    <button type="button" className="vp-mini" aria-label={`Marcar ${l.titulo} como resolvido`} onClick={() => aoResolver(l.id)}>
                                        <Check size={15} weight="bold" aria-hidden />
                                    </button>
                                    <button type="button" className="vp-mini" aria-label={`Adiar ${l.titulo} para amanhã`} onClick={() => aoAdiar(l.id)}>
                                        <Clock size={15} weight="bold" aria-hidden />
                                    </button>
                                </span>
                            )}
                            {l.href && (
                                <button type="button" className="vp-linha__fim" onClick={() => navigate(l.href!)}>
                                    {l.acao}
                                    <CaretRight size={14} weight="bold" aria-hidden />
                                </button>
                            )}
                        </div>
                    </Collapse>
                ))
            )}
        </section>
    );
}
