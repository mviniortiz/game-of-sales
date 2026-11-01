// VENDAS.0 (2026-10-24) — O bot de vendas do time interno (OpenBot) usa o
// próprio Vyzon como CRM das vendas do Vyzon. Docs em docs/distribuicao/openbot.
//
// Regra de uso: lista fria fica no banco do OpenBot; só quem respondeu de
// verdade vira card aqui. Card parado 3 dias faz a Lume sugerir a retomada e
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

// ── Entrada na prospecção do Vyzon (PROSPECT.3) ─────────────────────────────
// O Vendedor traz empresas de nicho novo do Google Maps; elas entram na
// prospecting_allowlist e seguem o fluxo de sempre: lote do dia aprovado pelo
// Markus no WhatsApp, rampa do chip, teto com sinal, um envio por vez.

export type EmpresaParaProspectar = {
    empresa: string;
    cidade: string | null;
    telefone: string;
    nicho: string;
    avaliacoes: number | null;
    estrelas: number | null;
    maps_url: string | null;
    /** Já recebeu a primeira mensagem à mão (pelo mesmo número): entra como enviada,
     *  sem seguimento automático, só para a resposta cair no Vyzon. */
    ja_contatada: boolean;
    /** Quando foi o contato à mão (aaaa-mm-dd). Sem data, conta como ontem: envio de
     *  hoje gastaria o teto do chip. */
    contatada_em: string | null;
};

export function validarEmpresaParaProspectar(input: unknown, nichosAceitos: string[]): Validado<EmpresaParaProspectar> {
    const b = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
    const erros: string[] = [];
    const empresa = campo(b.empresa, 120);
    if (empresa.length < 2) erros.push("empresa obrigatória");
    const telefone = telefoneBR(b.telefone);
    if (!telefone) erros.push("telefone obrigatório (DDD + número)");
    // Celular: 55 + DDD + 9 dígitos começando com 9. Fixo não tem WhatsApp, em geral.
    else if (!(telefone.length === 13 && telefone[4] === "9")) erros.push("só celular entra na prospecção (fixo não tem WhatsApp)");
    const nicho = campo(b.nicho, 60).toLowerCase();
    if (!nichosAceitos.includes(nicho)) erros.push(`nicho sem perfil na prospecção (aceitos: ${nichosAceitos.join(", ")})`);
    const av = b.avaliacoes == null || b.avaliacoes === "" ? null : Number(b.avaliacoes);
    if (av != null && (!Number.isFinite(av) || av < 0)) erros.push("avaliacoes inválido");
    const est = b.estrelas == null || b.estrelas === "" ? null : Number(String(b.estrelas).replace(",", "."));
    if (est != null && (!Number.isFinite(est) || est < 0 || est > 5)) erros.push("estrelas inválido");
    const url = campo(b.maps_url, 500);
    const maps_url = /^https:\/\//.test(url) ? url : null;
    if (erros.length) return { ok: false, erros };
    return {
        ok: true,
        valor: {
            empresa,
            cidade: campo(b.cidade, 80) || null,
            telefone: telefone!,
            nicho,
            avaliacoes: av,
            estrelas: est,
            maps_url,
            ja_contatada: b.ja_contatada === true,
            contatada_em: /^\d{4}-\d{2}-\d{2}$/.test(campo(b.contatada_em, 10)) ? campo(b.contatada_em, 10) : null,
        },
    };
}
