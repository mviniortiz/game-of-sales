import { formatPhone } from "@/lib/formatPhone";

// Contato sem nome salvo chega com o próprio telefone no lugar do nome
// ("+554896058479"). Nesses casos o título vira o número formatado, uma vez
// só, e o avatar mostra um ícone em vez de "+5".
export function semNome(name?: string | null): boolean {
    const n = (name ?? "").trim();
    return !n || /^[+\d\s()-]+$/.test(n);
}

export function tituloContato(name?: string | null, phone?: string | null): string {
    if (!semNome(name)) return (name as string).trim();
    const tel = phone || name;
    return tel ? formatPhone(tel) : "Sem nome";
}

/** Iniciais para o avatar; null quando não há nome de verdade. */
export function iniciais(name?: string | null): string | null {
    if (semNome(name)) return null;
    const parts = (name as string).trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
