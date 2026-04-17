// Captura e persiste dados de atribuição do signup
// UTM params + gclid/fbclid + referrer + landing page
// Armazenado em sessionStorage — sobrevive a navegação mas some quando
// o usuário fecha o browser (mantém o "first touch" da sessão atual)

const STORAGE_KEY = "vyzon_attribution";

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
        return raw ? (JSON.parse(raw) as Attribution) : null;
    } catch {
        return null;
    }
}
