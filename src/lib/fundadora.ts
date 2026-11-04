// As 10 primeiras integradoras que conectam o WhatsApp usam a Lume sem cobrança
// (conceder_fundadora, migration 20261104_fundadoras_sozinhas.sql). Aqui só o
// texto, para o Raio-X, o relatório, o placar e o /upgrade dizerem a mesma coisa.

export type VagaFundadora = {
    fundadora: boolean;
    numero: number | null;
    vagas_restantes: number;
    limite: number;
};

/** Lê a resposta da RPC minha_vaga_fundadora; qualquer coisa estranha vira "não é fundadora". */
export function lerVaga(data: unknown): VagaFundadora | null {
    if (!data || typeof data !== "object") return null;
    const d = data as Record<string, unknown>;
    const numero = typeof d.numero === "number" && d.numero > 0 ? d.numero : null;
    const limite = typeof d.limite === "number" && d.limite > 0 ? d.limite : 10;
    const restantes = typeof d.vagas_restantes === "number" ? Math.max(0, Math.min(limite, d.vagas_restantes)) : 0;
    return { fundadora: d.fundadora === true && numero !== null, numero, vagas_restantes: restantes, limite };
}

/** "Você é a 3ª das 10 primeiras. A Lume está liberada pra sempre, sem cobrança." */
export function fraseFundadora(numero: number, limite = 10): string {
    return `Você é a ${numero}ª das ${limite} primeiras. A Lume está liberada pra sempre, sem cobrança.`;
}

/**
 * O que o /upgrade diz sobre as vagas para quem ainda não é fundadora. Só fala
 * da oferta quando ela ainda vale para essa conta: com vaga e sem o WhatsApp
 * conectado (quem conectou e não ganhou ficou de fora por regra, e prometer de
 * novo seria mentira).
 */
export function ofertaFundadora(vaga: VagaFundadora | null, conectado: boolean): string | null {
    if (!vaga || vaga.fundadora || conectado || vaga.vagas_restantes <= 0) return null;
    const restam = vaga.vagas_restantes === 1 ? "Resta 1 vaga" : `Restam ${vaga.vagas_restantes} vagas`;
    return `As ${vaga.limite} primeiras integradoras que conectam o WhatsApp usam a Lume sem cobrança. ${restam}.`;
}
