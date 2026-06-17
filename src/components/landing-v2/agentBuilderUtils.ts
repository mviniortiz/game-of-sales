// Utilidades do Agent Builder (modal da landing /v2).

// Mesmo blocklist da edge: exigimos e-mail de trabalho (domínio próprio).
const FREE_EMAIL_DOMAINS = new Set([
    "gmail.com", "googlemail.com", "hotmail.com", "hotmail.com.br", "outlook.com",
    "outlook.com.br", "live.com", "live.com.br", "msn.com", "yahoo.com", "yahoo.com.br",
    "ymail.com", "icloud.com", "me.com", "mac.com", "proton.me", "protonmail.com",
    "pm.me", "gmx.com", "gmx.net", "aol.com", "zoho.com", "mail.com", "yandex.com",
    "tutanota.com", "bol.com.br", "uol.com.br", "terra.com.br", "ig.com.br",
    "globo.com", "globomail.com", "r7.com", "oi.com.br", "pop.com.br",
]);

export function classifyEmail(raw: string): "ok" | "invalid" | "free" {
    const e = (raw || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return "invalid";
    if (FREE_EMAIL_DOMAINS.has(e.split("@")[1])) return "free";
    return "ok";
}

export const ACCEPTED_FILE = ".md,.txt,.pdf,text/plain,text/markdown,application/pdf";
export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

const MAX_CHARS = 12000;

// Extrai texto de .md/.txt (direto) e .pdf (pdfjs lazy, fora do bundle principal).
export async function extractFileText(file: File): Promise<string> {
    const name = file.name.toLowerCase();
    if (name.endsWith(".md") || name.endsWith(".txt") || file.type.startsWith("text/")) {
        return (await file.text()).slice(0, MAX_CHARS);
    }
    if (name.endsWith(".pdf") || file.type === "application/pdf") {
        const pdfjs = await import("pdfjs-dist");
        const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        const buf = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: buf }).promise;
        let text = "";
        const pages = Math.min(pdf.numPages, 20);
        for (let i = 1; i <= pages && text.length < MAX_CHARS; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map((it) => ("str" in it ? it.str : "")).join(" ") + "\n";
        }
        return text.trim().slice(0, MAX_CHARS);
    }
    throw new Error("unsupported");
}

// Captura UTM/gclid/fbclid/referrer da sessão para atribuição do lead.
export function captureAttribution(): Record<string, string> {
    const out: Record<string, string> = {};
    try {
        const q = new URLSearchParams(window.location.search);
        for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"]) {
            const v = q.get(k);
            if (v) out[k] = v;
        }
        if (document.referrer) out.referrer = document.referrer;
        out.landing_page = window.location.pathname;
    } catch {
        /* noop */
    }
    return out;
}
