// Configuração da EVA por conversa (/configurar-eva): o que a pessoa confirmou
// no resumo vira o eva_business_context que a whatsapp-copilot e o
// eva-agent-loop leem. Sem IA aqui: só o que ela viu e aprovou é gravado.

/** Rascunho que a edge eva-site-context devolve a partir do site da empresa. */
export interface SiteDraft {
    site?: string;
    nome: string | null;
    e_energia_solar: boolean;
    descricao: string | null;
    cidades: string[];
    tipos_cliente: string[];
    financiamento: boolean | null;
    servicos: { nome: string; descricao: string | null }[];
    diferenciais: string[];
}

export type Trava = "preco" | "concorrente" | "financiamento" | "decisao" | "sumiu";
export type Tom = "proximo" | "direto" | "formal";
export type Financiamento = "sim" | "nao" | "nao_sei";

/** O resumo que a pessoa confere e edita antes de salvar. */
export interface SetupResumo {
    nome: string;
    oQueFaz: string;
    cidades: string;
    clientes: string;
    financiamento: Financiamento;
    ticket: string;
    travas: Trava[];
    tom: Tom;
    servicos: { nome: string; descricao: string | null }[];
    diferenciais: string[];
    site: string | null;
}

export const TICKETS = ["Até R$ 15 mil", "R$ 15 a 30 mil", "R$ 30 a 60 mil", "Acima de R$ 60 mil"] as const;

export const TRAVAS: { key: Trava; label: string; resposta: string }[] = [
    {
        key: "preco",
        label: "Acha caro",
        resposta: "Retomar mostrando a economia por mês e a simulação de parcela, sem baixar o preço de cara.",
    },
    {
        key: "concorrente",
        label: "Está comparando com outra empresa",
        resposta: "Perguntar o que a outra proposta tem de diferente (equipamento, garantia, prazo de instalação) antes de falar de preço.",
    },
    {
        key: "financiamento",
        label: "Esperando o financiamento",
        resposta: "Oferecer ajuda com a simulação ou com o banco e combinar um dia para retomar.",
    },
    {
        key: "decisao",
        label: "Vai conversar com a família ou o sócio",
        resposta: "Oferecer uma conversa rápida com quem decide junto, ou mandar um resumo curto da proposta para ele ler.",
    },
    {
        key: "sumiu",
        label: "Some sem dizer nada",
        resposta: "Mensagem curta perguntando se ficou alguma dúvida na proposta, sem pressão.",
    },
];

export const TONS: { key: Tom; label: string; descricao: string }[] = [
    { key: "proximo", label: "Próximo e informal", descricao: "Conversa leve, tratando por você, frases curtas, como quem já conhece o cliente." },
    { key: "direto", label: "Educado e direto", descricao: "Educado e objetivo, tratando por você, frases curtas, sem enrolação." },
    { key: "formal", label: "Mais formal", descricao: "Formal e cordial, sem gírias, tratando o cliente com cuidado." },
];

const CLIENTES = ["residencial", "comercial", "rural", "industrial", "condomínio"];

/** Monta o resumo inicial com o que o site trouxe; o resto a conversa pergunta. */
export function resumoInicial(draft: SiteDraft | null, nomeEmpresa: string): SetupResumo {
    return {
        nome: draft?.nome || nomeEmpresa,
        oQueFaz: draft?.descricao || "",
        cidades: (draft?.cidades ?? []).join(", "),
        clientes: (draft?.tipos_cliente ?? []).filter((c) => CLIENTES.includes(c)).join(", "),
        financiamento: draft?.financiamento === true ? "sim" : draft?.financiamento === false ? "nao" : "nao_sei",
        ticket: "",
        travas: [],
        tom: "direto",
        servicos: draft?.servicos ?? [],
        diferenciais: draft?.diferenciais ?? [],
        site: draft?.site ?? null,
    };
}

