// Busca de cliente feita na memória: a lista da empresa vem uma vez (dezenas de
// negócios, no máximo centenas) e cada tecla filtra na hora, sem ir ao banco.
// Ignora acento e maiúscula; número digitado procura também no telefone.

export interface ClienteBusca {
    id: string;
    title: string | null;
    customer_name: string | null;
    customer_phone: string | null;
    value: number | null;
    updated_at: string | null;
}

export const normalizar = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const digitos = (s: string) => s.replace(/\D/g, "");

export const nomeDo = (c: ClienteBusca) => (c.customer_name || c.title || "Sem nome").trim();

/** Nota do resultado: maior é melhor; 0 = não bate. */
function nota(c: ClienteBusca, termo: string, num: string): number {
    const nome = normalizar(nomeDo(c));
    const titulo = normalizar(c.title || "");
    if (nome.startsWith(termo)) return 4;
    if (nome.split(/\s+/).some((p) => p.startsWith(termo))) return 3;
    if (nome.includes(termo) || titulo.includes(termo)) return 2;
    if (num.length >= 3 && c.customer_phone && digitos(c.customer_phone).includes(num)) return 1;
    return 0;
}

export function buscarClientes(lista: ClienteBusca[], consulta: string, limite = 8): ClienteBusca[] {
    const termo = normalizar(consulta.trim());
    const recentes = (a: ClienteBusca, b: ClienteBusca) => (b.updated_at ?? "").localeCompare(a.updated_at ?? "");
    if (!termo) return [...lista].sort(recentes).slice(0, 6);
    const num = digitos(consulta);
    return lista
        .map((c) => ({ c, n: nota(c, termo, num) }))
        .filter((x) => x.n > 0)
        .sort((a, b) => b.n - a.n || recentes(a.c, b.c))
        .slice(0, limite)
        .map((x) => x.c);
}

/** Onde o termo aparece no nome, pra marcar em negrito (índices no texto original). */
export function trechoAchado(nome: string, consulta: string): [number, number] | null {
    const termo = normalizar(consulta.trim());
    if (!termo) return null;
    // A normalização tira acentos sem mudar o tamanho de cada letra base, então o índice vale no original.
    const i = normalizar(nome).indexOf(termo);
    return i < 0 ? null : [i, i + termo.length];
}
