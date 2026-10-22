// DIST.0 (2026-10-22) — Rascunho do time interno de distribuição
// (docs/distribuicao/time-de-bots.md).
//
// Ferramenta para gerir e crescer o Vyzon, não feature de cliente. Os agentes
// do OpenBot entregam post, anúncio, abordagem de parceiro e copy da
// prospecção pela edge distribuicao-inbox. O rascunho fica em
// distribuicao_rascunhos, separado da fila da EVA, e o Markus decide no
// WhatsApp com código próprio (D + letra + dígito). Aprovar não publica nada.
//
// Sem nada de Deno: validador, código e texto do aviso rodam nos testes do
// front (Node) e nas edges.

export const AGENTES = ["analista", "prospeccao", "parcerias", "conteudo", "criativos", "midia"] as const;
export type Agente = typeof AGENTES[number];

export const CANAIS = ["instagram", "blog", "meta_ads", "google_ads", "parceiro", "prospeccao_copy"] as const;
export type Canal = typeof CANAIS[number];

export const ACOES = ["manual", "merge_pr", "ads_apply"] as const;
export type Acao = typeof ACOES[number];

/** Todo aviso e toda resposta do time começa assim. Quando volta pelo webhook
 *  (chat do Markus com ele mesmo), o webhook descarta antes de qualquer
 *  leitura de comando: sem isso o aviso viraria "texto corrigido" de um
 *  rascunho da EVA. */
export const DIST_PREFIX = "DISTRIBUIÇÃO";

const ROTULO_CANAL: Record<Canal, string> = {
    instagram: "Instagram",
    blog: "Blog",
    meta_ads: "Anúncio Meta",
    google_ads: "Google Ads",
    parceiro: "Parceiro",
    prospeccao_copy: "Copy da prospecção",
};

export function rotuloCanal(canal: string): string {
    return ROTULO_CANAL[canal as Canal] ?? canal;
}

/** Avisos do time entregues ao Markus a cada 24h. */
export const TETO_AVISOS_DIA_PADRAO = 3;
/** Rascunhos que um mesmo agente pode entregar a cada 24h. */
export const TETO_POR_AGENTE_DIA = 3;
/** Rascunhos abertos ao mesmo tempo. Acima disso o resto expiraria sem leitura. */
export const MAX_PENDENTES = 10;
/** Rascunho velho não vale: post e anúncio dependem da semana em que foram escritos. */
export const MAX_IDADE_HORAS = 48;
/** Tentativas de aviso antes de desistir (número caído). */
export const MAX_TENTATIVAS = 5;

export type RascunhoDistribuicao = {
    agente: Agente;
    canal: Canal;
    titulo: string;
    texto: string;
    por_que_agora: string | null;
    anexo_url: string | null;
    acao_apos_aprovar: Acao;
    alvo: Record<string, unknown> | null;
};

// Regras de copy do CLAUDE.md. A edge recusa em vez de corrigir: o agente
// aprende com a recusa e o Markus nunca recebe texto fora da regra.
const TRAVESSAO = /[\u2013\u2014]/;
const EMOJI = /\p{Extended_Pictographic}/u;
const FRASES_PROIBIDAS = [
    "automatize suas vendas",
    "robo que vende sozinho",
    "crm gamificado",
    "vende sozinho",
];