/** Perguntas que o site não respondeu, na ordem em que a EVA faz. */
export function perguntasPendentes(r: SetupResumo): ("oQueFaz" | "cidades" | "financiamento" | "ticket" | "travas" | "tom")[] {
    const out: ("oQueFaz" | "cidades" | "financiamento" | "ticket" | "travas" | "tom")[] = [];
    if (!r.oQueFaz.trim()) out.push("oQueFaz");
    if (!r.cidades.trim()) out.push("cidades");
    if (r.financiamento === "nao_sei") out.push("financiamento");
    out.push("ticket", "travas", "tom");
    return out;
}

const limpa = (s: string, max: number) => s.replace(/\s*—\s*/g, ", ").replace(/\s+/g, " ").trim().slice(0, max);

export function composeContext(r: SetupResumo) {
    const financiamento =
        r.financiamento === "sim" ? "Trabalha com financiamento do sistema." : r.financiamento === "nao" ? "Não trabalha com financiamento." : null;
    const descricao = [
        limpa(r.oQueFaz, 400),
        r.cidades.trim() ? `Atende ${limpa(r.cidades, 200)}.` : null,
        financiamento,
    ].filter(Boolean).join(" ");
    const tom = TONS.find((t) => t.key === r.tom) ?? TONS[1];

    const agency = {
        descricao,
        publico_alvo: r.clientes.trim()
            ? `Clientes de energia solar: ${limpa(r.clientes, 120)}.`
            : "Clientes que pediram orçamento de energia solar.",
        ticket_medio: r.ticket ? `${r.ticket} por proposta` : "",
        tom_de_voz: `${tom.descricao} Sem emoji em excesso e sem travessão.`,
        regras_handoff: "Avisar o dono quando o cliente aceitar a proposta, pedir desconto, pedir visita técnica ou reclamar de algo.",
        observacoes: r.diferenciais.length ? `Diferenciais que a empresa divulga: ${r.diferenciais.map((d) => limpa(d, 120)).join("; ")}.` : "",
        palavras_proibidas: ["garanto", "milagre"],
        promessas_proibidas: ["Economia garantida em valor exato", "Prazo de instalação que a empresa não confirmou", "Desconto sem autorização do dono"],
        site: r.site,
        nome: limpa(r.nome, 80),
        fonte: "configuracao_por_conversa",
    };

    const services = r.servicos.slice(0, 5).map((s, i) => ({
        id: `svc_conversa_${i + 1}`,
        nome: limpa(s.nome, 80),
        descricao: s.descricao ? limpa(s.descricao, 200) : "",
        preco_min: null,
        preco_max: null,
        modelo_cobranca: "unico",
    }));
    if (services.length === 0) {
        services.push({
            id: "svc_conversa_1",
            nome: "Sistema de energia solar",
            descricao: "Projeto, equipamento e instalação de energia solar.",
            preco_min: null,
            preco_max: null,
            modelo_cobranca: "unico",
        });
    }

    const icp = {
        descricao: `Pessoa ou empresa que pediu orçamento de energia solar${r.cidades.trim() ? ` em ${limpa(r.cidades, 200)}` : ""}.`,
        criterios_bom_fit: ["Pediu orçamento ou simulação", "Mandou a conta de luz", "Tem telhado ou área própria", "Quem decide participa da conversa"],
        criterios_sem_fit: ["Conversa pessoal", "Fornecedor ou parceiro", "Cliente já instalado falando de pós-venda (responder, sem oferta nova)"],
    };

    const playbooks = TRAVAS.filter((t) => r.travas.includes(t.key)).map((t) => ({
        kind: "objection",
        title: `Trava comum: ${t.label.toLowerCase()}`,
        priority: "high",
        source: "configuracao_por_conversa",
        content: { response: t.resposta },
    }));
    playbooks.push({
        kind: "forbidden_promise",
        title: "Sem promessa que a empresa não confirmou",
        priority: "high",
        source: "configuracao_por_conversa",
        content: { response: "Não prometer economia exata, prazo nem desconto que o dono não confirmou na conversa." },
    });

    return { agency, services, icp, playbooks };
}
