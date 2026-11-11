// As 3 landings de proposta de energia solar (gerador em PDF, planilha em Excel
// e modelo em Word) e o post do blog que liga nelas.
//
// FONTE ÚNICA: os textos vivem em propostaLandings.content.json, lido aqui pelo
// React e por scripts/prerender-seo.mjs (o HTML que o Google lê). Mudou o texto
// num lugar, mudou nos dois.
import data from "./propostaLandings.content.json";

export interface PropostaSecao {
    h2: string;
    p?: string[];
    ol?: string[];
    ul?: string[];
}

export interface PropostaLanding {
    slug: string;
    formato: string; // nome curto no cartão de "Outros formatos"
    rodape: string; // nome do link no rodapé da home, que não tem o contexto "proposta"
    cartao: string; // uma linha sobre o que a página entrega
    seoTitle: string; // <title>, até 60 caracteres, palavra-chave na frente
    seoDescription: string; // meta description, até 155 caracteres
    kicker: string;
    h1: string;
    sub: string;
    arquivos?: { label: string; href: string }[];
    previa?: { src: string; alt: string };
    secoes: PropostaSecao[];
    atalho?: { texto: string; label: string; href: string };
    faq: { q: string; a: string }[];
}

export interface PropostaAtalho {
    href: string;
    formato: string;
    cartao: string;
}

export const PROPOSTA_LANDINGS = data.landings as PropostaLanding[];
export const PROPOSTA_POST = data.post as PropostaAtalho;

export function getPropostaLanding(slug: string): PropostaLanding {
    const l = PROPOSTA_LANDINGS.find((x) => x.slug === slug);
    if (!l) throw new Error(`Landing de proposta desconhecida: ${slug}`);
    return l;
}

// "Outros formatos": as outras landings e o post do blog. Toda landing liga em
// todas as outras e no post, e o post liga de volta (bloco "atalhos").
export function outrosFormatos(slug: string): PropostaAtalho[] {
    return [
        ...PROPOSTA_LANDINGS.filter((l) => l.slug !== slug).map((l) => ({ href: `/${l.slug}`, formato: l.formato, cartao: l.cartao })),
        PROPOSTA_POST,
    ];
}
