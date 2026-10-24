// VENDAS.0 (2026-10-24) — O bot de vendas do time interno (OpenBot) usa o
// próprio Vyzon como CRM das vendas do Vyzon. Docs em docs/distribuicao/openbot.
//
// Regra de uso: lista fria fica no banco do OpenBot; só quem respondeu de
// verdade vira card aqui. Card parado 3 dias faz a EVA sugerir a retomada e
// pedir aprovação ao Markus no WhatsApp; card para cada contato frio viraria
// uma enxurrada de aprovações.
//
// O bot cria card, move etapa e anota. Não envia mensagem, não apaga card e não
// marca venda ganha (closed_won é do Markus).
//
// Sem nada de Deno: valida nos testes do front (Node) e na edge.

export const ETAPAS_BOT = ["lead", "qualification", "proposal", "negotiation", "closed_lost"] as const;
export type EtapaBot = typeof ETAPAS_BOT[number];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function campo(value: unknown, max: number): string {
    return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Celular ou fixo BR em formato internacional, só dígitos. Null se não der. */
export function telefoneBR(raw: unknown): string | null {
    const texto = String(raw ?? "").trim();
    let d = texto.replace(/\D/g, "");
    if (!d) return null;
    // Com "+" na frente o código do país já veio: só serve se for 55.
    if (texto.startsWith("+") && !d.startsWith("55")) return null;
    if (d.length === 10 || d.length === 11) d = `55${d}`;
    if (!d.startsWith("55") || d.length < 12 || d.length > 13) return null;
    return d;
}

export type NovoCard = {
    empresa: string;
    cidade: string | null;
    telefone: string;
    nicho: string;
    contato: string | null;
    etapa: EtapaBot;
    nota: string;
};

export type Validado<T> = { ok: true; valor: T } | { ok: false; erros: string[] };

export function validarNovoCard(input: unknown): Validado<NovoCard> {
    const b = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
    const erros: string[] = [];
    const empresa = campo(b.empresa, 120);
    if (empresa.length < 2) erros.push("empresa obrigatória");
    const telefone = telefoneBR(b.telefone);
    if (!telefone) erros.push("telefone comercial obrigatório (DDD + número)");
    const nicho = campo(b.nicho, 60);
    if (!nicho) erros.push("nicho obrigatório");
    const etapa = (campo(b.etapa, 20) || "qualification") as EtapaBot;
    if (!ETAPAS_BOT.includes(etapa) || etapa === "closed_lost") {
        erros.push("etapa de card novo: lead, qualification, proposal ou negotiation");
    }
    const nota = campo(b.nota, 1500);
    if (nota.length < 10) erros.push("nota obrigatória: o que a pessoa disse e por que vira card");
    if (erros.length) return { ok: false, erros };
    return {
        ok: true,
        valor: {
            empresa,
            cidade: campo(b.cidade, 80) || null,
            telefone: telefone!,
            nicho,
            contato: campo(b.contato, 80) || null,
            etapa,
            nota,
        },
    };
}

export type Atualizacao = {
    deal_id: string;
    etapa: EtapaBot | null;
    nota: string | null;
    motivo_perda: string | null;
};

export function validarAtualizacao(input: unknown): Validado<Atualizacao> {
    const b = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
    const erros: string[] = [];
    const deal_id = campo(b.deal_id, 40);
    if (!UUID.test(deal_id)) erros.push("deal_id inválido");
    const etapaRaw = campo(b.etapa, 20);
    let etapa: EtapaBot | null = null;
    if (etapaRaw) {
        if (etapaRaw === "closed_won") erros.push("venda ganha é marcada pelo Markus, não pelo bot");
        else if (!ETAPAS_BOT.includes(etapaRaw as EtapaBot)) erros.push(`etapa inválida (use: ${ETAPAS_BOT.join(", ")})`);
        else etapa = etapaRaw as EtapaBot;
    }
    const nota = campo(b.nota, 1500) || null;
    const motivo_perda = campo(b.motivo_perda, 300) || null;
    if (etapa === "closed_lost" && !motivo_perda) erros.push("closed_lost exige motivo_perda");
    if (!etapa && !nota) erros.push("mande etapa, nota ou as duas");
    if (erros.length) return { ok: false, erros };
    return { ok: true, valor: { deal_id, etapa, nota, motivo_perda } };
}

/** Nota nova no topo, com data e autor, sem perder o histórico. */
export function anexarNota(notasAtuais: string | null | undefined, nota: string, agora = new Date()): string {
    const data = agora.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });
    const linha = `[${data} bot de vendas] ${nota}`;
    const resto = String(notasAtuais || "").trim();
    return (resto ? `${linha}\n${resto}` : linha).slice(0, 8000);
}
