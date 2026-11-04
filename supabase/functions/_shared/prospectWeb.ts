// Busca pública da empresa (site e Instagram) para a qualificação da prospecção.
// Pedido do Markus na retrospectiva de 04/11/2026: entender a empresa antes de abordar,
// para tirar da fila quem só presta mão de obra de instalação e dar contexto à IA que
// responde. Usa o Gemini com a busca do Google (grounding): lê o que o Google mostra
// do perfil e do site, sem raspar o Instagram e sem login. Só dado público da empresa
// (nada de pessoa física além do nome do sócio que já vem do CNPJ).

export type BuscaWeb = {
  achou: boolean;
  instagram: string | null;
  site: string | null;
  /** sim: vende e instala para o cliente final; nao: só mão de obra para outras empresas, outro ramo ou fechada. */
  vendeClienteFinal: "sim" | "nao" | "duvida";
  /** posta orçamento, obra entregue ou depoimento nos últimos meses. */
  ativa: boolean | null;
  resumo: string;
  fontes: string[];
};

export const BUSCA_VAZIA: BuscaWeb = { achou: false, instagram: null, site: null, vendeClienteFinal: "duvida", ativa: null, resumo: "", fontes: [] };

const MODELO = "gemini-2.5-flash";

export function perguntaDaBusca(alvo: { nome: string; razao?: string | null; cidade?: string | null }): string {
  const quem = [alvo.nome, alvo.razao && alvo.razao !== alvo.nome ? `(razão social ${alvo.razao})` : null, alvo.cidade ? `de ${alvo.cidade}` : null, "SC"]
    .filter(Boolean).join(" ");
  return [
    `Procure no Google a empresa de energia solar ${quem}: o perfil dela no Instagram e o site.`,
    "Responda só com fatos que aparecem nos resultados. Se não achar com segurança que é a mesma empresa (nome e cidade batendo), diga que não achou.",
    "Quero saber: o @ do Instagram, o endereço do site, se ela vende e instala sistema fotovoltaico para o cliente final (casa, comércio, agro) ou só presta serviço de instalação para outras empresas, e se postou obra, orçamento ou depoimento nos últimos 6 meses.",
    'Responda só JSON, sem texto antes ou depois: {"achou": true|false, "instagram": "@perfil" ou null, "site": "https://..." ou null, "vende_cliente_final": "sim"|"nao"|"duvida", "ativa": true|false|null, "resumo": "até 25 palavras, em português, sem travessão, do que a empresa faz e para quem"}',
  ].join("\n");
}

/** Lê a resposta do Gemini. Tolera cerca de markdown e texto em volta do JSON. */
export function lerBusca(texto: string, fontes: string[] = []): BuscaWeb {
  const m = String(texto || "").match(/\{[\s\S]*\}/);
  if (!m) return BUSCA_VAZIA;
  let j: any;
  try { j = JSON.parse(m[0]); } catch { return BUSCA_VAZIA; }
  if (j?.achou !== true) return { ...BUSCA_VAZIA, fontes };
  const insta = typeof j.instagram === "string" ? j.instagram.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "@").replace(/\/.*$/, "") : "";
  const site = typeof j.site === "string" && /^https?:\/\/[^\s]+\.[a-z]{2,}/i.test(j.site.trim()) ? j.site.trim() : null;
  const v = ["sim", "nao", "duvida"].includes(j.vende_cliente_final) ? j.vende_cliente_final : "duvida";
  return {
    achou: true,
    instagram: /^@?[A-Za-z0-9._]{2,30}$/.test(insta) ? (insta.startsWith("@") ? insta : `@${insta}`) : null,
    site: site && !/instagram\.com|facebook\.com/i.test(site) ? site : null,
    vendeClienteFinal: v,
    ativa: typeof j.ativa === "boolean" ? j.ativa : null,
    resumo: String(j.resumo || "").replace(/\s*[—–]\s*/g, ", ").slice(0, 220).trim(),
    fontes: fontes.slice(0, 5),
  };
}

export async function buscarNaWeb(alvo: { nome: string; razao?: string | null; cidade?: string | null }, chave: string): Promise<BuscaWeb> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": chave },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: perguntaDaBusca(alvo) }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0, maxOutputTokens: 600, thinkingConfig: { thinkingBudget: 0 } },
    }),
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`busca ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const cand = data?.candidates?.[0];
  const texto = (cand?.content?.parts ?? []).map((p: any) => p.text ?? "").join("");
  const fontes = (cand?.groundingMetadata?.groundingChunks ?? []).map((c: any) => c?.web?.title || c?.web?.uri).filter(Boolean);
  return lerBusca(texto, fontes);
}
