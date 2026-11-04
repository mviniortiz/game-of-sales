// Obras: partes puras (sem rede nem banco) do aviso de etapa atrasada.
// Etapas, nomes e prazos padrão seguem src/hooks/useObras.ts; mudou um, muda o outro.

export const ETAPAS = ["documentos", "protocolo", "parecer", "instalacao", "vistoria", "medidor", "ligada"] as const;
export type Etapa = typeof ETAPAS[number];

export const NOME_ETAPA: Record<Etapa, string> = {
  documentos: "documentos",
  protocolo: "protocolo",
  parecer: "parecer",
  instalacao: "instalação",
  vistoria: "vistoria",
  medidor: "medidor",
  ligada: "ligada",
};

export const NOME_COM_QUEM: Record<string, string> = {
  cliente: "o cliente",
  concessionaria: "a concessionária",
  voce: "você",
  instalador: "o instalador",
};

/** Dias corridos que a empresa espera em cada etapa. Padrão é sugestão. */
export const PRAZO_PADRAO: Record<Exclude<Etapa, "ligada">, number> = {
  documentos: 5, protocolo: 5, parecer: 15, instalacao: 10, vistoria: 7, medidor: 7,
};

export type ObraAviso = {
  id: string;
  etapa: Etapa;
  etapa_desde: string;
  avisado_em: string | null;
  cliente: string;
  com_quem?: string | null;
};

export function diasNaEtapa(desde: string, agora = new Date()): number {
  return Math.max(0, Math.floor((agora.getTime() - new Date(desde).getTime()) / 86_400_000));
}

export function prazoDa(etapa: Etapa, prazos?: Record<string, unknown> | null): number | null {
  if (etapa === "ligada") return null;
  const n = Number(prazos?.[etapa]);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : PRAZO_PADRAO[etapa];
}

/** Passou do prazo e ainda não avisei nesta etapa (ou avisei há 7 dias ou mais). */
export function precisaAvisar(o: ObraAviso, prazos: Record<string, unknown> | null, agora = new Date()): boolean {
  const prazo = prazoDa(o.etapa, prazos);
  if (prazo == null || diasNaEtapa(o.etapa_desde, agora) <= prazo) return false;
  if (!o.avisado_em) return true;
  const avisado = new Date(o.avisado_em);
  if (avisado < new Date(o.etapa_desde)) return true;
  return agora.getTime() - avisado.getTime() >= 7 * 86_400_000;
}

/** Texto do aviso ao dono. Sem prazo de concessionária: só o que ele mesmo definiu. */
export function textoDoAviso(obras: ObraAviso[], prazos: Record<string, unknown> | null, agora = new Date()): string {
  const linhas = obras.map((o, i) => {
    const dias = diasNaEtapa(o.etapa_desde, agora);
    const comQuem = o.com_quem && NOME_COM_QUEM[o.com_quem] ? `, com ${NOME_COM_QUEM[o.com_quem]}` : "";
    return `${i + 1}. ${o.cliente} · ${NOME_ETAPA[o.etapa]} há ${dias} dias${comQuem} (você espera ${prazoDa(o.etapa, prazos)})`;
  });
  const titulo = obras.length === 1
    ? "Obras: 1 passou do prazo que você definiu"
    : `Obras: ${obras.length} passaram do prazo que você definiu`;
  return [titulo, linhas.join("\n"), "Atualize em https://vyzon.com.br/obras quando andar."].join("\n\n");
}
