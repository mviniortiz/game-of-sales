export type Plan = {
    name: string;
    price: string;
    priceNumber: number;
    tagline: string;
    features: readonly string[];
    popular: boolean;
    extraInfo: string | null;
    ctaLabel: string;
    checkoutUrl: string;
};

export const PLANS: readonly Plan[] = [
    {
        name: "Starter",
        price: "147",
        priceNumber: 147,
        tagline: "Para estruturar o primeiro fluxo comercial.",
        features: [
            "1 vendedor/closer + 1 admin",
            "WhatsApp conectado com EVA respondendo",
            "Pipeline com agendamentos",
            "Metas individuais e progresso",
            "Painel básico de performance",
            "Suporte humano no WhatsApp",
        ],
        popular: false,
        extraInfo: null,
        ctaLabel: "Começar teste grátis",
        checkoutUrl: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=dd862f815f6b4d6285b2b8119710553b",
    },
    {
        name: "Plus",
        price: "397",
        priceNumber: 397,
        tagline: "Para agências que recebem leads todos os dias.",
        features: [
            "3 SDRs/closers + 1 admin",
            "Tudo do Starter",
            "Ranking do time ao vivo",
            "EVA analisando leads e vendas",
            "Relatórios completos",
            "Metas consolidadas do time",
            "Integrações Hotmart, Kiwify, Mercado Pago",
            "Ligações na plataforma (add-on)",
        ],
        popular: true,
        extraInfo: "+R$ 49,97/SDR adicional • Ligações como add-on",
        ctaLabel: "Testar plano Plus",
        checkoutUrl: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=7c2c9ac396684c229987a7501cf4f88c",
    },
    {
        name: "Pro",
        price: "797",
        priceNumber: 797,
        tagline: "Para agências com operação comercial em escala.",
        features: [
            "8 SDRs/closers + 3 admins",
            "Tudo do Plus",
            "EVA com prioridade e limite ampliado",
            "Multiempresa: matriz + braços",
            "Ligações com transcrição e resumo do deal",
            "Integrações completas (Stripe, etc)",
            "Suporte prioritário",
        ],
        popular: false,
        extraInfo: "+R$ 48,99/SDR adicional",
        ctaLabel: "Falar com especialista",
        checkoutUrl: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=7f7561d2b1174aacb31ab92dce72ded4",
    },
] as const;
