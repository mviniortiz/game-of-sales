// Telefone brasileiro legível: "+55 (11) 99999-0000". Aceita com ou sem +55 e
// com máscara; fixo (10 dígitos) e celular (11). Outros formatos voltam como vieram.
export function formatPhone(phone?: string | null): string {
    if (!phone) return "Sem telefone";
    const d = phone.replace(/\D/g, "");
    const local = d.length >= 12 && d.startsWith("55") ? d.slice(2) : d;
    const ddi = local !== d ? "+55 " : "";
    if (local.length === 11) return `${ddi}(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
    if (local.length === 10) return `${ddi}(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
    return phone;
}
