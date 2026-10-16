// Qualifica a fila da prospecção antes da primeira mensagem: Google Maps
// (Places API), home do site da empresa, juiz de IA e nota de encaixe
// (_shared/prospectFit.ts). Grava fit_score e metadata.qualif. Quem leva veto
// vai para descartado; quem estava aprovado e ficou abaixo do corte volta para
// a fila (mapeado) e só sai se a nota subir. Cron a cada 10 minutos; sem fila, a
// rodada só consulta o banco. Sem GOOGLE_PLACES_API_KEY a nota sai só do cadastro
// e do juiz (googleBuscado false); quando a chave chega, essas são refeitas.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { llmChat } from "../_shared/llm.ts";
import { CNAE_RAMO, CORTE_ENCAIXE, escolherLugar, notaDeEncaixe, type Evidencia, type Juiz, type LugarGoogle } from "../_shared/prospectFit.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EVA_CRON_SECRET = Deno.env.get("EVA_CRON_SECRET");
const PLACES_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
const POR_RODADA = 12;
const AO_MESMO_TEMPO = 4;
const VERSAO = 2;

const CAMPOS = [
  "places.id", "places.displayName", "places.formattedAddress", "places.nationalPhoneNumber",
  "places.rating", "places.userRatingCount", "places.primaryTypeDisplayName", "places.websiteUri",
  "places.businessStatus", "places.reviews",
].join(",");

