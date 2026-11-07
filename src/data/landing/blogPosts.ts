// Conteúdo do blog (rota /blog). Posts para o ICP do Vyzon: integrador de
// energia solar que vende pelo WhatsApp. Copy orientada a dor, IA enquadrada
// como assistida (a Lume sugere, o dono aprova); sem métricas inventadas
// (números só em exemplo marcado como tal).
//
// FONTE ÚNICA: os posts vivem em blogPosts.content.json, assim o React (aqui) e
// o prerender SEO (scripts/prerender-seo.mjs, Node) leem os mesmos dados. Bloco
// novo aqui = renderBlogBlock novo no prerender, na mesma entrega.
import postsData from "./blogPosts.content.json";

// Bloco do corpo do post. Espelha o shape do JSON.
export type BlogBlock =
    | { type: "p"; text: string }
    | { type: "h2"; text: string }
    | { type: "h3"; text: string }
    | { type: "ul"; items: string[] }
    | { type: "ol"; items: string[] }
    | { type: "quote"; text: string }
    | { type: "example"; title: string; body: string[] }
    // Mensagem pronta de WhatsApp, com botão de copiar.
    | { type: "mensagem"; label?: string; text: string }
    // Prompt para colar no ChatGPT (ou outra IA), com botão de copiar.
    | { type: "prompt"; label?: string; text: string }
    // Quadro da Lume: onde o produto entra no assunto do post, sem botão.
    | { type: "lume"; title: string; text: string }
    // Galeria dos modelos para baixar (prévia + arquivos).
    | { type: "modelos"; items: BlogModelo[] }
    // Tabela de comparação. A 1ª coluna é o nome da linha (th de linha).
    | { type: "tabela"; caption: string; colunas: string[]; linhas: string[][]; nota?: string; destaque?: string }
    // Seletor "qual combina com você": a situação escolhida mostra a indicação.
    | { type: "escolha"; titulo: string; opcoes: BlogOpcao[] }
    // Ficha de um produto comparado: fatos conferidos, onde combina, onde olhar.
    | { type: "ficha"; nome: string; tipo: string; fatos: [string, string][]; combina: string; atencao: string; fonte?: { label: string; href: string }; destaque?: boolean };

export interface BlogOpcao {
    situacao: string;
    indicacao: string;
    porque: string;
    ancora: string; // texto do h2 da seção, vira #âncora
}

export interface BlogModelo {
    titulo: string;
    descricao: string;
    previa: string; // imagem da 1ª página
    arquivos: { label: string; href: string }[];
}

// Capa feita em código com o kit Stageshow (src/vendor/stageshow), sobre um
// fundo chapado do sistema Lume em campo. Os textos são de exemplo.
export type BlogPlate = "sol" | "noite" | "creme" | "azul";
export type BlogCover =
    | { kind: "conversa"; plate: BlogPlate; contato: string; mensagens: { de: "cliente" | "voce"; texto: string }[]; selo?: string }
    | { kind: "aviso"; plate: BlogPlate; cliente: string; resumo: string; texto: string }
    | { kind: "proposta"; plate: BlogPlate; titulo: string; linhas: [string, string][]; destaque: [string, string] }
    | { kind: "lista"; plate: BlogPlate; total: string; itens: { cliente: string; valor: string; estado: "espera" | "ok" | "neutro"; status: string }[] }
    | { kind: "prompt"; plate: BlogPlate; pergunta: string; resposta: string[] }
    | { kind: "comparativo"; plate: BlogPlate; titulo: string; linhas: { nome?: string; status: string; estado: "neutro" | "ok" }[] };

export interface BlogPost {
    slug: string;
    category: BlogCategory;
    date: string; // ISO "2026-06-10"
    updated?: string; // ISO, quando o texto foi revisto
    title: string;
    excerpt: string;
    cover: BlogCover;
    featured?: boolean;
    content: BlogBlock[];
    faq?: { q: string; a: string }[]; // GEO: FAQPage + trecho extraível por IA
    downloads?: { label: string; href: string }[]; // arquivos grátis do post, sem cadastro
}

export const BLOG_CATEGORIES = ["Comercial", "Modelos prontos", "IA e Lume", "Crescimento"] as const;
export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function formatBlogDate(iso: string): string {
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) return iso;
    return `${d} de ${MESES[m - 1]} de ${y}`;
}

// Cast via unknown: o JSON é inferido com tipos literais; BlogPost[] é o contrato.
// Mais recente primeiro (pela data de publicação).
export const BLOG_POSTS: BlogPost[] = (postsData as unknown as BlogPost[])
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));

export function getBlogPost(slug: string): BlogPost | undefined {
    return BLOG_POSTS.find((p) => p.slug === slug);
}

// Id estável de um h2, para o sumário e para link direto (#secao).
export function headingId(text: string): string {
    return text
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 64);
}

// Tempo de leitura estimado (~200 palavras/min), mínimo de 2 min.
export function readMinutes(post: BlogPost): number {
    const count = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
    const words = post.content.reduce((n, b) => {
        switch (b.type) {
            case "ul":
            case "ol":
                return n + count(b.items.join(" "));
            case "example":
                return n + count(b.title + " " + b.body.join(" "));
            case "lume":
                return n + count(b.title + " " + b.text);
            case "modelos":
                return n + count(b.items.map((m) => m.titulo + " " + m.descricao).join(" "));
            case "tabela":
                return n + count([b.caption, ...b.colunas, ...b.linhas.flat(), b.nota ?? ""].join(" "));
            case "escolha":
                return n + count([b.titulo, ...b.opcoes.map((o) => `${o.situacao} ${o.indicacao} ${o.porque}`)].join(" "));
            case "ficha":
                return n + count([b.nome, b.tipo, ...b.fatos.flat(), b.combina, b.atencao].join(" "));
            default:
                return n + count(b.text);
        }
    }, 0);
    return Math.max(2, Math.round(words / 200));
}

// Posts para "Leia também": mesma categoria primeiro, depois os mais recentes.
export function relatedPosts(post: BlogPost, n = 3): BlogPost[] {
    const others = BLOG_POSTS.filter((p) => p.slug !== post.slug);
    const same = others.filter((p) => p.category === post.category);
    const rest = others.filter((p) => p.category !== post.category);
    return [...same, ...rest].slice(0, n);
}