function semAcento(value: string): string {
    return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Motivos pelos quais um texto não pode ir para o público. Vazio = pode. */
export function problemasDeCopy(texto: string): string[] {
    const problemas: string[] = [];
    if (TRAVESSAO.test(texto)) problemas.push("tem travessão");
    if (EMOJI.test(texto)) problemas.push("tem emoji");
    const plano = semAcento(texto);
    for (const frase of FRASES_PROIBIDAS) {
        if (plano.includes(frase)) problemas.push(`frase proibida: "${frase}"`);
    }
    return problemas;
}

function campo(value: unknown, max: number): string {
    return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function urlHttps(value: unknown): string | null {
    const s = campo(value, 1000);
    if (!s) return null;
    try {
        const u = new URL(s);
        return u.protocol === "https:" ? u.toString() : null;
    } catch {
        return null;
    }
}

export type Validacao =
    | { ok: true; rascunho: RascunhoDistribuicao }
    | { ok: false; erros: string[] };

/** Confere o que o agente mandou. `alvo` é só dado para o executor e nunca vai
 *  para o público. O texto chega em `message_text` (nome do contrato do doc). */
export function validarRascunho(input: unknown): Validacao {
    const b = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
    const erros: string[] = [];

    const agente = campo(b.agente, 40) as Agente;
    if (!AGENTES.includes(agente)) erros.push(`agente inválido (use: ${AGENTES.join(", ")})`);

    const canal = campo(b.canal, 40) as Canal;
    if (!CANAIS.includes(canal)) erros.push(`canal inválido (use: ${CANAIS.join(", ")})`);

    const acao = (campo(b.acao_apos_aprovar, 40) || "manual") as Acao;
    if (!ACOES.includes(acao)) erros.push(`acao_apos_aprovar inválida (use: ${ACOES.join(", ")})`);
    if (acao === "merge_pr" && canal !== "blog" && canal !== "prospeccao_copy") {
        erros.push("merge_pr só vale para blog e prospeccao_copy");
    }
    if (acao === "ads_apply" && canal !== "google_ads" && canal !== "meta_ads") {
        erros.push("ads_apply só vale para google_ads e meta_ads");
    }

    const titulo = campo(b.titulo, 120);
    if (titulo.length < 4) erros.push("titulo obrigatório (4 a 120 caracteres)");

    const texto = campo(b.message_text, 3000);
    if (texto.length < 10) erros.push("message_text obrigatório (10 a 3000 caracteres)");

    const porQue = campo(b.por_que_agora, 240) || null;

    let anexo: string | null = null;
    if (b.anexo_url != null && b.anexo_url !== "") {
        anexo = urlHttps(b.anexo_url);
        if (!anexo) erros.push("anexo_url precisa ser https");
    }

    let alvo: Record<string, unknown> | null = null;
    if (b.alvo != null) {
        if (typeof b.alvo !== "object" || Array.isArray(b.alvo)) erros.push("alvo precisa ser objeto");
        else if (JSON.stringify(b.alvo).length > 4000) erros.push("alvo grande demais");
        else alvo = b.alvo as Record<string, unknown>;
    }
    if (acao !== "manual" && !alvo) erros.push(`${acao} exige alvo`);

    for (const [nome, valor] of [["titulo", titulo], ["message_text", texto], ["por_que_agora", porQue ?? ""]] as const) {
        for (const p of problemasDeCopy(valor)) erros.push(`${nome}: ${p}`);
    }

    if (erros.length > 0) return { ok: false, erros };
    return {
        ok: true,
        rascunho: { agente, canal, titulo, texto, por_que_agora: porQue, anexo_url: anexo, acao_apos_aprovar: acao, alvo },
    };
}

// ── Código ──────────────────────────────────────────────────────────────────

// D + letra + dígito. Três caracteres: o parser da EVA só reconhece letra +
// dígito (A2) e a prospecção usa P + letra + dígito (PK4), então um "DK4 1"
// nunca resolve rascunho de outro fluxo. Sem I, O, 0 e 1 pelo mesmo motivo da
// EVA: o Markus digita de memória.
const LETRAS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITOS = "23456789";

export function proximoCodigo(emUso: Iterable<string>): string {
    const usados = new Set(Array.from(emUso, (c) => String(c).toUpperCase()));
    for (const letra of LETRAS) {
        for (const digito of DIGITOS) {
            const codigo = `D${letra}${digito}`;
            if (!usados.has(codigo)) return codigo;
        }
    }
    throw new Error("sem codigo livre para distribuicao");
}

// ── Resposta do Markus ──────────────────────────────────────────────────────

const APROVAR = new Set(["1", "ok", "sim", "s", "aprova", "aprovar", "aprovado", "pode", "manda", "vai"]);
const DESCARTAR = new Set(["2", "nao", "n", "descarta", "descartar", "cancela", "cancelar", "pula", "pular"]);

export type ComandoDistribuicao =
    | { codigo: string; intent: "aprovar" | "descartar" | "ajuda" }
    | { codigo: string; intent: "corrigir"; texto: string };

/** Só reconhece mensagem que começa com um código D (DK4, [DK4], DK4:). O
 *  resto devolve null e segue para os fluxos da EVA e da prospecção intactos. */
export function parseComandoDistribuicao(raw: string): ComandoDistribuicao | null {
    const texto = String(raw || "").trim();
    const m = texto.match(/^\[?(d[a-hj-np-z][2-9])\]?(?=$|[\s,.:;-])[\s,.:;-]*/i);
    if (!m) return null;
    const codigo = m[1].toUpperCase();
    const resto = texto.slice(m[0].length).trim();
    const chave = semAcento(resto).replace(/[.!]+$/, "").trim();
    if (!chave) return { codigo, intent: "ajuda" };
    if (APROVAR.has(chave)) return { codigo, intent: "aprovar" };
    if (DESCARTAR.has(chave)) return { codigo, intent: "descartar" };
    if (resto.length >= 12) return { codigo, intent: "corrigir", texto: resto };
    return { codigo, intent: "ajuda" };
}

// ── Textos para o Markus ────────────────────────────────────────────────────

export function textoDoAviso(p: {
    codigo: string;
    canal: string;
    titulo: string;
    porQue: string | null;
    texto: string;
    anexoUrl: string | null;
}): string {
    const linhas = [`${DIST_PREFIX} [${p.codigo}] ${rotuloCanal(p.canal)}`, p.titulo, ""];
    if (p.porQue) linhas.push(`Por que agora: ${p.porQue}`, "");
    linhas.push(p.texto);
    if (p.anexoUrl) linhas.push("", `Ver: ${p.anexoUrl}`);
    linhas.push(
        "",
        "Aprovar não publica nada.",
        `Responda ${p.codigo} 1 para aprovar, ${p.codigo} 2 para descartar, ou ${p.codigo} seguido do texto corrigido.`,
    );
    return linhas.join("\n");
}

/** O que acontece depois do 1, para a confirmação. */
export function proximoPasso(acao: string | null | undefined): string {
    if (acao === "merge_pr") return "O PR fica marcado como aprovado para merge.";
    if (acao === "ads_apply") return "A mudança fica marcada como aprovada para aplicar na campanha.";
    return "Publicar fica com você, com o texto aprovado.";
}
