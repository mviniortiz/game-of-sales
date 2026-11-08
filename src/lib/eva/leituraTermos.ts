// O que a Lume procura numa conversa enquanto lê, achado só nas palavras
// escritas. Serve à animação de leitura: ela marca o termo que está na
// mensagem e mostra na etapa certa. Nunca deduz nada além do texto.

export type GrupoTermo = "valor" | "prazo" | "decisao";

export interface Trecho {
    texto: string;
    grupo: GrupoTermo | null;
}

// Fronteira de palavra que entende acento ("à vista", "amanhã"); o \b do JS não entende.
const termo = (...alts: string[]) =>
    new RegExp(`(?<![\\p{L}\\d])(?:${alts.join("|")})(?![\\p{L}\\d])`, "giu");

const PADROES: { grupo: GrupoTermo; re: RegExp }[] = [
    // Dinheiro, consumo e a própria conta de luz.
    { grupo: "valor", re: /R\$\s?\d[\d.,]*(?:\s?mil)?(?![\p{L}\d])|(?<![\p{L}\d])\d[\d.,]*\s?kwp?h?(?![\p{L}\d])|(?<![\p{L}\d])(?:conta de luz|fatura)(?![\p{L}\d])/giu },
    // Quando e como paga.
    { grupo: "prazo", re: termo("amanh[ãa]", "semana que vem", "pr[óo]xim[ao] (?:semana|m[êe]s)", "m[êe]s que vem", "essa semana", "parcel\\p{L}*", "financi\\p{L}*", "entrada", "[àa] vista") },
    // Se quer fechar ou travou.
    { grupo: "decisao", re: termo("quero", "fechar", "fechamos", "pode mandar", "vamos fazer", "caro", "vou pensar", "pensar melhor", "desconto", "outro or[çc]amento", "concorr\\p{L}+") },
];

/** Quebra o texto em trechos, marcando os que a Lume procura. */
export function marcarTermos(texto: string): Trecho[] {
    const achados: { ini: number; fim: number; grupo: GrupoTermo }[] = [];
    for (const { grupo, re } of PADROES) {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(texto))) {
            const ini = m.index;
            const fim = ini + m[0].length;
            if (!achados.some((a) => ini < a.fim && fim > a.ini)) achados.push({ ini, fim, grupo });
        }
    }
    achados.sort((a, b) => a.ini - b.ini);
    const out: Trecho[] = [];
    let pos = 0;
    for (const a of achados) {
        if (a.ini > pos) out.push({ texto: texto.slice(pos, a.ini), grupo: null });
        out.push({ texto: texto.slice(a.ini, a.fim), grupo: a.grupo });
        pos = a.fim;
    }
    if (pos < texto.length) out.push({ texto: texto.slice(pos), grupo: null });
    return out;
}

/** Termos achados por grupo, sem repetir (ignora maiúsculas), na ordem em que aparecem. */
export function termosPorGrupo(textos: string[]): Record<GrupoTermo, string[]> {
    const out: Record<GrupoTermo, string[]> = { valor: [], prazo: [], decisao: [] };
    for (const t of textos) {
        for (const tr of marcarTermos(t)) {
            if (!tr.grupo) continue;
            const lista = out[tr.grupo];
            if (!lista.some((x) => x.toLowerCase() === tr.texto.toLowerCase())) lista.push(tr.texto);
        }
    }
    return out;
}
