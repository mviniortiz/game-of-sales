// Config consumida tanto pelo runtime React quanto pelo script de prerender
// (scripts/prerender-seo.mjs). Mantenha .js puro para Node ESM importar
// direto sem TS loader. Tipos checados via JSDoc.

/** @type {import('../types').SeoLandingConfig} */
export const crmGamificadoConfig = {
    slug: "crm-gamificado",

    seo: {
        title: "CRM Gamificado para Times Comerciais | Vyzon",
        description:
            "Use metas, ranking ao vivo, pipeline visual e automações para aumentar adesão do time comercial ao CRM e acompanhar performance em tempo real.",
    },

    hero: {
        badge: "CRM gamificado para performance comercial",
        h1: "CRM gamificado para times comerciais que vivem de meta",
        subheadline:
            "Transforme metas, ranking, pipeline e follow-up em uma rotina visual que vendedores realmente acompanham e gestores conseguem medir.",
        microcopy: "Mais adesão. Mais clareza. Menos cobrança manual.",
    },

    pains: {
        eyebrow: "O problema",
        title: "Por que o time não usa o CRM que você comprou?",
        intro:
            "Gamificação não é frescura: é a única forma de criar ritmo comercial diário sem virar cobrador no WhatsApp.",
        items: [
            "O vendedor não atualiza o CRM.",
            "O ranking é feito na planilha.",
            "A meta só aparece no fim do mês.",
            "O gestor não sabe quem precisa de ajuda.",
            "Follow-ups ficam esquecidos.",
            "O time perde ritmo depois dos primeiros dias do mês.",
        ],
    },

    mechanism: {
        eyebrow: "Como funciona",
        title: "Gamificação não é sobre brincar. É sobre criar ritmo comercial.",
        intro:
            "Cada mecanismo da Vyzon dá ao vendedor uma razão visual para abrir o sistema todo dia — e ao gestor uma leitura clara do que está acontecendo.",
        blocks: [
            {
                title: "Ranking ao vivo",
                body: "Cria visibilidade diária. Vendedor vê a posição própria, gestor vê quem está perto da meta e quem está parado.",
            },
            {
                title: "Metas individuais",
                body: "Cada vendedor sabe onde está e quanto falta. Acompanhamento deixa de ser cobrança e vira informação.",
            },
            {
                title: "Pipeline visual",
                body: "Mostra onde a venda travou. Gestor consegue intervir antes do fim do mês, vendedor sabe qual deal mover primeiro.",
            },
            {
                title: "Tarefas e automações",
                body: "Reduzem follow-up esquecido. Cadência criada uma vez, executada toda semana sem depender da memória do time.",
            },
            {
                title: "IA comercial",
                body: "Ajuda vendedor e gestor a entenderem próximos passos. A IA sinaliza deals parados, sugere ação e dá clareza sobre o que priorizar.",
            },
        ],
    },

    comparison: {
        title: "Antes da Vyzon × Com Vyzon",
        without: [
            "Ranking manual",
            "Leads perdidos",
            "CRM ignorado",
            "Gestor sem visibilidade",
            "Follow-up esquecido",
            "Meta acompanhada tarde",
        ],
        withVyzon: [
            "Ranking ao vivo",
            "Pipeline organizado",
            "Rotina mais visual",
            "Performance em tempo real",
            "Alertas e automações",
            "Meta acompanhada todos os dias",
        ],
    },

    integrations: {
        title: "Conectada às plataformas que sua operação já usa",
        body: "Centralize dados, reduza tarefas manuais e conecte sua rotina comercial a checkouts, ferramentas de captura de leads e canais de venda — sem virar mais uma planilha paralela.",
    },

    faq: {
        title: "Perguntas frequentes sobre CRM gamificado",
        items: [
            {
                q: "O que é um CRM gamificado?",
                a: "É um CRM que organiza a rotina comercial em torno de metas, ranking, tarefas e progresso visual. O objetivo não é entreter o time — é criar ritmo, transparência e referência diária para vendedor e gestor.",
            },
            {
                q: "Gamificação funciona para times B2B?",
                a: "Sim. B2B com SDRs, closers e representantes vive de meta, atividade e funil. Ranking ao vivo, metas claras e pipeline visual aumentam adesão ao CRM e dão ao gestor uma leitura honesta da operação, independente do segmento.",
            },
            {
                q: "A Vyzon substitui meu CRM atual?",
                a: "Pode substituir ou pode rodar com integração no que já existe. A maioria dos times migra porque o CRM atual não cria ritmo comercial — só guarda dado. Você importa contatos e deals via CSV e mantém os fluxos críticos.",
            },
            {
                q: "Dá para usar com time pequeno?",
                a: "Faz mais sentido a partir de alguns vendedores, SDRs ou closers, porque ranking e meta dependem de comparação. Times em crescimento já se beneficiam: instala-se uma rotina antes de escalar a operação.",
            },
            {
                q: "O ranking é atualizado em tempo real?",
                a: "Sim. Cada deal movido para 'ganho' atualiza o ranking imediatamente, sem refresh manual. Meta, posição e progresso aparecem no mesmo instante para todo o time.",
            },
            {
                q: "Dá para acompanhar metas individuais e do time?",
                a: "Sim. A Vyzon trabalha com meta individual (por vendedor) e meta consolidada (equipe ou empresa). O gestor enxerga quem está perto, quem está parado e quanto falta para fechar o mês.",
            },
            {
                q: "A gamificação depende de premiação?",
                a: "Não. Premiar é opcional. O efeito principal vem de visibilidade diária: o vendedor sabe onde está, o gestor sabe quem precisa de ajuda e o time enxerga progresso em conjunto. Premiação reforça, mas não é pré-requisito.",
            },
        ],
    },

    finalCta: {
        title: "Veja como a Vyzon pode organizar sua rotina comercial",
        body: "Em uma demonstração rápida, mostramos como metas, ranking, pipeline e automações podem funcionar dentro da sua operação.",
    },

    related: [
        {
            label: "CRM com ranking de vendas ao vivo",
            href: "/crm-com-ranking-de-vendas",
            description:
                "Como acompanhar vendedores, metas e pipeline em tempo real sem depender de planilha ou cobrança no grupo.",
        },
        {
            label: "CRM para times comerciais",
            href: "/crm-para-times-comerciais",
            description:
                "Pipeline visual, metas, ranking, automações e IA para dar mais clareza ao gestor e mais direção ao vendedor.",
        },
    ],
};
