// ─────────────────────────────────────────────────────────────────────────────
// V1.0.2 — Sanitização de nomes de contato para superfícies de demo/produção.
//
// Por que existe: contatos vindos do WhatsApp (channel_contacts.name) podem
// ser nome de grupo (ex. "Pobre", "Suporte", "Admin"), JID cru, telefone puro
// ou string lixo. Quando esses entram em texto principal da Central, viram:
//   "Pobre sem resposta há mais de 24h"  ← quebra credibilidade
//
// sanitizeDisplayName retorna o nome OU null. getLeadLabel devolve sempre uma
// string apresentável, caindo para "Lead" quando o nome é ruim.
//
// Sem chamada de DB. Sem chamada de IA. Helper puro.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Termos que indicam nome de grupo, função genérica ou label técnica vinda
 * de WhatsApp/sistema. Match exato (case-insensitive) — não substring, pra
 * não falsear "Suporte da Clínica X" → "Suporte".
 */
const BAD_NAME_EXACT = new Set<string>([
    "pobre",
    "admin",
    "administrador",
    "administradora",
    "suporte",
    "support",
    "contato",
    "contact",
    "unknown",
    "desconhecido",
    "sem nome",
    "no name",
    "n/a",
    "na",
    "null",
    "undefined",
    "—",
    "-",
    "user",
    "usuário",
    "usuario",
    "cliente",
    "lead",
    "grupo",
    "group",
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_ONLY_RE = /^[+\d\s()-]{7,}$/;
// JIDs WhatsApp: 5511999999999@s.whatsapp.net  ou  120363000@g.us
const JID_RE = /@(s\.whatsapp\.net|g\.us|c\.us|broadcast)$/i;

/**
 * Retorna nome limpo (trim + collapse de espaços) OU null se for inapresentável.
 *
 * Critérios de "inapresentável":
 * - vazio/whitespace-only
 * - match exato em BAD_NAME_EXACT (case-insensitive)
 * - é email puro (texto principal não deve mostrar email cru)
 * - é telefone puro (só dígitos/separadores)
 * - é JID do WhatsApp (xxx@s.whatsapp.net ou yyy@g.us)
 * - tem 1 caractere só
 */
export function sanitizeDisplayName(name?: string | null): string | null {
    if (name == null) return null;
    const trimmed = String(name).trim().replace(/\s+/g, " ");
    if (!trimmed) return null;
    if (trimmed.length < 2) return null;
    if (JID_RE.test(trimmed)) return null;
    if (EMAIL_RE.test(trimmed)) return null;
    if (PHONE_ONLY_RE.test(trimmed)) return null;
    if (BAD_NAME_EXACT.has(trimmed.toLowerCase())) return null;
    return trimmed;
}

/**
 * Label sempre apresentável. Usa o nome se sanitizar bem, senão devolve
 * o fallback. Default fallback = "Lead".
 *
 * Uso típico:
 *   `${getLeadLabel(c.channel_contacts?.name)} sem resposta há mais de 24h`
 */
export function getLeadLabel(name?: string | null, fallback: string = "Lead"): string {
    return sanitizeDisplayName(name) ?? fallback;
}

/**
 * True quando o nome é apresentável (caller quer ramificar a copy:
 * "{Nome} pediu reunião" vs "Lead pediu reunião").
 */
export function hasPresentableName(name?: string | null): boolean {
    return sanitizeDisplayName(name) !== null;
}