async function buscarNoGoogle(alvo: { nome: string; razao?: string | null; cidade?: string | null; celular?: string | null }): Promise<LugarGoogle & { avaliacoesTexto: string[] }> {
  const vazio = { achou: false, avaliacoes: 0, estrelas: null, ultimaAvaliacao: null, categoria: null, site: null, telefone: null, fechado: false, avaliacoesTexto: [] };
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": PLACES_KEY!, "X-Goog-FieldMask": CAMPOS },
    body: JSON.stringify({ textQuery: `${alvo.nome} ${alvo.cidade ?? ""} SC`, languageCode: "pt-BR", regionCode: "BR", pageSize: 5 }),
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`places ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const lugares: any[] = (await res.json())?.places ?? [];
  const i = escolherLugar(lugares.map((p) => ({ nome: p.displayName?.text ?? "", endereco: p.formattedAddress ?? "", telefone: p.nationalPhoneNumber ?? null })), alvo);
  if (i < 0) return vazio;
  const p = lugares[i];
  const reviews: any[] = p.reviews ?? [];
  const ultima = reviews.map((r) => r.publishTime).filter(Boolean).sort().pop() ?? null;
  return {
    achou: true,
    nome: p.displayName?.text ?? null,
    avaliacoes: p.userRatingCount ?? 0,
    estrelas: p.rating ?? null,
    ultimaAvaliacao: ultima,
    categoria: p.primaryTypeDisplayName?.text ?? null,
    site: p.websiteUri ?? null,
    telefone: p.nationalPhoneNumber ?? null,
    fechado: p.businessStatus === "CLOSED_PERMANENTLY",
    avaliacoesTexto: reviews.map((r) => String(r.text?.text ?? r.originalText?.text ?? "")).filter(Boolean).slice(0, 4).map((t) => t.slice(0, 280)),
  };
}

/** Texto da home do site da própria empresa (público), para o juiz. */
async function textoDoSite(url: string | null): Promise<string> {
  if (!url) return "";
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(7000), headers: { "User-Agent": "Mozilla/5.0 (Vyzon qualificação)" } });
    if (!res.ok) return "";
    const html = (await res.text()).slice(0, 300_000);
    return html
      .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;|&#160;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1800);
  } catch {
    return "";
  }
}

async function julgar(e: Evidencia, extras: { avaliacoes: string[]; site: string }): Promise<Juiz | null> {
  const fatos = [
    `Empresa: ${e.nome}${e.razao && e.razao !== e.nome ? ` (razão social: ${e.razao})` : ""}, ${e.cidade ?? "?"} - SC`,
    e.cnae ? `Atividade principal no CNPJ: ${CNAE_RAMO[e.cnae] ?? `código ${e.cnae}`}` : null,
    e.porte ? `Porte: ${e.porte}` : null,
    e.google?.achou
      ? `Google Maps: "${e.google.nome}", categoria "${e.google.categoria ?? "?"}", ${e.google.avaliacoes} avaliações`
      : e.googleBuscado === false ? "Google Maps não consultado." : "Não encontrada no Google Maps.",
    extras.avaliacoes.length ? `Avaliações recentes de clientes:\n- ${extras.avaliacoes.join("\n- ")}` : null,
    extras.site ? `Texto do site da empresa:\n${extras.site}` : null,
  ].filter(Boolean).join("\n");
  const res = await llmChat({
    messages: [
      {
        role: "system",
        content: [
          "Você avalia se uma empresa de Santa Catarina é cliente para uma ferramenta que acompanha propostas de energia solar enviadas pelo WhatsApp.",
          "O cliente certo é uma INTEGRADORA: vende e instala sistemas fotovoltaicos para o cliente final (casa, comércio, agro), manda orçamento e negocia.",
          "Não existe código de atividade (CNAE) próprio de energia solar: integradoras registram instalação elétrica (4321500), loja de material elétrico (4742300) ou engenharia (7112000). Um desses códigos com nome de empresa solar ou fotovoltaica é sinal forte de integradora: responda 'sim'.",
          "Não é cliente, responda 'nao': aquecedor solar ou aquecimento de água (é térmico, não fotovoltaico), quem só faz instalação elétrica sem nada de solar, usina ou geração de energia, distribuidora ou atacado, loja que só revende peças, imobiliária, financeira, empresa de outro ramo com 'sol' no nome, ou empresa fechada.",
          "Fora do ramo no CNAE (comunicação, publicidade, hidráulica, por exemplo) com nome solar: responda 'duvida'.",
          "Use só os fatos dados. Google Maps não consultado não é sinal contra.",
          'Responda só JSON: {"veredito": "sim" | "nao" | "duvida", "motivo": "até 12 palavras, em português, sem travessão"}',
        ].join("\n"),
      },
      { role: "user", content: fatos },
    ],
    max_completion_tokens: 120,
    response_format: { type: "json_object" },
  }, { label: "prospect-qualify", prefer: "anthropic" });
  if (!res.ok) return null;
  try {
    const data = await res.json();
    const raw = String(data?.choices?.[0]?.message?.content || "{}").replace(/^```(json)?|```$/g, "").trim();
    const j = JSON.parse(raw);
    if (!["sim", "nao", "duvida"].includes(j.veredito)) return null;
    return { veredito: j.veredito, motivo: String(j.motivo || "").slice(0, 120) };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  if (!EVA_CRON_SECRET || req.headers.get("x-cron-secret") !== EVA_CRON_SECRET) return new Response("unauthorized", { status: 401 });
  const payload = await req.json().catch(() => ({}));
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Aprovadas primeiro: são as próximas a sair e podem ter entrado pela nota antiga.
  const limite = Math.min(Number(payload?.limite) || POR_RODADA, 40);
  let consulta = admin.from("prospecting_allowlist")
    .select("id, agency_name, city, phone_e164, status, metadata")
    .eq("is_active", true).in("status", ["aprovado", "mapeado"]).is("sent_at", null);
  // Com a chave, também refaz quem foi qualificado sem o Google.
  consulta = PLACES_KEY
    ? consulta.or("fit_score.is.null,metadata->qualif->>google_buscado.eq.false")
    : consulta.is("fit_score", null);
  const { data: fila, error } = await consulta
    .order("status", { ascending: true }) // "aprovado" < "mapeado"
    .limit(limite);
  if (error) return Response.json({ ok: false, erro: error.message }, { status: 500 });

  const hoje = new Date();
  const resultado: any[] = [];
  const qualificar = async (row: any) => {
    const md = row.metadata ?? {};
    const evid: Evidencia = {
      nome: row.agency_name || md.fantasia || md.razao || "",
      razao: md.razao ?? null,
      cidade: row.city ?? null,
      cnae: md.cnae ?? null,
      porte: md.porte ?? null,
      inicio: md.inicio ?? null,
      emailDominio: md.email_dominio ?? null,
      socio: md.socio ?? null,
      celular: row.phone_e164 ?? null,
    };
    try {
      evid.googleBuscado = !!PLACES_KEY;
      const g = PLACES_KEY ? await buscarNoGoogle(evid) : null;
      const avaliacoesTexto = g?.avaliacoesTexto ?? [];
      const lugar = g ? (({ avaliacoesTexto: _t, ...l }) => l)(g) : null;
      evid.google = lugar;
      const site = await textoDoSite(lugar?.site ?? md.site ?? null);
      evid.juiz = await julgar(evid, { avaliacoes: avaliacoesTexto, site });
      const n = notaDeEncaixe(evid, hoje);
      const qualif = { nota: n.nota, motivos: n.motivos.slice(0, 6), veto: n.veto, google: lugar, google_buscado: !!PLACES_KEY, juiz: evid.juiz, site_lido: !!site, versao: VERSAO, em: hoje.toISOString() };
      const patch: Record<string, unknown> = { fit_score: n.nota, metadata: { ...md, qualif } };
      if (n.veto) { patch.status = "descartado"; patch.notes = `qualificação: ${n.veto}`; }
      else if (row.status === "aprovado" && n.nota < CORTE_ENCAIXE) patch.status = "mapeado";
      await admin.from("prospecting_allowlist").update(patch).eq("id", row.id);
      resultado.push({ nome: evid.nome, nota: n.nota, veto: n.veto, status: patch.status ?? row.status });
    } catch (err) {
      resultado.push({ nome: evid.nome, erro: (err as Error).message });
    }
  };
  // Em grupos pequenos: a IA e o Google respondem em paralelo sem estourar o tempo da edge.
  const lista = fila ?? [];
  for (let i = 0; i < lista.length; i += AO_MESMO_TEMPO) {
    await Promise.all(lista.slice(i, i + AO_MESMO_TEMPO).map(qualificar));
    if (resultado.some((r) => /places 4\d\d/.test(r.erro ?? ""))) break; // chave inválida ou cota
  }
  return Response.json({ ok: true, qualificadas: resultado.filter((r) => r.nota !== undefined).length, resultado });
});
