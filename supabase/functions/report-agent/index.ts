// Supabase Edge Function: Report Agent
// AI-powered sales analytics assistant for admin dashboard

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const PLAN_LIMITS: Record<string, number> = {
  pro: 999999, // ilimitado
  plus: 30,
  starter: 0,  // bloqueado
};
const WINDOW_SECONDS = 86400;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function consumeRateLimit(
  adminClient: any,
  bucket: string,
  limit: number,
  windowSeconds: number,
) {
  try {
    const { data, error } = await adminClient.rpc("consume_rate_limit", {
      p_bucket: bucket,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      const msg = String(error.message || "").toLowerCase();
      if (msg.includes("consume_rate_limit")) {
        return { enabled: false, allowed: true, remaining: limit };
      }
      throw error;
    }
    const row = Array.isArray(data) ? data[0] : data;
    return {
      enabled: true,
      allowed: row?.allowed !== false,
      remaining: Math.max(0, limit - (row?.current_count || 0)),
      resetAt: row?.reset_at ?? null,
    };
  } catch (error) {
    console.warn("[report-agent] rate limit unavailable:", error);
    return { enabled: false, allowed: true, remaining: limit };
  }
}

// ─── Data fetching helpers ──────────────────────────────────────────

async function fetchCompanyData(adminClient: any, companyId: string) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonth = now.getMonth() === 0
    ? `${now.getFullYear() - 1}-12`
    : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0")}`;
  const inicioMesAtual = `${currentMonth}-01`;
  const inicioMesAnterior = `${lastMonth}-01`;

  // Parallel queries
  const [vendedoresRes, vendasRes, metasRes, metasConsolidadasRes, produtosRes] = await Promise.all([
    // Vendedores
    adminClient
      .from("profiles")
      .select("id, nome, email, is_admin, is_super_admin")
      .eq("company_id", companyId)
      .order("nome"),

    // Vendas (last 3 months)
    adminClient
      .from("vendas")
      .select("id, user_id, valor, data_venda, status, produto, company_id")
      .eq("company_id", companyId)
      .gte("data_venda", `${now.getFullYear()}-${String(Math.max(1, now.getMonth() - 1)).padStart(2, "0")}-01`)
      .order("data_venda", { ascending: false }),

    // Metas individuais (current month)
    adminClient
      .from("metas")
      .select("*, profiles:user_id(nome)")
      .eq("company_id", companyId)
      .gte("mes_referencia", inicioMesAnterior),

    // Metas consolidadas
    adminClient
      .from("metas_consolidadas")
      .select("*")
      .eq("company_id", companyId)
      .gte("mes_referencia", inicioMesAnterior),

    // Produtos
    adminClient
      .from("produtos")
      .select("id, nome, preco_base, ativo")
      .eq("company_id", companyId),
  ]);

  const vendedores = vendedoresRes.data || [];
  const vendas = vendasRes.data || [];
  const metas = metasRes.data || [];
  const metasConsolidadas = metasConsolidadasRes.data || [];
  const produtos = produtosRes.data || [];

  // Process sales data
  const vendasMesAtual = vendas.filter((v: any) => (v.data_venda || "").startsWith(currentMonth));
  const vendasMesAnterior = vendas.filter((v: any) => (v.data_venda || "").startsWith(lastMonth));

  const totalMesAtual = vendasMesAtual.reduce((acc: number, v: any) => acc + Number(v.valor || 0), 0);
  const totalMesAnterior = vendasMesAnterior.reduce((acc: number, v: any) => acc + Number(v.valor || 0), 0);

  const vendasAprovadas = vendasMesAtual.filter((v: any) => v.status === "Aprovado");
  const faturamentoAprovado = vendasAprovadas.reduce((acc: number, v: any) => acc + Number(v.valor || 0), 0);
  const ticketMedio = vendasAprovadas.length > 0 ? faturamentoAprovado / vendasAprovadas.length : 0;

  // Ranking vendedores
  const rankingMap = new Map<string, { nome: string; total: number; qtd: number }>();
  vendasAprovadas.forEach((v: any) => {
    const seller = vendedores.find((s: any) => s.id === v.user_id);
    if (!seller) return;
    const existing = rankingMap.get(v.user_id) || { nome: seller.nome, total: 0, qtd: 0 };
    existing.total += Number(v.valor || 0);
    existing.qtd += 1;
    rankingMap.set(v.user_id, existing);
  });
  const ranking = Array.from(rankingMap.values()).sort((a, b) => b.total - a.total);

  // Products ranking
  const produtoMap = new Map<string, { nome: string; total: number; qtd: number }>();
  vendasAprovadas.forEach((v: any) => {
    const nome = v.produto || "Sem produto";
    const existing = produtoMap.get(nome) || { nome, total: 0, qtd: 0 };
    existing.total += Number(v.valor || 0);
    existing.qtd += 1;
    produtoMap.set(nome, existing);
  });
  const rankingProdutos = Array.from(produtoMap.values()).sort((a, b) => b.total - a.total);

  // Metas progress
  const metasInfo = metas
    .filter((m: any) => (m.mes_referencia || "").startsWith(currentMonth))
    .map((m: any) => {
      const vendasSeller = vendasAprovadas.filter((v: any) => v.user_id === m.user_id);
      const realizado = vendasSeller.reduce((acc: number, v: any) => acc + Number(v.valor || 0), 0);
      const valorMeta = Number(m.valor_meta) || 0;
      return {
        vendedor: m.profiles?.nome || "?",
        meta: valorMeta,
        realizado,
        progresso: valorMeta > 0 ? ((realizado / valorMeta) * 100).toFixed(1) + "%" : "N/A",
      };
    });

  const metaConsolidadaAtual = metasConsolidadas.find((m: any) => (m.mes_referencia || "").startsWith(currentMonth));

  return {
    resumo: {
      mesAtual: currentMonth,
      mesAnterior: lastMonth,
      totalVendedores: vendedores.length,
      vendasMesAtual: vendasMesAtual.length,
      vendasAprovadasMesAtual: vendasAprovadas.length,
      faturamentoMesAtual: faturamentoAprovado,
      faturamentoMesAnterior: totalMesAnterior,
      variacaoFaturamento: totalMesAnterior > 0
        ? (((totalMesAtual - totalMesAnterior) / totalMesAnterior) * 100).toFixed(1) + "%"
        : "N/A",
      ticketMedio: ticketMedio,
      totalProdutos: produtos.filter((p: any) => p.ativo).length,
    },
    rankingVendedores: ranking.slice(0, 10).map((r, i) => ({
      posicao: i + 1,
      nome: r.nome,
      faturamento: r.total,
      vendas: r.qtd,
      ticketMedio: r.qtd > 0 ? (r.total / r.qtd).toFixed(2) : "0",
    })),
    rankingProdutos: rankingProdutos.slice(0, 10).map((r, i) => ({
      posicao: i + 1,
      produto: r.nome,
      faturamento: r.total,
      vendas: r.qtd,
    })),
    metasIndividuais: metasInfo,
    metaConsolidada: metaConsolidadaAtual
      ? {
          valorMeta: Number(metaConsolidadaAtual.valor_meta),
          realizado: faturamentoAprovado,
          progresso: Number(metaConsolidadaAtual.valor_meta) > 0
            ? ((faturamentoAprovado / Number(metaConsolidadaAtual.valor_meta)) * 100).toFixed(1) + "%"
            : "N/A",
          descricao: metaConsolidadaAtual.descricao || null,
        }
      : null,
    vendedores: vendedores.map((v: any) => ({ nome: v.nome, isAdmin: v.is_admin })),
  };
}

