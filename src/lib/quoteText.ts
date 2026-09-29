// Texto de orçamento usado pela tela Orçamentos e pela fila "Agora" do Início:
// como cada situação se lê em uma linha e o que a EVA fez pelo orçamento.
import type { QuoteItem } from "@/hooks/useQuoteBoard";

/** Com 30 dias sem o cliente escrever, o orçamento morre (quote_tracking_expire). */
export const EXPIRE_DAYS = 30;

export const OPEN_QUOTE_STATES: QuoteItem["state"][] = ["no_reply", "went_quiet", "your_turn", "talking"];

export const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: Number.isInteger(v) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(v);

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
export const ago = (days: number) => (days <= 0 ? "hoje" : days === 1 ? "ontem" : `há ${days} dias`);
const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));

export function quoteName(q: Pick<QuoteItem, "contact_name" | "contact_phone">): string {
  return q.contact_name?.trim() || (q.contact_phone ? `+${q.contact_phone}` : "Contato sem nome");
}

/** O que aconteceu com o orçamento, em uma linha. */
export function stateLine(q: QuoteItem): string {
  switch (q.state) {
    case "no_reply":
      return `Nunca respondeu · orçamento${q.detected_by === "pdf" ? " em PDF" : ""} enviado ${ago(q.days)}`;
    case "went_quiet":
      return `Respondeu e sumiu · última mensagem do cliente ${ago(q.days)}`;
    case "your_turn":
      return `Esperando você · mandou mensagem ${ago(q.days)} e está sem resposta`;
    case "talking":
      return `Em conversa · cliente falou ${ago(q.days)}`;
    case "won":
      return q.recovered ? `Fechou com retomada · ${ago(q.days)}` : `Fechou · ${ago(q.days)}`;
    case "lost":
      return `Perdeu · ${ago(q.days)}`;
    case "expired":
      return `Morreu · ${EXPIRE_DAYS} dias sem o cliente escrever`;
    default:
      return "Encerrado no pipeline";
  }
}

/** O que a EVA fez por este orçamento. Só para orçamento aberto. */
export function evaLine(q: QuoteItem): string | null {
  if (!OPEN_QUOTE_STATES.includes(q.state) || !q.draft_status) return null;
  switch (q.draft_status) {
    case "pending":
      return "Retomada pronta no seu WhatsApp, esperando o seu ok";
    case "sent":
    case "adjusted":
      return `Retomada enviada ${ago(daysSince(q.followup_sent_at ?? q.draft_at ?? q.sent_at))}`;
    case "rejected":
      return "Você descartou a retomada";
    case "expired":
      return "A retomada expirou sem resposta sua";
    default:
      return null;
  }
}
