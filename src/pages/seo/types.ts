// Schema da config usada por SeoLandingPage. Tipagem deliberadamente plana
// pra cada landing SEO ser um arquivo de dados curto (sem JSX), facilitando
// criação/edição de novas páginas sem mexer no componente render.
//
// Toda página deve respeitar:
//  - slug único e canonical em https://vyzon.com.br/<slug>;
//  - H1 único (não usar <h1> em outros lugares dentro do componente);
//  - CTAs apontam pra rotas/âncoras reais que já existem no projeto.

export type SeoLandingConfig = {
    slug: string;

    seo: {
        title: string;
        description: string;
        ogTitle?: string;
        ogDescription?: string;
    };

    hero: {
        badge: string;
        h1: string;
        subheadline: string;
        microcopy: string;
    };

    pains: {
        eyebrow?: string;
        title: string;
        intro?: string;
        items: string[];
    };

    mechanism: {
        eyebrow?: string;
        title: string;
        intro?: string;
        blocks: { title: string; body: string }[];
    };

    comparison: {
        title: string;
        without: string[];
        withVyzon: string[];
    };

    integrations: {
        title: string;
        body: string;
    };

    faq: {
        title: string;
        items: { q: string; a: string }[];
    };

    finalCta: {
        title: string;
        body: string;
    };

    related: { label: string; href: string; description: string }[];
};
