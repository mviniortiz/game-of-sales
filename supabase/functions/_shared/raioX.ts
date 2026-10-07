// Raio-X das propostas paradas, montado na conversa de 20 minutos a partir do
// histórico importado do WhatsApp (90 dias). Função pura: quem chama busca as
// mensagens; aqui só se decide o que é proposta, em que pé está e quanto vale.
//
// Diferente do placar (quote_tracking), o histórico não traz o conteúdo do PDF,
// só o nome do arquivo. O valor vem da legenda, do texto da proposta ou de uma
// mensagem com rótulo de preço até 3 dias em volta dela. Sem isso, fica sem
// valor: número inventado no Raio-X derruba a conversa inteira.

import { detectQuote, pickProposalAmount } from "./quoteDetection.ts";

export type RxMessage = {
    conversation_id: string;
    direction: "inbound" | "outbound";
    message_type: string;
    body: string | null;
    // Histórico importado guarda o nome do PDF em caption; o webhook ao vivo
    // guarda em file_name e deixa caption para a legenda de verdade.
    media_ref: { mimetype?: string | null; caption?: string | null; file_name?: string | null } | null;
    ts: string;
};

// Quem está devendo a próxima mensagem decide o nome.
export type RxStatus = "no_reply" | "went_quiet" | "your_turn" | "talking";

export type RxItem = {
    conversation_id: string;
    quote_at: string;
    detected_by: "pdf" | "text";
    status: RxStatus;
    days_since_quote: number;
    days_silent: number;
    amount: number | null;
    kwp: number | null;
};

export type RxSummary = {
    quotes: number;
    stuck: number;
    stuck_recent: number;
    stuck_value: number;
    stuck_value_recent: number;
    stuck_without_value: number;
    your_turn: number;
};

const DAY = 86_400_000;
const AROUND_QUOTE = 3 * DAY;
// Mesmo corte do placar: proposta com mais de 30 dias ainda aparece, mas
// separada, porque a retomada já é outra conversa.
export const RECENT_DAYS = 30;

const STUCK_AFTER: Record<Exclude<RxStatus, "talking">, number> = {
    no_reply: 2,
    went_quiet: 3,
    your_turn: 1,
};

const KWP = /(\d{1,3}(?:[.,]\d{1,2})?)\s*kwp/i;

function text(m: RxMessage): string {
    return [m.body, m.media_ref?.caption].filter(Boolean).join("\n");
}

function days(fromIso: string, now: number): number {
    return Math.max(0, Math.floor((now - Date.parse(fromIso)) / DAY));
}

export function isStuck(item: Pick<RxItem, "status" | "days_silent">): boolean {
    return item.status !== "talking" && item.days_silent >= STUCK_AFTER[item.status];
}

/** Uma linha por conversa: a última proposta enviada e o que veio depois dela. */
export function analyzeConversation(msgs: RxMessage[], now = Date.now()): RxItem | null {
    const sorted = [...msgs].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));

    let quoteIdx = -1;
    let detection: ReturnType<typeof detectQuote> | null = null;
    for (let i = sorted.length - 1; i >= 0; i--) {
        const m = sorted[i];
        if (m.direction !== "outbound") continue;
        const isDoc = m.message_type === "document";
        const fileName = m.media_ref?.file_name ?? (isDoc ? m.media_ref?.caption : null);
        const d = detectQuote({
            type: m.message_type,
            body: m.body,
            caption: isDoc && !m.media_ref?.file_name ? null : m.media_ref?.caption,
            fileName,
            mimetype: m.media_ref?.mimetype,
        });
        if (d.isQuote) {
            quoteIdx = i;
            detection = d;
            break;
        }
    }
    if (quoteIdx < 0 || !detection?.detectedBy) return null;

    const quote = sorted[quoteIdx];
    const quoteTs = Date.parse(quote.ts);

    let amount = detection.amount;
    if (amount === null) {
        for (const m of sorted) {
            if (m.direction !== "outbound" || Math.abs(Date.parse(m.ts) - quoteTs) > AROUND_QUOTE) continue;
            const v = pickProposalAmount(text(m));
            if (v !== null && (amount === null || v > amount)) amount = v;
        }
    }

    let kwp: number | null = null;
    for (const m of sorted) {
        const hit = text(m).match(KWP);
        if (hit) kwp = Number(hit[1].replace(",", "."));
    }

    const after = sorted.slice(quoteIdx + 1);
    const lastIn = [...after].reverse().find((m) => m.direction === "inbound");
    let status: RxStatus;
    let silentFrom: string;
    if (!lastIn) {
        status = "no_reply";
        silentFrom = quote.ts;
    } else {
        const answered = after.some((m) => m.direction === "outbound" && Date.parse(m.ts) > Date.parse(lastIn.ts));
        status = answered ? "went_quiet" : "your_turn";
        silentFrom = lastIn.ts;
    }

    const item: RxItem = {
        conversation_id: quote.conversation_id,
        quote_at: quote.ts,
        detected_by: detection.detectedBy,
        status,
        days_since_quote: days(quote.ts, now),
        days_silent: days(silentFrom, now),
        amount,
        kwp,
    };
    if (!isStuck(item)) item.status = "talking";
    return item;
}

export function summarize(items: RxItem[]): RxSummary {
    const stuck = items.filter((i) => i.status !== "talking");
    const recent = stuck.filter((i) => i.days_since_quote <= RECENT_DAYS);
    const sum = (list: RxItem[]) => list.reduce((acc, i) => acc + (i.amount ?? 0), 0);
    return {
        quotes: items.length,
        stuck: stuck.length,
        stuck_recent: recent.length,
        stuck_value: sum(stuck),
        stuck_value_recent: sum(recent),
        stuck_without_value: stuck.filter((i) => i.amount === null).length,
        your_turn: stuck.filter((i) => i.status === "your_turn").length,
    };
}

/** Parados primeiro, os recentes de maior valor na frente. */
export function rankItems(items: RxItem[]): RxItem[] {
    const weight = (i: RxItem) => (i.status === "talking" ? 2 : i.days_since_quote <= RECENT_DAYS ? 0 : 1);
    return [...items].sort(
        (a, b) => weight(a) - weight(b) || (b.amount ?? -1) - (a.amount ?? -1) || a.days_silent - b.days_silent,
    );
}
