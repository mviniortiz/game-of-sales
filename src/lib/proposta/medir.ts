import { APP_EVENTS, contarDaEmpresa, trackApp, trackPrimeiroDaEmpresa } from "@/lib/appAnalytics";

// Proposta gerada dentro do app (não confundir com o gerador público, que mede
// em landing_events). `proposal_generated` sai a cada proposta; a primeira da
// empresa também dispara `first_proposal_generated`, o marco de ativação.
// Só números e o lugar: nada do cliente nem dos itens entra aqui.
export function medirPropostaGerada(o: { origem: "editor" | "produtos_do_negocio"; itens: number; valor: number; pdf: boolean }) {
    trackApp(APP_EVENTS.PROPOSAL_GENERATED, { origem: o.origem, itens: o.itens, valor: Math.round(o.valor), pdf: o.pdf });
    void trackPrimeiroDaEmpresa(APP_EVENTS.FIRST_PROPOSAL_GENERATED, () => contarDaEmpresa("proposals"), { origem: o.origem });
}
