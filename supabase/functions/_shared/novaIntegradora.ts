// Pedido do botão "Nova integradora" (AdminCompanies), lido e limpo antes de
// gravar qualquer coisa. Sem import de Deno: o teste roda no vitest.

export type PedidoIntegradora = {
    empresa: string;
    email: string;
    nome: string | null;
    whats: string | null;
    fundadora: boolean;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Só dígitos, com 55 na frente quando vier só DDD + número. Vazio vira null. */
export function whatsDigitos(v: unknown): string | null {
    const d = String(v ?? "").replace(/\D/g, "");
    if (!d) return null;
    if (d.length === 10 || d.length === 11) return `55${d}`;
    return d;
}

export function lerPedido(body: unknown): { ok: true; pedido: PedidoIntegradora } | { ok: false; erro: string } {
    const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
    const empresa = String(b.empresa ?? "").trim().replace(/\s+/g, " ");
    const email = String(b.email ?? "").trim().toLowerCase();
    const nome = String(b.nome ?? "").trim().replace(/\s+/g, " ") || null;
    const whats = whatsDigitos(b.whats);

    if (empresa.length < 2) return { ok: false, erro: "Informe o nome da empresa." };
    if (empresa.length > 120) return { ok: false, erro: "Nome da empresa muito longo." };
    if (!EMAIL.test(email)) return { ok: false, erro: "E-mail inválido." };
    if (whats && (whats.length < 12 || whats.length > 13)) return { ok: false, erro: "WhatsApp com DDD, só números." };

    return { ok: true, pedido: { empresa, email, nome, whats, fundadora: b.fundadora === true } };
}
