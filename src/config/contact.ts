// Contato comercial/suporte centralizado. Hoje o número estava hardcoded em
// WhatsAppButton.tsx e Docs.tsx; este módulo passa a ser a fonte única.
export const CONTACT = {
    /** Número do WhatsApp (formato internacional, só dígitos). */
    whatsappNumber: "5548991696887",
    supportName: "Vyzon Suporte",
    defaultMessage: "Olá! Preciso de ajuda com o Vyzon.",
};

/** Monta um link wa.me com a mensagem já preenchida. */
export function whatsappUrl(message: string, number: string = CONTACT.whatsappNumber): string {
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
