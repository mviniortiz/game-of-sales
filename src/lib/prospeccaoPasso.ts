// Próximo passo de cada integradora da prospecção, a partir do que a Lume leu.
// Puro (sem rede) para teste e para o card do Início.

export type ProspectItem = {
    id: string;
    agency_name: string | null;
    city: string | null;
    status: string;
    reply_kind: string | null;
    replied_at: string | null;
    reply_code: string | null;
    last_reply: string | null;
    reply_draft: string | null;
    meeting_at: string | null;
    sent_at: string | null;
};

export type ProspeccaoHoje = {
    ativo: boolean;
    numero?: string | null;
    desde?: string | null;
    pausado_ate?: string | null;
    lote?: { code: string; status: string; total: number; created_at: string } | null;
    enviados_hoje?: number;
    seguimentos?: number;
    proximo_seguimento?: string | null;
    itens?: ProspectItem[];
};

export type ProximoPasso = { texto: string; agir: boolean };

const DIA_HORA = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** O próximo passo de uma integradora que respondeu, a partir do que a Lume leu. */
export function proximoPasso(item: ProspectItem, agora = new Date()): ProximoPasso {
    if (item.reply_code) {
        return { texto: `Aprovar a resposta no grupo: ${item.reply_code} 1 envia, ${item.reply_code} 2 descarta`, agir: true };
    }
    if (item.meeting_at && new Date(item.meeting_at) > agora) {
        return { texto: `Chamada ${DIA_HORA.format(new Date(item.meeting_at))}`, agir: true };
    }
    switch (item.reply_kind) {
        case "interesse":
            return { texto: "Mostrou interesse: marcar a chamada e oferecer a vaga grátis", agir: true };
        case "duvida":
            return { texto: "Recebeu a explicação. Esperando ela responder", agir: false };
        case "automatico":
            return { texto: "Caiu no atendimento automático. Esperando alguém da empresa", agir: false };
        default:
            return { texto: "Esperando a resposta dela", agir: false };
    }
}

/** Ordem do bloco: o que pede você primeiro, depois o resto pela resposta mais nova. */
export function ordenarItens(itens: ProspectItem[], agora = new Date()): Array<ProspectItem & { passo: ProximoPasso }> {
    return itens
        .map((i) => ({ ...i, passo: proximoPasso(i, agora) }))
        .sort((a, b) => Number(b.passo.agir) - Number(a.passo.agir)
            || (b.replied_at ?? "").localeCompare(a.replied_at ?? ""));
}
