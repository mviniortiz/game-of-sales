// Número para o código de pareamento do WhatsApp (conectar sem QR): só dígitos,
// com DDI. Número brasileiro digitado sem o 55 (DDD + número) ganha o 55.
export function normalizePairingNumber(raw?: string | null): string | null {
    const d = String(raw ?? "").replace(/\D/g, "");
    if (!d) return null;
    const full = d.length === 10 || d.length === 11 ? `55${d}` : d;
    return full.length >= 12 && full.length <= 15 ? full : null;
}
