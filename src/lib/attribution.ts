// Captura e persiste dados de atribuição do signup
// UTM params + gclid/fbclid + referrer + landing page
// Armazenado em sessionStorage — sobrevive a navegação mas some quando
// o usuário fecha o browser (mantém o "first touch" da sessão atual)

const STORAGE_KEY = "vyzon_attribution";

// Hipótese de consciência (5 níveis, Schwartz) derivada dos sinais de origem.
// É HIPÓTESE, não verdade: nenhum sinal isolado é perfeito. Serve pra segmentar
// conversão por estágio mental em vez de olhar só a média (que esconde o erro).
export type AwarenessLevel =
    | "unaware" // não sabe que tem um problema nomeado (scroll social frio)
    | "problem_aware" // sente a dor, não conhece a solução
    | "solution_aware" // pesquisou uma categoria/solução (busca ativa)
    | "product_aware" // já conhece a Vyzon (indicação, outbound nominal, marca)
    | "most_aware"; // pronto pra decidir (retorno direto, remarketing quente)

// Canal normalizado — colapsa o par utm_source/medium ruidoso num rótulo estável.
export type TrafficSource =
    | "paid_search"
    | "organic_search"
    | "social"
    | "email_outreach"
    | "referral"
    | "direct"
    | "other";

export type Attribution = {
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
    utm_term?: string | null;
    utm_content?: string | null;
    gclid?: string | null;
    fbclid?: string | null;
    referrer?: string | null;
    landing_page?: string | null;
    // Derivados (não vêm da URL; computados em captureAttribution):
    traffic_source?: TrafficSource | null;
    awareness_hypothesis?: AwarenessLevel | null;
    // Termo de intenção quando disponível (utm_term de busca paga).
    query_intent?: string | null;
};

const FIELDS = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "gclid",
    "fbclid",
] as const;

const SEARCH_HOSTS = ["google.", "bing.", "yahoo.", "duckduckgo.", "ecosia.", "search.brave"];
const SOCIAL_HOSTS = [
    "instagram", "facebook", "fb.", "l.facebook", "lm.facebook", "t.co", "twitter",
    "x.com", "linkedin", "lnkd.in", "tiktok", "youtube", "youtu.be", "reddit",
];
const PAID_MEDIA = ["cpc", "ppc", "paid", "paidsearch", "paid_search", "sem"];
const SOCIAL_MEDIA = ["social", "paid_social", "paidsocial", "social_paid"];

function hostMatches(referrer: string, needles: string[]): boolean {
    let host = referrer.toLowerCase();
    try {
        host = new URL(referrer).hostname.toLowerCase();
    } catch {
        /* referrer pode não ser URL completa; cai no match por substring */
    }
    return needles.some((n) => host.includes(n));
}

// Deriva canal + hipótese de consciência a partir dos sinais de origem.
// Ordem = precedência do sinal mais forte pro mais fraco. Ver os 5 níveis:
// busca paga já comprou a categoria (solution); outbound nominal do Markus e
// indicação já conhecem a Vyzon (product); social frio ainda está no sintoma
// (problem); direto sem referrer típico de marca/retorno (most).
export function deriveAwareness(a: Attribution): {
    traffic_source: TrafficSource;
    awareness_hypothesis: AwarenessLevel;
    query_intent: string | null;
} {
    const src = (a.utm_source || "").toLowerCase();
    const med = (a.utm_medium || "").toLowerCase();
    const ref = a.referrer || "";
    const hasGclid = !!a.gclid;
    const hasFbclid = !!a.fbclid;

    // 1. Busca paga (Google Ads Search): pesquisou uma solução → solution_aware.
    if (hasGclid || PAID_MEDIA.includes(med) || (src === "google" && PAID_MEDIA.includes(med))) {
        return {
            traffic_source: "paid_search",
            awareness_hypothesis: "solution_aware",
            query_intent: a.utm_term || null,
        };
    }

    // 2. Outbound nominal (cold email do Markus, personalizado por fit_signal):
    //    a pessoa recebeu uma mensagem que já cita a Vyzon → product_aware.
    if (med === "email" || ["outreach", "cold_email", "coldemail", "resend", "markus"].includes(src)) {
        return { traffic_source: "email_outreach", awareness_hypothesis: "product_aware", query_intent: null };
    }

    // 3. Indicação: chega já conhecendo → product_aware.
    if (med === "referral" || ["indicacao", "indicação", "referral", "indicacao_wpp"].includes(src)) {
        return { traffic_source: "referral", awareness_hypothesis: "product_aware", query_intent: null };
    }

    // 4. Social (pago ou orgânico): scroll frio, incitado pelo sintoma → problem_aware.
    const socialSrc = SOCIAL_HOSTS.some((n) => src.includes(n));
    if (hasFbclid || SOCIAL_MEDIA.includes(med) || socialSrc || (ref && hostMatches(ref, SOCIAL_HOSTS))) {
        return { traffic_source: "social", awareness_hypothesis: "problem_aware", query_intent: null };
    }

    // 5. Busca orgânica (referrer de buscador, sem gclid): pesquisou → solution_aware.
    if (ref && hostMatches(ref, SEARCH_HOSTS)) {
        return { traffic_source: "organic_search", awareness_hypothesis: "solution_aware", query_intent: a.utm_term || null };
    }

    // 6. Direto (sem referrer e sem utm): digitou a URL / voltou → conhece a marca.
    if (!ref && !src && !med) {
        return { traffic_source: "direct", awareness_hypothesis: "most_aware", query_intent: null };
    }

    // 7. Fallback: origem existe mas não classificada. Não fingir precisão.
    return { traffic_source: "other", awareness_hypothesis: "problem_aware", query_intent: a.utm_term || null };
}

// Chame no bootstrap da app. Se já existe attribution na sessão, mantém
// (first-touch). Só sobrescreve se a URL atual trouxer dados novos de ad.
export function captureAttribution(): Attribution | null {
    if (typeof window === "undefined") return null;

    try {
        const params = new URLSearchParams(window.location.search);
        const fromUrl: Attribution = {};
        let hasAdSignal = false;

        for (const f of FIELDS) {
            const v = params.get(f);
            if (v) {
                fromUrl[f] = v;
                if (f === "gclid" || f === "fbclid" || f === "utm_source") {
                    hasAdSignal = true;
                }
            }
        }

        const existing = getAttribution();

        // Se já tem attribution salva e a URL atual não traz sinal de ad,
        // mantém o first-touch existente
        if (existing && !hasAdSignal) return existing;

        // Se tem sinal de ad novo OU não tem nada salvo, cria/atualiza
        const attribution: Attribution = {
            ...fromUrl,
            referrer: document.referrer || null,
            landing_page: window.location.pathname + window.location.search,
        };

        // Deriva canal + hipótese de consciência a partir dos sinais capturados.
        const derived = deriveAwareness(attribution);
        attribution.traffic_source = derived.traffic_source;
        attribution.awareness_hypothesis = derived.awareness_hypothesis;
        attribution.query_intent = derived.query_intent;

        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
        return attribution;
    } catch {
        return null;
    }
}

export function getAttribution(): Attribution | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const attr = JSON.parse(raw) as Attribution;
        // Sessão salva antes deste deploy não tem os derivados: deriva na leitura
        // (backward-compat, não reescreve o storage).
        if (attr && !attr.awareness_hypothesis) {
            const d = deriveAwareness(attr);
            attr.traffic_source = d.traffic_source;
            attr.awareness_hypothesis = d.awareness_hypothesis;
            attr.query_intent = d.query_intent;
        }
        return attr;
    } catch {
        return null;
    }
}
