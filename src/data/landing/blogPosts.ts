// Conteúdo do blog da landing (v2). Posts voltados pro ICP da Vyzon: agências
// que vendem por conversa. Capas geradas em CSS (sem assets). Copy orientada a
// dor/conversa, IA enquadrada como assistida; sem métricas inventadas.
//
// FONTE ÚNICA: os posts vivem em blogPosts.content.json — assim o React (aqui) e
// o prerender SEO (scripts/prerender-seo.mjs, Node) leem exatamente os mesmos
// dados, sem risco de drift. Editar o conteúdo => editar o JSON.
import postsData from "./blogPosts.content.json";

// Bloco de conteúdo do corpo do post. Estrutura rica (subtítulos, listas, citação)
// pra artigos extensos e bons de SEO (H2 reais). Espelha o shape do JSON.
export type BlogBlock =
    | { type: "p"; text: string }
    | { type: "h2"; text: string }
    | { type: "h3"; text: string }
    | { type: "ul"; items: string[] }
    | { type: "ol"; items: string[] }
    | { type: "quote"; text: string }
    | { type: "example"; title: string; body: string[] };

export interface BlogPost {
    slug: string;
    category: string;
    date: string; // ISO "2026-06-10"
    title: string;
    excerpt: string;
    coverText: string; // frase grande na capa
    accent: string; // cor de acento da capa
    featured?: boolean;
    content: BlogBlock[]; // corpo em blocos
    faq?: { q: string; a: string }[]; // perguntas frequentes (GEO: FAQPage + trecho extraível por IA)
}

export const BLOG_CATEGORIES = ["Crescimento", "Comercial", "Produto"] as const;

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function formatBlogDate(iso: string): string {
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) return iso;
    return `${d} de ${MESES[m - 1]} de ${y}`;
}

// Cast via unknown: o JSON é inferido com tipos literais; BlogPost[] é o contrato.
export const BLOG_POSTS: BlogPost[] = postsData as unknown as BlogPost[];

export function getBlogPost(slug: string): BlogPost | undefined {
    return BLOG_POSTS.find((p) => p.slug === slug);
}

// Tempo de leitura estimado (~200 palavras/min), mínimo de 2 min.
export function readMinutes(post: BlogPost): number {
    const count = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
    const words = post.content.reduce((n, b) => {
        if (b.type === "ul" || b.type === "ol") return n + count(b.items.join(" "));
        if (b.type === "example") return n + count(b.title + " " + b.body.join(" "));
        return n + count(b.text);
    }, 0);
    return Math.max(2, Math.round(words / 200));
}
