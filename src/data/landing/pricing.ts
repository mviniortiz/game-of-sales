export type Plan = {
    name: string;
    price: string;
    priceNumber: number;
    tagline: string;
    features: readonly string[];
    popular: boolean;
    extraInfo: string | null;
    checkoutUrl: string;
};

export const PLANS: readonly Plan[] = [
    {
        name: "Starter",
        price: "147",
        priceNumber: 147,
        tagline: "Para validar sua operação.",
        features: [
            "Dashboard em tempo real",
            "1 Vendedor + 1 Admin",
            "Metas individuais",
            "Registro de vendas",
            "Painel de performance básico",
        ],
        popular: false,
        extraInfo: null,
        checkoutUrl: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=dd862f815f6b4d6285b2b8119710553b",
    },
    {
        name: "Plus",
        price: "397",
        priceNumber: 397,
        tagline: "O mais popular.",
        features: [
            "Tudo do Starter",
            "3 Vendedores + 1 Admin",
            "Pipeline de vendas",
            "Ranking gamificado",
            "Eva, analista de vendas com IA",
            "Relatórios completos",
            "Metas consolidadas",
            "Ligações na plataforma (add-on)",
        ],
        popular: true,
        extraInfo: "+R$ 49,97/vendedor adicional • Ligações como add-on",
        checkoutUrl: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=7c2c9ac396684c229987a7501cf4f88c",
    },
    {
        name: "Pro",
        price: "797",
        priceNumber: 797,
        tagline: "Escala total.",
        features: [
            "Tudo do Plus",
            "8 Vendedores + 3 Admins",
            "CRM completo",
            "Eva ilimitada + prioridade",
            "Integrações (Hotmart, Stripe)",
            "Ligações + transcrição no deal (add-on)",
            "Multi-empresa",
            "Suporte prioritário",
        ],
        popular: false,
        extraInfo: "+R$ 48,99/vendedor adicional • Melhor custo para add-on de ligações",
        checkoutUrl: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=7f7561d2b1174aacb31ab92dce72ded4",
    },
] as const;
