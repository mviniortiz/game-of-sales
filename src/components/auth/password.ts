// AUTH.1 — força de senha em 4 níveis (heurística local, sem dependência).
// Pontua: comprimento, variedade de classes de caractere. Cap em 4.
export function scorePassword(senha: string): number {
    if (!senha) return 0;
    let score = 0;
    if (senha.length >= 8) score += 1;
    if (senha.length >= 12) score += 1;
    if (/[a-z]/.test(senha) && /[A-Z]/.test(senha)) score += 1;
    if (/\d/.test(senha)) score += 1;
    if (/[^A-Za-z0-9]/.test(senha)) score += 1;
    return Math.min(4, score);
}

export const STRENGTH_META: Record<number, { label: string; color: string }> = {
    0: { label: "", color: "rgba(255,255,255,0.1)" },
    1: { label: "Fraca", color: "#F43F5E" },
    2: { label: "Fraca", color: "#FB923C" },
    3: { label: "Boa", color: "#FACC15" },
    4: { label: "Forte", color: "#34D399" },
};
