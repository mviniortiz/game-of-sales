// Conteúdo do blog da landing (v2). Posts voltados pro ICP da Vyzon: agências
// que vendem por conversa. Capas geradas em CSS (sem assets). Copy orientada a
// dor/conversa, IA enquadrada como assistida; sem métricas inventadas.

export interface BlogPost {
    slug: string;
    category: string;
    date: string; // ISO "2026-06-10"
    title: string;
    excerpt: string;
    coverText: string; // frase grande na capa
    accent: string; // cor de acento da capa
    featured?: boolean;
    body: string[]; // parágrafos
}

export const BLOG_CATEGORIES = ["Crescimento", "Comercial", "Produto"] as const;

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function formatBlogDate(iso: string): string {
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) return iso;
    return `${d} de ${MESES[m - 1]} de ${y}`;
}

export const BLOG_POSTS: BlogPost[] = [
    {
        slug: "pare-de-perder-leads-no-whatsapp",
        category: "Comercial",
        date: "2026-06-11",
        title: "Pare de perder leads no WhatsApp: o custo do follow-up esquecido",
        excerpt: "Cada conversa que fica sem resposta no WhatsApp é uma oportunidade esfriando. Veja onde o vazamento acontece e como fechar a torneira sem contratar mais gente.",
        coverText: "Quem não responde, não vende.",
        accent: "#1556C0",
        featured: true,
        body: [
            "Na maioria das agências, o lead não some por falta de demanda. Ele some no intervalo entre a mensagem que chegou e a resposta que demorou. Um \"depois eu respondo\" vira um dia, o dia vira a semana, e quando alguém lembra a conversa já esfriou.",
            "O WhatsApp é ótimo pra conversar e péssimo pra organizar. As conversas se misturam, o follow-up depende da memória de quem está com o celular na mão, e o pipeline raramente reflete o que de fato aconteceu no atendimento.",
            "O ponto não é responder mais rápido a qualquer custo, é nunca deixar uma conversa que importa cair no esquecimento. Pra isso, alguém (ou algo) precisa estar lendo tudo o tempo todo e apontando o que precisa de atenção agora.",
            "É aqui que a EVA entra: ela acompanha cada atendimento, identifica quem está pronto pra avançar e sugere o próximo passo. O time aprova e a oportunidade segue no pipeline. A decisão continua sendo de um humano, mas nada importante passa batido.",
            "Não é sobre automatizar a venda. É sobre garantir que o trabalho que você já faz não vaze pelas frestas do dia a dia.",
        ],
    },
    {
        slug: "sdr-humano-vs-eva",
        category: "Crescimento",
        date: "2026-06-04",
        title: "SDR humano vs EVA: a comparação honesta para agências",
        excerpt: "Contratar alguém só pra qualificar os leads que chegam é uma das decisões mais caras de uma agência pequena. Aqui está a conta e o que faz sentido em cada caso.",
        coverText: "Qualificar é trabalho. Não precisa ser só humano.",
        accent: "#0E9DA8",
        body: [
            "Toda agência chega num ponto em que o dono não dá conta de responder, qualificar e ainda fechar. A reação natural é contratar um SDR pra filtrar o que chega. Faz sentido, mas tem um custo que vai além do salário.",
            "Um SDR precisa de tempo pra rampar, de um playbook que quase nunca está escrito, e de supervisão pra não qualificar errado. Enquanto isso, os leads continuam chegando a qualquer hora, inclusive quando ninguém está de plantão.",
            "A EVA não substitui o julgamento de um bom vendedor, mas faz a parte repetitiva muito bem: lê cada conversa, detecta orçamento, urgência e intenção, e organiza quem merece atenção primeiro. Tudo como sugestão, pra um humano aprovar.",
            "Na prática, a pergunta não é \"SDR ou EVA\". É: o que você quer que uma pessoa faça com o tempo dela? Quase sempre a resposta é conversar com quem está pronto, não triar caixa de entrada.",
            "Comece deixando a EVA qualificar e priorizar. Quando o volume justificar um humano, ele entra pra fechar, não pra apagar incêndio.",
        ],
    },
    {
        slug: "seu-lead-ja-decidiu",
        category: "Crescimento",
        date: "2026-05-21",
        title: "Seu lead já decidiu antes de te chamar no WhatsApp",
        excerpt: "Em 2026, o cliente pesquisa, compara e quase escolhe antes da primeira mensagem. O que isso muda no seu funil e como chegar preparado na conversa.",
        coverText: "A conversa começa antes do \"oi\".",
        accent: "#7C3AED",
        body: [
            "O comportamento de compra mudou. Antes de te chamar, o lead já viu seu conteúdo, comparou com concorrentes e formou uma primeira opinião. Quando a mensagem chega, ele não está no começo da jornada, está no meio.",
            "Isso significa que respostas genéricas e demoradas custam caro. Quem chega na conversa sem contexto trata um lead quente como se fosse frio, e perde a janela.",
            "O que separa quem fecha de quem perde é entrar na conversa já entendendo o que aquele lead quer. Histórico, intenção, temperatura. Não pra roteirizar, mas pra responder como alguém que prestou atenção.",
            "A EVA lê o atendimento e entrega esse contexto pro time antes da resposta sair. O vendedor revisa, ajusta e envia. A conversa flui como se a agência tivesse memória, porque agora ela tem.",
            "Aparecer na hora certa, com a resposta certa, é o novo diferencial. E ele se constrói na conversa, não no anúncio.",
        ],
    },
    {
        slug: "central-comercial-para-agencias",
        category: "Produto",
        date: "2026-05-07",
        title: "Por que agências que vendem por conversa precisam de uma central comercial",
        excerpt: "Planilha, WhatsApp e memória não escalam. Como uma central comercial com IA organiza o atendimento sem tirar o controle do seu time.",
        coverText: "Uma central. Não mais um chatbot.",
        accent: "#E0703A",
        body: [
            "Muita agência diz que tem CRM, mas na real opera com planilha, grupo de WhatsApp e a memória de quem está mais próximo do cliente. Funciona até o volume crescer, e aí começa a vazar.",
            "Uma central comercial junta num lugar só as conversas dos canais, o que cada lead quer e em que estágio está. Não pra burocratizar, mas pra que ninguém precise lembrar de cabeça o que foi combinado.",
            "A diferença da Vyzon é a EVA no centro: ela lê os atendimentos, sugere o próximo passo e mantém o pipeline conectado ao que realmente aconteceu na conversa. Tudo com aprovação humana nas mensagens de saída.",
            "Não é um chatbot que responde sozinho nem automação que tira o vendedor da jogada. É um copiloto que enxerga tudo e te deixa decidir.",
            "Se a sua agência vende por conversa, o gargalo não é gerar lead, é não perder o que já chega. Uma central comercial existe pra resolver exatamente isso.",
        ],
    },
];

export function getBlogPost(slug: string): BlogPost | undefined {
    return BLOG_POSTS.find((p) => p.slug === slug);
}
