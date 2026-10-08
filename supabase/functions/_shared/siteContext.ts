// Leitura do site da própria empresa (eva-site-context): limpeza do HTML e as
// travas de rede. Separado da função para ter teste.

export function htmlToText(html: string): string {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&[a-z#0-9]+;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
}

// Alvo interno nunca: localhost, faixas privadas, link-local, IPv6 literal e
// nomes de rede local. Vale para o endereço digitado e para cada redirecionamento.
export function hostPermitido(host: string): boolean {
    const h = host.toLowerCase();
    if (!h || h.startsWith("[") || h.includes(":")) return false;
    if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return false;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) {
        const [a, b] = h.split(".").map(Number);
        if (
            a === 0 || a === 10 || a === 127 || a >= 224 ||
            (a === 169 && b === 254) ||
            (a === 172 && b >= 16 && b <= 31) ||
            (a === 192 && b === 168) ||
            (a === 100 && b >= 64 && b <= 127)
        ) return false;
    }
    return h.includes(".");
}

// Rede social exige login e não mostra o texto da página: a conversa segue
// pelas perguntas.
export const REDE_SOCIAL = /(^|\.)(instagram\.com|facebook\.com|fb\.com|linktr\.ee|wa\.me|whatsapp\.com|tiktok\.com|linkedin\.com)$/i;

// Até 2 páginas internas que costumam descrever a empresa.
export function paginasInternas(html: string, base: URL): string[] {
    const achadas = new Set<string>();
    for (const m of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
        let u: URL;
        try {
            u = new URL(m[1], base);
        } catch {
            continue;
        }
        if (u.hostname !== base.hostname || u.pathname === base.pathname || u.pathname === "/") continue;
        if (!/(sobre|quem-somos|empresa|servic|solu|energia|solar|contato|atendimento|financ)/i.test(u.pathname)) continue;
        achadas.add(u.origin + u.pathname);
        if (achadas.size >= 2) break;
    }
    return [...achadas];
}