// ─── System prompt ──────────────────────────────────────────────────

function buildSystemPrompt(companyData: any) {
  return `Voce e a Eva, a assistente de vendas do Vyzon. Voce e inteligente, direta e tem um tom casual — como uma colega de trabalho analitica que manja dos dados.

Seu papel: ajudar o gestor a entender o que esta rolando com as vendas, metas, vendedores e produtos. Voce tem acesso aos dados REAIS da empresa e responde de forma clara.

DADOS ATUAIS DA EMPRESA (use SOMENTE estes dados):
${JSON.stringify(companyData, null, 2)}

PERSONALIDADE:
- Tom casual e direto, como se estivesse conversando com o gestor no dia a dia
- Use "você" e fale em primeira pessoa ("olha", "pelo que vejo", "tá indo bem")
- Pode usar expressões naturais ("tá voando", "precisa de atenção", "destaque pro")
- Seja analítica mas acessível — nada de parecer um relatório corporativo chato
- Quando der boas notícias, celebre de leve. Quando der alertas, seja franca mas construtiva
- Máximo 1-2 emojis por resposta, só quando fizer sentido

REGRAS TÉCNICAS:
- Use SOMENTE os dados fornecidos - NUNCA invente números
- Formate valores como R$ X.XXX,XX
- Quando comparar períodos, mostre a variação percentual
- Se não tiver dados suficientes, diga na boa ("não tenho essa info ainda")
- Use **negrito** pra destacar números e nomes importantes
- Use listas com - pra organizar quando tiver vários itens
- Sugira ações concretas quando relevante

RETORNE UM JSON com esta estrutura exata:
{
  "answer": "sua resposta formatada em markdown",
  "type": "insight" | "ranking" | "comparison" | "alert" | "general",
  "highlights": ["array de 1-3 metricas-chave curtas (ex: 'Faturamento: R$ 50k')"]
}

SEMPRE retorne JSON valido, sem markdown code blocks ao redor.`;
}

