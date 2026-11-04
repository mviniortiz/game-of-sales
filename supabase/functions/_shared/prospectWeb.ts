// Busca pública da empresa (site e Instagram) para a qualificação da prospecção.
// Pedido do Markus na retrospectiva de 04/11/2026: entender a empresa antes de abordar,
// para tirar da fila quem só presta mão de obra de instalação e dar contexto à IA que
// responde. Usa a busca na web da API da Anthropic: lê o que a busca mostra do perfil e
// do site, sem raspar o Instagram e sem login. Só dado público da empresa
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
  /** O que a busca pesquisou (para conferir a busca). */
  buscas?: string[];
  /** Só no teste seco: o que voltou da busca, para conferir. Não é gravado. */
  bruto?: { chaves: string[]; texto: string; chunks: number };
};

export const BUSCA_VAZIA: BuscaWeb = { achou: false, instagram: null, site: null, vendeClienteFinal: "duvida", ativa: null, resumo: "", fontes: [] };

const MODELO = "claude-haiku-5-5";

export function perguntaDaBusca(alvo: { nome: string; razao?: string | null; cidade?: string | null }): string {
  const quem = [alvo.nome, alvo.razao && alvo.razao !== alvo.nome ? `(razão social ${alvo.razao})` : null, alvo.cidade ? `de ${alvo.cidade}` : null, "SC"]
    .filter(Boolean).join(" ");
  return [
    `Pesquise na web (obrigatório, não responda de memória): site:instagram.com "${alvo.nome}" e também "${alvo.nome}" ${alvo.cidade ?? ""} energia solar. A empresa é ${quem}.`,
    "Responda só com fatos que aparecem nos resultados. Se não achar com segurança que é a mesma empresa (nome e cidade batendo), diga que não achou.",
    "Quero saber: o @ do Instagram da própria empresa, o site da própria empresa (nunca página de diretório, guia, CNPJ ou marketplace), se ela vende e instala sistema fotovoltaico para o cliente final (casa, comércio, agro) ou só presta serviço de instalação para outras empresas.",
    "'ativa' é só sobre publicações: true se um resultado mostra post, obra ou depoimento com data nos últimos 6 meses; false se o último é mais antigo; null se não dá pra saber. Empresa aberta no CNPJ não conta.",
    'Responda só JSON, sem texto antes ou depois: {"achou": true|false, "instagram": "@perfil" ou null, "site": "https://..." ou null, "vende_cliente_final": "sim"|"nao"|"duvida", "ativa": true|false|null, "resumo": "até 25 palavras, em português, sem travessão, do que a empresa faz e para quem"}',
  ].join("\n");
}

/** Sites de diretório, guia e consulta de CNPJ: não são o site da empresa. */
const DIRETORIO = /solartask|cnpj|econodata|guiamais|apontador|telelistas|solutudo|empresaqui|casadosdados|serasa|linkedin|facebook|instagram|google\.|mercadolivre|olx|portalsolar|bndes/i;

/** Lê a resposta da busca. Tolera cerca de markdown e texto em volta do JSON. */
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
    site: site && !DIRETORIO.test(site) ? site : null,
    vendeClienteFinal: v,
    ativa: typeof j.ativa === "boolean" ? j.ativa : null,
    resumo: String(j.resumo || "").replace(/\s*[—–]\s*/g, ", ").slice(0, 220).trim(),
    fontes: fontes.slice(0, 5),
  };
}

/** Busca com a ferramenta web_search da API da Anthropic (decisão do Markus em 04/11/2026:
 *  o Gemini grátis travou na cota e a Places API é cara). Cobra dos créditos da API:
 *  cerca de US$ 10 por mil buscas, mais o texto lido. max_uses 2: Instagram e site. */
export async function buscarNaWeb(alvo: { nome: string; razao?: string | null; cidade?: string | null }, chave: string): Promise<BuscaWeb> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": chave, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: MODELO,
      // O Haiku pensa antes de responder: com 700 o JSON chegava cortado (04/11/2026).
      max_tokens: 3000,
      output_config: { effort: "low" },
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 2, user_location: { type: "approximate", country: "BR", region: "Santa Catarina" } }],
      messages: [{ role: "user", content: perguntaDaBusca(alvo) }],
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`busca ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const blocos: any[] = data?.content ?? [];
  const buscas = blocos.filter((b) => b.type === "server_tool_use").map((b) => String(b.input?.query ?? "")).filter(Boolean);
  const fontes = blocos.filter((b) => b.type === "web_search_tool_result" && Array.isArray(b.content))
    .flatMap((b) => b.content.map((r: any) => r.url)).filter(Boolean);
  const texto = blocos.filter((b) => b.type === "text").map((b) => b.text).join("");
  const bruto = { chaves: blocos.map((b) => b.type), texto: texto.slice(0, 500), chunks: fontes.length };
  // Sem pesquisa feita, a resposta veio da memória: não vale. O site é conferido depois.
  if (!buscas.length) return { ...BUSCA_VAZIA, bruto };
  return { ...lerBusca(texto, fontes), buscas, bruto };
}

const GENERICAS = new Set(["solar", "solares", "energia", "energias", "solucoes", "solução", "soluções", "solucao", "sistemas", "sistema", "instalacao", "instalação", "instalacoes", "instalações", "engenharia", "eletrica", "elétrica", "eletricos", "elétricos", "materiais", "servicos", "serviços", "tecnologia", "aplicada", "renovavel", "renovável", "sustentaveis", "sustentáveis", "fotovoltaica", "fotovoltaico", "ltda", "comercio", "comércio"]);

/** A página aberta é da empresa? Precisa citar uma palavra própria do nome (ou da razão
 *  social) com 4 letras ou mais, ou a cidade. "Solar Energia" sozinho não conta. */
export function siteConfere(textoDoSite: string, alvo: { nome: string; razao?: string | null; cidade?: string | null }): boolean {
  const norm = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const pagina = norm(textoDoSite);
  if (!pagina) return false;
  const palavras = norm(`${alvo.nome} ${alvo.razao ?? ""}`).split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !GENERICAS.has(w));
  if (palavras.some((w) => pagina.includes(w))) return true;
  const cidade = norm(alvo.cidade ?? "").trim();
  return cidade.length >= 4 && pagina.includes(cidade);
}