// ─── Main handler ───────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      return json(500, { error: "OPENAI_API_KEY não configurada", code: "OPENAI_NOT_CONFIGURED" });
    }

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Unauthorized" });

    const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) return json(401, { error: "Unauthorized" });

    // Fetch profile (company_id + super_admin flag)
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("is_super_admin, company_id")
      .eq("id", user.id)
      .single();

    const isSuperAdmin = !!profile?.is_super_admin;

    const body = await req.json();
    const { question, companyId } = body;

    if (!question || typeof question !== "string") {
      return json(400, { error: "question is required" });
    }

    // Determine company
    const effectiveCompanyId = isSuperAdmin && companyId
      ? companyId
      : profile?.company_id;

    if (!effectiveCompanyId) {
      return json(400, { error: "company_id não encontrado" });
    }

    // Check company plan — Eva requires Plus or Pro
    const { data: company } = await adminSupabase
      .from("companies")
      .select("plan")
      .eq("id", effectiveCompanyId)
      .single();

    const companyPlan = (company?.plan || "starter").toLowerCase();
    const dailyLimit = PLAN_LIMITS[companyPlan] ?? PLAN_LIMITS.starter;

    if (dailyLimit === 0 && !isSuperAdmin) {
      return json(403, {
        error: "Eva está disponível nos planos Plus e Pro. Faça upgrade para usar.",
        code: "PLAN_REQUIRED",
      });
    }

    // Rate limit (skip for Pro / super_admin)
    let rateLimit = { allowed: true, remaining: dailyLimit, resetAt: null as string | null };

    if (companyPlan !== "pro" && !isSuperAdmin) {
      rateLimit = await consumeRateLimit(
        adminSupabase,
        `report-agent:user:${user.id}`,
        dailyLimit,
        WINDOW_SECONDS,
      );

      if (!rateLimit.allowed) {
        return json(429, {
          error: `Limite diário de ${dailyLimit} consultas atingido.`,
          code: "RATE_LIMITED",
          remaining: 0,
          resetAt: rateLimit.resetAt,
        });
      }
    }

    // Fetch real company data
    const companyData = await fetchCompanyData(adminSupabase, effectiveCompanyId);

    // Build prompt and call GPT
    const systemPrompt = buildSystemPrompt(companyData);

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        temperature: 0.3,
        max_tokens: 1200,
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiResponse.ok) {
      const errBody = await openaiResponse.text();
      console.error("[report-agent] OpenAI error:", errBody);
      return json(502, { error: "Erro ao consultar IA", code: "OPENAI_ERROR" });
    }

    const completion = await openaiResponse.json();
    const content = completion.choices?.[0]?.message?.content;

    if (!content) {
      return json(502, { error: "Resposta vazia da IA" });
    }

    let analysis;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      analysis = JSON.parse(cleaned);
    } catch {
      console.error("[report-agent] Failed to parse response:", content);
      // Fallback: return raw text as answer
      analysis = { answer: content, type: "general", highlights: [] };
    }

    return json(200, {
      success: true,
      analysis,
      model: "gpt-4o-mini",
      tokens: completion.usage?.total_tokens || null,
      remaining: companyPlan === "pro" ? null : (rateLimit.remaining > 0 ? rateLimit.remaining - 1 : 0),
      dailyLimit: companyPlan === "pro" ? null : dailyLimit,
    });
  } catch (error) {
    console.error("[report-agent] error:", error);
    return json(500, { error: "Internal server error" });
  }
});
